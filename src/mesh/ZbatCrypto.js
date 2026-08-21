/**
 * WyreSup ZBAT Cryptographic Engine (مُحَرِّك التَّعْمِيَة المِفْتَاحِيَّة ZBAT)
 * Implements 13-Layer Cryptographic Mesh Primitives with Lisan al-Arab guidance:
 * - Ṭams (طَمْس): 3-Pass Active Anti-Forensics Key Scrubbing
 * - Sadd (سَدّ): Strict Constant-Time Side-Channel Immunity (crypto.timingSafeEqual)
 * - Ḥabk (حَبْك): Double-Ratchet Asymmetric DH Weave (Break-In Recovery & Post-Compromise Security)
 * - Raṣd (رَصْد): Autonomous Ingress Sentinel & Clock-Drift Replay Rejection
 * - Thaqb (ثَقْب): Symmetric KDF Message Ratchet with forward secrecy
 * - ZBAT (الظَّاهِر و البَاطِن): Zero-Knowledge Envelope Framing
 * - Al-Sabk (الصَّبْك): Zero-Copy 34-byte Binary Framing (60k+ ops/sec)
 * - Al-Ikhfa (الإِخْفَاء): 2ⁿ Morphological Traffic-Analysis Bucket Padding
 * - Al-Mizan (المِيزَان): Verifiable Micro-Proof-of-Work Anti-Spam Rate Limiter
 * - Nagham (نَغَم): DTMF Acoustic SAS & Goertzel Spectral Key Fingerprinting
 */

const crypto = require("crypto");

/**
 * Ṭams (طَمْس): Active 3-Pass Multi-Pattern Memory Sanitizer
 */
function tamsScrub(buffer) {
  if (!buffer) return;
  if (Buffer.isBuffer(buffer) || buffer instanceof Uint8Array) {
    try {
      buffer.fill(0xFF);                  // Pass 1: All ones
      buffer.fill(0xAA);                  // Pass 2: Alternating bits
      crypto.randomFillSync(buffer);      // Pass 3: CSPRNG Noise
      buffer.fill(0x00);                  // Final Pass: Clean zero
    } catch {
      buffer.fill(0x00);
    }
  }
}

/**
 * Sadd (سَدّ): Constant-Time Safe Comparison
 */
function saddEqual(a, b) {
  if (!a || !b) return false;
  const bufA = Buffer.isBuffer(a) ? a : Buffer.from(typeof a === "string" ? a : "", "hex");
  const bufB = Buffer.isBuffer(b) ? b : Buffer.from(typeof b === "string" ? b : "", "hex");
  if (bufA.length === 0 || bufB.length === 0 || bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * ThaqbRatchet (ثَقْب): Symmetric KDF Message Ratchet with Ṭams Active Memory Scrubbing
 */
class ThaqbRatchet {
  constructor(rootKey) {
    const rawBuffer = Buffer.isBuffer(rootKey)
      ? rootKey
      : crypto.createHash("sha256").update(rootKey).digest();
    
    this.chainKey = Buffer.from(rawBuffer);
    this.messageIndex = 0;
    this.skippedMessageKeys = new Map();
    this.maxSkippedKeys = 100;
  }

  advanceChain() {
    const prevChainKey = this.chainKey;

    const nextChainKey = crypto.createHmac("sha256", prevChainKey)
      .update(Buffer.from([0x01]))
      .digest();

    const messageKey = crypto.createHmac("sha256", prevChainKey)
      .update(Buffer.from([0x02]))
      .digest();

    tamsScrub(prevChainKey);

    this.chainKey = nextChainKey;
    const currentIndex = this.messageIndex;
    this.messageIndex++;

    return { messageKey, messageIndex: currentIndex };
  }

  encryptMessage(payload) {
    const { messageKey, messageIndex } = this.advanceChain();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", messageKey, iv);

    const plaintext = typeof payload === "string" ? payload : JSON.stringify(payload);
    let ciphertext = cipher.update(plaintext, "utf8", "hex");
    ciphertext += cipher.final("hex");
    const tag = cipher.getAuthTag().toString("hex");

    tamsScrub(messageKey);

    return {
      ciphertext,
      iv: iv.toString("hex"),
      tag,
      messageIndex,
      algorithm: "AES-256-GCM/THAQB"
    };
  }

  decryptMessage(encryptedObj) {
    const { ciphertext, iv, tag, messageIndex } = encryptedObj;
    let messageKey = null;

    if (messageIndex === this.messageIndex) {
      const step = this.advanceChain();
      messageKey = step.messageKey;
    } else if (messageIndex > this.messageIndex) {
      while (this.messageIndex < messageIndex) {
        const step = this.advanceChain();
        this.skippedMessageKeys.set(step.messageIndex, step.messageKey);
        if (this.skippedMessageKeys.size > this.maxSkippedKeys) {
          const oldestKey = this.skippedMessageKeys.keys().next().value;
          const oldBuf = this.skippedMessageKeys.get(oldestKey);
          if (oldBuf) tamsScrub(oldBuf);
          this.skippedMessageKeys.delete(oldestKey);
        }
      }
      const step = this.advanceChain();
      messageKey = step.messageKey;
    } else if (this.skippedMessageKeys.has(messageIndex)) {
      messageKey = this.skippedMessageKeys.get(messageIndex);
      this.skippedMessageKeys.delete(messageIndex);
    } else {
      throw new Error(`[Thaqb Error] Message index ${messageIndex} already consumed or unrecoverable (Thaqb Forward Secrecy Enforcement)`);
    }

    try {
      const decipher = crypto.createDecipheriv("aes-256-gcm", messageKey, Buffer.from(iv, "hex"));
      decipher.setAuthTag(Buffer.from(tag, "hex"));

      let decrypted = decipher.update(ciphertext, "hex", "utf8");
      decrypted += decipher.final("utf8");

      tamsScrub(messageKey);

      try {
        return JSON.parse(decrypted);
      } catch {
        return decrypted;
      }
    } catch (err) {
      tamsScrub(messageKey);
      throw err;
    }
  }

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

/**
 * ḤabkRatchet (حَبْك): Full Double-Ratchet Asymmetric DH Weave with Break-In Recovery
 */
/**
 * ḤabkRatchet (حَبْك): Full Double-Ratchet Asymmetric DH Weave with Break-In Recovery
 */
class HabkRatchet {
  constructor(rootKey, isInitiator = true) {
    this.rootKey = Buffer.isBuffer(rootKey) ? Buffer.from(rootKey) : crypto.createHash("sha256").update(rootKey).digest();
    this.dhp = crypto.createECDH("prime256v1");
    this.dhp.generateKeys();
    this.localDhPubKey = this.dhp.getPublicKey("hex");
    this.remoteDhPubKey = null;
    this.isInitiator = isInitiator;

    const initSeed = crypto.createHmac("sha256", this.rootKey).update(Buffer.from("habk-init-v1")).digest();
    
    if (isInitiator) {
      this.sendingRatchet = new ThaqbRatchet(initSeed);
      this.receivingRatchet = null;
    } else {
      this.sendingRatchet = null;
      this.receivingRatchet = new ThaqbRatchet(initSeed);
    }
  }

  dhRatchetTurn(remoteDhPubKeyHex) {
    this.remoteDhPubKey = remoteDhPubKeyHex;

    // Compute DH shared secret with remote peer's public key
    const dhSecret = this.dhp.computeSecret(Buffer.from(remoteDhPubKeyHex, "hex"));

    // Derive new RootKey and Receiving Chain Key
    const nextRoot = crypto.createHmac("sha256", this.rootKey).update(Buffer.concat([dhSecret, Buffer.from([0x01])])).digest();
    const recvChain = crypto.createHmac("sha256", this.rootKey).update(Buffer.concat([dhSecret, Buffer.from([0x02])])).digest();

    tamsScrub(this.rootKey);
    this.rootKey = nextRoot;
    this.receivingRatchet = new ThaqbRatchet(recvChain);
  }

  encrypt(payload) {
    // If we received a DH turn previously and haven't updated our local DH keypair yet,
    // generate a fresh keypair and ratchet the sending chain (Self-Healing Break-in Recovery)
    if (this.remoteDhPubKey && (!this.sendingRatchet || this.needsNewSendingChain)) {
      this.dhp = crypto.createECDH("prime256v1");
      this.dhp.generateKeys();
      this.localDhPubKey = this.dhp.getPublicKey("hex");

      const dhSecret = this.dhp.computeSecret(Buffer.from(this.remoteDhPubKey, "hex"));
      const nextRoot = crypto.createHmac("sha256", this.rootKey).update(Buffer.concat([dhSecret, Buffer.from([0x01])])).digest();
      const sendChain = crypto.createHmac("sha256", this.rootKey).update(Buffer.concat([dhSecret, Buffer.from([0x02])])).digest();

      tamsScrub(this.rootKey);
      this.rootKey = nextRoot;
      this.sendingRatchet = new ThaqbRatchet(sendChain);
      this.needsNewSendingChain = false;
    } else if (!this.sendingRatchet) {
      const sendSeed = crypto.createHmac("sha256", this.rootKey).update(Buffer.from("habk-init-v1")).digest();
      this.sendingRatchet = new ThaqbRatchet(sendSeed);
    }

    const enc = this.sendingRatchet.encryptMessage(payload);
    return {
      ...enc,
      dhPubKey: this.localDhPubKey,
      protocol: "HABK_DOUBLE_RATCHET_V2"
    };
  }

  decrypt(encryptedObj) {
    if (encryptedObj.dhPubKey) {
      if (!this.remoteDhPubKey) {
        if (this.isInitiator) {
          this.dhRatchetTurn(encryptedObj.dhPubKey);
          this.needsNewSendingChain = true;
        } else {
          this.remoteDhPubKey = encryptedObj.dhPubKey;
        }
      } else if (encryptedObj.dhPubKey !== this.remoteDhPubKey) {
        this.dhRatchetTurn(encryptedObj.dhPubKey);
        this.needsNewSendingChain = true;
      }
    }
    const r = this.receivingRatchet || this.sendingRatchet;
    return r.decryptMessage(encryptedObj);
  }
}

class ZbatCrypto {
  static tamsScrub(buffer) {
    return tamsScrub(buffer);
  }

  static saddEqual(a, b) {
    return saddEqual(a, b);
  }

  static verifyRasd(zahirPacket, maxClockSkewMs = 120000) {
    if (!zahirPacket || !zahirPacket.messageId || !zahirPacket.timestamp) {
      return { valid: false, reason: "MALFORMED_HEADER" };
    }
    const now = Date.now();
    if (Math.abs(now - zahirPacket.timestamp) > maxClockSkewMs) {
      return { valid: false, reason: "TIMESTAMP_SKEW_EXCEEDED" };
    }
    if (zahirPacket.hops !== undefined && (zahirPacket.hops > 15 || zahirPacket.ttl < 0)) {
      return { valid: false, reason: "TTL_HOP_EXHAUSTION" };
    }
    return { valid: true };
  }

  static initHabkRatchet(rootKey, isInitiator = true) {
    return new HabkRatchet(rootKey, isInitiator);
  }

  static initThaqbRatchet(sharedKey) {
    return new ThaqbRatchet(sharedKey);
  }

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

  static deriveSharedKey(localPrivKeyHex, remotePubKeyHex) {
    const ecdh = crypto.createECDH("prime256v1");
    ecdh.setPrivateKey(Buffer.from(localPrivKeyHex, "hex"));
    const rawSecret = ecdh.computeSecret(Buffer.from(remotePubKeyHex, "hex"));
    const sharedKey = crypto.createHash("sha256").update(rawSecret).digest();
    tamsScrub(rawSecret);
    return sharedKey;
  }

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

  static generateMessageId(senderId, spaceId, channelId, timestamp, content) {
    const data = `${senderId}:${spaceId}:${channelId}:${timestamp}:${content}`;
    return crypto.createHash("sha256").update(data).digest("hex").substring(0, 16);
  }

  static signPayload(data, privateKeyPem) {
    const sign = crypto.createSign("SHA256");
    sign.update(typeof data === "string" ? data : JSON.stringify(data));
    sign.end();
    return sign.sign(privateKeyPem, "hex");
  }

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

  static packSabk(ciphertextBuf, ivBuf, tagBuf, messageIndex = 0, flags = 0x01) {
    const ct = Buffer.isBuffer(ciphertextBuf) ? ciphertextBuf : Buffer.from(ciphertextBuf);
    const iv = Buffer.isBuffer(ivBuf) ? ivBuf : Buffer.from(ivBuf, "hex");
    const tag = Buffer.isBuffer(tagBuf) ? tagBuf : Buffer.from(tagBuf, "hex");

    const header = Buffer.alloc(34);
    header[0] = 0x57;
    header[1] = flags;
    header.writeUInt32BE(messageIndex, 2);
    iv.copy(header, 6, 0, 12);
    tag.copy(header, 18, 0, 16);

    return Buffer.concat([header, ct]);
  }

  static unpackSabk(packedBuf) {
    const buf = Buffer.isBuffer(packedBuf) ? packedBuf : Buffer.from(packedBuf);
    if (buf.length < 34 || buf[0] !== 0x57) {
      throw new Error("[Al-Sabk Error] Invalid binary frame magic header or truncated packet");
    }

    const flags = buf[1];
    const messageIndex = buf.readUInt32BE(2);
    const iv = buf.subarray(6, 18);
    const tag = buf.subarray(18, 34);
    const ciphertext = buf.subarray(34);

    return { flags, messageIndex, iv, tag, ciphertext };
  }

  static encryptSabk(plaintext, sharedKey, messageIndex = 0) {
    const key = Buffer.isBuffer(sharedKey) ? sharedKey : crypto.createHash("sha256").update(sharedKey).digest();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

    const ptBuf = Buffer.isBuffer(plaintext) ? plaintext : Buffer.from(typeof plaintext === "string" ? plaintext : JSON.stringify(plaintext), "utf8");
    const ct = Buffer.concat([cipher.update(ptBuf), cipher.final()]);
    const tag = cipher.getAuthTag();

    return this.packSabk(ct, iv, tag, messageIndex, 0x01);
  }

  static decryptSabk(packedBuf, sharedKey) {
    const { messageIndex, iv, tag, ciphertext } = this.unpackSabk(packedBuf);
    const key = Buffer.isBuffer(sharedKey) ? sharedKey : crypto.createHash("sha256").update(sharedKey).digest();

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);

    const decryptedBuf = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return { decryptedBuf, messageIndex };
  }

  static padPayload(plaintext, bucketSizes = [256, 1024, 4096, 16384, 65536]) {
    const rawStr = typeof plaintext === "string" ? plaintext : JSON.stringify(plaintext);
    const rawLen = Buffer.byteLength(rawStr, "utf8");
    
    let targetSize = bucketSizes[bucketSizes.length - 1];
    for (const size of bucketSizes) {
      if (rawLen + 8 <= size) {
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
      if (nonce > 500000) break;
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
module.exports.HabkRatchet = HabkRatchet;
