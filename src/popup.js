// Popup script: standalone lookup UI for the browser action.

const $ = (id) => document.getElementById(id);
const S = window.TomoshiJaDictShared;
const I = window.TomoshiJaDictI18n;

// --- Connection status -----------------------------------------------------

function checkStatus() {
  chrome.runtime.sendMessage({ type: "ping" }, (res) => {
    const el = $("status");
    if (res && res.ok && res.outdated) {
      // Connected, but the app is older than this build needs. Flagged in the
      // same slot as "disconnected" — lookups still work, pronunciation doesn't.
      el.textContent = I.t("popup.outdated", { min: res.min });
      el.className = "status off";
    } else if (res && res.ok && res.extOutdated) {
      // The reverse: the app wants a newer extension than this one (only the
      // mainland offline zip ever stays behind — the store channel auto-updates).
      // Everything keeps working; the settings page has the download link.
      el.textContent = I.t("popup.extOutdated", { min: res.extMin });
      el.className = "status off";
    } else if (res && res.ok) {
      el.textContent = I.t("popup.connected");
      el.className = "status ok";
    } else if (res && res.unsupportedOs) {
      // The desktop app doesn't ship for this platform, so don't imply the
      // usual "start the app" fix.
      el.textContent = I.t("common.unsupportedOs", { os: res.unsupportedOs });
      el.className = "status off";
    } else {
      el.textContent = I.t("popup.disconnected");
      el.className = "status off";
    }
  });
}

// --- Pitch-accent (wrapper) ------------------------------------------------

function requestPitch(surface, reading, slot) {
  chrome.runtime.sendMessage({ type: "pitch", surface, reading }, (res) => {
    if (!res || !res.ok || !res.accent) return;
    const svg = S.renderPitchSvg(reading, res.accent.mora_count, res.accent.accent_type);
    if (svg) slot.appendChild(svg);
  });
}

// --- TTS wrapper -----------------------------------------------------------

function tts(text, reading, cb) {
  chrome.runtime.sendMessage({ type: "tts", text, reading }, cb);
}

// --- Add to wordbook -------------------------------------------------------

const fav = {
  add(payload, cb) {
    chrome.runtime.sendMessage({ type: "favorite", ...payload }, (res) => {
      cb(chrome.runtime.lastError ? { ok: false, reason: "offline" } : res);
    });
  },
  remove(entryId, cb) {
    chrome.runtime.sendMessage({ type: "unfavorite", entryId }, (res) => {
      cb(chrome.runtime.lastError ? { ok: false, reason: "offline" } : res);
    });
  },
  check(entryId, cb) {
    chrome.runtime.sendMessage({ type: "favoriteStatus", entryId }, (res) => {
      cb(chrome.runtime.lastError ? { ok: false, reason: "offline" } : res);
    });
  },
  // 「收藏到」设置 + 自建本清单（多生词本，shared.js makeFav 据此决定出不出选本 chips）。
  decks(cb) {
    chrome.runtime.sendMessage({ type: "favoriteDecks" }, (res) => {
      cb(chrome.runtime.lastError ? { ok: false, reason: "offline" } : res);
    });
  },
};

// --- Main search -----------------------------------------------------------

function doSearch() {
  const q = $("query").value.trim();
  if (!q) return;
  const box = $("results");
  box.innerHTML = `<div class="jd-msg">${I.t("common.searching")}</div>`;

  let answered = false;
  const finish = (result) => {
    if (answered) return;
    answered = true;
    clearTimeout(safety);
    S.renderResult(box, q, result, requestPitch, tts, fav, null);
  };
  const safety = setTimeout(() => finish({ ok: false, reason: "offline" }), 9000);
  // 工具栏弹窗是用户亲手输入：typed → 同应用搜索框，拉丁字母也按罗马字查（tokoro → ところ）。
  chrome.runtime.sendMessage({ type: "search", q, typed: true }, (res) => {
    finish(chrome.runtime.lastError ? { ok: false, reason: "offline" } : res);
  });
}

// --- Event handlers --------------------------------------------------------

$("search").addEventListener("click", doSearch);
$("query").addEventListener("keydown", (e) => {
  if (e.key === "Enter") doSearch();
});

$("open-options").addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

// --- Init ------------------------------------------------------------------
// Localize before the first render so status/placeholder come up in the right
// language; the popup is transient, so no live re-render on locale change.

function getSelectionFromTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || !tabs[0]) return;
    chrome.scripting.executeScript(
      {
        target: { tabId: tabs[0].id },
        func: () => window.getSelection()?.toString().trim() || "",
      },
      (results) => {
        if (chrome.runtime.lastError || !results || !results[0]) return;
        const text = results[0].result;
        if (text && text.length <= S.MAX_LEN) {
          $("query").value = text;
          doSearch();
        }
      }
    );
  });
}

I.init(() => {
  I.localizeDom();
  checkStatus();
  getSelectionFromTab();
  $("query").focus();
});
