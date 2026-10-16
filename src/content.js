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

  // 浮层放选区下方还是上方，按**实际内容高度**定：「查询中…」时先按那一行定一次，
  // 结果渲染完再按量出来的高度重定一次（lookupSelection 的 finish）。原先只在查询中
  // 那一刻按假定的 200px 定死，结果把浮层撑到 60vh 时靠近窗口底部的会伸出视口、最下面
  // 几行滚到底也看不见；只按「下方剩多少」判也不够——下方剩 300px 而语法卡要 600px 时，
  // 上方明明放得下却被塞进下方一条窄缝里滚动。规则：
  // - 下方放得下整张卡 → 下方（`top` 锚定）；
  // - 否则上方放得下 → 上方（`bottom` 锚在选区上沿，之后再变高也是向上长，不盖住选中的词）；
  // - 都放不下 → 哪边宽敞放哪边。
  // 卡高上限 60vh；放不下的部分由 .jd-box 自己的滚动条承担（max-height 钳到所在一侧的空间）。
  function positionAt(rect, box) {
    const gap = 6;
    const margin = 8;
    const width = 340;
    const vh = window.innerHeight;
    let left = rect.left;
    if (left + width > window.innerWidth) left = window.innerWidth - width - margin;
    if (left < margin) left = margin;
    host.style.left = `${left}px`;

    const below = vh - rect.bottom - gap - margin;
    const above = rect.top - gap - margin;
    // 量自然高度：先摘掉 max-height（含样式表里的 60vh）再读 offsetHeight，同步完成、
    // 不会画出中间态。不能用 scrollHeight——有结果时 box 自身不滚（.jd-split），内容
    // 被压进 .jd-scroll，box 的 scrollHeight 只等于被钳之后的高度。
    box.style.maxHeight = "none";
    const want = Math.min(box.offsetHeight, vh * 0.6);
    const placeBelow = below >= want || (above < want && below >= above);
    if (placeBelow) {
      host.style.top = `${rect.bottom + gap}px`;
      host.style.bottom = "";
    } else {
      host.style.top = "";
      host.style.bottom = `${vh - rect.top + gap}px`;
    }
    // 选区几乎占满窗口时两侧都很窄：至少留 120px，宁可盖住一点选区也别只剩一条缝。
    const room = Math.max(placeBelow ? below : above, 120);
    box.style.maxHeight = `${Math.min(room, vh * 0.6)}px`;
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
    // 「收藏到」设置 + 自建本清单（多生词本，shared.js makeFav 据此决定出不出选本 chips）。
    decks(cb) {
      sendMessage({ type: "favoriteDecks" }, (res) => {
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
    positionAt(rect, box);

    // Resolve the popup at most once: from the reply, or from a safety timeout
    // so it can never spin on "查询中…" forever if the worker never answers.
    let answered = false;
    const finish = (result) => {
      if (answered || !host) return;
      answered = true;
      clearTimeout(safety);
      S.renderResult(box, text, result, requestPitch, tts, fav, reveal);
      // 按渲染出的实际高度重新选上 / 下（见 positionAt）。
      positionAt(rect, box);
    };
    const safety = setTimeout(() => finish({ ok: false, reason: "offline" }), 9000);
    // 词条 + 语法 + 分类计数 + 活用解释一次回齐（background.js search）；划词读的是页面
    // 上的日文，不按罗马字查（typed 不给）。
    sendMessage({ type: "search", q: text }, (res) => {
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
    /* 有结果时（shared.js renderResult 加 .jd-split）：box 自身不滚，内边距挪给两块——
       .jd-scroll 撑满剩余高度并滚动，.jd-foot 固定在底部，上沿一条分隔线。 */
    .jd-box.jd-split { display: flex; flex-direction: column; overflow: hidden; padding: 0; }
    .jd-scroll { flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 12px 14px; }
    .jd-foot { flex-shrink: 0; padding: 10px 14px 12px; border-top: 1px solid #eee; }
    .jd-foot > :first-child { margin-top: 0; }
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
    .jd-deconj { font-size: 12px; color: #777; margin: 0 0 6px; padding: 4px 8px; background: #f3f3f3; border-radius: 6px; }
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
    /* 星标选本行（多生词本，shared.js showDeckPicker）：词头行下方一行 chips。 */
    .jd-deck-pick {
      display: flex; flex-wrap: wrap; align-items: center; gap: 6px;
      margin: 4px 0 6px 2px; padding: 6px 8px;
      border: 1px solid #e6e8ee; border-radius: 8px; background: #f7f8fa;
    }
    .jd-deck-pick-title { font-size: 12px; color: #6b7280; margin-right: 2px; }
    .jd-deck-chip {
      padding: 3px 10px; border: 1px solid #d6dae3; border-radius: 999px;
      background: #fff; color: #333; cursor: pointer;
      font-family: inherit; font-size: 12px; line-height: 1.4; max-width: 160px;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .jd-deck-chip:hover { border-color: #4f46e5; color: #4f46e5; background: #eef2ff; }
    .jd-deck-chip-last { border-color: #a5b4fc; }
    .jd-deck-pick-hint { flex-basis: 100%; font-size: 11px; color: #9ca3af; }
    .jd-flash { margin-left: 8px; font-size: 12px; color: #c0392b; }
    /* Own line under the header row — see the block option on flash(). */
    .jd-flash-block { display: block; margin: 3px 0 0 2px; }
    /* 结果分类导航（shared.js appendSectionNav）：同桌面 SearchBar .sug-nav——常用绿、
       语法青、非常用只灰字无框；色值取 app.css --color-tag-common-* / --color-tag-gram-*。 */
    .jd-nav { display: flex; flex-wrap: wrap; gap: 6px 8px; margin-top: 12px; }
    .jd-nav-chip { display: inline-flex; align-items: baseline; gap: 4px; padding: 2px 8px; font-size: 12px; line-height: 1.5; color: #9ca3af; border: 1px solid transparent; border-radius: 4px; white-space: nowrap; }
    .jd-nav-common { color: #15803d; background: #f0fdf4; border-color: #bbf7d0; }
    .jd-nav-grammar { color: #0e7490; background: #ecfeff; border-color: #a5f3fc; }
    .jd-nav-count { font-variant-numeric: tabular-nums; opacity: 0.8; }
    .jd-nav + .jd-more { margin-top: 8px; }
    .jd-more {
      display: block; width: 100%; margin-top: 12px; padding: 7px 10px;
      border: 1px solid #e0e0e0; border-radius: 7px;
      background: #f7f8fa; color: #4a5568; cursor: pointer;
      font-family: inherit; font-size: 13px; text-align: center;
    }
    .jd-more:hover { background: #eef2ff; border-color: #c7d2fe; color: #4f46e5; }
    .jd-more:disabled { opacity: 0.5; cursor: default; }
    /* 语法卡（shared.js renderGrammarCard）：语体章色值同桌面 RegisterTag（口语绿 /
       中性紫 / 书面蓝 / 正式红，深色各降一档）；小节标题 + 接续逐条 + 例句左竖线。 */
    .jd-reg-casual { background: #15803d; }
    .jd-reg-neutral { background: #7c3aed; }
    .jd-reg-written { background: #1d4ed8; }
    .jd-reg-formal { background: #b91c1c; }
    .jd-g-meaning { margin: 4px 0 0 2px; color: #333; }
    .jd-g-senses { margin: 4px 0 0 2px; padding-left: 1.4em; color: #333; }
    .jd-g-senses li + li { margin-top: 2px; }
    .jd-g-sec { margin: 8px 0 0 2px; }
    .jd-g-sec-title { font-size: 11px; font-weight: 600; color: #888; margin-bottom: 2px; }
    .jd-g-form { font-size: 13px; color: #333; }
    .jd-g-form + .jd-g-form { margin-top: 2px; }
    .jd-g-form-label { font-size: 12px; color: #888; margin-right: 6px; }
    .jd-g-form-note { font-size: 12px; color: #888; margin-left: 2px; }
    .jd-g-ex { padding-left: 8px; border-left: 2px solid #d6dae3; }
    .jd-g-ex-jp { font-size: 14px; color: #222; }
    .jd-g-ex-tr { font-size: 12px; color: #777; margin-top: 1px; }
    .jd-pitch-slot { display: inline-flex; align-items: center; }
    /* 词头标签章（shared.js makeTags）：色值取桌面应用 app.css 的 --color-badge-blue /
       --color-badge-green-strong，深色下各降一档，与应用内同一套。 */
    .jd-tags { display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; }
    .jd-tag {
      display: inline-flex; align-items: center; gap: 3px;
      font-size: 11px; line-height: 1; padding: 3px 6px; border-radius: 4px; color: #fff;
    }
    .jd-tag-jlpt { background: #1d4ed8; cursor: help; }
    .jd-tag-approx { font-size: 9px; padding: 1px 3px; border-radius: 3px; background: rgba(255, 255, 255, 0.22); }
    .jd-tag-common { background: #15803d; }
    .jd-pitch { display: block; }
    .jd-pitch-line { fill: none; stroke: #888; stroke-width: 1.5; }
    .jd-pitch-drop { stroke-dasharray: 1.5 1.5; }
    .jd-pitch-dot { fill: #4a90d9; }
    .jd-pitch-dot-low { fill: #888; }
    @media (prefers-color-scheme: dark) {
      .jd-box { background: #1f1f1f; color: #ededed; border-color: #333; }
      .jd-foot { border-top-color: #333; }
      .jd-reading { color: #aaa; }
      .jd-sense { color: #cfcfcf; }
      .jd-pos { color: #999; }
      .jd-msg { color: #999; }
      .jd-deconj { color: #bbb; background: #2a2a2a; }
      .jd-tag-jlpt { background: #1e40af; }
      .jd-tag-common { background: #166534; }
      .jd-reg-casual { background: #166534; }
      .jd-reg-neutral { background: #5b21b6; }
      .jd-reg-written { background: #1e40af; }
      .jd-reg-formal { background: #991b1b; }
      .jd-g-meaning, .jd-g-senses, .jd-g-form { color: #cfcfcf; }
      .jd-g-sec-title, .jd-g-form-label, .jd-g-form-note { color: #999; }
      .jd-g-ex { border-left-color: #444; }
      .jd-g-ex-jp { color: #e5e5e5; }
      .jd-g-ex-tr { color: #aaa; }
      .jd-speak:hover { background: rgba(255, 255, 255, 0.1); color: #ddd; }
      .jd-fav:hover { background: rgba(255, 255, 255, 0.1); color: #ffcb47; }
      .jd-fav-on, .jd-fav-on:hover { color: #ffcb47; background: transparent; }
      .jd-flash { color: #e57373; }
      .jd-deck-pick { background: #2a2a2a; border-color: #3a3a3a; }
      .jd-deck-pick-title { color: #9ca3af; }
      .jd-deck-chip { background: #1f1f1f; border-color: #444; color: #ddd; }
      .jd-deck-chip:hover { border-color: #818cf8; color: #c7d2fe; background: #2b2d4a; }
      .jd-deck-chip-last { border-color: #6366f1; }
      .jd-deck-pick-hint { color: #777; }
      .jd-nav-chip { color: #757575; }
      .jd-nav-common { color: #84ab8c; background: #202b22; border-color: #3c5642; }
      .jd-nav-grammar { color: #79a6ad; background: #1f2b2e; border-color: #3a545a; }
      .jd-more { background: #2a2a2a; border-color: #3a3a3a; color: #cfcfcf; }
      .jd-more:hover { background: #33343a; border-color: #4b4f66; color: #a5b4fc; }
    }
  `;
})();
