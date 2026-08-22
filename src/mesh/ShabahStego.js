/**
 * WyreSup Shabah (شَبَح) - Steganographic Covert Transport Layer
 * Grounded in Ibn Manzur's Lisan al-Arab: "شَبَحَ: الظِّلُّ أَوِ الشَّخْصُ الَّذِي يُرَى مِنْ بَعِيدٍ وَلَا يُسْتَبَانُ حَقِيقَتُهُ"
 *
 * Implements:
 * 1. Waswas (وَسْوَس): Zero-Width Unicode Steganography with Randomized Multi-Word Dispersal
 * 2. Ramz (رَمْز): Visual Emoji-Carrier Steganography using natural emoji variation sequences
 */

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

// Natural emoji carrier dictionary for Al-Ramz (الرَّمْز)
const EMOJI_CARRIERS = [
  "✨", "🌿", "🕊️", "🌙", "🌊", "⭐", "🍃", "💎",
  "🌸", "🔥", "🛡️", "📜", "🪐", "⚡", "🔮", "🏔️"
];

class ShabahStego {
  /**
   * Waswas (وَسْوَس): Hide payload inside cover text with randomized multi-word dispersal
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

    // Disperse zero-width characters evenly across multiple word boundaries
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

  /**
   * Extract and decode hidden payload from text containing zero-width characters
   */
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
   * Al-Ramz (الرَّمْز): Hide binary payload inside a natural sequence of carrier emojis
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

  /**
   * Al-Ramz (الرَّمْز): Extract and decode binary payload from emoji sequence
   */
  static extractFromEmojiSequence(stegoText) {
    const carrierMap = new Map();
    EMOJI_CARRIERS.forEach((emoji, idx) => carrierMap.set(emoji, idx));

    // Extract all recognized carrier emojis
    const matchedNibbles = [];
    for (const [emoji, nibbleVal] of carrierMap.entries()) {
      let pos = 0;
      while ((pos = stegoText.indexOf(emoji, pos)) !== -1) {
        matchedNibbles.push({ pos, nibbleVal });
        pos += emoji.length;
      }
    }

    // Sort by order of appearance
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
