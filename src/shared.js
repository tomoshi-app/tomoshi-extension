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

  function headword(entry) {
    const kanji = entry.kanji && entry.kanji[0] ? entry.kanji[0].text : null;
    const kana = entry.kana && entry.kana[0] ? entry.kana[0].text : "";
    return { surface: kanji || kana, reading: kanji ? kana : "" };
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

  function flash(anchor, text) {
    const tip = document.createElement("span");
    tip.className = "jd-flash";
    tip.textContent = text;
    anchor.insertAdjacentElement("afterend", tip);
    setTimeout(() => tip.remove(), 2000);
  }

  function playWord(text, reading, btn, ttsFn) {
    btn.classList.add("jd-speak-busy");
    ttsFn(text, reading, (res) => {
      if (!btn.isConnected) return;
      btn.classList.remove("jd-speak-busy");
      if (!res || !res.ok) {
        flash(btn, T(res && res.reason === "offline" ? "common.offline" : "common.engineOff"));
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

  // "加入生词本" star — a toggle. Reflects the entry's saved state when the popup
  // opens (already-saved words show ★), and clicking adds or removes accordingly.
  // `fav` is { check(entryId, cb), add(payload, cb), remove(entryId, cb) }.
  function makeFav(entry, surface, reading, fav) {
    const btn = document.createElement("button");
    btn.className = "jd-fav";
    let on = false;

    const setState = (favorited) => {
      on = favorited;
      btn.textContent = favorited ? "★" : "☆";
      btn.title = T(favorited ? "common.favAdded" : "common.favAdd");
      btn.classList.toggle("jd-fav-on", favorited);
    };
    setState(false);

    // Reflect the current saved state so a re-shown popup for an already-saved
    // word isn't stuck on the empty star.
    if (fav.check) {
      fav.check(entry.id, (res) => {
        if (btn.isConnected && res && res.ok) setState(!!res.favorited);
      });
    }

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (btn.disabled) return;
      btn.disabled = true;
      const wantOn = !on;
      const done = (res) => {
        if (!btn.isConnected) return;
        btn.disabled = false;
        if (res && res.ok) {
          setState(wantOn);
        } else {
          flash(
            btn,
            T(
              res && res.reason === "offline"
                ? "common.offline"
                : wantOn
                  ? "common.favAddFail"
                  : "common.favRemoveFail"
            )
          );
        }
      };
      if (wantOn) {
        const meaning = (entry.senses || []).map(glossText).find((t) => t) || "";
        const payload = {
          entryId: entry.id,
          word: surface,
          reading: reading || null,
          meaning: meaning ? meaning.slice(0, 80) : null,
        };
        fav.add(payload, done);
      } else {
        fav.remove(entry.id, done);
      }
    });
    return btn;
  }

  function renderGrammarCard(box, g) {
    const head = document.createElement("div");
    head.className = "jd-head";
    head.innerHTML =
      `<span class="jd-surface">${escapeHtml(g.pattern)}</span>` +
      (g.level ? `<span class="jd-badge">${escapeHtml(g.level)}</span>` : "");
    box.appendChild(head);
    if (g.meaning) {
      const m = document.createElement("div");
      m.className = "jd-sense";
      m.textContent = g.meaning;
      box.appendChild(m);
    }
    if (g.formation) {
      const f = document.createElement("div");
      f.className = "jd-formation";
      f.textContent = T("common.formation", { text: g.formation });
      box.appendChild(f);
    }
    const ex = g.examples && g.examples[0];
    if (ex && ex.jp) {
      const e = document.createElement("div");
      e.className = "jd-example";
      e.textContent = ex.zho ? `${ex.jp} — ${ex.zho}` : ex.jp;
      box.appendChild(e);
    }
  }

  function renderGrammar(box, q, entries) {
    box.innerHTML = "";
    if (!entries.length) {
      box.innerHTML = `<div class="jd-msg">${T("common.notFound", { q: escapeHtml(q) })}</div>`;
      return;
    }
    entries.slice(0, 4).forEach((g) => renderGrammarCard(box, g));
  }

  function renderEntries(box, entries, pitchFn, ttsFn, fav) {
    for (const entry of entries.slice(0, 6)) {
      const { surface, reading } = headword(entry);
      const kana = entry.kana && entry.kana[0] ? entry.kana[0].text : surface;
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
      if (kana) pitchFn(surface, kana, pitchSlot);

      head.appendChild(makeSpeaker(surface, kana, ttsFn));
      if (fav && entry.id) head.appendChild(makeFav(entry, surface, reading, fav));
      box.appendChild(head);

      (entry.senses || []).slice(0, 4).forEach((sense, i) => {
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
        flash(btn, T(res && res.reason === "offline" ? "common.offline" : "common.openFail"));
      });
    });
    box.appendChild(btn);
  }

  function renderResult(box, q, res, grammarFn, pitchFn, ttsFn, fav, revealFn) {
    box.innerHTML = "";
    if (!res || !res.ok) {
      const reason = res && res.reason;
      const msg = T(reason === "offline" ? "common.offlineLong" : "common.lookupFail");
      box.innerHTML = `<div class="jd-msg">${msg}</div>`;
      return;
    }
    const entries = res.entries || [];
    if (!entries.length) {
      box.innerHTML = `<div class="jd-msg">${T("common.noWordTryGrammar")}</div>`;
      grammarFn(q, (gres) => {
        if (!gres || !gres.ok) {
          box.innerHTML = `<div class="jd-msg">${T("common.notFound", { q: escapeHtml(q) })}</div>`;
        } else {
          renderGrammar(box, q, gres.entries || []);
        }
        // No dictionary word match: still offer a jump into the app, relabeled to
        // "搜索" so the user can look `q` up there (dictionary + AI) themselves.
        if (revealFn) appendMoreButton(box, q, revealFn, T("common.searchInApp"));
      });
      return;
    }
    renderEntries(box, entries, pitchFn, ttsFn, fav);
    if (revealFn) appendMoreButton(box, q, revealFn);
  }

  window.TomoshiJaDictShared = {
    MAX_LEN,
    renderPitchSvg,
    renderResult,
  };
})();
