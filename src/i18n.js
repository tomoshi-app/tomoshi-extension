// Shared UI i18n for the extension (content script, popup, options).
// Exposed as window.TomoshiJaDictI18n. Must load before shared.js.
//
// The locale setting lives in chrome.storage.sync `uiLanguage`:
//   "auto" (default, follows the browser UI language) | "zh-CN" | "zh-TW" | "en".
// 术语与桌面应用 src/lib/i18n/zh-TW.ts 对齐：词典→辭典、设置→設定、
// 快捷键→快捷鍵、应用→應用程式、连接→連線、保存→儲存、插件→擴充功能。
// 英文术语与 src/lib/i18n/en.ts 对齐：生词本→wordbook、语速→speech rate、
// 界面语言→interface language、划词取词→select-to-look-up；拼写按那边的英式
// 口径（-ise/-yse）。
//
// ⚠️ `popup.placeholder` 三份都**不点名可输入的语种**（不写「日语或中文」这类）：
// 界面语言与词典语言是两套独立设置，而扩展这一侧根本读不到后者——
// /v1/health 只回 ok/name/version，反查用哪种语言取决于桌面应用装的是哪个
// lang pack。桌面应用能按 dict_locale 在 search.placeholder / .placeholderEn
// 之间切，这里不能，所以只描述「输入什么」，不描述「用什么语言」。

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
      // 多生词本（2026-10-10，shared.js makeFav 选本 chips）：本名术语与桌面应用
      // src/lib/i18n 的 fav.deck.default / fav.deck.starTitle / fav.deck.setDefault 对齐。
      "common.deckDefault": "系统默认本",
      "common.favAddedIn": "已加入「{name}」（点击移除）",
      "common.favPickTitle": "收藏到哪一本？",
      "common.favPickHint": "在桌面应用的生词本页设置首选收藏本后，可一键存入",
      "common.favDeckGone": "该生词本已被删除，请重新选择",
      "common.openFail": "打开失败",
      // 语法卡（2026-10-15 改版，shared.js renderGrammarCard）：与桌面 grammar.* 与
      // RegisterTag 的显示文案同文。
      "grammar.jlptTitle":
        "JLPT {level}（社区约估·非官方：JLPT 官方不公布语法考纲，等级为社区整理）",
      "grammar.formationTitle": "接续",
      "grammar.exampleTitle": "例句",
      "grammar.register.casual": "口语",
      "grammar.register.neutral": "中性",
      "grammar.register.written": "书面",
      "grammar.register.formal": "正式",
      // 结果分类导航（shared.js appendSectionNav）：与桌面 search.nav* 同文。
      "nav.label": "结果分类",
      "nav.common": "常用词",
      "nav.grammar": "语法",
      "nav.uncommon": "非常用词",
      // 词头标签章（2026-10-15）：与桌面应用 dict.common / dict.unofficial / dict.jlptTitle 同文。
      "common.tagCommon": "常用",
      "common.tagUnofficial": "非官方",
      "common.tagJlptTitle": "JLPT {level}（社区约估·非官方：2010 年改革后官方不再公布词汇表）",
      "common.notFound": "未找到「{q}」",
      // 活用还原解释（2026-10-10，shared.js renderResult）：键与桌面应用 src/lib/i18n 的 deconj.* 逐字相同。
      "deconj.note": "「{from}」是「{base}」的{forms}",
      "deconj.step.past": "过去形（た形）",
      "deconj.step.te-form": "て形",
      "deconj.step.polite": "礼貌形（ます形）",
      "deconj.step.desire": "たい形（想要）",
      "deconj.step.while": "ながら形（一边…一边）",
      "deconj.step.negative": "否定形（ない形）",
      "deconj.step.negative (zu)": "否定形（ず）",
      "deconj.step.negative (nu)": "否定形（ぬ）",
      "deconj.step.passive": "被动形",
      "deconj.step.causative": "使役形",
      "deconj.step.causative passive": "使役被动形",
      "deconj.step.potential": "可能形",
      "deconj.step.conditional": "条件形（ば形）",
      "deconj.step.imperative": "命令形",
      "deconj.step.volitional": "意向形",
      "deconj.step.stem": "连用形（ます形去ます）",
      "deconj.step.potential/passive": "可能形／被动形",
      "deconj.step.potential (colloquial)": "可能形（口语ら抜き）",
      "deconj.step.past negative": "过去否定形（なかった）",
      "deconj.step.polite past": "过去形・礼貌（ました）",
      "deconj.step.polite past negative": "过去否定形・礼貌（ませんでした）",
      "deconj.step.polite negative": "否定形・礼貌（ません）",
      "deconj.step.polite volitional": "意向形・礼貌（ましょう）",
      "deconj.step.progressive": "进行・状态（ている）",
      "deconj.step.polite progressive": "进行・状态・礼貌（ています）",
      "deconj.step.past progressive": "进行・状态・过去（ていた）",
      "deconj.step.progressive (colloquial)": "进行・状态（てる，口语）",
      "deconj.step.negative desire": "たい形・否定（たくない）",
      "deconj.step.past desire": "たい形・过去（たかった）",
      "deconj.step.negative continuative": "否定形（ず）＋に",
      "deconj.step.adverbial": "副词形（く）",
      "deconj.step.adverbial (ni)": "副词形（に）",
      "deconj.step.nominalized": "名词化（さ）",
      "deconj.step.conditional (tara)": "条件形（たら形）",
      "deconj.step.conditional (nara)": "条件形（なら）",
      "deconj.step.polite (desu)": "礼貌形（です）",
      "deconj.step.polite negative (arimasen)": "否定形・礼貌（ありません）",
      "common.offlineLong": "无法连接 Tomoshi，请先启动桌面应用",
      "common.unsupportedOs": "暂不支持 {os}",
      "common.unsupportedOsLong": "本扩展需配合 Tomoshi 桌面应用使用，暂不支持 {os}",
      "common.lookupFail": "查询失败",
      "common.viewInApp": "在 Tomoshi 中查看详情",
      "common.searchInApp": "在 Tomoshi 中搜索",

      "popup.title": "Tomoshi 查词",
      "popup.checking": "检测中…",
      "popup.connected": "已连接",
      "popup.disconnected": "未连接",
      "popup.outdated": "桌面应用需更新到 {min} 或更高版本",
      "popup.extOutdated": "本扩展有新版本（{min}），请在设置页查看更新方式",
      "popup.placeholder": "输入查询内容…",
      "popup.search": "查询",
      "popup.openOptions": "打开设置页",

      "options.title": "Tomoshi 取词 设置",
      "options.checking": "检测连接中…",
      "options.connected": "已连接桌面应用：{base}",
      "options.disconnected":
        "未连接 — 请先启动 Tomoshi 桌面应用，如您尚未安装 Tomoshi 桌面应用，可前往 {site} 下载安装，如已启动，可点击「重新检测」。",
      "options.outdated":
        "已连接桌面应用（v{version}），但版本过旧 — 本插件的发音功能需要 {min} 或更高版本。请在 Tomoshi 桌面应用中更新，或前往 {site} 下载最新版本；更新后可点击「重新检测」。查词、生词本等功能不受影响。",
      "options.extOutdatedOffline":
        "已连接桌面应用，但本扩展（v{version}）有新版本（{min}）。手动安装的扩展不会自动更新，请前往 {site} 重新下载并按页面说明覆盖安装；安装后可点击「重新检测」。当前版本仍可正常使用。",
      "options.extOutdatedStore":
        "已连接桌面应用，但本扩展（v{version}）有新版本（{min}）。浏览器通常会在数小时内自动更新；如长时间未更新，可在浏览器的扩展管理页手动检查更新。当前版本仍可正常使用。",
      "options.unsupportedOs":
        "本扩展需配合 Tomoshi 桌面应用（Windows/macOS）使用，暂不支持 {os}，因此在此设备上无法工作。后续平台支持动态请关注 {site}。",
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
      "common.deckDefault": "系統預設本",
      "common.favAddedIn": "已加入「{name}」（點擊移除）",
      "common.favPickTitle": "收藏到哪一本？",
      "common.favPickHint": "在桌面應用程式的生詞本頁設定首選收藏本後，可一鍵儲存",
      "common.favDeckGone": "該生詞本已被刪除，請重新選擇",
      "common.openFail": "開啟失敗",
      "grammar.jlptTitle":
        "JLPT {level}（社群約估·非官方：JLPT 官方不公布文法考綱，等級為社群整理）",
      "grammar.formationTitle": "接續",
      "grammar.exampleTitle": "例句",
      "grammar.register.casual": "口語",
      "grammar.register.neutral": "中性",
      "grammar.register.written": "書面",
      "grammar.register.formal": "正式",
      "nav.label": "結果分類",
      "nav.common": "常用詞",
      "nav.grammar": "文法",
      "nav.uncommon": "非常用詞",
      "common.tagCommon": "常用",
      "common.tagUnofficial": "非官方",
      "common.tagJlptTitle": "JLPT {level}（社群約估·非官方：2010 年改革後官方不再公布詞彙表）",
      "common.notFound": "找不到「{q}」",
      "deconj.note": "「{from}」是「{base}」的{forms}",
      "deconj.step.past": "過去形（た形）",
      "deconj.step.te-form": "て形",
      "deconj.step.polite": "禮貌形（ます形）",
      "deconj.step.desire": "たい形（想要）",
      "deconj.step.while": "ながら形（一邊…一邊）",
      "deconj.step.negative": "否定形（ない形）",
      "deconj.step.negative (zu)": "否定形（ず）",
      "deconj.step.negative (nu)": "否定形（ぬ）",
      "deconj.step.passive": "被動形",
      "deconj.step.causative": "使役形",
      "deconj.step.causative passive": "使役被動形",
      "deconj.step.potential": "可能形",
      "deconj.step.conditional": "條件形（ば形）",
      "deconj.step.imperative": "命令形",
      "deconj.step.volitional": "意向形",
      "deconj.step.stem": "連用形（ます形去ます）",
      "deconj.step.potential/passive": "可能形／被動形",
      "deconj.step.potential (colloquial)": "可能形（口語ら抜き）",
      "deconj.step.past negative": "過去否定形（なかった）",
      "deconj.step.polite past": "過去形・禮貌（ました）",
      "deconj.step.polite past negative": "過去否定形・禮貌（ませんでした）",
      "deconj.step.polite negative": "否定形・禮貌（ません）",
      "deconj.step.polite volitional": "意向形・禮貌（ましょう）",
      "deconj.step.progressive": "進行・狀態（ている）",
      "deconj.step.polite progressive": "進行・狀態・禮貌（ています）",
      "deconj.step.past progressive": "進行・狀態・過去（ていた）",
      "deconj.step.progressive (colloquial)": "進行・狀態（てる，口語）",
      "deconj.step.negative desire": "たい形・否定（たくない）",
      "deconj.step.past desire": "たい形・過去（たかった）",
      "deconj.step.negative continuative": "否定形（ず）＋に",
      "deconj.step.adverbial": "副詞形（く）",
      "deconj.step.adverbial (ni)": "副詞形（に）",
      "deconj.step.nominalized": "名詞化（さ）",
      "deconj.step.conditional (tara)": "條件形（たら形）",
      "deconj.step.conditional (nara)": "條件形（なら）",
      "deconj.step.polite (desu)": "禮貌形（です）",
      "deconj.step.polite negative (arimasen)": "否定形・禮貌（ありません）",
      "common.offlineLong": "無法連線 Tomoshi，請先啟動桌面應用程式",
      "common.unsupportedOs": "暫不支援 {os}",
      "common.unsupportedOsLong": "本擴充功能需搭配 Tomoshi 桌面應用程式使用，暫不支援 {os}",
      "common.lookupFail": "查詢失敗",
      "common.viewInApp": "在 Tomoshi 中檢視詳情",
      "common.searchInApp": "在 Tomoshi 中搜尋",

      "popup.title": "Tomoshi 查詞",
      "popup.checking": "偵測中…",
      "popup.connected": "已連線",
      "popup.disconnected": "未連線",
      "popup.outdated": "桌面應用程式需更新至 {min} 或更新版本",
      "popup.extOutdated": "本擴充功能有新版本（{min}），請到設定頁查看更新方式",
      "popup.placeholder": "輸入查詢內容…",
      "popup.search": "查詢",
      "popup.openOptions": "開啟設定頁",

      "options.title": "Tomoshi 取詞 設定",
      "options.checking": "偵測連線中…",
      "options.connected": "已連線桌面應用程式：{base}",
      "options.disconnected":
        "未連線 — 請先啟動 Tomoshi 桌面應用程式，如您尚未安裝 Tomoshi 桌面應用程式，可前往 {site} 下載安裝，如已啟動，可點擊「重新偵測」。",
      "options.outdated":
        "已連線桌面應用程式（v{version}），但版本過舊 — 本擴充功能的發音功能需要 {min} 或更新版本。請在 Tomoshi 桌面應用程式中更新，或前往 {site} 下載最新版本；更新後可點擊「重新偵測」。查詞、生詞本等功能不受影響。",
      "options.extOutdatedOffline":
        "已連線桌面應用程式，但本擴充功能（v{version}）有新版本（{min}）。手動安裝的擴充功能不會自動更新，請前往 {site} 重新下載並依頁面說明覆蓋安裝；安裝後可點擊「重新偵測」。目前版本仍可正常使用。",
      "options.extOutdatedStore":
        "已連線桌面應用程式，但本擴充功能（v{version}）有新版本（{min}）。瀏覽器通常會在數小時內自動更新；如長時間未更新，可在瀏覽器的擴充功能管理頁手動檢查更新。目前版本仍可正常使用。",
      "options.unsupportedOs":
        "本擴充功能需搭配 Tomoshi 桌面應用程式（Windows/macOS）使用，暫不支援 {os}，因此在此裝置上無法運作。後續平台支援動態請關注 {site}。",
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
    en: {
      "common.searching": "Looking up…",
      "common.offline": "Not connected",
      "common.engineOff": "Audio engine not running",
      "common.appOutdated": "Update the desktop app to {min}",
      "common.speak": "Play pronunciation",
      "common.favAdd": "Add to wordbook",
      "common.favAdded": "In your wordbook (click to remove)",
      "common.favAddFail": "Could not add",
      "common.favRemoveFail": "Could not remove",
      "common.deckDefault": "Default deck",
      "common.favAddedIn": "In “{name}” (click to remove)",
      "common.favPickTitle": "Save to which deck?",
      "common.favPickHint": "Set a preferred deck on the app's wordbook page to save in one click",
      "common.favDeckGone": "That deck was deleted. Pick another",
      "common.openFail": "Could not open",
      "grammar.jlptTitle":
        "JLPT {level} (community estimate, unofficial: the JLPT publishes no official grammar syllabus, so levels are community-compiled)",
      "grammar.formationTitle": "Formation",
      "grammar.exampleTitle": "Example",
      "grammar.register.casual": "casual",
      "grammar.register.neutral": "neutral",
      "grammar.register.written": "written",
      "grammar.register.formal": "formal",
      "nav.label": "Result groups",
      "nav.common": "Common",
      "nav.grammar": "Grammar",
      "nav.uncommon": "Uncommon",
      "common.tagCommon": "common",
      "common.tagUnofficial": "unofficial",
      "common.tagJlptTitle":
        "JLPT {level} (community estimate, unofficial: no official word list has been published since the 2010 reform)",
      "common.notFound": "No match for “{q}”",
      "deconj.note": "“{from}” is the {forms} of “{base}”",
      "deconj.step.past": "past (ta)",
      "deconj.step.te-form": "te-form",
      "deconj.step.polite": "polite (masu)",
      "deconj.step.desire": "desire (tai)",
      "deconj.step.while": "while (nagara)",
      "deconj.step.negative": "negative (nai)",
      "deconj.step.negative (zu)": "negative (zu)",
      "deconj.step.negative (nu)": "negative (nu)",
      "deconj.step.passive": "passive",
      "deconj.step.causative": "causative",
      "deconj.step.causative passive": "causative passive",
      "deconj.step.potential": "potential",
      "deconj.step.conditional": "conditional (ba)",
      "deconj.step.imperative": "imperative",
      "deconj.step.volitional": "volitional",
      "deconj.step.stem": "masu stem",
      "deconj.step.potential/passive": "potential or passive",
      "deconj.step.potential (colloquial)": "potential (colloquial)",
      "deconj.step.past negative": "past negative (nakatta)",
      "deconj.step.polite past": "polite past (mashita)",
      "deconj.step.polite past negative": "polite past negative (masen deshita)",
      "deconj.step.polite negative": "polite negative (masen)",
      "deconj.step.polite volitional": "polite volitional (mashou)",
      "deconj.step.progressive": "progressive (te iru)",
      "deconj.step.polite progressive": "polite progressive (te imasu)",
      "deconj.step.past progressive": "past progressive (te ita)",
      "deconj.step.progressive (colloquial)": "progressive (te ru, colloquial)",
      "deconj.step.negative desire": "negative desire (takunai)",
      "deconj.step.past desire": "past desire (takatta)",
      "deconj.step.negative continuative": "negative (zu) + ni",
      "deconj.step.adverbial": "adverbial (ku)",
      "deconj.step.adverbial (ni)": "adverbial (ni)",
      "deconj.step.nominalized": "nominalized (sa)",
      "deconj.step.conditional (tara)": "conditional (tara)",
      "deconj.step.conditional (nara)": "conditional (nara)",
      "deconj.step.polite (desu)": "polite (desu)",
      "deconj.step.polite negative (arimasen)": "polite negative (arimasen)",
      "common.offlineLong": "Cannot reach Tomoshi — start the desktop app first",
      "common.unsupportedOs": "{os} not supported",
      "common.unsupportedOsLong":
        "This extension works with the Tomoshi desktop app, which is not available for {os} yet",
      "common.lookupFail": "Lookup failed",
      "common.viewInApp": "View in Tomoshi",
      "common.searchInApp": "Search in Tomoshi",

      "popup.title": "Tomoshi lookup",
      "popup.checking": "Checking…",
      "popup.connected": "Connected",
      "popup.disconnected": "Not connected",
      "popup.outdated": "The desktop app needs updating to {min} or newer",
      "popup.extOutdated":
        "A newer version of this extension ({min}) is available — see the settings page",
      "popup.placeholder": "Type a word or sentence…",
      "popup.search": "Search",
      "popup.openOptions": "Open settings",

      "options.title": "Tomoshi select-to-look-up settings",
      "options.checking": "Checking the connection…",
      "options.connected": "Connected to the desktop app: {base}",
      "options.disconnected":
        "Not connected — start the Tomoshi desktop app first. If you have not installed it yet, download it from {site}. If it is already running, click “Check again”.",
      "options.outdated":
        "Connected to the desktop app (v{version}), but it is too old — this extension’s pronunciation needs {min} or newer. Update from inside the Tomoshi desktop app, or download the latest version from {site}; then click “Check again”. Lookup, the wordbook and everything else are unaffected.",
      "options.extOutdatedOffline":
        "Connected to the desktop app, but a newer version of this extension ({min}; you have v{version}) is available. A manually installed extension does not update itself: download it again from {site} and install it over this one as the page describes, then click “Check again”. This version keeps working in the meantime.",
      "options.extOutdatedStore":
        "Connected to the desktop app, but a newer version of this extension ({min}; you have v{version}) is available. Your browser normally installs it within a few hours; if it has not, you can check for updates on the browser’s extensions page. This version keeps working in the meantime.",
      "options.unsupportedOs":
        "This extension works with the Tomoshi desktop app (Windows/macOS), which is not available for {os} yet, so it cannot work on this device. Watch {site} for news about further platforms.",
      "options.retry": "Check again",
      "options.enable": "Enable select-to-look-up",
      "options.language": "Interface language",
      "options.langAuto": "Follow the browser",
      "options.modifier": "Trigger key",
      "options.modifierHint":
        "Select text, then hold this key to show the popup; release to close.",
      "options.modifierLinkNote":
        "Tip: to look up text inside a link, hold the trigger key first and then select with the mouse — that way the link is not followed.",
      "options.limitTitle": "Known limitations",
      "options.limitHint":
        "Canvas-based apps such as Google Docs are not supported (their text is painted onto a canvas and cannot be selected). Copy the text instead, then look it up with the Tomoshi desktop app’s global shortcut.",
      "options.disabledSites": "Disabled sites",
      "options.disabledSitesPlaceholder":
        "One domain per line, for example:\nexample.com\nmail.google.com",
      "options.disabledSitesHint":
        "Select-to-look-up is not triggered on these domains (or their subdomains).",
      "options.saveHistory": "Save lookups to the desktop app",
      "options.saveHistoryHint":
        "When on, the words you look up in the browser are also saved to the Tomoshi desktop app’s history.",
      "options.speedTitle": "Speech rate",
      "options.speedHint":
        "The extension reads aloud at the same speed as the desktop app, following its “word rate” setting. To change it, go to Settings → Speech synthesis → Speech rate in the Tomoshi desktop app.",
      "options.autoSave": "Settings save automatically",
      "options.saved": "Saved",
    },
  };

  // 英文浏览器出英文，Hant 出繁体，其余 zh* 出简体，**其他语言一律回落英文**
  // ——与 manifest 的 `default_locale`（同为 `en`）一致，故扩展清单里的名称与
  // 扩展自身界面永远同语，不会一中一英。两处必须一起改。
  //
  // ⚠️ **口径与桌面应用的 `guessUiLocaleFromSystem`（src/lib/i18n/index.svelte.ts）
  // 刻意分叉**（2026-09-02）：那边未知语言回落 zh-CN，因为它猜的是「存量安装里
  // 最可能持久化的 ui_language」——一个迁移口径，扩展这侧没有那笔历史包袱。
  // 别看到两处不一致就"顺手对齐"。
  //
  // 这次改动会翻转一批存量用户：把设置留在「跟随浏览器」、且浏览器语言既非
  // zh* 也非 en 的（日语/法语/德语…系统），界面由简体变英文。其中在日中国人
  // 这一批是明确的代价，设置页的语言下拉可以调回来。
  function browserLocale() {
    const lang = (
      (chrome.i18n && chrome.i18n.getUILanguage && chrome.i18n.getUILanguage()) ||
      navigator.language ||
      ""
    )
      .toLowerCase()
      .replace(/_/g, "-");
    if (/^zh-?(tw|hk|mo|hant)/.test(lang)) return "zh-TW";
    if (/^zh(-|$)/.test(lang)) return "zh-CN"; // 含裸 zh 与 zh-SG，同 preferredDictLocale
    return "en";
  }

  // Any catalog key is a valid setting; anything else (including "auto", the
  // default) means "follow the browser". hasOwnProperty rather than a plain
  // lookup so a stored value like "constructor" can't resolve to a non-catalog.
  function resolve(setting) {
    return Object.prototype.hasOwnProperty.call(MESSAGES, setting) ? setting : browserLocale();
  }

  // Start from the browser-language guess so t() works even before init()'s
  // async storage read lands (the content script's popup opens much later).
  let locale = browserLocale();
  const changeCallbacks = [];

  function t(key, params) {
    let str = MESSAGES[locale][key] || MESSAGES["en"][key] || key;
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
