# Tomoshi 日语词典 - 划词查词（Chrome 扩展）

[Tomoshi](https://tomoshi.app) 日语词典的浏览器取词前端：**先选中**日语文本，**按住 Alt** 在页面内悬浮窗显示查询结果，**松开 Alt 关闭**。实际查询由本地 Tomoshi 桌面应用内置的 HTTP server 提供（`http://127.0.0.1:21420`），扩展自身**不与任何远程服务器通信**——它读取的页面内容只发往你本机的桌面应用。

本扩展以 **AGPL-3.0** 开源（见 [LICENSE](LICENSE)）。「Tomoshi」名称与图标是品牌标识，**不在**许可范围内：分发修改版时请勿以可能引起混淆的方式使用。桌面应用本体暂未开源，其行为口径见 [使用条款](https://tomoshi.app/terms/) 与 [隐私政策](https://tomoshi.app/privacy/)。

> 本仓库是发布镜像，真源在 Tomoshi 主仓的 `extension/` 目录内维护；欢迎 issue 与 PR（见 [CONTRIBUTING](CONTRIBUTING.md)），合入后会同步回真源再镜像发布。

## 运行前提

先启动 Tomoshi 桌面应用（[tomoshi.app](https://tomoshi.app) 下载，或从主仓开发构建）。扩展会自动探测 `21420 → 21421 → 21422` 三个端口。

### 最低桌面应用版本

`src/background.js` 的 `MIN_APP_VERSION` 记录本扩展所需的最低桌面应用版本（当前 **0.97.0**，即 `/v1/tts?play=true` 由桌面端播放的首个版本；线上的 0.96.0 尚不支持）。探活 `/v1/health` 返回的 `version` 会与之比较，过旧时在设置页与 popup 的状态行提示更新，并在扩展自动更新落地时（`onInstalled` 的 `reason === "update"`）主动打开一次设置页。

**改动本地 API 契约时**：只要扩展开始依赖旧版桌面应用没有的能力，就要同步抬高 `MIN_APP_VERSION`。商店会在数小时内静默推送新扩展，而桌面应用要等用户启动才更新——「新扩展 + 旧客户端」是发版后的常态而非边角情况。能力本身若可探测（如发音靠响应里 `audio` 是否非空判断旧客户端没播），优先按探测结果给精确提示，版本号只作通用兜底。

## 加载（开发）

1. 打开 `chrome://extensions`
2. 右上角开启「开发者模式」
3. 「加载已解压的扩展程序」→ 选择本 `extension/` 目录
4. 打开任意含日语的网页，**选中一个词后按住 Alt 查看，松开关闭**

未连接到桌面应用时，悬浮窗会提示「请先启动桌面应用」。

## 结构

| 文件 | 作用 |
|---|---|
| `manifest.json` | MV3 清单（Chrome/Edge）：权限、host_permissions、content script |
| `manifest.safari.json` | 同上，Safari 专用——`background` 用 `scripts` 而非 `service_worker`（Safari 这里不支持 service worker），也不带 `offscreen` 权限。`scripts/build-safari-extension.sh` 打包时会把它换成 Resources 里的 `manifest.json`；两份清单其余字段应保持同步 |
| `src/background.js` | service worker（Safari 上是非持久背景页，见上）：唯一与本地 server 通信的地方（探活 + 查词/语法/音高/发音代理 + offscreen 生命周期） |
| `src/content.js` | content script：选区 + 触发键 → 请求查询 → Shadow DOM 悬浮窗渲染（释义/音高图/语法兜底/发音按钮） |
| `src/offscreen.html` `src/offscreen.js` | 隐藏文档，专门播放发音音频（绕开页面 CSP / 混合内容）；仅 Chromium 用得到，Safari 走桌面应用播放 |
| `src/options.html` `src/options.js` | 设置页：界面语言、启用开关、触发键、禁用站点、连接状态 |
| `src/i18n.js` | 界面文案 i18n（简体/繁体目录 + `t()`），content script / popup / options 共用；`_locales/` 只管 manifest 名称与描述（随浏览器语言） |
| `src/pos.js` | JMdict 词性 → 中文标签（简繁双份）。**真源在桌面应用侧**（`posTranslations.ts`），两侧人工保持同步 |

## 触发方式

**先选中文本，按住触发键显示弹窗，松开关闭**（`keydown` 显示 / `keyup` 关闭）。触发键默认 **Alt**，可在设置页改为 Ctrl / Shift。

## 发音

弹窗里点喇叭图标发音 —— **保持按住触发键**的同时移动鼠标点击。音频由桌面应用合成；播放路径按浏览器分开——Chrome/Edge 用 `chrome.offscreen` 在浏览器本地播放（标签页静音、系统音量对它生效），Safari 没有该 API，改由桌面应用播放（声音来自应用而非网页标签页）。合成失败时按钮旁提示「发音引擎未启动」；Safari 若连着的桌面应用版本过旧（早于 `MIN_APP_VERSION`，见上）会提示「需更新桌面应用至 x.y.z」（多停留几秒，因为这是用户唯一必然看到该问题的时机——划词弹窗需按住触发键才可交互，不适合放常驻横幅或跳转入口，引导统一放在设置页与工具栏 popup；Chrome/Edge 不依赖这个能力，不会看到这条提示）。

## 设置

首次安装后自动打开设置页（`onInstalled` 的 `reason === "install"`）。扩展更新（`reason === "update"`）只在**检测到桌面应用版本过旧**时打开一次，其余情况不打扰。之后可从 `chrome://extensions` → 本扩展 → 「扩展程序选项」，或右键扩展图标 →「选项」进入。可配置：

- **界面语言**：跟随浏览器（默认）/ 简体中文 / 繁體中文，存 `uiLanguage`，切换即时生效
- **启用取词**（总开关）
- **触发键**：Alt / Ctrl / Shift
- **禁用的网站**：在指定域名（含子域名）上不触发
- 顶部显示与桌面应用的**连接状态**

设置存于 `chrome.storage.sync`，content script 实时生效。

## 尚未实现（后续里程碑）

- 图标 + 上架 Chrome Web Store 打包
