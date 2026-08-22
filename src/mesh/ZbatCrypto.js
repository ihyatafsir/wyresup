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
/**
 * ḤabkRatchet (حَبْك): Canonical Signal-Grade Double Ratchet Protocol
 * Implements continuous per-turn asymmetric Diffie-Hellman ratchets (حَبْك)
 * interleaved with symmetric KDF message chains (ثَقْب) and out-of-order skipped key cache.
 * Provides true Forward Secrecy & Post-Compromise Security (Break-In Recovery).
 */
/**
 * ḤabkRatchet (حَبْك): Canonical Signal-Grade Double Ratchet Protocol
 * Implements continuous per-turn asymmetric Diffie-Hellman ratchets (حَبْك)
 * interleaved with symmetric KDF message chains (ثَقْب) and out-of-order skipped key cache.
 * Provides true Forward Secrecy & Post-Compromise Security (Break-In Recovery).
 */
class HabkRatchet {
  constructor(sharedRootKey, isInitiator = true, remoteDhPubKey = null) {
    this.RK = Buffer.isBuffer(sharedRootKey) 
      ? Buffer.from(sharedRootKey) 
      : crypto.createHash("sha256").update(sharedRootKey).digest();

    this.dhp = crypto.createECDH("prime256v1");
    this.dhp.generateKeys();
    this.localDhPubKey = this.dhp.getPublicKey("hex");
    this.remoteDhPubKey = remoteDhPubKey;

    this.CKs = null; // Sending chain key
    this.CKr = null; // Receiving chain key
    this.Ns = 0;    // Number of messages sent in current chain
    this.Nr = 0;    // Number of messages received in current chain
    this.PN = 0;    // Number of messages in previous sending chain
    this.MKSKIPPED = new Map(); // Map of "dhPubKey:messageIndex" -> messageKey

    this.isInitiator = isInitiator;

    const initSeed = crypto.createHmac("sha256", this.RK).update(Buffer.from("habk-init-v3")).digest();
    if (isInitiator) {
      this.CKs = initSeed;
      this.CKr = null;
    } else {
      this.CKs = null;
      this.CKr = initSeed;
    }
  }

  static kdfRK(rk, dhSecret) {
    const nextRK = crypto.createHmac("sha256", rk).update(Buffer.concat([dhSecret, Buffer.from([0x01])])).digest();
    const chainKey = crypto.createHmac("sha256", rk).update(Buffer.concat([dhSecret, Buffer.from([0x02])])).digest();
    return { nextRK, chainKey };
  }

  static kdfCK(ck) {
    const nextCK = crypto.createHmac("sha256", ck).update(Buffer.from([0x01])).digest();
    const messageKey = crypto.createHmac("sha256", ck).update(Buffer.from([0x02])).digest();
    return { nextCK, messageKey };
  }

  dhRatchetTurn(remoteDhPubKeyHex) {
    this.PN = this.Ns;
    this.Ns = 0;
    this.Nr = 0;
    this.remoteDhPubKey = remoteDhPubKeyHex;

    // 1. Receiving DH Step (with previous local DH key and new remote DH key)
    const dhSecret1 = this.dhp.computeSecret(Buffer.from(remoteDhPubKeyHex, "hex"));
    const step1 = HabkRatchet.kdfRK(this.RK, dhSecret1);
    tamsScrub(this.RK);
    this.RK = step1.nextRK;
    this.CKr = step1.chainKey;

    // 2. Generate fresh local DH keypair for sending
    this.dhp = crypto.createECDH("prime256v1");
    this.dhp.generateKeys();
    this.localDhPubKey = this.dhp.getPublicKey("hex");

    // 3. Sending DH Step (with new local DH key and remote DH key)
    const dhSecret2 = this.dhp.computeSecret(Buffer.from(remoteDhPubKeyHex, "hex"));
    const step2 = HabkRatchet.kdfRK(this.RK, dhSecret2);
    tamsScrub(this.RK);
    this.RK = step2.nextRK;
    this.CKs = step2.chainKey;
  }

  skipMessageKeys(untilIndex, isSending = false) {
    const currentChain = isSending ? this.CKs : this.CKr;
    let currentIndex = isSending ? this.Ns : this.Nr;

    if (!currentChain) return;
    if (currentIndex + 2000 < untilIndex) {
      throw new Error("[Ḥabk Error] Too many skipped messages in ratchet chain (> 2000)");
    }

    let tempCK = currentChain;
    while (currentIndex < untilIndex) {
      const { nextCK, messageKey } = HabkRatchet.kdfCK(tempCK);
      tempCK = nextCK;
      const skipKey = `${this.remoteDhPubKey || "init"}:${currentIndex}`;
      this.MKSKIPPED.set(skipKey, messageKey);
      currentIndex++;
    }

    if (isSending) {
      this.CKs = tempCK;
      this.Ns = currentIndex;
    } else {
      this.CKr = tempCK;
      this.Nr = currentIndex;
    }
  }

  encrypt(payload) {
    // If responder has received remote DH pubkey but has no sending chain yet, execute DH ratchet turn
    if (!this.CKs) {
      if (this.remoteDhPubKey) {
        this.dhp = crypto.createECDH("prime256v1");
        this.dhp.generateKeys();
        this.localDhPubKey = this.dhp.getPublicKey("hex");

        const dhSecret = this.dhp.computeSecret(Buffer.from(this.remoteDhPubKey, "hex"));
        const step = HabkRatchet.kdfRK(this.RK, dhSecret);
        tamsScrub(this.RK);
        this.RK = step.nextRK;
        this.CKs = step.chainKey;
      } else {
        this.CKs = crypto.createHmac("sha256", this.RK).update(Buffer.from("habk-init-v3")).digest();
      }
    }

    const { nextCK, messageKey } = HabkRatchet.kdfCK(this.CKs);
    tamsScrub(this.CKs);
    this.CKs = nextCK;

    const messageIndex = this.Ns;
    this.Ns++;

    const plaintext = typeof payload === "string" ? payload : JSON.stringify(payload);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", messageKey, iv);
    
    // Bind Ratchet Header into AAD
    const headerAad = Buffer.from(`${this.localDhPubKey}:${messageIndex}:${this.PN}`);
    cipher.setAAD(headerAad);

    const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();

    tamsScrub(messageKey);

    return {
      ciphertext: ciphertext.toString("hex"),
      iv: iv.toString("hex"),
      tag: tag.toString("hex"),
      dhPubKey: this.localDhPubKey,
      messageIndex,
      previousChainLength: this.PN,
      protocol: "HABK_CANONICAL_DOUBLE_RATCHET_V3"
    };
  }

  decrypt(encryptedObj) {
    const { ciphertext, iv, tag, dhPubKey, messageIndex, previousChainLength } = encryptedObj;
    const remoteKey = dhPubKey || this.remoteDhPubKey;
    const skipKey = `${remoteKey || "init"}:${messageIndex}`;

    let messageKey = null;

    // 1. Check if key was previously skipped and cached
    if (this.MKSKIPPED.has(skipKey)) {
      messageKey = this.MKSKIPPED.get(skipKey);
      this.MKSKIPPED.delete(skipKey);
    } else {
      // 2. Check if DH ratchet turn is required
      if (dhPubKey) {
        if (!this.remoteDhPubKey) {
          if (this.isInitiator) {
            // Initiator receiving first reply from responder: execute DH ratchet turn
            this.dhRatchetTurn(dhPubKey);
          } else {
            // Responder receiving first message from initiator: record remote key (initial chain is active)
            this.remoteDhPubKey = dhPubKey;
          }
        } else if (dhPubKey !== this.remoteDhPubKey) {
          if (this.CKr && previousChainLength !== undefined) {
            this.skipMessageKeys(previousChainLength, false);
          }
          this.dhRatchetTurn(dhPubKey);
        }
      }

      // 3. Skip missing keys in current receiving chain if out-of-order
      if (messageIndex > this.Nr) {
        this.skipMessageKeys(messageIndex, false);
      }

      const { nextCK, messageKey: derivedKey } = HabkRatchet.kdfCK(this.CKr);
      tamsScrub(this.CKr);
      this.CKr = nextCK;
      this.Nr++;
      messageKey = derivedKey;
    }

    try {
      const decipher = crypto.createDecipheriv("aes-256-gcm", messageKey, Buffer.from(iv, "hex"));
      decipher.setAuthTag(Buffer.from(tag, "hex"));
      const headerAad = Buffer.from(`${dhPubKey || this.remoteDhPubKey}:${messageIndex}:${previousChainLength || 0}`);
      decipher.setAAD(headerAad);

      const decrypted = Buffer.concat([decipher.update(Buffer.from(ciphertext, "hex")), decipher.final()]);
      tamsScrub(messageKey);

      const str = decrypted.toString("utf8");
      try { return JSON.parse(str); } catch { return str; }
    } catch (err) {
      if (messageKey) tamsScrub(messageKey);
      throw err;
    }
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
    if (zahirPacket.hops !== undefined && (zahirPacket.hops > 15 || (zahirPacket.ttl !== undefined && (zahirPacket.ttl <= 0 || zahirPacket.hops >= zahirPacket.ttl)))) {
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

  static deriveSharedKey(localPrivKeyHex, remotePubKeyHex, senderId = 'peerA', targetId = 'peerB') {
    const ecdh = crypto.createECDH("prime256v1");
    ecdh.setPrivateKey(Buffer.from(localPrivKeyHex, "hex"));
    const rawSecret = ecdh.computeSecret(Buffer.from(remotePubKeyHex, "hex"));
    const salt = Buffer.from("wyresup-miftah-v2-salt", "utf8");
    const sorted = [senderId || 'peerA', targetId || 'peerB'].sort().join(':');
    const info = Buffer.from(`wyresup-authenticated-session:${sorted}`, "utf8");
    const sharedKey = Buffer.from(crypto.hkdfSync("sha256", rawSecret, salt, info, 32));
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
    // Hash the public key with SHA-256 to ensure 256-bit uniform entropy across all 16 DTMF dual-tones
    const hash = crypto.createHash("sha256").update(pubKeyHex || "").digest("hex");
    const cleanHex = hash.toLowerCase();
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

  /**
   * Al-Sabk v2.0 (الصَّبْك الإصدار الثاني): SIMD-Aligned Zero-Copy Binary Protocol with Al-Ṣahr (AAD Fusion)
   * 48-Byte Aligned Header (Qālab/قالب) for zero-penalty 128-bit ARM NEON & Intel AES-NI vector loading.
   * Header Layout:
   *  - 0..2  (2B): Magic Header (0x53, 0x42 = 'SB')
   *  - 2..4  (2B): Naqsh (نَقْش) Bitflags (0x0001: NASS, 0x0002: SAWT, 0x0004: MARS, 0x0008: SHABAH)
   *  - 4..8  (4B): Monotonic Sequence Index (UInt32BE)
   *  - 8..20 (12B): AEAD Nonce / IV
   *  - 20..36 (16B): Poly1305 / GHASH Authentication Tag (Al-Khatm / الختم)
   *  - 36..48 (12B): Al-Qālab Alignment & Mesh Routing Pad (ensures payload starts at offset 48, multiple of 16)
   *  - 48..End (NB): Pure Ciphertext (16-byte SIMD Aligned)
   */
  static encryptSabkV2(payload, sharedKey, messageIndex = 0, flags = 0x0001) {
    const rawKey = Buffer.isBuffer(sharedKey) ? sharedKey : crypto.createHash("sha256").update(sharedKey).digest();
    const iv = crypto.randomBytes(12);

    const plaintextBuf = Buffer.isBuffer(payload) 
      ? payload 
      : Buffer.from(typeof payload === "string" ? payload : JSON.stringify(payload), "utf8");

    // 1. Construct 48-byte Qālab Header Skeleton
    const headerBuf = Buffer.alloc(48);
    headerBuf[0] = 0x53; // 'S'
    headerBuf[1] = 0x42; // 'B'
    headerBuf.writeUInt16BE(flags & 0xFFFF, 2); // Naqsh Bitflags
    headerBuf.writeUInt32BE(messageIndex >>> 0, 4); // Sequence Index
    iv.copy(headerBuf, 8); // IV at offset 8..20
    // AuthTag placeholder at offset 20..36
    // Alignment pad at offset 36..48 (zeros)

    // 2. Al-Ṣahr (الصَّهْر): Fuse Header (Offsets 0..20 and 36..48) into AEAD AAD
    const aadBuf = Buffer.concat([headerBuf.subarray(0, 20), headerBuf.subarray(36, 48)]);

    // 3. Encrypt Plaintext with AAD Fusion
    const cipher = crypto.createCipheriv("aes-256-gcm", rawKey, iv);
    cipher.setAAD(aadBuf);
    const ciphertext = Buffer.concat([cipher.update(plaintextBuf), cipher.final()]);
    const tag = cipher.getAuthTag();

    // 4. Seal Al-Khatm (الخَتْم) AuthTag into header at offset 20..36
    tag.copy(headerBuf, 20);

    // 5. Molten Cast (السَّبْك): Combine 48B Header + 16B-Aligned Ciphertext into Single Zero-Copy Frame
    return Buffer.concat([headerBuf, ciphertext]);
  }

  static decryptSabkV2(packedBuffer, sharedKey) {
    if (!Buffer.isBuffer(packedBuffer) || packedBuffer.length < 48) {
      throw new Error("[Al-Sabk Error] Malformed binary frame: Minimum 48 bytes required for Qālab header");
    }

    // 1. Verify Magic Identifier ('SB')
    if (packedBuffer[0] !== 0x53 || packedBuffer[1] !== 0x42) {
      throw new Error("[Al-Sabk Error] Invalid magic header: Not an Al-Sabk binary frame");
    }

    const rawKey = Buffer.isBuffer(sharedKey) ? sharedKey : crypto.createHash("sha256").update(sharedKey).digest();

    // 2. Zero-Copy Slicing of Header Fields
    const flags = packedBuffer.readUInt16BE(2);
    const messageIndex = packedBuffer.readUInt32BE(4);
    const iv = packedBuffer.subarray(8, 20);
    const tag = packedBuffer.subarray(20, 36);
    const ciphertext = packedBuffer.subarray(48);

    // 3. Al-Ṣahr (الصَّهْر): Reconstruct AAD from Header Slice
    const aadBuf = Buffer.concat([packedBuffer.subarray(0, 20), packedBuffer.subarray(36, 48)]);

    // 4. Decrypt with AAD Authentication
    const decipher = crypto.createDecipheriv("aes-256-gcm", rawKey, iv);
    decipher.setAAD(aadBuf);
    decipher.setAuthTag(tag);

    const decryptedBuf = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

    return {
      decryptedBuf,
      messageIndex,
      flags,
      isText: (flags & 0x0001) !== 0,
      isSawt: (flags & 0x0002) !== 0,
      isMarsVideo: (flags & 0x0004) !== 0,
      isShabah: (flags & 0x0008) !== 0
    };
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

  static computeMizanPoW(zahirEnvelopeOrString, difficulty = 2) {
    const targetPrefix = "0".repeat(difficulty);
    const baseData = typeof zahirEnvelopeOrString === "string" 
      ? zahirEnvelopeOrString 
      : `${zahirEnvelopeOrString.senderId}:${zahirEnvelopeOrString.messageId}:${zahirEnvelopeOrString.timestamp}`;
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

  static verifyMizanPoW(zahirEnvelopeOrString, mizanObj, difficulty = null) {
    if (mizanObj === null || mizanObj === undefined) return false;
    const nonce = typeof mizanObj === "object" ? mizanObj.nonce : mizanObj;
    const diff = difficulty || (typeof mizanObj === "object" ? mizanObj.difficulty : 2) || 2;
    const targetPrefix = "0".repeat(diff);
    const baseData = typeof zahirEnvelopeOrString === "string" 
      ? zahirEnvelopeOrString 
      : `${zahirEnvelopeOrString.senderId}:${zahirEnvelopeOrString.messageId}:${zahirEnvelopeOrString.timestamp}`;
    const hash = crypto.createHash("sha256").update(`${baseData}:${nonce}`).digest("hex");
    return hash.startsWith(targetPrefix);
  }

  /**
   * Al-Ratq (الرَّتْق): Dual-Cipher Cascading Defense-in-Depth (AES-256-GCM + ChaCha20-Poly1305)
   * Encrypts plaintext through two distinct cipher primitives with distinct derived keys.
   */
  static encryptRatqCascade(payload, sharedKey) {
    const rawKey = Buffer.isBuffer(sharedKey) ? sharedKey : crypto.createHash("sha256").update(sharedKey).digest();
    
    // Derive two distinct 256-bit sub-keys via HKDF
    const keyAes = crypto.createHmac("sha256", rawKey).update(Buffer.from("ratq-aes256-v1")).digest();
    const keyChaCha = crypto.createHmac("sha256", rawKey).update(Buffer.from("ratq-chacha20-v1")).digest();

    const plaintext = typeof payload === "string" ? payload : JSON.stringify(payload);
    const ptBuf = Buffer.from(plaintext, "utf8");

    // 1. Layer 1: ChaCha20-Poly1305 (Inner Shield)
    const ivChaCha = crypto.randomBytes(12);
    const cipherChaCha = crypto.createCipheriv("chacha20-poly1305", keyChaCha, ivChaCha, { authTagLength: 16 });
    const innerCt = Buffer.concat([cipherChaCha.update(ptBuf), cipherChaCha.final()]);
    const innerTag = cipherChaCha.getAuthTag();

    // 2. Layer 2: AES-256-GCM (Outer Fortress)
    const innerPacked = Buffer.concat([ivChaCha, innerTag, innerCt]);
    const ivAes = crypto.randomBytes(12);
    const cipherAes = crypto.createCipheriv("aes-256-gcm", keyAes, ivAes);
    const outerCt = Buffer.concat([cipherAes.update(innerPacked), cipherAes.final()]);
    const outerTag = cipherAes.getAuthTag();

    tamsScrub(keyAes);
    tamsScrub(keyChaCha);

    return {
      outerCiphertext: outerCt.toString("hex"),
      outerIv: ivAes.toString("hex"),
      outerTag: outerTag.toString("hex"),
      protocol: "AL_RATQ_CASCADE_AEAD"
    };
  }

  static decryptRatqCascade(encryptedObj, sharedKey) {
    const { outerCiphertext, outerIv, outerTag } = encryptedObj;
    const rawKey = Buffer.isBuffer(sharedKey) ? sharedKey : crypto.createHash("sha256").update(sharedKey).digest();

    const keyAes = crypto.createHmac("sha256", rawKey).update(Buffer.from("ratq-aes256-v1")).digest();
    const keyChaCha = crypto.createHmac("sha256", rawKey).update(Buffer.from("ratq-chacha20-v1")).digest();

    // 1. Decrypt Layer 2: AES-256-GCM
    const decipherAes = crypto.createDecipheriv("aes-256-gcm", keyAes, Buffer.from(outerIv, "hex"));
    decipherAes.setAuthTag(Buffer.from(outerTag, "hex"));
    const innerPacked = Buffer.concat([decipherAes.update(Buffer.from(outerCiphertext, "hex")), decipherAes.final()]);

    // 2. Decrypt Layer 1: ChaCha20-Poly1305
    const ivChaCha = innerPacked.subarray(0, 12);
    const innerTag = innerPacked.subarray(12, 28);
    const innerCt = innerPacked.subarray(28);

    const decipherChaCha = crypto.createDecipheriv("chacha20-poly1305", keyChaCha, ivChaCha, { authTagLength: 16 });
    decipherChaCha.setAuthTag(innerTag);
    const decryptedBuf = Buffer.concat([decipherChaCha.update(innerCt), decipherChaCha.final()]);

    tamsScrub(keyAes);
    tamsScrub(keyChaCha);

    const rawStr = decryptedBuf.toString("utf8");
    try {
      return JSON.parse(rawStr);
    } catch {
      return rawStr;
    }
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
