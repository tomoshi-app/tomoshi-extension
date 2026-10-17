// Shared utilities for tomoshi-ja-dict extension (content.js & popup.js).
// Exposed as window.TomoshiJaDictShared.

(() => {
  const T = (key, params) => window.TomoshiJaDictI18n.t(key, params);
  const P = window.TomoshiJaDictPos;
  const SVGNS = "http://www.w3.org/2000/svg";
  const COMBINING = new Set(Array.from("ぁぃぅぇぉゃゅょゎァィゥェォャュョヮ"));
  const MAX_LEN = 40;

  const SPEAKER_SVG =
    '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">' +
    '<path d="M4 9v6h4l5 5V4L8 9H4z" fill="currentColor"/>' +
    '<path d="M16.5 8.5a4 4 0 0 1 0 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
    "</svg>";

  function escapeHtml(s) {
    return String(s).replace(
      /[&<>"]/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]
    );
  }

  // ── 词头口径 ───────────────────────────────────────────────────────────────
  // **与桌面应用的迷你词卡同口径**（src/lib/components/WordCard.svelte，规则真源
  // src/lib/utils/headword.ts——扩展是纯 JS、import 不到，这里是它的逐条移植）：
  //  - uk 词（JMdict「通常只写假名」且非古语义项）由假名领衔：ようやく 不显示罕用的 漸く；
  //  - search-only 写法（其れでは）不进词头，同读音的片假名重写（アソコ）不当读音；
  //  - 汉字领衔时常用写法（ke_pri）排在前（計り 而非异体 量り）；
  //  - 选中文本正好是词条的某个写法时回显它（headwordLead 的 searchWord）。
  // 改 headword.ts 的这几条规则时这里一起改。
  const SEARCH_ONLY_KANA = "search-only kana form";
  const SEARCH_ONLY_KANJI = "search-only kanji form";
  const USUALLY_KANA = "word usually written using kana alone";
  const ARCHAIC_MISC = new Set(["archaic", "poetical term", "obsolete term"]);

  const kanjiOf = (entry) => entry.kanji || [];
  const kanaOf = (entry) => entry.kana || [];
  const hasInfo = (f, tag) => (f.info || []).includes(tag);
  const isCommon = (f) => (f.priority || []).length > 0;

  function toHiragana(s) {
    let out = "";
    for (const ch of s) {
      const c = ch.codePointAt(0);
      out += c >= 0x30a1 && c <= 0x30f6 ? String.fromCodePoint(c - 0x60) : ch;
    }
    return out;
  }

  function isKatakana(s) {
    let sawKana = false;
    for (const ch of s) {
      const c = ch.codePointAt(0);
      if (c >= 0x30a1 && c <= 0x30fa) sawKana = true;
      else if (ch !== "ー") return false;
    }
    return sawKana;
  }

  function visibleKanji(entry) {
    return kanjiOf(entry).filter((k) => !hasInfo(k, SEARCH_ONLY_KANJI));
  }

  function visibleKana(entry) {
    const kana = kanaOf(entry).filter((k) => !hasInfo(k, SEARCH_ONLY_KANA));
    const hira = new Set(kana.filter((k) => !isKatakana(k.text)).map((k) => k.text));
    return kana.filter((k) => !(isKatakana(k.text) && hira.has(toHiragana(k.text))));
  }

  // headword.ts readingForForm：与汉字写法搭配的第一个读音（JMdict re_restr——
  // 叢立ち 不能配 総立ち 专属的 そうだち），一个都配不上时退回首个。
  function readingForForm(kana, form) {
    if (form === undefined) return kana[0];
    const fits = (k) => !(k.restricted_to || []).length || k.restricted_to.includes(form);
    return kana.find(fits) || kana[0];
  }

  function kanaLedHeadword(entry) {
    if (!kanjiOf(entry).length || !kanaOf(entry).length) return false;
    return (entry.senses || []).some((s) => {
      const misc = s.misc || [];
      return misc.includes(USUALLY_KANA) && !misc.some((m) => ARCHAIC_MISC.has(m));
    });
  }

  function orderedKanji(entry) {
    const visible = visibleKanji(entry);
    const common = visible.filter(isCommon);
    const rest = visible.filter((k) => !isCommon(k));
    return common.length && rest.length ? [...common, ...rest] : visible;
  }

  function headwordLead(entry, q) {
    const kana = visibleKana(entry);
    const first = (list) => (list[0] ? list[0].text : "");
    const exact = (list) => list.find((f) => f.text === q);
    if (kanaLedHeadword(entry)) {
      return (exact(kanaOf(entry)) || kana[0] || {}).text || "";
    }
    return (
      (exact(visibleKanji(entry)) || {}).text ||
      first(orderedKanji(entry)) ||
      (exact(kanaOf(entry)) || {}).text ||
      first(kana)
    );
  }

  /** 卡片要用的几样写法，各字段与 WordCard.svelte 一一对应：
   *  - surface / reading：显示的词头与读音（读音与词头相同时为空，不重复显示）；
   *  - pitchSurface / pitchKana：查音调图的键（getPitchAccent 同参）；
   *  - ttsText：送去朗读的文本（假名领衔的词读假名，避开罕用汉字）；
   *  - favWord / favReading：存进生词本的写法（favorites.ts favoriteHeadword 同口径）。 */
  function headword(entry, q) {
    const kanaLed = kanaLedHeadword(entry);
    const kanji0 = visibleKanji(entry)[0];
    const kanaFirst = kanaOf(entry)[0] ? kanaOf(entry)[0].text : "";
    const surface = headwordLead(entry, q) || q;
    // 标题实际显示的汉字写法（headword.ts shownKanjiForm）：读音、音调图、朗读都跟它
    // 配对——查 総立ち 显示 総立ち／そうだち，不按首个写法 叢立ち 配成 むらだち。
    // 假名领衔 / 纯假名词为 undefined，readingForForm 照旧取首个读音。
    const shown =
      !kanaLed && visibleKanji(entry).some((k) => k.text === surface) ? surface : undefined;
    const pairKana = (readingForForm(kanaOf(entry), shown) || {}).text || "";
    const visReading = (readingForForm(visibleKana(entry), shown) || {}).text || "";
    const pitchSurface = shown || (kanji0 ? kanji0.text : kanaFirst || q);
    // 生词本存的是首个汉字写法与它搭配的读音（favorites.ts favoriteHeadword），与
    // 标题回显哪个写法无关。
    const favForm = kanji0 ? kanji0.text : kanaFirst || q;
    const favKana = kanji0 ? (readingForForm(kanaOf(entry), kanji0.text) || {}).text || "" : "";
    return {
      surface,
      reading: visReading && visReading !== surface ? visReading : "",
      pitchSurface,
      pitchKana: pairKana || pitchSurface,
      ttsText: kanaLed ? surface : pitchSurface,
      ttsReading: visReading || pairKana,
      favWord: kanaLed ? kanaFirst : favForm,
      favReading: !kanaLed ? favKana : "",
    };
  }

  function glossText(sense) {
    const glosses = sense.glosses || [];
    const zho = glosses.filter((g) => g.lang === "zho");
    const eng = glosses.filter((g) => g.lang === "eng");
    const use = zho.length ? zho : eng.length ? eng : glosses;
    return use.map((g) => g.text).join("; ");
  }

  function splitMorae(kana) {
    const morae = [];
    for (const ch of kana) {
      if (COMBINING.has(ch) && morae.length) morae[morae.length - 1] += ch;
      else morae.push(ch);
    }
    return morae;
  }

  function isHigh(pos, accentType) {
    if (accentType === 1) return pos === 1;
    if (pos === 1) return false;
    return accentType === 0 || pos <= accentType;
  }

  function renderPitchSvg(reading, moraCount, accentType) {
    const morae = splitMorae(reading);
    if (!morae.length || morae.length !== moraCount) return null;

    const step = 12,
      padX = 2,
      topY = 4,
      botY = 14,
      radius = 3,
      height = 18;
    const n = moraCount;
    const width = padX * 2 + n * step;
    const xAt = (i) => padX + i * step + step / 2;

    const svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("width", String(width));
    svg.setAttribute("height", String(height));
    svg.setAttribute("class", "jd-pitch");

    const pts = [];
    for (let i = 0; i < n; i++) {
      pts.push({ x: xAt(i), y: isHigh(i + 1, accentType) ? topY : botY });
    }

    const line = document.createElementNS(SVGNS, "polyline");
    line.setAttribute("points", pts.map((p) => `${p.x},${p.y}`).join(" "));
    line.setAttribute("class", "jd-pitch-line");
    svg.appendChild(line);

    if (accentType > 0 && accentType === n) {
      const dropX = padX + n * step;
      const drop = document.createElementNS(SVGNS, "line");
      drop.setAttribute("x1", String(dropX));
      drop.setAttribute("y1", String(topY));
      drop.setAttribute("x2", String(dropX));
      drop.setAttribute("y2", String(botY));
      drop.setAttribute("class", "jd-pitch-line jd-pitch-drop");
      svg.appendChild(drop);
    }

    for (const p of pts) {
      const c = document.createElementNS(SVGNS, "circle");
      c.setAttribute("cx", String(p.x));
      c.setAttribute("cy", String(p.y));
      c.setAttribute("r", String(radius));
      c.setAttribute("class", p.y === botY ? "jd-pitch-dot jd-pitch-dot-low" : "jd-pitch-dot");
      svg.appendChild(c);
    }
    return svg;
  }

  // Transient error message for `anchor`. Options:
  //   ms    — lifetime, default a glance-length 2s; pass longer for messages the
  //           user has to act on rather than just notice.
  //   block — render on its own line under the entry's header row instead of
  //           inline after `anchor`. `.jd-head` is a fixed-width flex row
  //           (词头/读音/音调图 + 喇叭/星标), so anything longer than a few
  //           characters squeezes the headword and wraps badly as a flex item.
  //           Short messages stay inline, where they read as attached to the
  //           button that failed.
  // Short label for a connection-level failure, or null when the failure is
  // operation-specific and the caller should name it. "unsupported_os" is the
  // background's relabeling of "offline" on a platform the desktop app doesn't
  // ship for — "未连接" alone would read as fixable there.
  function connErrorText(res) {
    const reason = res && res.reason;
    if (reason === "offline") return T("common.offline");
    if (reason === "unsupported_os") return T("common.unsupportedOs", { os: res.os });
    return null;
  }

  function flash(anchor, text, options) {
    const { ms = 2000, block = false } = options || {};
    const tip = document.createElement("span");
    tip.className = block ? "jd-flash jd-flash-block" : "jd-flash";
    tip.textContent = text;
    const target = (block && anchor.closest(".jd-head")) || anchor;
    target.insertAdjacentElement("afterend", tip);
    setTimeout(() => tip.remove(), ms);
  }

  function playWord(text, reading, btn, ttsFn) {
    btn.classList.add("jd-speak-busy");
    ttsFn(text, reading, (res) => {
      if (!btn.isConnected) return;
      btn.classList.remove("jd-speak-busy");
      if (!res || !res.ok) {
        const reason = res && res.reason;
        // "outdated" = the app is running but predates desktop-side playback, so
        // it synthesized fine and nothing came out. Say so, or the user hears
        // silence and blames the engine. This is the one moment the user is
        // guaranteed to be looking (they just clicked play), so it names the
        // version to update to and lingers long enough to read — the in-page
        // popup is held open with the trigger key and has no room for a banner.
        if (reason === "outdated") {
          flash(btn, T("common.appOutdated", { min: res.min }), { ms: 6000, block: true });
          return;
        }
        flash(btn, connErrorText(res) || T("common.engineOff"));
      }
    });
  }

  function makeSpeaker(text, reading, ttsFn) {
    const btn = document.createElement("button");
    btn.className = "jd-speak";
    btn.title = T("common.speak");
    btn.innerHTML = SPEAKER_SVG;
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      playWord(text, reading, btn, ttsFn);
    });
    return btn;
  }

  // ── 多生词本：星标时选本（2026-10-10，工作区 plans/wordbook-enhancement-plan.md §8.4 ④）──
  //
  // 与桌面应用 stores/favorites.ts chooseStarDeck 同口径：「收藏到」已设（target 非 null）
  // → 一步存入，App 按设置落；每次询问但没有自建本 → 一步存入默认本；每次询问且有自建本
  // → 星标下方展开一行本名 chips，点哪本存哪本，点外面 / Esc / 再点星标 = 收起、不收藏
  // （同应用内选本框「关掉 = 不收藏」）。App 侧没有 /v1/decks（老版本）→ 退回一步存入。
  // 「设为首选」刻意不在这里提供——那是 App 的 config，chips 下一行小字指去生词本页。

  // 同一时刻只开一行：点另一张卡的星标时先收起上一行。
  let openDeckPicker = null;

  function closeDeckPicker() {
    if (openDeckPicker) openDeckPicker.close();
  }

  // `info` 是 background favoriteDecks 的回包：{ decks: [{id, name}], last }。
  // `onPick(deck)` 收 "default" 或本 id。返回 { btn, close }。
  function showDeckPicker(btn, info, onPick) {
    const row = document.createElement("div");
    row.className = "jd-deck-pick";
    const title = document.createElement("span");
    title.className = "jd-deck-pick-title";
    title.textContent = T("common.favPickTitle");
    row.appendChild(title);

    const chips = [{ id: "default", name: T("common.deckDefault") }, ...info.decks];
    for (const d of chips) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "jd-deck-chip" + (d.id === info.last ? " jd-deck-chip-last" : "");
      chip.textContent = d.name;
      chip.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        close();
        onPick(d);
      });
      row.appendChild(chip);
    }

    const hint = document.createElement("span");
    hint.className = "jd-deck-pick-hint";
    hint.textContent = T("common.favPickHint");
    row.appendChild(hint);

    // 点行外任意处 / Esc 收起。监听挂在 document 上（取词浮层在 shadow root 里，
    // 事件到 document 时 target 已被重定向成 host，故用 composedPath 判「在不在行内」）。
    const onDown = (e) => {
      const path = e.composedPath ? e.composedPath() : [];
      if (!path.includes(row) && !path.includes(btn)) close();
    };
    const onKey = (e) => {
      if (e.key === "Escape") close();
    };
    let listening = false;
    const timer = setTimeout(() => {
      listening = true;
      document.addEventListener("mousedown", onDown, true);
      document.addEventListener("keydown", onKey, true);
    }, 0);

    const picker = { btn, close };
    function close() {
      clearTimeout(timer);
      if (listening) {
        document.removeEventListener("mousedown", onDown, true);
        document.removeEventListener("keydown", onKey, true);
      }
      row.remove();
      if (openDeckPicker === picker) openDeckPicker = null;
    }

    (btn.closest(".jd-head") || btn).insertAdjacentElement("afterend", row);
    return picker;
  }

  // "加入生词本" star — a toggle. Reflects the entry's saved state when the popup
  // opens (already-saved words show ★), and clicking adds or removes accordingly.
  // `fav` is { check(entryId, cb), add(payload, cb), remove(entryId, cb),
  // decks(cb)? } — `decks` is optional so the two hosts can adopt it separately.
  function makeFav(entry, word, reading, fav) {
    const btn = document.createElement("button");
    btn.className = "jd-fav";
    let on = false;

    // `deck` = 所在的自建本 {id, name}（null = 默认本 / 没收藏）：★ 的提示带上本名。
    const setState = (favorited, deck) => {
      on = favorited;
      btn.textContent = favorited ? "★" : "☆";
      btn.title = !favorited
        ? T("common.favAdd")
        : deck && deck.name
          ? T("common.favAddedIn", { name: deck.name })
          : T("common.favAdded");
      btn.classList.toggle("jd-fav-on", favorited);
    };
    setState(false, null);

    // Reflect the current saved state so a re-shown popup for an already-saved
    // word isn't stuck on the empty star.
    if (fav.check) {
      fav.check(entry.id, (res) => {
        if (btn.isConnected && res && res.ok) setState(!!res.favorited, res.deck || null);
      });
    }

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (btn.disabled) return;
      // 选本行开着时再点星标 = 收起、不收藏。
      if (openDeckPicker && openDeckPicker.btn === btn) {
        closeDeckPicker();
        return;
      }
      closeDeckPicker();
      btn.disabled = true;
      const wantOn = !on;
      // `deck` = 这次存进的自建本（给 ★ 提示用），一步存入时不知道去向、不带本名。
      const done = (deck) => (res) => {
        if (!btn.isConnected) return;
        btn.disabled = false;
        if (res && res.ok) {
          setState(wantOn, deck);
        } else if (res && res.reason === "deck_gone") {
          flash(btn, T("common.favDeckGone"), { ms: 4000, block: true });
        } else {
          flash(
            btn,
            connErrorText(res) || T(wantOn ? "common.favAddFail" : "common.favRemoveFail")
          );
        }
      };
      if (!wantOn) {
        fav.remove(entry.id, done(null));
        return;
      }
      const meaning = (entry.senses || []).map(glossText).find((t) => t) || "";
      const payload = {
        entryId: entry.id,
        word,
        reading: reading || null,
        meaning: meaning ? meaning.slice(0, 80) : null,
      };
      if (!fav.decks) {
        fav.add(payload, done(null));
        return;
      }
      fav.decks((info) => {
        if (!btn.isConnected) return;
        const ask =
          info && info.ok && info.target === null && Array.isArray(info.decks) && info.decks.length;
        if (!ask) {
          fav.add(payload, done(null));
          return;
        }
        btn.disabled = false;
        openDeckPicker = showDeckPicker(btn, info, (d) => {
          btn.disabled = true;
          fav.add({ ...payload, deck: d.id }, done(d.id === "default" ? null : d));
        });
      });
    });
    return btn;
  }

  // ── 语法卡（2026-10-15 改版）：桌面应用 GrammarCard.svelte 的精简版 ──────────────
  // 头部：句型 + 读音 + JLPT 章（同词条那枚）+ 语体章；正文：多义时编号列义项（v2 数据
  // `senses`，单义 / 旧数据回落整段 `meaning`）→ 接续逐条分行（parseFormation），
  // 带「＋」的公式拆成词性 / 日语成分两色标签（splitFormula，2026-10-16 起同桌面）→
  // 第一个例句（日文一行、译文另起一行）。用法 / 注意 / 易混淆不搬，底部按钮进应用看全。

  // 接续段切分：src/lib/grammarText.ts splitTopLevel / formationSep / parseFormation 的
  // 逐条移植（扩展 import 不到）。启发式、不吞字：切不出就整段一行。改那边时这里一起改。
  const F_OPEN = new Set(["（", "(", "「", "『", "［", "["]);
  const F_CLOSE = new Set(["）", ")", "」", "』", "］", "]"]);

  function formationSep(str, i) {
    const ch = str[i];
    if (ch === "\n" || ch === "；" || ch === "。") return 1;
    if (ch === ";" && (i + 1 >= str.length || /\s/.test(str[i + 1]))) return 1;
    if (ch === "." && /\s/.test(str[i + 1] || "") && /[A-Z]/.test(str[i + 2] || "")) return 1;
    return 0;
  }

  // 括号深度为 0 处才算分隔符——英文括注里常见 "(e.g., 食べて → 食べちゃう; …)"。
  function splitTopLevel(text, isSep) {
    const out = [];
    let depth = 0;
    let start = 0;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (F_OPEN.has(ch)) depth++;
      else if (F_CLOSE.has(ch)) depth = Math.max(0, depth - 1);
      else if (depth === 0) {
        const len = isSep(text, i);
        if (len > 0) {
          out.push(text.slice(start, i));
          i += len - 1;
          start = i + 1;
        }
      }
    }
    out.push(text.slice(start));
    return out.map((x) => x.trim()).filter(Boolean);
  }

  function matchingOpen(text, closeIdx) {
    let depth = 0;
    for (let i = closeIdx; i >= 0; i--) {
      const ch = text[i];
      if (F_CLOSE.has(ch)) depth++;
      else if (F_OPEN.has(ch)) {
        depth--;
        if (depth === 0) return i;
      }
    }
    return -1;
  }

  /** → [{ label, formula, note, isFormula }]：「口语缩略：…」这类前缀标签与句尾括注拆出来弱化显示；
   *  isFormula=false 的段（无 +/→ 且偏长）按一句说明渲染。 */
  function parseFormation(text) {
    return splitTopLevel(text.replace(/\r/g, ""), formationSep).map((seg) => {
      let f = seg.replace(/[。.]\s*$/, "").trim();
      let label = "";
      const m = /^([^＋+→（(「\n，,。.]{1,28}?)[：:]\s*(?=\S)/.exec(f);
      if (m) {
        label = m[1].trim();
        f = f.slice(m[0].length);
      }
      let note = "";
      const last = f[f.length - 1];
      if (last === "）" || last === ")") {
        const open = matchingOpen(f, f.length - 1);
        if (open > 0) {
          note = f.slice(open + 1, -1).trim();
          f = f.slice(0, open).trim();
        }
      }
      const isFormula = /[＋+→]/.test(f) || (f.length <= 30 && !/[，,]/.test(f));
      return { label, formula: f, note, isFormula };
    });
  }

  // 接续标签化（2026-10-16）：grammarText.ts splitFormula / splitMixed / classifyPart / posToEn
  // 的逐条移植——按顶层「＋」拆成标签，词性描述（靛蓝）｜日语成分（青）｜判不出的普通字。
  // 改那边的标记表 / 词素表时这里一起改。
  const POS_MARK =
    /[A-Za-z词詞形干幹句语語项項]|用言|表达|表達|表現|内容|內容|否定|部分|场所|場所|地点|地點|引用|引号|引號|发言|發言|连体|連体|简体|簡體|结论|結論|评价|評價|评论|評論|说明|說明|接续|接續|同上|人名|数量|數量|长度|長度|[前後]件|補足|話題|主題|者$|^[文節]$/;
  const KANA = /[ぁ-ゟ゠-ヿ]/;
  const CJK = /[㐀-鿿]/;

  function classifyPart(core) {
    const bare = core.replace(/^「(.*)」$/, "$1");
    if (POS_MARK.test(bare)) return "pos";
    if (KANA.test(bare) || CJK.test(bare)) return "ja";
    return "text";
  }

  const ALT_SEP = /[、／/]/;

  // 一个「＋」片段按顶层并列分隔再切成多枚标签；跨种类的「、」保留为连接符。
  function splitMixed(core) {
    const out = [];
    if (/[，,]/.test(core)) return [{ text: core, kind: classifyPart(core), sep: "" }];
    let depth = 0;
    let start = 0;
    let pending = "";
    const push = (end, sep) => {
      const text = pending + core.slice(start, end).trim();
      pending = "";
      if (!text) {
        const prev = out[out.length - 1];
        if (prev) prev.sep += sep;
        else pending = sep;
        return;
      }
      out.push({ text, kind: classifyPart(text), sep });
    };
    for (let i = 0; i < core.length; i++) {
      const ch = core[i];
      if (F_OPEN.has(ch)) depth++;
      else if (F_CLOSE.has(ch)) depth = Math.max(0, depth - 1);
      else if (depth === 0 && ALT_SEP.test(ch)) {
        push(i, ch);
        start = i + 1;
      }
    }
    push(core.length, "");
    const tail = out[out.length - 1];
    if (tail && tail.sep) {
      tail.text += tail.sep;
      tail.sep = "";
    }
    for (let i = 0; i < out.length - 1; i++) {
      out[i].sep = out[i].sep === "、" && out[i].kind !== out[i + 1].kind ? "、" : "";
    }
    return out;
  }

  /** → [{ text, kind, aside, joiner }]；公式里没有顶层加号时返回 null（整块原样显示）。 */
  function splitFormula(formula, en) {
    const parts = splitTopLevel(formula, (s, i) => (s[i] === "＋" || s[i] === "+" ? 1 : 0));
    if (parts.length < 2) return null;
    const out = [];
    parts.forEach((p, pi) => {
      let core = p;
      let aside = "";
      const last = p[p.length - 1];
      if (last === "）" || last === ")") {
        const open = matchingOpen(p, p.length - 1);
        if (open > 0) {
          core = p.slice(0, open).trim();
          aside = p.slice(open + 1, -1).trim();
        }
      }
      const subs = splitMixed(core);
      if (subs.length === 0) subs.push({ text: core, kind: classifyPart(core), sep: "" });
      subs.forEach((s, si) => {
        const lastSub = si === subs.length - 1;
        out.push({
          text: s.text,
          kind: s.kind,
          aside: lastSub ? aside : "",
          joiner: lastSub ? (pi < parts.length - 1 ? "＋" : "") : s.sep,
        });
      });
    });
    if (!en) return out;
    // 英文数据的接续写的是日文词性术语，英文里读着像串了语言——词性标签显示层译成英文。
    return out.map((t) =>
      t.kind === "pos"
        ? { ...t, text: posToEn(t.text) || t.text, aside: (t.aside && posToEn(t.aside)) || t.aside }
        : t
    );
  }

  // 日文词性术语 → 英文：切成已知词素（最长匹配），有一个字切不进就整段返回 null。
  const POS_CLASS = {
    名詞: "Noun",
    代名詞: "Pronoun",
    指示代名詞: "Demonstrative",
    指示詞: "Demonstrative",
    場所名詞: "Place noun",
    サ変名詞: "Suru-noun",
    動作性名詞: "Action noun",
    動詞: "Verb",
    他動詞: "Transitive verb",
    自動詞: "Intransitive verb",
    移動動詞: "Motion verb",
    五段動詞: "Godan verb",
    一段動詞: "Ichidan verb",
    可能動詞: "Potential verb",
    受身動詞: "Passive verb",
    使役動詞: "Causative verb",
    サ変動詞: "Suru-verb",
    い形容詞: "i-adj.",
    イ形容詞: "i-adj.",
    な形容詞: "na-adj.",
    ナ形容詞: "na-adj.",
    形容動詞: "na-adj.",
    形容詞: "Adjective",
    副詞: "Adverb",
    数量詞: "Quantity",
    数量: "Quantity",
    数詞: "Number",
    助数詞: "Counter",
    疑問詞: "Question word",
    格助詞: "Case particle",
    助詞: "Particle",
    述語: "Predicate",
    主語: "Subject",
    節: "Clause",
    文: "Sentence",
    動詞句: "Verb phrase",
    場所: "Place",
    引用文: "Quotation",
    連体修飾語: "Noun modifier",
    連体修飾節: "Relative clause",
    連体修飾: "Noun modifier",
    否定表現: "Negative expression",
    否定述語: "Negative predicate",
    否定: "Negation",
    後件: "Main clause",
  };
  const POS_FORM = {
    辞書形: "dictionary form",
    普通形: "plain form",
    丁寧形: "polite form",
    て形: "te-form",
    ない形: "nai-form",
    た形: "ta-form",
    ます形: "masu-form",
    ます形語幹: "masu-stem",
    ます形の語幹: "masu-stem",
    語幹: "stem",
    意向形: "volitional form",
    意志形: "volitional form",
    連用形: "continuative form",
    連体形: "attributive form",
    未然形: "irrealis form",
    仮定形: "conditional form",
    否定形: "negative form",
    可能形: "potential form",
    受身形: "passive form",
    命令形: "imperative form",
    過去形: "past form",
    現在形: "present form",
    ば形: "ba-form",
    たら形: "tara-form",
    たい形: "tai-form",
    ている形: "teiru-form",
    ていた形: "teita-form",
    く形: "ku-form",
    くて形: "kute-form",
    ければ形: "kereba-form",
  };
  const STEM_FORMS = new Set(["stem", "masu-stem"]);
  const POS_LEXEMES = [
    ...Object.keys(POS_CLASS).map((k) => ({ k, cls: POS_CLASS[k] })),
    ...Object.keys(POS_FORM).map((k) => ({ k, form: POS_FORM[k] })),
  ].sort((a, b) => b.k.length - a.k.length);

  function posToEn(text) {
    const s = text.replace(/^「(.*)」$/, "$1").trim();
    const wrapped = /^[（(](.+)[）)]$/.exec(s);
    if (wrapped) {
      const inner = posToEn(wrapped[1]);
      return inner && `(${inner})`;
    }
    const paren = /^(.+?)[（(](.+)[）)]$/.exec(s);
    if (paren) {
      const head = posToEn(paren[1]);
      const note = posToEn(paren[2]);
      return head && note ? `${head} (${note[0].toLowerCase() + note.slice(1)})` : null;
    }
    const groups = [];
    let cur = { classes: [], forms: [] };
    let afterNo = false;
    let suffix = "";
    let i = 0;
    while (i < s.length) {
      const ch = s[i];
      if (ch === " " || ch === "　" || ch === "・" || ch === "/" || ch === "／") {
        i++;
        continue;
      }
      if (/[₀-₉]/.test(ch) && cur.classes.length > 0 && !afterNo) {
        cur.classes[cur.classes.length - 1] += ch;
        i++;
        continue;
      }
      if (ch === "の" && cur.classes.length > 0 && cur.forms.length === 0 && !afterNo) {
        afterNo = true;
        i++;
        continue;
      }
      const lx = POS_LEXEMES.find((l) => s.startsWith(l.k, i));
      if (!lx) {
        const rest = s.slice(i).trim();
        if (!afterNo && cur.classes.length > 0 && /^[〜～…ぁ-ゟ゠-ヿ]+$/.test(rest)) {
          suffix = rest;
          break;
        }
        return null;
      }
      if (afterNo && !lx.form) return null;
      afterNo = false;
      if (lx.cls) {
        if (cur.forms.length > 0) {
          groups.push(cur);
          cur = { classes: [], forms: [] };
        }
        cur.classes.push(lx.cls);
      } else cur.forms.push(lx.form);
      i += lx.k.length;
    }
    if (afterNo) return null;
    groups.push(cur);
    if (groups.every((g) => g.classes.length === 0 && g.forms.length === 0)) return null;
    const out =
      groups
        .map((g) => {
          const cls = g.classes.join(" / ");
          if (!cls) return g.forms.join(" / ");
          if (g.forms.length === 0) return cls;
          if (g.forms.every((f) => STEM_FORMS.has(f))) return `${cls} ${g.forms.join(" / ")}`;
          return `${cls} (${g.forms.join(" / ")})`;
        })
        .join(" / ") + (suffix ? ` ${suffix}` : "");
    return /^[a-z]/.test(out) && !/^(?:i|na)-adj\./.test(out)
      ? out[0].toUpperCase() + out.slice(1)
      : out;
  }

  // 括号随文字选半角 / 全角（桌面 GrammarCard 的 paren 同规）。
  const isAscii = (s) => /^[\x20-\x7e]+$/.test(s);
  const parenText = (s) => (isAscii(s[0]) ? ` (${s})` : `（${s}）`);

  // 扩展拿不到桌面的 dict_locale：语法文本随词典语言走，按释义里拉丁字母多于汉字判英文数据。
  function isEnGrammar(g) {
    const s = g.meaning || ((g.senses || [])[0] || {}).gloss || "";
    const latin = (s.match(/[A-Za-z]/g) || []).length;
    const han = (s.match(/[㐀-鿿]/g) || []).length;
    return latin > han;
  }

  function span(cls, text) {
    const el = document.createElement("span");
    el.className = cls;
    if (text != null) el.textContent = text;
    return el;
  }

  // 语体：数据值恒为简体四档（同桌面 RegisterTag），显示文案走 i18n，类名用固定英文键。
  const REGISTER_KEY = { 口语: "casual", 中性: "neutral", 书面: "written", 正式: "formal" };

  function grammarSection(titleKey) {
    const sec = document.createElement("div");
    sec.className = "jd-g-sec";
    const title = document.createElement("div");
    title.className = "jd-g-sec-title";
    title.textContent = T(titleKey);
    sec.appendChild(title);
    return sec;
  }

  function renderGrammarCard(box, g) {
    const head = document.createElement("div");
    head.className = "jd-head";
    const title = document.createElement("span");
    title.className = "jd-title";
    const pattern = document.createElement("span");
    pattern.className = "jd-surface";
    pattern.textContent = g.pattern;
    title.appendChild(pattern);
    if (g.reading && g.reading !== g.pattern) {
      const reading = document.createElement("span");
      reading.className = "jd-reading";
      reading.textContent = g.reading;
      title.appendChild(reading);
    }
    const reg = REGISTER_KEY[g.register];
    if (g.level || reg) {
      const tags = document.createElement("span");
      tags.className = "jd-tags";
      if (g.level) tags.appendChild(jlptTag(g.level, "grammar.jlptTitle"));
      if (reg) {
        const r = document.createElement("span");
        r.className = `jd-tag jd-reg-${reg}`;
        r.textContent = T(`grammar.register.${reg}`);
        tags.appendChild(r);
      }
      title.appendChild(tags);
    }
    head.appendChild(title);
    box.appendChild(head);

    const senses = (g.senses || []).filter((x) => x && x.gloss);
    if (senses.length > 1) {
      const ol = document.createElement("ol");
      ol.className = "jd-g-senses";
      for (const x of senses) {
        const li = document.createElement("li");
        li.textContent = x.gloss;
        ol.appendChild(li);
      }
      box.appendChild(ol);
    } else if (g.meaning || senses.length) {
      const m = document.createElement("div");
      m.className = "jd-g-meaning";
      m.textContent = g.meaning || senses[0].gloss;
      box.appendChild(m);
    }

    const forms = g.formation ? parseFormation(g.formation) : [];
    if (forms.length) {
      const sec = grammarSection("grammar.formationTitle");
      const en = isEnGrammar(g);
      for (const it of forms) {
        // 不像公式的段拼回一句说明（同桌面 proseLine）。
        if (!it.isFormula) {
          const p = span("jd-g-form-prose");
          const label = it.label ? it.label + (isAscii(it.label) ? ": " : "：") : "";
          p.textContent = label + it.formula + (it.note ? parenText(it.note) : "");
          sec.appendChild(p);
          continue;
        }
        const row = document.createElement("div");
        row.className = "jd-g-form";
        if (it.label) row.appendChild(span("jd-g-form-label", it.label));
        const tokens = splitFormula(it.formula, en);
        if (tokens) {
          const wrap = span("jd-g-fx");
          for (const tk of tokens) {
            const tag = span(tk.kind === "text" ? "jd-fx-text" : `jd-fx-tag jd-fx-${tk.kind}`);
            // 日语成分走日文字形；括注多是中文说明，留在 lang 之外。
            const body = span("", tk.text);
            if (tk.kind === "ja") body.lang = "ja";
            tag.appendChild(body);
            if (tk.aside) tag.appendChild(span("jd-fx-aside", parenText(tk.aside)));
            wrap.appendChild(tag);
            if (tk.joiner) wrap.appendChild(span("jd-fx-op", tk.joiner));
          }
          row.appendChild(wrap);
        } else {
          row.appendChild(span("jd-g-formula", it.formula));
        }
        if (it.note) row.appendChild(span("jd-g-form-note", it.note));
        sec.appendChild(row);
      }
      box.appendChild(sec);
    }

    const ex = (g.examples || []).find((x) => x && x.jp);
    if (ex) {
      const sec = grammarSection("grammar.exampleTitle");
      const e = document.createElement("div");
      e.className = "jd-g-ex";
      const jp = document.createElement("div");
      jp.className = "jd-g-ex-jp";
      jp.lang = "ja";
      jp.textContent = ex.jp;
      e.appendChild(jp);
      if (ex.zho) {
        const tr = document.createElement("div");
        tr.className = "jd-g-ex-tr";
        tr.textContent = ex.zho;
        e.appendChild(tr);
      }
      sec.appendChild(e);
      box.appendChild(sec);
    }
  }

  // JLPT 章：级别 +「非官方」小章，hover 出约估说明。词条与语法各用各的说明
  // （`titleKey`，同桌面 dict.jlptTitle / grammar.jlptTitle）。
  function jlptTag(level, titleKey) {
    const tag = document.createElement("span");
    tag.className = "jd-tag jd-tag-jlpt";
    tag.title = T(titleKey, { level });
    tag.textContent = level;
    const approx = document.createElement("span");
    approx.className = "jd-tag-approx";
    approx.textContent = T("common.tagUnofficial");
    tag.appendChild(approx);
    return tag;
  }

  // 词头标签章（2026-10-15）：JLPT 级别 + 常用——划词时一眼看出这个词值不值得收藏。
  // 取桌面应用 EntryTags.svelte 的前两枚、同文同色（JLPT 实心蓝带「非官方」小章，hover
  // 出约估说明；常用实心绿）；自他 / 语体章不搬，浮窗只有 340px 宽。两个字段 /v1/lookup
  // 一直就有（DictEntry.jlpt_level / is_common），不依赖新版桌面应用。
  // 整组作为 jd-title 的一个 flex 项、内部不折行：放不下时两枚一起换到下一行。
  function makeTags(entry) {
    if (!entry.jlpt_level && !entry.is_common) return null;
    const wrap = document.createElement("span");
    wrap.className = "jd-tags";
    if (entry.jlpt_level) wrap.appendChild(jlptTag(entry.jlpt_level, "common.tagJlptTitle"));
    if (entry.is_common) {
      const common = document.createElement("span");
      common.className = "jd-tag jd-tag-common";
      common.textContent = T("common.tagCommon");
      wrap.appendChild(common);
    }
    return wrap;
  }

  // 浮层里最多列几条，超出的由底部分类导航报总数、「查看详情」进应用看全。词条（常用 +
  // 非常用合计）6 条，同桌面迷你词卡；语法 3 条，同搜索下拉的 GRAMMAR_CAP——语法卡比
  // 词条高得多，夹在两组词条之间时再多就把非常用词挤出一屏。
  const WORDS_SHOWN = 6;
  const GRAMMAR_SHOWN = 3;

  // ── 结果分类导航（2026-10-15）：「常用词 n · 语法 n · 非常用词 n」，放在「查看详情」上方 ──
  // 仿桌面应用搜索下拉的 .sug-nav（SearchBar.svelte）：同样三类、同样顺序、同色。计数是
  // 查询结果里的 `sections`（App 的 /v1/search 算好下发；老 App 由 background.js 用老端点
  // 拼出同样的数），上限与应用结果页相同（词条 20 / 语法 30），数字对得上应用里看到的。
  // 浮层只列前几条，导航让人知道「还有多少」（として 有 7 条语法，浮层只列 3 条）。
  // 可点（2026-10-16）：浮层里列了这一类的卡片时，点标签把结果区滚到该类第一张的顶部；
  // 这一类有计数却一张没列（词条名额被常用词占满）时仍是不可点的摘要。
  // 出现条件同 suggest 的 showNav：至少两类有结果，或某一类多于浮层列出的条数。
  const NAV_SECTIONS = ["common", "grammar", "uncommon"];

  function appendSectionNav(box, counts, overflowing, scroll) {
    const present = NAV_SECTIONS.filter((id) => counts[id] > 0);
    if (!present.length || (present.length < 2 && !overflowing)) return;
    const nav = document.createElement("div");
    nav.className = "jd-nav";
    nav.setAttribute("aria-label", T("nav.label"));
    for (const id of present) {
      const target = scroll && scroll.querySelector(`[data-jd-section="${id}"]`);
      const chip = document.createElement(target ? "button" : "span");
      chip.className = `jd-nav-chip jd-nav-${id}` + (target ? " jd-nav-link" : "");
      if (target) {
        chip.type = "button";
        chip.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          scrollToSection(scroll, target);
        });
      }
      chip.textContent = T(`nav.${id}`);
      const n = document.createElement("span");
      n.className = "jd-nav-count";
      n.textContent = String(counts[id]);
      chip.appendChild(n);
      nav.appendChild(chip);
    }
    box.appendChild(nav);
  }

  // 把 target 的上沿对到滚动区内容区顶部（扣掉 .jd-scroll 的上内边距：页面浮层那份有
  // 12px，工具栏弹窗那份没有）。
  function scrollToSection(scroll, target) {
    const pad = parseFloat(getComputedStyle(scroll).paddingTop) || 0;
    const top =
      scroll.scrollTop +
      target.getBoundingClientRect().top -
      scroll.getBoundingClientRect().top -
      pad;
    scroll.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }

  // 每个词条 / 语法卡各包一层 .jd-entry，相邻两张之间由样式画一条分隔线（2026-10-16）。
  // `section`：给该段第一张打上 data-jd-section，分类导航据此跳转。
  function entryWrap(box, section) {
    const wrap = document.createElement("div");
    wrap.className = "jd-entry";
    if (section && !box.querySelector(`[data-jd-section="${section}"]`)) {
      wrap.dataset.jdSection = section;
    }
    box.appendChild(wrap);
    return wrap;
  }

  function renderEntries(scroll, q, entries, pitchFn, ttsFn, fav, section) {
    for (const entry of entries) {
      const box = entryWrap(scroll, section);
      const hw = headword(entry, q);
      const { surface, reading } = hw;
      const head = document.createElement("div");
      head.className = "jd-head";
      // 词头/读音/音调图收进可换行的 jd-title 组：放不下时整项换到下一行，
      // 而不是把词头或读音从中间折断；喇叭/星标固定在行末。
      head.innerHTML =
        `<span class="jd-title">` +
        `<span class="jd-surface">${escapeHtml(surface)}</span>` +
        (reading ? `<span class="jd-reading">${escapeHtml(reading)}</span>` : "") +
        `</span>`;

      const pitchSlot = document.createElement("span");
      pitchSlot.className = "jd-pitch-slot";
      head.firstElementChild.appendChild(pitchSlot);
      if (hw.pitchKana) pitchFn(hw.pitchSurface, hw.pitchKana, pitchSlot);
      const tags = makeTags(entry);
      if (tags) head.firstElementChild.appendChild(tags);

      head.appendChild(makeSpeaker(hw.ttsText, hw.ttsReading, ttsFn));
      if (fav && entry.id) head.appendChild(makeFav(entry, hw.favWord, hw.favReading, fav));
      box.appendChild(head);

      // 展示上限。**与桌面应用的迷你词卡同值**（src/lib/components/WordCard.svelte
      // 的 GLOSS_CAP）——同一张卡在两处给出的义项数不该不一样，改一边就要改另一边。
      // 被截掉的义项由底部那颗「查看详情」通向应用（appendMoreButton）。
      const GLOSS_CAP = 3;
      (entry.senses || []).slice(0, GLOSS_CAP).forEach((sense, i) => {
        const text = glossText(sense);
        if (!text) return;
        const line = document.createElement("div");
        line.className = "jd-sense";
        line.textContent = `${i + 1}. `;
        // 词性前缀，与桌面应用 DictPanel 同一格式：(名词，自动词)。
        // 超过 10 字符的长词性（如动词细分类）另起一行放释义，避免挤成一团。
        const pos = sense.pos && sense.pos.length ? P.translatePosList(sense.pos) : [];
        const joined = pos.join("，");
        if (pos.length) {
          const tag = document.createElement("span");
          tag.className = "jd-pos";
          tag.textContent = joined.length > 10 ? `(${joined})` : `(${joined}) `;
          line.appendChild(tag);
        }
        if (joined.length > 10) {
          const cont = document.createElement("div");
          cont.className = "jd-sense-cont";
          cont.textContent = text;
          line.appendChild(cont);
        } else {
          line.appendChild(document.createTextNode(text));
        }
        box.appendChild(line);
      });
    }
  }

  // Footer button that jumps into the desktop app for `q`: "查看详情" when the
  // popup already shows a match, "搜索" as the fallback when nothing was found
  // (same reveal call — the app raises and searches `q`). `revealFn` is `(q, cb)`;
  // omit it (e.g. contexts without a running app link) to hide the button.
  function appendMoreButton(box, q, revealFn, label) {
    const btn = document.createElement("button");
    btn.className = "jd-more";
    btn.textContent = label || T("common.viewInApp");
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (btn.disabled) return;
      btn.disabled = true;
      revealFn(q, (res) => {
        if (!btn.isConnected) return;
        btn.disabled = false;
        flash(btn, connErrorText(res) || T("common.openFail"));
      });
    });
    box.appendChild(btn);
  }

  // ── 活用还原解释（2026-10-10）：所选文本不是任何结果的写法时（たべた → 食べる），顶部出
  // 「「たべた」是「食べる」的过去形（た形）」，与 App 结果页 / 下拉同一句、同一套 label
  // （deconjugate.rs 的 Rule.label；念法见 App src/lib/deconjHint.ts：从辞书形往外念，链式
  // label 后面紧跟的一步恰是其中间形的纯消费者时才并掉、其余照念，する 剥离那步不念）。
  // DECONJ_CHAIN_CONSUMER 与 App 的 CHAIN_CONSUMER 同表。
  const DECONJ_CHAIN_CONSUMER = {
    "past negative": "negative",
    "polite past": "polite",
    "polite past negative": "polite",
    "polite negative": "polite",
    "polite volitional": "polite",
    progressive: "te-form",
    "polite progressive": "te-form",
    "past progressive": "te-form",
    "progressive (colloquial)": "te-form",
    "negative desire": "desire",
    "past desire": "desire",
    "negative continuative": "negative (zu)",
    "conditional (tara)": "past",
  };
  const DECONJ_CHAIN = new Set(Object.keys(DECONJ_CHAIN_CONSUMER));
  const DECONJ_KNOWN = new Set([
    ...DECONJ_CHAIN,
    "past",
    "te-form",
    "polite",
    "desire",
    "while",
    "negative",
    "negative (zu)",
    "negative (nu)",
    "passive",
    "causative",
    "causative passive",
    "potential",
    "conditional",
    "imperative",
    "volitional",
    "stem",
    "potential/passive",
    "potential (colloquial)",
    "adverbial",
    "adverbial (ni)",
    "nominalized",
    "conditional (nara)",
    "polite (desu)",
    "polite negative (arimasen)",
  ]);
  const stepName = (l) => (DECONJ_KNOWN.has(l) ? T("deconj.step." + l) : "");
  function describeDeconj(steps) {
    const real = (steps || []).filter((l) => l !== "dictionary");
    if (!real.length) return "";
    const kept = [];
    for (let i = 0; i < real.length; i++) {
      kept.push(real[i]);
      if (DECONJ_CHAIN.has(real[i]) && real[i + 1] === DECONJ_CHAIN_CONSUMER[real[i]]) i++;
    }
    return kept.reverse().map(stepName).filter(Boolean).join(" → ");
  }
  // `res` 是 background.js search() 的回包：{ ok, entries, grammar, sections, common, deconj }
  // ——一次查询全部到齐（App 1.1.2 起的 /v1/search；老 App 由 background 用老端点拼出同样
  // 形状），这里同步渲染，不再有「未找到单词，查询语法…」的中间态。
  //
  // 有结果时 box 分两块（2026-10-15）：上面 .jd-scroll 放查询结果、自己滚动，下面
  // .jd-foot 放分类导航与「查看详情」、固定不动——结果长到要滚时，这两样不必滚到底才
  // 看得见。box 加 .jd-split 切成纵向 flex（样式在 content.js STYLE 与 popup.html 各一份）；
  // 「查询中…」与连接失败这类单行提示不分块，照旧一个 .jd-msg。
  function renderResult(box, q, res, pitchFn, ttsFn, fav, revealFn) {
    box.innerHTML = "";
    box.classList.remove("jd-split");
    if (!res || !res.ok) {
      const reason = res && res.reason;
      const msg =
        reason === "unsupported_os"
          ? T("common.unsupportedOsLong", { os: res.os })
          : T(reason === "offline" ? "common.offlineLong" : "common.lookupFail");
      box.innerHTML = `<div class="jd-msg">${msg}</div>`;
      return;
    }
    const entries = res.entries || [];
    const grammar = res.grammar || [];
    const scroll = document.createElement("div");
    scroll.className = "jd-scroll";
    const foot = document.createElement("div");
    foot.className = "jd-foot";
    box.classList.add("jd-split");
    box.appendChild(scroll);
    box.appendChild(foot);
    if (!entries.length && !grammar.length) {
      scroll.innerHTML = `<div class="jd-msg">${T("common.notFound", { q: escapeHtml(q) })}</div>`;
      // Nothing at all: still offer a jump into the app, relabeled "搜索" so the
      // user can look `q` up there (dictionary + AI) themselves.
      if (revealFn) appendMoreButton(foot, q, revealFn, T("common.searchInApp"));
      if (!foot.childElementCount) foot.remove();
      return;
    }
    // 活用还原解释：所选文本不是任何结果的写法时 App 才给（null = 不出）。
    const forms = res.deconj ? describeDeconj(res.deconj.steps) : "";
    if (forms) {
      const note = document.createElement("div");
      note.className = "jd-deconj";
      note.textContent = T("deconj.note", { from: res.deconj.from, base: res.deconj.base, forms });
      scroll.appendChild(note);
    }
    // 分段顺序同搜索下拉（commands::dict::order_sections）与底部导航：常用词 → 语法 →
    // 非常用词。查 をめぐって 时，罕用的同形词条排在它的语法点后面，而不是独占首屏、
    // 语法只剩一个计数。段内保持 App 给的相关度顺序；词条两段合计 WORDS_SHOWN 条，
    // 常用的先占位。
    // 常用与否按命中的写法（App 回的 `common`，与 entries 等长）：てい 只命中 弟 的次要读音，
    // 弟 沉到非常用段，不再凭 おとうと 的常用标记排在最前。老 App 不回 → 词条级 is_common。
    const flags =
      Array.isArray(res.common) && res.common.length === entries.length ? res.common : null;
    const isHitCommon = (e, i) => (flags ? flags[i] : e.is_common);
    const common = entries.filter(isHitCommon).slice(0, WORDS_SHOWN);
    const uncommon = entries
      .filter((e, i) => !isHitCommon(e, i))
      .slice(0, WORDS_SHOWN - common.length);
    const shownGrammar = grammar.slice(0, GRAMMAR_SHOWN);
    // 词头回显按还原后的辞书形挑写法：选中 聴いて 时原文对不上任何写法，会回落到首个
    // 汉字写法 聞く，与上面那句「…是「聴く」的て形」对不上。
    const headQ = (res.deconj && res.deconj.base) || q;
    renderEntries(scroll, headQ, common, pitchFn, ttsFn, fav, "common");
    shownGrammar.forEach((g) => renderGrammarCard(entryWrap(scroll, "grammar"), g));
    renderEntries(scroll, headQ, uncommon, pitchFn, ttsFn, fav, "uncommon");
    appendSectionNav(
      foot,
      res.sections || {},
      common.length + uncommon.length < entries.length || shownGrammar.length < grammar.length,
      scroll
    );
    // 有任何结果都叫「查看详情」：应用里的搜索会落到同一批词条 / 语法卡（语法卡在应用
    // 里还有用法、注意与易混淆）。
    if (revealFn) appendMoreButton(foot, q, revealFn);
    // 工具栏弹窗没有「查看详情」，导航又没出（结果少）时底栏是空的，别留一条分隔线。
    if (!foot.childElementCount) foot.remove();
  }

  window.TomoshiJaDictShared = {
    MAX_LEN,
    headword,
    describeDeconj,
    renderPitchSvg,
    renderResult,
  };
})();
