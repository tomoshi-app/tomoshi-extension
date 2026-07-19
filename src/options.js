// Options page: reads/writes the same settings the content script consumes
// (chrome.storage.sync) and shows live connection status via the background.
// Settings auto-save on change.

const DEFAULTS = {
  enabled: true,
  modifier: "Alt",
  disabledSites: [],
  saveHistory: false,
  uiLanguage: "auto",
};
const $ = (id) => document.getElementById(id);
const I = window.TomoshiJaDictI18n;

function load() {
  chrome.storage.sync.get(DEFAULTS, (s) => {
    $("enabled").checked = s.enabled;
    $("modifier").value = s.modifier;
    $("disabledSites").value = (s.disabledSites || []).join("\n");
    $("saveHistory").checked = s.saveHistory;
    $("uiLanguage").value = s.uiLanguage;
  });
}

let savedTimer = null;
function showSaved() {
  const el = $("saved");
  el.textContent = I.t("options.saved");
  clearTimeout(savedTimer);
  savedTimer = setTimeout(() => (el.textContent = ""), 1200);
}

function save() {
  const disabledSites = $("disabledSites")
    .value.split("\n")
    .map((line) => line.trim().toLowerCase())
    .filter(Boolean);
  chrome.storage.sync.set(
    {
      enabled: $("enabled").checked,
      modifier: $("modifier").value,
      disabledSites,
      saveHistory: $("saveHistory").checked,
      uiLanguage: $("uiLanguage").value,
    },
    showSaved
  );
}

// Debounce the textarea so we don't write on every keystroke.
let saveTimer = null;
function saveDebounced() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 400);
}

function checkStatus() {
  const el = $("status");
  el.className = "status";
  el.textContent = I.t("options.checking");
  chrome.runtime.sendMessage({ type: "ping" }, (res) => {
    if (res && res.ok) {
      el.textContent = I.t("options.connected", { base: res.base });
      el.className = "status ok";
      return;
    }
    // Disconnected: the message carries a literal {site} placeholder that we
    // materialize as a real link (t() leaves it untouched with no params), plus
    // a retry button so the user doesn't have to reload the page.
    el.className = "status off";
    el.textContent = "";
    const [before, after = ""] = I.t("options.disconnected").split("{site}");
    const link = document.createElement("a");
    link.href = "https://tomoshi.app";
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = "tomoshi.app";
    el.append(before, link, after);
    const retry = document.createElement("button");
    retry.type = "button";
    retry.className = "retry";
    retry.textContent = I.t("options.retry");
    retry.addEventListener("click", checkStatus);
    el.append(retry);
  });
}

$("enabled").addEventListener("change", save);
$("modifier").addEventListener("change", save);
$("saveHistory").addEventListener("change", save);
$("uiLanguage").addEventListener("change", save);
$("disabledSites").addEventListener("input", saveDebounced);
$("disabledSites").addEventListener("change", save); // flush immediately on blur

// Language switch takes effect immediately: the storage write above fires
// i18n.js's onChanged listener, which resolves the new locale and lands here.
I.onChange(() => {
  I.localizeDom();
  checkStatus(); // status text is rendered, not attribute-driven — repaint it
});

I.init(() => {
  I.localizeDom();
  load();
  checkStatus();
});
