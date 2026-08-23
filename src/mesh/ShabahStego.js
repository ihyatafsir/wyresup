/**
 * WyreSup Shabah (شَبَح) - Classical Arabic Linguistic & Steganographic Transport Layer
 * Grounded in Ibn Manzur's Lisān al-'Arab:
 * "شَبَحَ: الظِّلُّ أَوِ الشَّخْصُ الَّذِي يُرَى مِنْ بَعِيدٍ وَلَا يُسْتَبَانُ حَقِيقَتُهُ"
 *
 * Implements:
 * 1. LisanRootStego (اللِّسَانُ المَسْتُور): Classical Arabic 256-Root Byte Carrier Encoding
 * 2. Waswas (وَسْوَس): Zero-Width Unicode Steganography with Randomized Multi-Word Dispersal
 * 3. Ramz (رَمْز): Visual Carrier Steganography
 */

// 256 Classical Arabic Roots from Lisan al-'Arab (1 Byte = 1 Classical Root Word)
const LISAN_ROOTS_256 = [
  "علم",
  "نور",
  "حكم",
  "فتح",
  "شفع",
  "نفق",
  "سرر",
  "بصر",
  "كشف",
  "حقق",
  "عقل",
  "روح",
  "عدل",
  "امن",
  "صبح",
  "ليل",
  "قمر",
  "شمس",
  "نجم",
  "فلك",
  "ارض",
  "سما",
  "بحر",
  "نهر",
  "جبل",
  "شجر",
  "ثمر",
  "زهر",
  "غيث",
  "مطر",
  "سحب",
  "ريح",
  "نسم",
  "طيب",
  "مسك",
  "عطر",
  "صفا",
  "نقا",
  "طهر",
  "قدس",
  "مجد",
  "حمد",
  "شكر",
  "ذكر",
  "فكر",
  "نظر",
  "سمع",
  "نطق",
  "كتب",
  "قرا",
  "رسم",
  "سبك",
  "حبك",
  "ثقب",
  "رتق",
  "صدع",
  "وصل",
  "فصل",
  "جمع",
  "فرق",
  "نظم",
  "رتب",
  "عقد",
  "حلل",
  "سلك",
  "نهج",
  "صنع",
  "بدع",
  "خلق",
  "صور",
  "نقش",
  "بنى",
  "شيد",
  "رفع",
  "علا",
  "بلغ",
  "فصح",
  "بيان",
  "لسان",
  "صوت",
  "نغم",
  "وقع",
  "لحن",
  "حرف",
  "لفظ",
  "معنى",
  "فهم",
  "درك",
  "يقن",
  "صدق",
  "برر",
  "وفا",
  "عهد",
  "ذمم",
  "حفظ",
  "صون",
  "حرس",
  "كلا",
  "ستر",
  "خفى",
  "غيب",
  "حجب",
  "رمز",
  "كنى",
  "لغز",
  "عجم",
  "وضح",
  "جلا",
  "ضيا",
  "اشرق",
  "سطع",
  "لمع",
  "برق",
  "شعش",
  "تالق",
  "وهج",
  "قبس",
  "شعل",
  "سراج",
  "منار",
  "فجر",
  "شفق",
  "غسق",
  "سحر",
  "نفس",
  "قلب",
  "فؤاد",
  "صدر",
  "لبب",
  "نهى",
  "حلم",
  "صبر",
  "شجع",
  "بسل",
  "نجد",
  "عزم",
  "حزم",
  "قوى",
  "متن",
  "شدد",
  "عزز",
  "كرم",
  "جود",
  "سخا",
  "بذل",
  "عطا",
  "منح",
  "وهب",
  "فضل",
  "خير",
  "برك",
  "نعم",
  "هنأ",
  "سعد",
  "فرح",
  "بشر",
  "انس",
  "ودد",
  "عطف",
  "حنو",
  "رحم",
  "لطف",
  "رفق",
  "سهل",
  "يسر",
  "عون",
  "غوث",
  "سند",
  "ظفر",
  "فوز",
  "نصر",
  "غلب",
  "سود",
  "ملك",
  "قضى",
  "امر",
  "رعى",
  "ساس",
  "دبر",
  "صلح",
  "عمر",
  "نبت",
  "زرع",
  "حصد",
  "كسب",
  "ربح",
  "تجر",
  "وفد",
  "سفر",
  "رحل",
  "سار",
  "قدم",
  "رجع",
  "اوَى",
  "سكن",
  "قام",
  "نزل",
  "دار",
  "بيت",
  "قصر",
  "حصن",
  "سور",
  "باب",
  "مفتاح",
  "قفل",
  "سد",
  "وثق",
  "ربط",
  "حبل",
  "عروة",
  "عصم",
  "طرق",
  "سبيل",
  "صراط",
  "هدى",
  "رشد",
  "سدد",
  "صوب",
  "قصد",
  "قسط",
  "وزن",
  "ميزان",
  "كيل",
  "قدر",
  "حسب",
  "عدّ",
  "حصى",
  "شمل",
  "الف",
  "وفق",
  "لائم",
  "طابق",
  "وافق",
  "سلم",
  "سلام",
  "امان",
  "عافية",
  "شفاء",
  "حياة",
  "بقاء",
  "ذخر",
  "كنز",
  "درر",
  "ياقوت",
  "زمرد",
  "ذهب",
  "فضة",
  "جوهر",
  "عين",
  "نبع",
  "كوثر",
  "سلسبيل",
  "تسنيم",
  "فردوس",
  "جنان",
  "روض"
];

// Inverted Map for O(1) Fast Decoding
const LISAN_ROOT_TO_BYTE = new Map();
LISAN_ROOTS_256.forEach((root, idx) => {
  LISAN_ROOT_TO_BYTE.set(root, idx);
});

const ZERO_WIDTH = {
  SPACE: "\u200B",      // 00
  JOINER: "\u200D",     // 01
  NON_JOINER: "\u200C", // 10
  LEFT_MARK: "\u200E"   // 11
};

const BIT_TO_ZW = {
  "00": ZERO_WIDTH.SPACE,
  "01": ZERO_WIDTH.JOINER,
  "10": ZERO_WIDTH.NON_JOINER,
  "11": ZERO_WIDTH.LEFT_MARK
};

const ZW_TO_BIT = {
  "\u200B": "00",
  "\u200D": "01",
  "\u200C": "10",
  "\u200E": "11"
};

// Legacy emoji carrier dictionary
const EMOJI_CARRIERS = [
  "✨", "🌿", "🕊️", "🌙", "🌊", "⭐", "🍃", "💎",
  "🌸", "🔥", "🛡️", "📜", "🪐", "⚡", "🔮", "🏔️"
];

// Helper: Strip Arabic diacritics and tatweel for robust token matching
function normalizeArabicToken(token) {
  if (!token) return "";
  return token
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "") // remove tashkeel & tatweel
    .replace(/[\u0622\u0623\u0625]/g, "ا")       // normalize alef
    .replace(/[.,:;،؟!\[\]()\"\']/g, "")        // remove punctuation
    .trim();
}

class ShabahStego {
  /**
   * =========================================================================
   * 📜 LisanRootStego (اللِّسَانُ المَسْتُور): Arabic Root Word Steganography
   * Encodes 1 Byte per Classical Arabic Root (8 bits/word) from Lisan al-'Arab
   * Framing: [2-Byte Length Header Roots] + [Payload Data Roots]
   * =========================================================================
   */
  static hideInLisanRoots(secretPayload, preamble = "بَيَانُ الحِكْمَةِ المَأْثُورَةِ:") {
    const payloadStr = typeof secretPayload === "string" ? secretPayload : JSON.stringify(secretPayload);
    const buf = Buffer.from(payloadStr, "utf8");

    // 2-Byte length header (Big Endian)
    const lenHigh = (buf.length >> 8) & 0xFF;
    const lenLow = buf.length & 0xFF;

    const words = [LISAN_ROOTS_256[lenHigh], LISAN_ROOTS_256[lenLow]];
    for (let i = 0; i < buf.length; i++) {
      words.push(LISAN_ROOTS_256[buf[i]]);
    }

    return `${preamble} :: ${words.join(" ")}`;
  }

  /**
   * Extract and decode binary payload from Classical Arabic Root Word sequence
   */
  static extractFromLisanRoots(stegoArabicText) {
    if (!stegoArabicText || typeof stegoArabicText !== "string") return null;

    // Isolate payload section if separator is present
    let bodyText = stegoArabicText;
    if (stegoArabicText.includes("::")) {
      bodyText = stegoArabicText.split("::")[1].trim();
    } else if (stegoArabicText.includes("\n\n")) {
      bodyText = stegoArabicText.split("\n\n").slice(1).join(" ").trim();
    }

    // Split text into tokens and normalize
    const rawTokens = bodyText.split(/\s+/);
    const matchedBytes = [];

    for (const rawToken of rawTokens) {
      const normalized = normalizeArabicToken(rawToken);
      if (LISAN_ROOT_TO_BYTE.has(normalized)) {
        matchedBytes.push(LISAN_ROOT_TO_BYTE.get(normalized));
      }
    }

    if (matchedBytes.length < 2) return null;

    // Extract length header
    const expectedLen = (matchedBytes[0] << 8) | matchedBytes[1];
    const dataBytes = matchedBytes.slice(2, 2 + expectedLen);

    if (dataBytes.length !== expectedLen) {
      // Fallback to all matched bytes if length header mismatch
      const fullBuf = Buffer.from(matchedBytes);
      try {
        const decodedStr = fullBuf.toString("utf8");
        try { return JSON.parse(decodedStr); } catch { return decodedStr; }
      } catch {}
      return null;
    }

    const buf = Buffer.from(dataBytes);
    try {
      const decodedStr = buf.toString("utf8");
      try { return JSON.parse(decodedStr); } catch { return decodedStr; }
    } catch {
      return null;
    }
  }

  /**
   * =========================================================================
   * 👻 Waswas (وَسْوَس): Zero-Width Unicode Steganography
   * =========================================================================
   */
  static hideInText(coverText, secretPayload) {
    const payloadStr = typeof secretPayload === "string" ? secretPayload : JSON.stringify(secretPayload);
    const buf = Buffer.from(payloadStr, "utf8");

    let binaryStr = "";
    for (let i = 0; i < buf.length; i++) {
      binaryStr += buf[i].toString(2).padStart(8, "0");
    }

    let zeroWidthSeq = "";
    for (let i = 0; i < binaryStr.length; i += 2) {
      const bitPair = binaryStr.substring(i, i + 2);
      zeroWidthSeq += BIT_TO_ZW[bitPair] || ZERO_WIDTH.SPACE;
    }

    const words = coverText.split(" ");
    if (words.length <= 1) {
      return coverText + zeroWidthSeq;
    }

    const chunkSize = Math.ceil(zeroWidthSeq.length / (words.length - 1));
    let result = "";

    for (let i = 0; i < words.length; i++) {
      result += words[i];
      if (i < words.length - 1) {
        const chunk = zeroWidthSeq.substring(i * chunkSize, (i + 1) * chunkSize);
        result += chunk + " ";
      }
    }

    return result;
  }

  static extractFromText(stegoText) {
    let bitStr = "";
    for (let i = 0; i < stegoText.length; i++) {
      const char = stegoText[i];
      if (ZW_TO_BIT[char]) {
        bitStr += ZW_TO_BIT[char];
      }
    }

    if (bitStr.length < 8) return null;

    const byteCount = Math.floor(bitStr.length / 8);
    const bytes = Buffer.alloc(byteCount);

    for (let i = 0; i < byteCount; i++) {
      const byteBits = bitStr.substring(i * 8, (i + 1) * 8);
      bytes[i] = parseInt(byteBits, 2);
    }

    try {
      const decodedStr = bytes.toString("utf8");
      try { return JSON.parse(decodedStr); } catch { return decodedStr; }
    } catch {
      return null;
    }
  }

  /**
   * =========================================================================
   * 🌟 Legacy Al-Ramz (الرَّمْز): Emoji Sequence Carrier
   * =========================================================================
   */
  static hideInEmojiSequence(secretPayload, prefixMessage = "Mesh Telemetry Verified") {
    const payloadStr = typeof secretPayload === "string" ? secretPayload : JSON.stringify(secretPayload);
    const buf = Buffer.from(payloadStr, "utf8");

    let emojiSeq = "";
    for (let i = 0; i < buf.length; i++) {
      const byte = buf[i];
      const highNibble = (byte >> 4) & 0x0F;
      const lowNibble = byte & 0x0F;
      emojiSeq += EMOJI_CARRIERS[highNibble] + EMOJI_CARRIERS[lowNibble];
    }

    return `${prefixMessage} ${emojiSeq}`;
  }

  static extractFromEmojiSequence(stegoText) {
    const carrierMap = new Map();
    EMOJI_CARRIERS.forEach((emoji, idx) => carrierMap.set(emoji, idx));

    const matchedNibbles = [];
    for (const [emoji, nibbleVal] of carrierMap.entries()) {
      let pos = 0;
      while ((pos = stegoText.indexOf(emoji, pos)) !== -1) {
        matchedNibbles.push({ pos, nibbleVal });
        pos += emoji.length;
      }
    }

    matchedNibbles.sort((a, b) => a.pos - b.pos);

    if (matchedNibbles.length < 2 || matchedNibbles.length % 2 !== 0) {
      return null;
    }

    const byteCount = matchedNibbles.length / 2;
    const bytes = Buffer.alloc(byteCount);

    for (let i = 0; i < byteCount; i++) {
      const high = matchedNibbles[i * 2].nibbleVal;
      const low = matchedNibbles[i * 2 + 1].nibbleVal;
      bytes[i] = (high << 4) | low;
    }

    try {
      const decodedStr = bytes.toString("utf8");
      try { return JSON.parse(decodedStr); } catch { return decodedStr; }
    } catch {
      return null;
    }
  }
}

module.exports = ShabahStego;
