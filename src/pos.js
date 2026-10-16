// JMdict part-of-speech (pos) → display labels, per UI locale (简/繁/英).
// Exposed as window.TomoshiJaDictPos. Must load after i18n.js (locale source)
// and before shared.js (consumer).
//
// 英文列同样查表（2026-09-15 起，此前原样返回 JMdict 原文）：短名口径与拍板理由
// 见桌面应用 posTranslations.ts 文件头。
//
// ⚠ 真源是桌面应用的 src/lib/posTranslations.ts —— 本文件是其纯 JS 移植
// （插件无构建步骤，无法直接 import TS）。两侧的键集合与译文需保持同步：
// 那边加了新词性映射，这边要跟着补。
(() => {
  const POS_TRANSLATIONS = {
    "zh-CN": {
      abbreviation: "缩略语",
      "noun or verb acting prenominally": "连体修饰语",
      "adjective (keiyoushi)": "い形容词",
      "adjective (keiyoushi) - yoi/ii class": "い形容词（よい/いい类）",
      "'kari' adjective (archaic)": "形容词（古语）",
      "'ku' adjective (archaic)": "形容词（古语）",
      "'shiku' adjective (archaic)": "形容词（古语）",
      "adjectival nouns or quasi-adjectives (keiyodoshi)": "な形容词/形容动词",
      "archaic/formal form of na-adjective": "形容动词（古语）",
      "nouns which may take the genitive case particle 'no'": "名词（可接の）",
      "pre-noun adjectival (rentaishi)": "连体词",
      "'taru' adjective": "タル形容词",
      "adverb (fukushi)": "副词",
      "adverb taking the 'to' particle": "副词（可接と）",
      auxiliary: "助动词",
      "auxiliary adjective": "补助形容词",
      "auxiliary verb": "助动词",
      conjunction: "连词",
      copula: "判断词",
      counter: "量词",
      "expressions (phrases, clauses, etc.)": "短语",
      "interjection (kandoushi)": "感叹词",
      "noun (common) (futsuumeishi)": "名词",
      "adverbial noun (fukushitekimeishi)": "副词性名词",
      "proper noun": "专有名词",
      "noun, used as a prefix": "名词（作前缀）",
      "noun, used as a suffix": "名词（作后缀）",
      "noun (temporal) (jisoumeishi)": "时间名词",
      numeric: "数词",
      pronoun: "代词",
      prefix: "前缀",
      particle: "助词",
      suffix: "后缀",
      unclassified: "未分类",
      "verb unspecified": "动词",
      "Ichidan verb": "二类/一段动词",
      "Ichidan verb - kureru special class": "二类/一段动词（特殊型）",
      "Ichidan verb - zuru verb (alternative form of -jiru verbs)": "二类/一段动词（ずる/じる）",
      "Nidan verb with 'u' ending (archaic)": "二段动词（古语）",
      "Godan verb - -aru special class": "一类/五段动词（特殊型）",
      "Godan verb with 'bu' ending": "一类/五段动词",
      "Godan verb with 'gu' ending": "一类/五段动词",
      "Godan verb with 'ku' ending": "一类/五段动词",
      "Godan verb - Iku/Yuku special class": "一类/五段动词（特殊型）",
      "Godan verb with 'mu' ending": "一类/五段动词",
      "Godan verb with 'nu' ending": "一类/五段动词",
      "Godan verb with 'ru' ending": "一类/五段动词",
      "Godan verb with 'ru' ending (irregular verb)": "一类/五段动词（特殊型）",
      "Godan verb with 'su' ending": "一类/五段动词",
      "Godan verb with 'tsu' ending": "一类/五段动词",
      "Godan verb with 'u' ending": "一类/五段动词",
      "Godan verb with 'u' ending (special class)": "一类/五段动词（特殊型）",
      "Godan verb - Uru old class verb (old form of Eru)": "一类/五段动词（古语）",
      "intransitive verb": "自动词",
      "Kuru verb - special class": "三类/カ变动词",
      "irregular nu verb": "ナ变动词（古语）",
      "irregular ru verb, plain form ends with -ri": "ラ变动词（古语）",
      "noun or participle which takes the aux. verb suru": "三类/サ变动词",
      "su verb - precursor to the modern suru": "三类/サ变动词（古语）",
      "suru verb - included": "三类/サ变动词",
      "suru verb - special class": "三类/サ变动词（特殊型）",
      "transitive verb": "他动词",
    },
    "zh-TW": {
      abbreviation: "縮略語",
      "noun or verb acting prenominally": "連體修饰語",
      "adjective (keiyoushi)": "い形容詞",
      "adjective (keiyoushi) - yoi/ii class": "い形容詞（よい/いい類）",
      "'kari' adjective (archaic)": "形容詞（古語）",
      "'ku' adjective (archaic)": "形容詞（古語）",
      "'shiku' adjective (archaic)": "形容詞（古語）",
      "adjectival nouns or quasi-adjectives (keiyodoshi)": "な形容詞/形容動詞",
      "archaic/formal form of na-adjective": "形容動詞（古語）",
      "nouns which may take the genitive case particle 'no'": "名詞（可接の）",
      "pre-noun adjectival (rentaishi)": "連體詞",
      "'taru' adjective": "タル形容詞",
      "adverb (fukushi)": "副詞",
      "adverb taking the 'to' particle": "副詞（可接と）",
      auxiliary: "助動詞",
      "auxiliary adjective": "補助形容詞",
      "auxiliary verb": "助動詞",
      conjunction: "連詞",
      copula: "判斷詞",
      counter: "量詞",
      "expressions (phrases, clauses, etc.)": "短語",
      "interjection (kandoushi)": "感嘆詞",
      "noun (common) (futsuumeishi)": "名詞",
      "adverbial noun (fukushitekimeishi)": "副詞性名詞",
      "proper noun": "專有名詞",
      "noun, used as a prefix": "名詞（作前綴）",
      "noun, used as a suffix": "名詞（作後綴）",
      "noun (temporal) (jisoumeishi)": "時间名詞",
      numeric: "數詞",
      pronoun: "代詞",
      prefix: "前綴",
      particle: "助詞",
      suffix: "後綴",
      unclassified: "未分類",
      "verb unspecified": "動詞",
      "Ichidan verb": "二類/一段動詞",
      "Ichidan verb - kureru special class": "二類/一段動詞（特殊型）",
      "Ichidan verb - zuru verb (alternative form of -jiru verbs)": "二類/一段動詞（ずる/じる）",
      "Nidan verb with 'u' ending (archaic)": "二段動詞（古語）",
      "Godan verb - -aru special class": "一類/五段動詞（特殊型）",
      "Godan verb with 'bu' ending": "一類/五段動詞",
      "Godan verb with 'gu' ending": "一類/五段動詞",
      "Godan verb with 'ku' ending": "一類/五段動詞",
      "Godan verb - Iku/Yuku special class": "一類/五段動詞（特殊型）",
      "Godan verb with 'mu' ending": "一類/五段動詞",
      "Godan verb with 'nu' ending": "一類/五段動詞",
      "Godan verb with 'ru' ending": "一類/五段動詞",
      "Godan verb with 'ru' ending (irregular verb)": "一類/五段動詞（特殊型）",
      "Godan verb with 'su' ending": "一類/五段動詞",
      "Godan verb with 'tsu' ending": "一類/五段動詞",
      "Godan verb with 'u' ending": "一類/五段動詞",
      "Godan verb with 'u' ending (special class)": "一類/五段動詞（特殊型）",
      "Godan verb - Uru old class verb (old form of Eru)": "一類/五段動詞（古語）",
      "intransitive verb": "自動詞",
      "Kuru verb - special class": "三類/カ變動詞",
      "irregular nu verb": "ナ變動詞（古語）",
      "irregular ru verb, plain form ends with -ri": "ラ變動詞（古語）",
      "noun or participle which takes the aux. verb suru": "三類/サ變動詞",
      "su verb - precursor to the modern suru": "三類/サ變動詞（古語）",
      "suru verb - included": "三類/サ變動詞",
      "suru verb - special class": "三類/サ變動詞（特殊型）",
      "transitive verb": "他動詞",
    },
    en: {
      abbreviation: "abbreviation",
      "noun or verb acting prenominally": "prenominal modifier",
      "adjective (keiyoushi)": "i-adjective",
      "adjective (keiyoushi) - yoi/ii class": "i-adjective (よい/いい)",
      "'kari' adjective (archaic)": "adjective (archaic)",
      "'ku' adjective (archaic)": "adjective (archaic)",
      "'shiku' adjective (archaic)": "adjective (archaic)",
      "adjectival nouns or quasi-adjectives (keiyodoshi)": "na-adjective",
      "archaic/formal form of na-adjective": "na-adjective (archaic)",
      "nouns which may take the genitive case particle 'no'": "no-adjective",
      "pre-noun adjectival (rentaishi)": "pre-noun adjectival",
      "'taru' adjective": "taru-adjective",
      "adverb (fukushi)": "adverb",
      "adverb taking the 'to' particle": "adverb (with と)",
      auxiliary: "auxiliary",
      "auxiliary adjective": "auxiliary adjective",
      "auxiliary verb": "auxiliary verb",
      conjunction: "conjunction",
      copula: "copula",
      counter: "counter",
      "expressions (phrases, clauses, etc.)": "expression",
      "interjection (kandoushi)": "interjection",
      "noun (common) (futsuumeishi)": "noun",
      "adverbial noun (fukushitekimeishi)": "adverbial noun",
      "proper noun": "proper noun",
      "noun, used as a prefix": "noun (prefix)",
      "noun, used as a suffix": "noun (suffix)",
      "noun (temporal) (jisoumeishi)": "temporal noun",
      numeric: "numeral",
      pronoun: "pronoun",
      prefix: "prefix",
      particle: "particle",
      suffix: "suffix",
      unclassified: "unclassified",
      "verb unspecified": "verb",
      "Ichidan verb": "ichidan verb",
      "Ichidan verb - kureru special class": "ichidan verb (irregular)",
      "Ichidan verb - zuru verb (alternative form of -jiru verbs)": "ichidan verb (-zuru)",
      "Nidan verb with 'u' ending (archaic)": "nidan verb (archaic)",
      "Godan verb - -aru special class": "godan verb (irregular)",
      "Godan verb with 'bu' ending": "godan verb",
      "Godan verb with 'gu' ending": "godan verb",
      "Godan verb with 'ku' ending": "godan verb",
      "Godan verb - Iku/Yuku special class": "godan verb (irregular)",
      "Godan verb with 'mu' ending": "godan verb",
      "Godan verb with 'nu' ending": "godan verb",
      "Godan verb with 'ru' ending": "godan verb",
      "Godan verb with 'ru' ending (irregular verb)": "godan verb (irregular)",
      "Godan verb with 'su' ending": "godan verb",
      "Godan verb with 'tsu' ending": "godan verb",
      "Godan verb with 'u' ending": "godan verb",
      "Godan verb with 'u' ending (special class)": "godan verb (irregular)",
      "Godan verb - Uru old class verb (old form of Eru)": "godan verb (archaic)",
      "intransitive verb": "intransitive verb",
      "Kuru verb - special class": "kuru verb",
      "irregular nu verb": "irregular verb (archaic)",
      "irregular ru verb, plain form ends with -ri": "irregular verb (archaic)",
      "noun or participle which takes the aux. verb suru": "suru verb",
      "su verb - precursor to the modern suru": "suru verb (archaic)",
      "suru verb - included": "suru verb",
      "suru verb - special class": "suru verb (irregular)",
      "transitive verb": "transitive verb",
    },
  };

  // Archaic Nidan/Yodan verb classes follow a regular pattern, e.g.
  // "Nidan verb (upper class) with 'gu' ending (archaic)".
  const NIDAN_RE =
    /^Nidan verb \((upper|lower) class\) with '(.+)' ending(?: and 'we' conjugation)? \(archaic\)$/;
  const YODAN_RE = /^Yodan verb with '(.+)' ending \(archaic\)$/;

  // 二段/四段的上下类与词尾都不进标签（同桌面侧的精简口径），只剩「古语动词」一档。
  const NIDAN_LABEL = {
    "zh-CN": "二段动词（古语）",
    "zh-TW": "二段動詞（古語）",
    en: "nidan verb (archaic)",
  };
  const YODAN_LABEL = {
    "zh-CN": "四段动词（古语）",
    "zh-TW": "四段動詞（古語）",
    en: "yodan verb (archaic)",
  };

  function translatePos(pos) {
    const locale = window.TomoshiJaDictI18n.getLocale();
    const known = POS_TRANSLATIONS[locale][pos];
    if (known) return known;
    if (NIDAN_RE.test(pos)) return NIDAN_LABEL[locale];
    if (YODAN_RE.test(pos)) return YODAN_LABEL[locale];
    // 表外的键：英文剥掉括号里的罗马字注，中文没有译名只能原样出。
    return locale === "en" ? pos.replace(/\s*\([a-z/ -]+\)/g, "") : pos;
  }

  // 细化词性 → 它所细化的基础词性：同一义项两者并列时基础项不显示（同桌面侧 REFINES）。
  const REFINES = {
    "nouns which may take the genitive case particle 'no'": "noun (common) (futsuumeishi)",
    "adverb taking the 'to' particle": "adverb (fukushi)",
  };

  // 丢掉被兄弟细化的基础词性，再按译名去重（多个五段词类共用一个译名）。
  function translatePosList(pos) {
    const refined = new Set(pos.map((p) => REFINES[p]).filter(Boolean));
    const out = [];
    for (const p of pos) {
      if (refined.has(p)) continue;
      const label = translatePos(p);
      if (!out.includes(label)) out.push(label);
    }
    return out;
  }

  window.TomoshiJaDictPos = { translatePosList };
})();
