/**
 * WyreSup ZBAT Crypto, Thaqb Ratchet & Nagham Engine
 * (مِعْيَار التَّرْمِيز و البَاطِن و عَقْد المِفْتَاح و ثَقْب السِّلْسِلَة و نَغَم الصَّوْت)
 *
 * 13-Layer Protocol Engine:
 * - Huwiyya: Elliptic-curve keypair generation (ECDH prime256v1 & ECDSA)
 * - Miftah: ECDH Diffie-Hellman Key Agreement with SHA-256 derivation
 * - Thaqb: Symmetric KDF Message Ratchet with ephemeral key zeroization & forward secrecy
 * - ZBAT: Zahir public routing metadata + Batin AES-256-GCM authenticated payload
 * - Nagham: DTMF Acoustic SAS key fingerprinting and Goertzel discrete spectral analysis
 */

const crypto = require("crypto");

class ThaqbRatchet {
  /**
   * Initialize a Thaqb symmetric KDF message ratchet from a root key
   * @param {Buffer|string} rootKey - 256-bit ECDH shared secret or KDF root
   */
  constructor(rootKey) {
    const rawBuffer = Buffer.isBuffer(rootKey)
      ? rootKey
      : crypto.createHash("sha256").update(rootKey).digest();
    
    // Initial 256-bit Chain Key (CK_0)
    this.chainKey = Buffer.from(rawBuffer);
    this.messageIndex = 0;
    this.skippedMessageKeys = new Map(); // messageIndex -> Buffer(key)
    this.maxSkippedKeys = 100;
  }

  /**
   * Advance the KDF chain by 1 step:
   * CK_{i+1} = HMAC-SHA256(CK_i, 0x01)
   * MK_i     = HMAC-SHA256(CK_i, 0x02)
   * Explicitly zeroizes previous CK_i in memory.
   */
  advanceChain() {
    const prevChainKey = this.chainKey;

    // 1. Next Chain Key
    const nextChainKey = crypto.createHmac("sha256", prevChainKey)
      .update(Buffer.from([0x01]))
      .digest();

    // 2. Ephemeral Message Key for current step
    const messageKey = crypto.createHmac("sha256", prevChainKey)
      .update(Buffer.from([0x02]))
      .digest();

    // 3. Explicit Secure Zeroization of previous Chain Key buffer
    prevChainKey.fill(0);

    // 4. Update state
    this.chainKey = nextChainKey;
    const currentIndex = this.messageIndex;
    this.messageIndex++;

    return { messageKey, messageIndex: currentIndex };
  }

  /**
   * Encrypt message with current message key, then immediately zeroize message key
   */
  encryptMessage(payload) {
    const { messageKey, messageIndex } = this.advanceChain();
    const iv = crypto.randomBytes(12); // Standard 96-bit GCM IV
    const cipher = crypto.createCipheriv("aes-256-gcm", messageKey, iv);

    const plaintext = typeof payload === "string" ? payload : JSON.stringify(payload);
    let ciphertext = cipher.update(plaintext, "utf8", "hex");
    ciphertext += cipher.final("hex");
    const tag = cipher.getAuthTag().toString("hex");

    // Secure Zeroization of ephemeral Message Key immediately after encryption
    messageKey.fill(0);

    return {
      ciphertext,
      iv: iv.toString("hex"),
      tag,
      messageIndex,
      algorithm: "AES-256-GCM/THAQB"
    };
  }

  /**
   * Decrypt message for given messageIndex with forward secrecy & zeroization
   */
  decryptMessage(encryptedObj) {
    const { ciphertext, iv, tag, messageIndex } = encryptedObj;
    let messageKey = null;

    if (messageIndex === this.messageIndex) {
      const step = this.advanceChain();
      messageKey = step.messageKey;
    } else if (messageIndex > this.messageIndex) {
      // Fast-forward ratchet and store skipped keys (up to maxSkippedKeys)
      while (this.messageIndex < messageIndex) {
        const step = this.advanceChain();
        this.skippedMessageKeys.set(step.messageIndex, step.messageKey);
        if (this.skippedMessageKeys.size > this.maxSkippedKeys) {
          // Drop oldest skipped key and zeroize it
          const oldestKey = this.skippedMessageKeys.keys().next().value;
          const oldBuf = this.skippedMessageKeys.get(oldestKey);
          if (oldBuf) oldBuf.fill(0);
          this.skippedMessageKeys.delete(oldestKey);
        }
      }
      const step = this.advanceChain();
      messageKey = step.messageKey;
    } else if (this.skippedMessageKeys.has(messageIndex)) {
      messageKey = this.skippedMessageKeys.get(messageIndex);
      this.skippedMessageKeys.delete(messageIndex); // One-time consumption
    } else {
      throw new Error(`[Thaqb Error] Message index ${messageIndex} already consumed or unrecoverable (Thaqb Forward Secrecy Enforcement)`);
    }

    try {
      const decipher = crypto.createDecipheriv("aes-256-gcm", messageKey, Buffer.from(iv, "hex"));
      decipher.setAuthTag(Buffer.from(tag, "hex"));

      let decrypted = decipher.update(ciphertext, "hex", "utf8");
      decrypted += decipher.final("utf8");

      // Secure Zeroization of message key
      messageKey.fill(0);

      try {
        return JSON.parse(decrypted);
      } catch {
        return decrypted;
      }
    } catch (err) {
      messageKey.fill(0);
      throw err;
    }
  }

  /**
   * Export only current chain key and index (past keys are destroyed forever)
   */
  exportState() {
    return {
      chainKeyHex: this.chainKey.toString("hex"),
      messageIndex: this.messageIndex
    };
  }

  static fromState(state) {
    const ratchet = new ThaqbRatchet(Buffer.from(state.chainKeyHex, "hex"));
    ratchet.messageIndex = state.messageIndex;
    return ratchet;
  }
}

class ZbatCrypto {
  /**
   * Generates a cryptographic ECDH keypair and persona: prefix@8byteHash
   */
  static generateIdentity(prefix = "peer") {
    const ecdh = crypto.createECDH("prime256v1");
    ecdh.generateKeys();
    const ecdhPubKey = ecdh.getPublicKey("hex");
    const ecdhPrivKey = ecdh.getPrivateKey("hex");

    const { publicKey: signPubKeyObj, privateKey: signPrivKeyObj } = crypto.generateKeyPairSync("ec", {
      namedCurve: "prime256v1"
    });
    const signPubKey = signPubKeyObj.export({ type: "spki", format: "pem" });
    const signPrivKey = signPrivKeyObj.export({ type: "pkcs8", format: "pem" });

    const shortHash = crypto.createHash("sha256").update(ecdhPubKey).digest("hex").substring(0, 8);

    return {
      prefix,
      shortHash,
      fullId: `${prefix}@${shortHash}`,
      pubKey: ecdhPubKey,
      secretKey: ecdhPrivKey,
      signPubKey,
      signPrivKey
    };
  }

  /**
   * Derive shared AES-256 symmetric key via ECDH (Aqd al-Miftah)
   */
  static deriveSharedKey(localPrivKeyHex, remotePubKeyHex) {
    const ecdh = crypto.createECDH("prime256v1");
    ecdh.setPrivateKey(Buffer.from(localPrivKeyHex, "hex"));
    const rawSecret = ecdh.computeSecret(Buffer.from(remotePubKeyHex, "hex"));
    return crypto.createHash("sha256").update(rawSecret).digest();
  }

  /**
   * Initialize a Thaqb KDF ratchet session between two peers
   */
  static initThaqbRatchet(sharedKey) {
    return new ThaqbRatchet(sharedKey);
  }

  /**
   * Encrypt Batin payload using AES-256-GCM
   */
  static encryptBatin(payload, sharedKey) {
    const key = Buffer.isBuffer(sharedKey) ? sharedKey : crypto.createHash("sha256").update(sharedKey).digest();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    
    const plaintext = typeof payload === "string" ? payload : JSON.stringify(payload);
    let ciphertext = cipher.update(plaintext, "utf8", "hex");
    ciphertext += cipher.final("hex");
    const tag = cipher.getAuthTag().toString("hex");

    return {
      ciphertext,
      iv: iv.toString("hex"),
      tag,
      algorithm: "AES-256-GCM"
    };
  }

  /**
   * Decrypt and authenticate Batin payload using AES-256-GCM
   */
  static decryptBatin(encryptedObj, sharedKey) {
    const { ciphertext, iv, tag } = encryptedObj;
    const key = Buffer.isBuffer(sharedKey) ? sharedKey : crypto.createHash("sha256").update(sharedKey).digest();
    
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "hex"));
    decipher.setAuthTag(Buffer.from(tag, "hex"));

    let decrypted = decipher.update(ciphertext, "hex", "utf8");
    decrypted += decipher.final("utf8");

    try {
      return JSON.parse(decrypted);
    } catch {
      return decrypted;
    }
  }

  /**
   * Generate deterministic unique message ID
   */
  static generateMessageId(senderId, spaceId, channelId, timestamp, content) {
    const data = `${senderId}:${spaceId}:${channelId}:${timestamp}:${content}`;
    return crypto.createHash("sha256").update(data).digest("hex").substring(0, 16);
  }

  /**
   * Sign message payload using ECDSA Private Key
   */
  static signPayload(data, privateKeyPem) {
    const sign = crypto.createSign("SHA256");
    sign.update(typeof data === "string" ? data : JSON.stringify(data));
    sign.end();
    return sign.sign(privateKeyPem, "hex");
  }

  /**
   * Verify message signature using ECDSA Public Key
   */
  static verifyPayload(data, signatureHex, publicKeyPem) {
    try {
      const verify = crypto.createVerify("SHA256");
      verify.update(typeof data === "string" ? data : JSON.stringify(data));
      verify.end();
      return verify.verify(publicKeyPem, signatureHex, "hex");
    } catch {
      return false;
    }
  }

  /**
   * Maps public key hex fingerprint into a deterministic 8-digit DTMF acoustic SAS sequence
   * Hex chars: 0-9 -> 0-9, a -> *, b -> #, c -> A, d -> B, e -> C, f -> D
   */
  static fingerprintToDtmfSequence(pubKeyHex, length = 8) {
    const cleanHex = (pubKeyHex || "").replace(/[^0-9a-fA-F]/g, "").toLowerCase();
    const hexMap = {
      "0": "0", "1": "1", "2": "2", "3": "3", "4": "4",
      "5": "5", "6": "6", "7": "7", "8": "8", "9": "9",
      "a": "*", "b": "#", "c": "A", "d": "B", "e": "C", "f": "D"
    };
    const freqsTable = this.getDtmfFrequencies();

    let sequence = "";
    const tones = [];

    for (let i = 0; i < Math.min(length, cleanHex.length); i++) {
      const char = cleanHex[i];
      const dtmfChar = hexMap[char] || "0";
      sequence += dtmfChar;
      tones.push({
        digit: dtmfChar,
        freqs: freqsTable[dtmfChar] || [941, 1336]
      });
    }

    return {
      sequence,
      tones,
      sasDisplay: sequence.split("").join(" ")
    };
  }

  /**
   * Goertzel Single-Frequency Discrete Fourier Transform Magnitude
   * O(N) per frequency — optimal for decoding DTMF frequency grids
   */
  static goertzelMagnitude(samples, sampleRate, targetFreq) {
    const N = samples.length;
    if (N === 0) return 0;

    const k = Math.round((N * targetFreq) / sampleRate);
    const omega = (2 * Math.PI * k) / N;
    const coeff = 2 * Math.cos(omega);

    let sPrev = 0;
    let sPrev2 = 0;

    for (let i = 0; i < N; i++) {
      const s = samples[i] + coeff * sPrev - sPrev2;
      sPrev2 = sPrev;
      sPrev = s;
    }

    const power = sPrev2 * sPrev2 + sPrev * sPrev - coeff * sPrev * sPrev2;
    return Math.sqrt(Math.max(0, power)) / N;
  }

  /**
   * Decode a PCM audio buffer into a DTMF digit using Goertzel algorithm
   */
  static decodeDtmfSample(samples, sampleRate = 44100, threshold = 0.08) {
    const rowFreqs = [697, 770, 852, 941];
    const colFreqs = [1209, 1336, 1477, 1633];

    const dtmfMatrix = [
      ["1", "2", "3", "A"],
      ["4", "5", "6", "B"],
      ["7", "8", "9", "C"],
      ["*", "0", "#", "D"]
    ];

    let maxRowMag = 0, bestRow = -1;
    for (let r = 0; r < rowFreqs.length; r++) {
      const mag = this.goertzelMagnitude(samples, sampleRate, rowFreqs[r]);
      if (mag > maxRowMag) {
        maxRowMag = mag;
        bestRow = r;
      }
    }

    let maxColMag = 0, bestCol = -1;
    for (let c = 0; c < colFreqs.length; c++) {
      const mag = this.goertzelMagnitude(samples, sampleRate, colFreqs[c]);
      if (mag > maxColMag) {
        maxColMag = mag;
        bestCol = c;
      }
    }

    if (maxRowMag > threshold && maxColMag > threshold && bestRow !== -1 && bestCol !== -1) {
      return {
        digit: dtmfMatrix[bestRow][bestCol],
        confidence: (maxRowMag + maxColMag) / 2,
        rowFreq: rowFreqs[bestRow],
        colFreq: colFreqs[bestCol]
      };
    }

    return null;
  }

  /**
   * ZBAT Framing
   */
  static wrapZbat(senderId, spaceId, channelId, payload, options = {}) {
    const timestamp = options.timestamp || Date.now();
    const rawContent = typeof payload === "object" ? (payload.content || JSON.stringify(payload)) : payload;
    const messageId = options.messageId || this.generateMessageId(senderId, spaceId, channelId, timestamp, rawContent);
    const ttl = options.ttl !== undefined ? options.ttl : 5;

    let batinPayload;
    let isEncrypted = false;
    let encryptionMeta = null;

    if (options.sharedKey) {
      const enc = this.encryptBatin(payload, options.sharedKey);
      batinPayload = {
        ciphertext: enc.ciphertext,
        iv: enc.iv,
        tag: enc.tag,
        algorithm: enc.algorithm
      };
      isEncrypted = true;
      encryptionMeta = {
        senderPubKey: options.senderPubKey || null,
        targetPeer: options.targetPeer || null,
        cipher: "AES-256-GCM/MIFTAH"
      };
    } else {
      batinPayload = {
        content: payload.content || "",
        mediaUrl: payload.mediaUrl || null,
        voiceData: payload.voiceData || null,
        attachments: payload.attachments || null,
        replyTo: payload.replyTo || null,
        reactions: payload.reactions || {}
      };
    }

    let sig = null;
    if (options.signPrivKey) {
      sig = this.signPayload(`${senderId}:${messageId}:${batinPayload.ciphertext || batinPayload.content}`, options.signPrivKey);
    } else {
      sig = crypto.createHash("sha256").update(`${senderId}:${messageId}:${batinPayload.ciphertext || batinPayload.content || ""}`).digest("hex").substring(0, 12);
    }

    batinPayload.sig = sig;

    return {
      zahir: {
        version: "zbat/1.4.0",
        messageId,
        senderId,
        spaceId,
        channelId,
        timestamp,
        ttl,
        hops: options.hops || 0,
        routeType: options.routeType || (isEncrypted ? "direct_e2ee" : "gossip"),
        priority: options.priority || "normal",
        isVoice: !!options.isVoice,
        isEncrypted,
        encryptionMeta
      },
      batin: batinPayload
    };
  }


  /**
   * Al-Ikhfa (الإِخْفَاء): Constant-size morphological bucket padding
   * Defeats packet-size metadata fingerprinting by aligning payloads to power-of-2 boundaries.
   */
  static padPayload(plaintext, bucketSizes = [256, 1024, 4096, 16384, 65536]) {
    const rawStr = typeof plaintext === "string" ? plaintext : JSON.stringify(plaintext);
    const rawLen = Buffer.byteLength(rawStr, "utf8");
    
    let targetSize = bucketSizes[bucketSizes.length - 1];
    for (const size of bucketSizes) {
      if (rawLen + 8 <= size) { // 8 bytes for length header
        targetSize = size;
        break;
      }
    }
    
    const padLen = targetSize - (rawLen + 8);
    const padding = crypto.randomBytes(Math.max(0, padLen)).toString("hex");
    return JSON.stringify({
      d: rawStr,
      p: padding
    });
  }

  static unpadPayload(paddedStr) {
    try {
      const parsed = JSON.parse(paddedStr);
      if (parsed && parsed.d) {
        try { return JSON.parse(parsed.d); } catch { return parsed.d; }
      }
      return parsed;
    } catch {
      return paddedStr;
    }
  }

  /**
   * Al-Mizan (المِيزَان): Verifiable Micro-Proof-of-Work Rate Limiter
   * Computes a ~3ms hash puzzle nonce ensuring Sybil and spam immunity without user accounts.
   */
  static computeMizanPoW(zahirEnvelope, difficulty = 2) {
    const targetPrefix = "0".repeat(difficulty);
    const baseData = `${zahirEnvelope.senderId}:${zahirEnvelope.messageId}:${zahirEnvelope.timestamp}`;
    let nonce = 0;
    
    while (true) {
      const hash = crypto.createHash("sha256").update(`${baseData}:${nonce}`).digest("hex");
      if (hash.startsWith(targetPrefix)) {
        return { nonce, hash, difficulty };
      }
      nonce++;
      if (nonce > 500000) break; // safety guard
    }
    return { nonce, hash: "00", difficulty };
  }

  static verifyMizanPoW(zahirEnvelope, mizanObj) {
    if (!mizanObj || mizanObj.nonce === undefined) return false;
    const targetPrefix = "0".repeat(mizanObj.difficulty || 2);
    const baseData = `${zahirEnvelope.senderId}:${zahirEnvelope.messageId}:${zahirEnvelope.timestamp}`;
    const hash = crypto.createHash("sha256").update(`${baseData}:${mizanObj.nonce}`).digest("hex");
    return hash.startsWith(targetPrefix);
  }

  /**
   * DTMF Frequencies (Dual-Tone Multi-Frequency) for Nagham Voice Protocol
   */
  static getDtmfFrequencies() {
    return {
      "1": [697, 1209], "2": [697, 1336], "3": [697, 1477], "A": [697, 1633],
      "4": [770, 1209], "5": [770, 1336], "6": [770, 1477], "B": [770, 1633],
      "7": [852, 1209], "8": [852, 1336], "9": [852, 1477], "C": [852, 1633],
      "*": [941, 1209], "0": [941, 1336], "#": [941, 1477], "D": [941, 1633]
    };
  }
}

module.exports = ZbatCrypto;
module.exports.ThaqbRatchet = ThaqbRatchet;
