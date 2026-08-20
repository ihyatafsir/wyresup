/**
 * WyreSup ZBAT Crypto & Miftah Security Layer (مِعْيَار التَّرْمِيز و البَاطِن و عَقْد المِفْتَاح)
 * 13-Layer Protocol Engine:
 * - Huwiyya: Elliptic-curve keypair generation (ECDH prime256v1 & ECDSA)
 * - Miftah: ECDH Diffie-Hellman Key Agreement with SHA-256 derivation
 * - ZBAT: Zahir public routing metadata + Batin AES-256-GCM authenticated payload
 * - Nagham: DTMF Acoustic carrier tone mapping
 */

const crypto = require("crypto");

class ZbatCrypto {
  /**
   * Generates a cryptographic ECDH keypair and persona: prefix@8byteHash
   */
  static generateIdentity(prefix = "peer") {
    // Generate ECDH Keypair for Miftah key agreement
    const ecdh = crypto.createECDH("prime256v1");
    ecdh.generateKeys();
    const ecdhPubKey = ecdh.getPublicKey("hex");
    const ecdhPrivKey = ecdh.getPrivateKey("hex");

    // Generate ECDSA Keypair for cryptographic message signatures
    const { publicKey: signPubKeyObj, privateKey: signPrivKeyObj } = crypto.generateKeyPairSync("ec", {
      namedCurve: "prime256v1"
    });
    const signPubKey = signPubKeyObj.export({ type: "spki", format: "pem" });
    const signPrivKey = signPrivKeyObj.export({ type: "pkcs8", format: "pem" });

    // Deterministic short hash from public key
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
    // Hash raw secret with SHA-256 to create 32-byte AES-256 key
    return crypto.createHash("sha256").update(rawSecret).digest();
  }

  /**
   * Encrypt Batin payload using AES-256-GCM (Authenticated Encryption)
   */
  static encryptBatin(payload, sharedKey) {
    const key = Buffer.isBuffer(sharedKey) ? sharedKey : crypto.createHash("sha256").update(sharedKey).digest();
    const iv = crypto.randomBytes(12); // Standard 96-bit GCM IV
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
   * ZBAT Framing:
   * - Zahir (ظَاهِر): Manifest routing metadata visible to mesh routers
   * - Batin (بَاطِن): Authenticated payload container (Plaintext or Encrypted Ciphertext)
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
      // Perform genuine AES-256-GCM encryption on Batin
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

    // Signature
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
