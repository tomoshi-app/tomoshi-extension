// Content script: while the user holds Alt with text selected (either order:
// select then press, or hold and drag-select — the latter also works on link
// text), shows a Shadow-DOM popup with the lookup; releasing Alt hides it (a
// quick-glance mode). Shadow
// DOM isolates our styles from (and against) the host page; nothing here loads a
// sub-resource into the page DOM, so strict site CSPs don't interfere.

(() => {
  const S = window.TomoshiJaDictShared;
  const I = window.TomoshiJaDictI18n;
  // Pull the stored UI language early; until it lands t() uses the browser-
  // language guess (the popup only opens on a later keydown, so this races
  // nothing in practice). Later changes arrive via i18n.js's storage listener.
  I.init();

  let host = null; // the Shadow-DOM host element, or null when no popup is open
  let shadow = null;
  let modHeld = false; // the configured modifier is currently held down

  // User settings (managed on the options page), kept live via storage events.
  const DEFAULTS = { enabled: true, modifier: "Alt", disabledSites: [], saveHistory: false };
  let settings = { ...DEFAULTS };
  chrome.storage.sync.get(DEFAULTS, (loaded) => {
    settings = { ...DEFAULTS, ...loaded };
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    for (const k in changes) settings[k] = changes[k].newValue;
  });

  const MOD_FLAG = { Alt: "altKey", Control: "ctrlKey", Shift: "shiftKey" };

  // After the extension is reloaded/updated/disabled, an already-injected content
  // script keeps running but loses its bridge: `chrome.runtime` becomes undefined
  // (or `chrome.runtime.id` goes null), and any sendMessage throws
  // "Cannot read properties of undefined (reading 'sendMessage')". Route every
  // message through here so a dead context degrades to the normal offline path
  // instead of throwing.
  function sendMessage(msg, cb) {
    if (!chrome.runtime?.id) {
      if (cb) cb(undefined);
      return;
    }
    try {
      chrome.runtime.sendMessage(msg, (res) => {
        // Touch lastError so Chrome doesn't log "Unchecked runtime.lastError".
        void chrome.runtime.lastError;
        if (cb) cb(res);
      });
    } catch (_) {
      // Context invalidated between the guard and the call.
      if (cb) cb(undefined);
    }
  }

  function siteDisabled() {
    const h = location.hostname;
    return (settings.disabledSites || []).some((d) => h === d || h.endsWith("." + d));
  }

  // True when the chosen modifier is held and no *other* modifier is, so the
  // trigger doesn't fire on combos like Ctrl+Alt.
  function onlyModifierHeld(e, mod) {
    const want = MOD_FLAG[mod] || "altKey";
    return ["altKey", "ctrlKey", "shiftKey", "metaKey"].every((f) => (f === want ? true : !e[f]));
  }

  function teardown() {
    if (host) host.remove();
    host = null;
    shadow = null;
    document.removeEventListener("mousedown", onOutside, true);
    document.removeEventListener("keydown", onKey, true);
    window.removeEventListener("scroll", teardown, true);
  }

  function onOutside(e) {
    if (host && !e.composedPath().includes(host)) teardown();
  }

  function onKey(e) {
    if (e.key === "Escape") teardown();
  }

  function openHost() {
    teardown();
    host = document.createElement("div");
    // `all: initial` resets inherited page styles on the host itself; the rest
    // of the UI lives in the shadow root and is styled by STYLE below.
    host.style.cssText = "all: initial; position: fixed; z-index: 2147483647;";
    // lang drives Han glyph variant selection (简/台) inside the shadow tree.
    host.setAttribute("lang", I.getLocale());
    shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = STYLE;
    shadow.appendChild(style);
    document.documentElement.appendChild(host);
    document.addEventListener("mousedown", onOutside, true);
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("scroll", teardown, true);
  }

  function positionAt(rect) {
    const gap = 6;
    const width = 340;
    let left = rect.left;
    let top = rect.bottom + gap;
    if (left + width > window.innerWidth) left = window.innerWidth - width - 8;
    if (left < 8) left = 8;
    // If it would overflow the bottom, flip above the selection.
    if (top + 200 > window.innerHeight && rect.top > 200) {
      top = rect.top - gap - 200;
    }
    host.style.left = `${left}px`;
    host.style.top = `${top}px`;
  }

  // --- Pitch-accent (wrapper with host-alive check) ------------------------

  function requestPitch(surface, reading, slot) {
    sendMessage({ type: "pitch", surface, reading }, (res) => {
      if (!host || !slot.isConnected) return;
      if (!res || !res.ok || !res.accent) return;
      const svg = S.renderPitchSvg(reading, res.accent.mora_count, res.accent.accent_type);
      if (svg) slot.appendChild(svg);
    });
  }

  // --- TTS wrapper ---------------------------------------------------------

  function tts(text, reading, cb) {
    sendMessage({ type: "tts", text, reading }, (res) => {
      if (!host) return;
      cb(res);
    });
  }

  // --- Grammar lookup ------------------------------------------------------

  function lookupGrammar(q, cb) {
    sendMessage({ type: "grammar", q, limit: 5 }, (gres) => {
      if (!host) return;
      cb(gres);
    });
  }

  // --- Add to wordbook -----------------------------------------------------

  // Add / remove / check saved state, driving the popup's star toggle.
  const fav = {
    add(payload, cb) {
      sendMessage({ type: "favorite", ...payload }, (res) => {
        if (!host) return;
        // A dropped channel / dead context surfaces as res undefined.
        cb(res || { ok: false, reason: "offline" });
      });
    },
    remove(entryId, cb) {
      sendMessage({ type: "unfavorite", entryId }, (res) => {
        if (!host) return;
        cb(res || { ok: false, reason: "offline" });
      });
    },
    check(entryId, cb) {
      sendMessage({ type: "favoriteStatus", entryId }, (res) => {
        if (!host) return;
        cb(res || { ok: false, reason: "offline" });
      });
    },
  };

  // --- Open full entry in the desktop app ----------------------------------

  // Ask the app to raise its window and show the full result for `q`. On success
  // the quick-glance popup is closed (the user is switching to the app); on
  // failure the popup stays so `cb` can flash an inline error.
  function reveal(q, cb) {
    sendMessage({ type: "reveal", q }, (res) => {
      if (!host) return;
      if (res && res.ok) {
        teardown();
        return;
      }
      if (cb) cb(res || { ok: false, reason: "offline" });
    });
  }

  // --- Render loading / result ---------------------------------------------

  function renderLoading() {
    openHost();
    const box = document.createElement("div");
    box.className = "jd-box";
    box.innerHTML = `<div class="jd-msg">${I.t("common.searching")}</div>`;
    shadow.appendChild(box);
    return box;
  }

  // Look up the current selection and open the popup over it. Returns true
  // when a popup was opened (i.e. a usable selection existed).
  function lookupSelection() {
    const selection = window.getSelection();
    const text = selection ? selection.toString().trim() : "";
    if (!text || text.length > S.MAX_LEN) return false;

    let rect;
    try {
      rect = selection.getRangeAt(0).getBoundingClientRect();
    } catch (_) {
      return false;
    }
    if (!rect || (rect.width === 0 && rect.height === 0)) return false;

    const box = renderLoading();
    positionAt(rect);

    // Resolve the popup at most once: from the reply, or from a safety timeout
    // so it can never spin on "查询中…" forever if the worker never answers.
    let answered = false;
    const finish = (result) => {
      if (answered || !host) return;
      answered = true;
      clearTimeout(safety);
      S.renderResult(box, text, result, lookupGrammar, requestPitch, tts, fav, reveal);
    };
    const safety = setTimeout(() => finish({ ok: false, reason: "offline" }), 9000);
    sendMessage({ type: "lookup", q: text, limit: 8 }, (res) => {
      // A dropped channel / dead context surfaces as res undefined.
      const result = res || { ok: false, reason: "offline" };
      finish(result);
      // Record history if the user has opted in and the lookup succeeded
      if (
        settings.saveHistory &&
        result &&
        result.ok &&
        result.entries &&
        result.entries.length > 0
      ) {
        const entryRef = result.entries[0].id ?? null;
        sendMessage({ type: "recordHistory", q: text, entryRef });
      }
    });
    return true;
  }

  // Trigger: select text first, then hold the configured modifier (default
  // Alt). Its keydown shows the popup (when a selection exists); its keyup hides
  // it again. `e.repeat` filters held-key autorepeat; `onlyModifierHeld` keeps
  // real shortcuts (Ctrl+Alt, etc.) working untouched.
  document.addEventListener(
    "keydown",
    (e) => {
      if (!settings.enabled || siteDisabled()) return;
      const mod = settings.modifier || "Alt";
      if (e.key !== mod || e.repeat) return;
      if (!onlyModifierHeld(e, mod)) return;

      modHeld = true;

      // Suppress Alt focusing the browser menu bar when we act on it.
      if (lookupSelection()) e.preventDefault();
    },
    true
  );

  // Releasing the modifier closes the popup.
  document.addEventListener(
    "keyup",
    (e) => {
      if (e.key === (settings.modifier || "Alt")) {
        modHeld = false;
        if (host) teardown();
      }
    },
    true
  );

  // Losing window focus (Alt+Tab and friends) eats the keyup, so clear the
  // held flag here or drag suppression would stick until the next Alt press.
  window.addEventListener("blur", () => {
    modHeld = false;
  });

  // Link text can't normally be drag-selected: the drag turns into a native
  // link drag. While the modifier is held, suppress that so dragging over an
  // <a> makes a text selection — the reverse order (hold Alt, then select) is
  // the only way to get linked words selected.
  document.addEventListener(
    "dragstart",
    (e) => {
      if (modHeld && settings.enabled && !siteDisabled()) e.preventDefault();
    },
    true
  );

  // Second half of that flow: the selection finishes *after* the modifier's
  // keydown, so fire the lookup on mouseup too. Deferred a tick because the
  // selection is finalized after the mouseup event.
  document.addEventListener(
    "mouseup",
    (e) => {
      if (!modHeld || !settings.enabled || siteDisabled()) return;
      if (host && e.composedPath().includes(host)) return;
      setTimeout(() => {
        if (modHeld) lookupSelection();
      }, 0);
    },
    true
  );

  // Releasing a drag-selection over a link would still count as an Alt+click
  // (Chrome: download the link target); swallow that when a selection exists.
  document.addEventListener(
    "click",
    (e) => {
      if (!modHeld) return;
      if (host && e.composedPath().includes(host)) return;
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed) e.preventDefault();
    },
    true
  );

  const STYLE = `
    .jd-box {
      font-family: -apple-system, "Segoe UI", "Hiragino Kaku Gothic ProN", "Noto Sans CJK JP", sans-serif;
      width: 340px;
      max-height: 60vh;
      overflow-y: auto;
      box-sizing: border-box;
      background: #ffffff;
      color: #1a1a1a;
      border: 1px solid #e0e0e0;
      border-radius: 10px;
      box-shadow: 0 8px 28px rgba(0, 0, 0, 0.18);
      padding: 12px 14px;
      font-size: 14px;
      line-height: 1.5;
    }
    .jd-head {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 12px;
    }
    .jd-head:first-child { margin-top: 0; }
    .jd-title {
      display: flex; align-items: center; flex-wrap: wrap;
      gap: 2px 8px; flex: 1; min-width: 0;
    }
    .jd-surface { font-size: 18px; font-weight: 600; white-space: nowrap; }
    .jd-reading { font-size: 13px; color: #777; white-space: nowrap; }
    .jd-sense { margin: 3px 0 0 2px; color: #333; }
    .jd-pos { font-size: 12px; color: #888; }
    .jd-sense-cont { margin-left: 1.1em; }
    .jd-msg { color: #888; }
    .jd-speak {
      margin-left: auto; align-self: center;
      display: inline-flex; padding: 3px; border: none; border-radius: 5px;
      background: transparent; color: #999; cursor: pointer;
    }
    .jd-speak:hover { background: rgba(0, 0, 0, 0.06); color: #555; }
    .jd-speak-busy { opacity: 0.4; cursor: default; }
    .jd-fav {
      align-self: center;
      display: inline-flex; align-items: center; justify-content: center;
      width: 24px; height: 24px; padding: 0; border: none; border-radius: 5px;
      background: transparent; color: #b8b8b8; cursor: pointer;
      font-size: 16px; line-height: 1;
    }
    .jd-fav:hover { background: rgba(0, 0, 0, 0.06); color: #f0a500; }
    .jd-fav-on { color: #f0a500; }
    .jd-fav-on:hover { color: #f0a500; background: rgba(0, 0, 0, 0.06); }
    .jd-flash { margin-left: 8px; font-size: 12px; color: #c0392b; }
    .jd-more {
      display: block; width: 100%; margin-top: 12px; padding: 7px 10px;
      border: 1px solid #e0e0e0; border-radius: 7px;
      background: #f7f8fa; color: #4a5568; cursor: pointer;
      font-family: inherit; font-size: 13px; text-align: center;
    }
    .jd-more:hover { background: #eef2ff; border-color: #c7d2fe; color: #4f46e5; }
    .jd-more:disabled { opacity: 0.5; cursor: default; }
    .jd-badge { font-size: 11px; font-weight: 600; padding: 1px 7px; border-radius: 999px; background: #eef0f4; color: #555; }
    .jd-formation { margin: 4px 0 0 2px; font-size: 13px; color: #666; }
    .jd-example { margin: 4px 0 0 2px; font-size: 13px; color: #444; }
    .jd-pitch-slot { display: inline-flex; align-items: center; }
    .jd-pitch { display: block; }
    .jd-pitch-line { fill: none; stroke: #888; stroke-width: 1.5; }
    .jd-pitch-drop { stroke-dasharray: 1.5 1.5; }
    .jd-pitch-dot { fill: #4a90d9; }
    .jd-pitch-dot-low { fill: #888; }
    @media (prefers-color-scheme: dark) {
      .jd-box { background: #1f1f1f; color: #ededed; border-color: #333; }
      .jd-reading { color: #aaa; }
      .jd-sense { color: #cfcfcf; }
      .jd-pos { color: #999; }
      .jd-msg { color: #999; }
      .jd-badge { background: #333; color: #ccc; }
      .jd-formation { color: #aaa; }
      .jd-example { color: #bbb; }
      .jd-speak:hover { background: rgba(255, 255, 255, 0.1); color: #ddd; }
      .jd-fav:hover { background: rgba(255, 255, 255, 0.1); color: #ffcb47; }
      .jd-fav-on, .jd-fav-on:hover { color: #ffcb47; background: transparent; }
      .jd-flash { color: #e57373; }
      .jd-more { background: #2a2a2a; border-color: #3a3a3a; color: #cfcfcf; }
      .jd-more:hover { background: #33343a; border-color: #4b4f66; color: #a5b4fc; }
    }
  `;
})();
