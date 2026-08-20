/**
 * WyreSup Shabah (شَبَح) - Steganographic Covert Layer
 * Grounded in Ibn Manzur's Lisan al-Arab: "شَبَحَ: الظِّلُّ أَوِ الشَّخْصُ الَّذِي يُرَى مِنْ بَعِيدٍ وَلَا يُسْتَبَانُ حَقِيقَتُهُ"
 *
 * Implements:
 * 1. Waswas (وَسْوَس): Zero-Width Unicode Steganography (hides binary encrypted ZBAT packets inside ordinary text)
 * 2. Ramz (رَمْز): Emoji-Carrier Steganography
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

class ShabahStego {
  /**
   * Hide binary or text payload inside innocent cover text using invisible Unicode characters (Waswas)
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

    // Embed invisible sequence right after first word or at midpoint
    const words = coverText.split(" ");
    if (words.length > 1) {
      words[0] = words[0] + zeroWidthSeq;
      return words.join(" ");
    }
    return coverText + zeroWidthSeq;
  }

  /**
   * Extract and decode hidden payload from text containing zero-width characters
   */
  static extractFromText(stegoText) {
    const zwChars = [ZERO_WIDTH.SPACE, ZERO_WIDTH.JOINER, ZERO_WIDTH.NON_JOINER, ZERO_WIDTH.LEFT_MARK];
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
}

module.exports = ShabahStego;
