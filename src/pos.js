// JMdict part-of-speech (pos) → Chinese labels, per UI locale.
// Exposed as window.TomoshiJaDictPos. Must load after i18n.js (locale source)
// and before shared.js (consumer).
//
// ⚠ 真源是桌面应用的 src/lib/posTranslations.ts —— 本文件是其纯 JS 移植
// （插件无构建步骤，无法直接 import TS）。两侧的键集合与译文需保持同步：
// 那边加了新词性映射，这边要跟着补。
(() => {
  const POS_TRANSLATIONS = {
    "zh-CN": {
      abbreviation: "缩略语",
      "noun or verb acting prenominally": "作连体修饰的名词或动词",
      "adjective (keiyoushi)": "形容词（い形容词）",
      "adjective (keiyoushi) - yoi/ii class": "形容词（よい/いい类）",
      "'kari' adjective (archaic)": "カリ活用形容词（古语）",
      "'ku' adjective (archaic)": "ク活用形容词（古语）",
      "adjectival nouns or quasi-adjectives (keiyodoshi)": "形容动词（な形容词）",
      "archaic/formal form of na-adjective": "ナリ活用形容词（古语/书面语）",
      "nouns which may take the genitive case particle 'no'": "可接「の」的名词",
      "pre-noun adjectival (rentaishi)": "连体词",
      "'shiku' adjective (archaic)": "シク活用形容词（古语）",
      "'taru' adjective": "タル形容词",
      "adverb (fukushi)": "副词",
      "adverb taking the 'to' particle": "可接「と」的副词",
      auxiliary: "助动词性成分",
      "auxiliary adjective": "补助形容词",
      "auxiliary verb": "助动词",
      conjunction: "连词",
      copula: "判断词（断定助动词）",
      counter: "量词",
      "expressions (phrases, clauses, etc.)": "惯用语/短语",
      "interjection (kandoushi)": "感叹词",
      "noun (common) (futsuumeishi)": "名词",
      "adverbial noun (fukushitekimeishi)": "副词性名词",
      "proper noun": "专有名词",
      "noun, used as a prefix": "用作前缀的名词",
      "noun, used as a suffix": "用作后缀的名词",
      "noun (temporal) (jisoumeishi)": "时间名词",
      numeric: "数词",
      pronoun: "代词",
      prefix: "前缀",
      particle: "助词",
      suffix: "后缀",
      unclassified: "未分类",
      "verb unspecified": "动词（类型不明）",
      "Ichidan verb": "二类动词/一段动词",
      "Ichidan verb - kureru special class": "二类动词/一段动词（くれる特殊型）",
      "Ichidan verb - zuru verb (alternative form of -jiru verbs)":
        "二类动词/一段动词（ずる/じる动词）",
      "Godan verb - -aru special class": "一类动词/五段动词（-aru特殊型）",
      "Godan verb with 'bu' ending": "一类动词/五段动词（ぶ结尾）",
      "Godan verb with 'gu' ending": "一类动词/五段动词（ぐ结尾）",
      "Godan verb with 'ku' ending": "一类动词/五段动词（く结尾）",
      "Godan verb - Iku/Yuku special class": "一类动词/五段动词（いく/ゆく特殊型）",
      "Godan verb with 'mu' ending": "一类动词/五段动词（む结尾）",
      "Godan verb with 'nu' ending": "一类动词/五段动词（ぬ结尾）",
      "Godan verb with 'ru' ending": "一类动词/五段动词（る结尾）",
      "Godan verb with 'ru' ending (irregular verb)": "一类动词/五段动词（る结尾，不规则）",
      "Godan verb with 'su' ending": "一类动词/五段动词（す结尾）",
      "Godan verb with 'tsu' ending": "一类动词/五段动词（つ结尾）",
      "Godan verb with 'u' ending": "一类动词/五段动词（う结尾）",
      "Godan verb with 'u' ending (special class)": "一类动词/五段动词（う结尾，特殊型）",
      "Godan verb - Uru old class verb (old form of Eru)":
        "一类动词/五段动词（うる古语，える的古形）",
      "intransitive verb": "自动词",
      "Kuru verb - special class": "来る特殊型动词",
      "irregular nu verb": "ナ行不规则动词",
      "irregular ru verb, plain form ends with -ri": "ラ行不规则动词（基本形以り结尾）",
      "noun or participle which takes the aux. verb suru": "三类动词/サ变动词（する动词）",
      "su verb - precursor to the modern suru": "古サ变动词（する的前身）",
      "suru verb - included": "三类动词/サ变动词（词条含する）",
      "suru verb - special class": "三类动词/サ变动词（特殊型）",
      "transitive verb": "他动词",
    },
    "zh-TW": {
      abbreviation: "縮略語",
      "noun or verb acting prenominally": "作連體修飾的名詞或動詞",
      "adjective (keiyoushi)": "形容詞（い形容詞）",
      "adjective (keiyoushi) - yoi/ii class": "形容詞（よい/いい類）",
      "'kari' adjective (archaic)": "カリ活用形容詞（古語）",
      "'ku' adjective (archaic)": "ク活用形容詞（古語）",
      "adjectival nouns or quasi-adjectives (keiyodoshi)": "形容動詞（な形容詞）",
      "archaic/formal form of na-adjective": "ナリ活用形容詞（古語/書面語）",
      "nouns which may take the genitive case particle 'no'": "可接「の」的名詞",
      "pre-noun adjectival (rentaishi)": "連體詞",
      "'shiku' adjective (archaic)": "シク活用形容詞（古語）",
      "'taru' adjective": "タル形容詞",
      "adverb (fukushi)": "副詞",
      "adverb taking the 'to' particle": "可接「と」的副詞",
      auxiliary: "助動詞性成分",
      "auxiliary adjective": "補助形容詞",
      "auxiliary verb": "助動詞",
      conjunction: "連詞",
      copula: "判斷詞（斷定助動詞）",
      counter: "量詞",
      "expressions (phrases, clauses, etc.)": "慣用語/短語",
      "interjection (kandoushi)": "感嘆詞",
      "noun (common) (futsuumeishi)": "名詞",
      "adverbial noun (fukushitekimeishi)": "副詞性名詞",
      "proper noun": "專有名詞",
      "noun, used as a prefix": "用作前綴的名詞",
      "noun, used as a suffix": "用作後綴的名詞",
      "noun (temporal) (jisoumeishi)": "時間名詞",
      numeric: "數詞",
      pronoun: "代詞",
      prefix: "前綴",
      particle: "助詞",
      suffix: "後綴",
      unclassified: "未分類",
      "verb unspecified": "動詞（類型不明）",
      "Ichidan verb": "二類動詞/一段動詞",
      "Ichidan verb - kureru special class": "二類動詞/一段動詞（くれる特殊型）",
      "Ichidan verb - zuru verb (alternative form of -jiru verbs)":
        "二類動詞/一段動詞（ずる/じる動詞）",
      "Godan verb - -aru special class": "一類動詞/五段動詞（-aru特殊型）",
      "Godan verb with 'bu' ending": "一類動詞/五段動詞（ぶ結尾）",
      "Godan verb with 'gu' ending": "一類動詞/五段動詞（ぐ結尾）",
      "Godan verb with 'ku' ending": "一類動詞/五段動詞（く結尾）",
      "Godan verb - Iku/Yuku special class": "一類動詞/五段動詞（いく/ゆく特殊型）",
      "Godan verb with 'mu' ending": "一類動詞/五段動詞（む結尾）",
      "Godan verb with 'nu' ending": "一類動詞/五段動詞（ぬ結尾）",
      "Godan verb with 'ru' ending": "一類動詞/五段動詞（る結尾）",
      "Godan verb with 'ru' ending (irregular verb)": "一類動詞/五段動詞（る結尾，不規則）",
      "Godan verb with 'su' ending": "一類動詞/五段動詞（す結尾）",
      "Godan verb with 'tsu' ending": "一類動詞/五段動詞（つ結尾）",
      "Godan verb with 'u' ending": "一類動詞/五段動詞（う結尾）",
      "Godan verb with 'u' ending (special class)": "一類動詞/五段動詞（う結尾，特殊型）",
      "Godan verb - Uru old class verb (old form of Eru)":
        "一類動詞/五段動詞（うる古語，える的古形）",
      "intransitive verb": "自動詞",
      "Kuru verb - special class": "来る特殊型動詞",
      "irregular nu verb": "ナ行不規則動詞",
      "irregular ru verb, plain form ends with -ri": "ラ行不規則動詞（基本形以り結尾）",
      "noun or participle which takes the aux. verb suru": "三類動詞/サ變動詞（する動詞）",
      "su verb - precursor to the modern suru": "古サ變動詞（する的前身）",
      "suru verb - included": "三類動詞/サ變動詞（詞條含する）",
      "suru verb - special class": "三類動詞/サ變動詞（特殊型）",
      "transitive verb": "他動詞",
    },
  };

  // Archaic Nidan/Yodan verb classes follow a regular pattern, e.g.
  // "Nidan verb (upper class) with 'gu' ending (archaic)".
  const NIDAN_RE =
    /^Nidan verb \((upper|lower) class\) with '(.+)' ending(?: and 'we' conjugation)? \(archaic\)$/;
  const YODAN_RE = /^Yodan verb with '(.+)' ending \(archaic\)$/;

  function translatePos(pos) {
    const locale = window.TomoshiJaDictI18n.getLocale();
    const known = POS_TRANSLATIONS[locale][pos];
    if (known) return known;

    const nidan = pos.match(NIDAN_RE);
    if (nidan) {
      const klass = nidan[1] === "upper" ? "上二段" : "下二段";
      return locale === "zh-TW"
        ? `二段動詞（${klass}，${nidan[2]}結尾，古語）`
        : `二段动词（${klass}，${nidan[2]}结尾，古语）`;
    }

    const yodan = pos.match(YODAN_RE);
    if (yodan) {
      return locale === "zh-TW"
        ? `四段動詞（${yodan[1]}結尾，古語）`
        : `四段动词（${yodan[1]}结尾，古语）`;
    }

    return pos;
  }

  window.TomoshiJaDictPos = {
    translatePosList: (pos) => pos.map(translatePos),
  };
})();
