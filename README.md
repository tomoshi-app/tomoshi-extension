# Tomoshi 日语词典 - 划词查词（Chrome 扩展）

[Tomoshi](https://tomoshi.app) 日语词典的浏览器取词前端：**先选中**日语文本，**按住 Alt** 在页面内悬浮窗显示查询结果，**松开 Alt 关闭**。实际查询由本地 Tomoshi 桌面应用内置的 HTTP server 提供（`http://127.0.0.1:21420`），扩展自身**不与任何远程服务器通信**——它读取的页面内容只发往你本机的桌面应用。

本扩展以 **AGPL-3.0** 开源（见 [LICENSE](LICENSE)）。「Tomoshi」名称与图标是品牌标识，**不在**许可范围内：分发修改版时请勿以可能引起混淆的方式使用。桌面应用本体暂未开源，其行为口径见 [使用条款](https://tomoshi.app/terms/) 与 [隐私政策](https://tomoshi.app/privacy/)。

> 本仓库是发布镜像，真源在 Tomoshi 主仓的 `extension/` 目录内维护；欢迎 issue 与 PR（见 [CONTRIBUTING](CONTRIBUTING.md)），合入后会同步回真源再镜像发布。

## 运行前提

先启动 Tomoshi 桌面应用（[tomoshi.app](https://tomoshi.app) 下载，或从主仓开发构建）。扩展会自动探测 `21420 → 21421 → 21422` 三个端口。

## 加载（开发）

1. 打开 `chrome://extensions`
2. 右上角开启「开发者模式」
3. 「加载已解压的扩展程序」→ 选择本 `extension/` 目录
4. 打开任意含日语的网页，**选中一个词后按住 Alt 查看，松开关闭**

未连接到桌面应用时，悬浮窗会提示「请先启动桌面应用」。

## 结构

| 文件 | 作用 |
|---|---|
| `manifest.json` | MV3 清单：权限、host_permissions、content script |
| `src/background.js` | service worker：唯一与本地 server 通信的地方（探活 + 查词/语法/音高/发音代理 + offscreen 生命周期） |
| `src/content.js` | content script：选区 + 触发键 → 请求查询 → Shadow DOM 悬浮窗渲染（释义/音高图/语法兜底/发音按钮） |
| `src/offscreen.html` `src/offscreen.js` | 隐藏文档，专门播放发音音频（绕开页面 CSP / 混合内容） |
| `src/options.html` `src/options.js` | 设置页：界面语言、启用开关、触发键、禁用站点、连接状态 |
| `src/i18n.js` | 界面文案 i18n（简体/繁体目录 + `t()`），content script / popup / options 共用；`_locales/` 只管 manifest 名称与描述（随浏览器语言） |
| `src/pos.js` | JMdict 词性 → 中文标签（简繁双份）。**真源在桌面应用侧**（`posTranslations.ts`），两侧人工保持同步 |

## 触发方式

**先选中文本，按住触发键显示弹窗，松开关闭**（`keydown` 显示 / `keyup` 关闭）。触发键默认 **Alt**，可在设置页改为 Ctrl / Shift。

## 发音

弹窗里点喇叭图标发音 —— **保持按住触发键**的同时移动鼠标点击。需本机运行 VOICEVOX 引擎；未启动时按钮旁提示「发音引擎未启动」。

## 设置

首次安装后自动打开设置页（`onInstalled`，仅 `reason === "install"`，更新不触发）。之后可从 `chrome://extensions` → 本扩展 → 「扩展程序选项」，或右键扩展图标 →「选项」进入。可配置：

- **界面语言**：跟随浏览器（默认）/ 简体中文 / 繁體中文，存 `uiLanguage`，切换即时生效
- **启用取词**（总开关）
- **触发键**：Alt / Ctrl / Shift
- **禁用的网站**：在指定域名（含子域名）上不触发
- 顶部显示与桌面应用的**连接状态**

设置存于 `chrome.storage.sync`，content script 实时生效。

## 尚未实现（后续里程碑）

- CORS 锁定到固定扩展 ID（需先在 Chrome 里确认扩展 ID）
- 图标 + 上架 Chrome Web Store 打包
