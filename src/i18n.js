// Shared UI i18n for the extension (content script, popup, options).
// Exposed as window.TomoshiJaDictI18n. Must load before shared.js.
//
// The locale setting lives in chrome.storage.sync `uiLanguage`:
//   "auto" (default, follows the browser UI language) | "zh-CN" | "zh-TW".
// 术语与桌面应用 src/lib/i18n/zh-TW.ts 对齐：词典→辭典、设置→設定、
// 快捷键→快捷鍵、应用→應用程式、连接→連線、保存→儲存、插件→擴充功能。

(() => {
  const MESSAGES = {
    "zh-CN": {
      "common.searching": "查询中…",
      "common.offline": "未连接",
      "common.engineOff": "发音引擎未启动",
      "common.appOutdated": "需更新桌面应用至 {min}",
      "common.speak": "发音",
      "common.favAdd": "加入生词本",
      "common.favAdded": "已加入生词本（点击移除）",
      "common.favAddFail": "收藏失败",
      "common.favRemoveFail": "移除失败",
      "common.openFail": "打开失败",
      "common.formation": "接续：{text}",
      "common.notFound": "未找到「{q}」",
      "common.noWordTryGrammar": "未找到单词，查询语法…",
      "common.offlineLong": "无法连接 Tomoshi，请先启动桌面应用",
      "common.lookupFail": "查询失败",
      "common.viewInApp": "在 Tomoshi 中查看详情",
      "common.searchInApp": "在 Tomoshi 中搜索",

      "popup.title": "Tomoshi 查词",
      "popup.checking": "检测中…",
      "popup.connected": "已连接",
      "popup.disconnected": "未连接",
      "popup.outdated": "桌面应用需更新到 {min} 或更高版本",
      "popup.placeholder": "输入日语或中文…",
      "popup.search": "查询",
      "popup.openOptions": "打开设置页",

      "options.title": "Tomoshi 取词 设置",
      "options.checking": "检测连接中…",
      "options.connected": "已连接桌面应用：{base}",
      "options.disconnected":
        "未连接 — 请先启动 Tomoshi 桌面应用，如您尚未安装 Tomoshi 桌面应用，可前往 {site} 下载安装，如已启动，可点击「重新检测」。",
      "options.outdated":
        "已连接桌面应用（v{version}），但版本过旧 — 本插件的发音功能需要 {min} 或更高版本。请在 Tomoshi 桌面应用中更新，或前往 {site} 下载最新版本；更新后可点击「重新检测」。查词、生词本等功能不受影响。",
      "options.retry": "重新检测",
      "options.enable": "启用取词",
      "options.language": "界面语言",
      "options.langAuto": "跟随浏览器",
      "options.modifier": "触发键",
      "options.modifierHint": "选中文本后按住该键显示弹窗，松开关闭。",
      "options.modifierLinkNote":
        "提示：若想取链接中的文字，可先按住触发键，再用鼠标选中，这样不会触发链接跳转。",
      "options.limitTitle": "已知限制",
      "options.limitHint":
        "暂不支持 Google Docs 等 canvas 应用取词（其文字由画布渲染，无法被选中）。请先复制文本，再用 Tomoshi 桌面词典的全局快捷键查询。",
      "options.disabledSites": "禁用的网站",
      "options.disabledSitesPlaceholder": "每行一个域名，例如：\nexample.com\nmail.google.com",
      "options.disabledSitesHint": "在这些域名（含其子域名）上不触发取词。",
      "options.saveHistory": "保存查询记录到桌面应用",
      "options.saveHistoryHint":
        "开启后，浏览器中的查词记录会同步保存到 Tomoshi 桌面应用的历史记录中。",
      "options.speedTitle": "语速设置",
      "options.speedHint":
        "插件朗读语速与桌面应用保持一致，沿用其中的「单词语速」设置。如需调节，请在 Tomoshi 桌面应用的「设置 → 语音合成 → 语速设置」中修改。",
      "options.autoSave": "设置自动保存",
      "options.saved": "已保存",
    },
    "zh-TW": {
      "common.searching": "查詢中…",
      "common.offline": "未連線",
      "common.engineOff": "發音引擎未啟動",
      "common.appOutdated": "需更新桌面應用程式至 {min}",
      "common.speak": "發音",
      "common.favAdd": "加入生詞本",
      "common.favAdded": "已加入生詞本（點擊移除）",
      "common.favAddFail": "收藏失敗",
      "common.favRemoveFail": "移除失敗",
      "common.openFail": "開啟失敗",
      "common.formation": "接續：{text}",
      "common.notFound": "找不到「{q}」",
      "common.noWordTryGrammar": "找不到單字，查詢文法…",
      "common.offlineLong": "無法連線 Tomoshi，請先啟動桌面應用程式",
      "common.lookupFail": "查詢失敗",
      "common.viewInApp": "在 Tomoshi 中檢視詳情",
      "common.searchInApp": "在 Tomoshi 中搜尋",

      "popup.title": "Tomoshi 查詞",
      "popup.checking": "偵測中…",
      "popup.connected": "已連線",
      "popup.disconnected": "未連線",
      "popup.outdated": "桌面應用程式需更新至 {min} 或更新版本",
      "popup.placeholder": "輸入日語或中文…",
      "popup.search": "查詢",
      "popup.openOptions": "開啟設定頁",

      "options.title": "Tomoshi 取詞 設定",
      "options.checking": "偵測連線中…",
      "options.connected": "已連線桌面應用程式：{base}",
      "options.disconnected":
        "未連線 — 請先啟動 Tomoshi 桌面應用程式，如您尚未安裝 Tomoshi 桌面應用程式，可前往 {site} 下載安裝，如已啟動，可點擊「重新偵測」。",
      "options.outdated":
        "已連線桌面應用程式（v{version}），但版本過舊 — 本擴充功能的發音功能需要 {min} 或更新版本。請在 Tomoshi 桌面應用程式中更新，或前往 {site} 下載最新版本；更新後可點擊「重新偵測」。查詞、生詞本等功能不受影響。",
      "options.retry": "重新偵測",
      "options.enable": "啟用取詞",
      "options.language": "介面語言",
      "options.langAuto": "跟隨瀏覽器",
      "options.modifier": "觸發鍵",
      "options.modifierHint": "選取文字後按住該鍵顯示彈出視窗，放開後關閉。",
      "options.modifierLinkNote":
        "提示：若想取連結中的文字，可先按住觸發鍵，再用滑鼠選取，這樣不會觸發連結跳轉。",
      "options.limitTitle": "已知限制",
      "options.limitHint":
        "暫不支援 Google Docs 等 canvas 應用程式取詞（其文字由畫布繪製，無法被選取）。請先複製文字，再用 Tomoshi 桌面辭典的全域快捷鍵查詢。",
      "options.disabledSites": "停用的網站",
      "options.disabledSitesPlaceholder": "每行一個網域，例如：\nexample.com\nmail.google.com",
      "options.disabledSitesHint": "在這些網域（含其子網域）上不觸發取詞。",
      "options.saveHistory": "將查詢記錄儲存到桌面應用程式",
      "options.saveHistoryHint":
        "開啟後，瀏覽器中的查詞記錄會同步儲存到 Tomoshi 桌面應用程式的歷史記錄中。",
      "options.speedTitle": "語速設定",
      "options.speedHint":
        "擴充功能朗讀語速與桌面應用程式保持一致，沿用其中的「單字語速」設定。如需調整，請在 Tomoshi 桌面應用程式的「設定 → 語音合成 → 語速設定」中修改。",
      "options.autoSave": "設定自動儲存",
      "options.saved": "已儲存",
    },
  };

  function browserLocale() {
    const lang = (
      (chrome.i18n && chrome.i18n.getUILanguage && chrome.i18n.getUILanguage()) ||
      navigator.language ||
      ""
    )
      .toLowerCase()
      .replace(/_/g, "-");
    return /^zh-?(tw|hk|mo|hant)/.test(lang) ? "zh-TW" : "zh-CN";
  }

  function resolve(setting) {
    return setting === "zh-CN" || setting === "zh-TW" ? setting : browserLocale();
  }

  // Start from the browser-language guess so t() works even before init()'s
  // async storage read lands (the content script's popup opens much later).
  let locale = browserLocale();
  const changeCallbacks = [];

  function t(key, params) {
    let str = MESSAGES[locale][key] || MESSAGES["zh-CN"][key] || key;
    if (params) {
      for (const k in params) str = str.split(`{${k}}`).join(String(params[k]));
    }
    return str;
  }

  // Apply data-i18n / data-i18n-placeholder attributes across the page (popup
  // and options pages; the content script builds its DOM with t() directly).
  // Also sets <html lang>, which drives Han glyph variant selection (简/台).
  function localizeDom() {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(el.dataset.i18n);
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      el.setAttribute("placeholder", t(el.dataset.i18nPlaceholder));
    });
    document.documentElement.lang = locale;
  }

  // Read the stored setting, then call cb(locale). Safe in an invalidated
  // content-script context: falls back to the browser-language guess.
  function init(cb) {
    try {
      chrome.storage.sync.get({ uiLanguage: "auto" }, (s) => {
        locale = resolve(s.uiLanguage);
        if (cb) cb(locale);
      });
    } catch (_) {
      if (cb) cb(locale);
    }
  }

  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "sync" || !changes.uiLanguage) return;
      locale = resolve(changes.uiLanguage.newValue);
      changeCallbacks.forEach((cb) => cb(locale));
    });
  } catch (_) {
    // Dead context after an extension reload — keep the last known locale.
  }

  window.TomoshiJaDictI18n = {
    t,
    init,
    localizeDom,
    getLocale: () => locale,
    onChange: (cb) => changeCallbacks.push(cb),
  };
})();
