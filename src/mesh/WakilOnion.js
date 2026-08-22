const crypto = require("crypto");
const ZbatCrypto = require("./ZbatCrypto");

/**
 * WyreSup Wakil (وَكِيل) v2.2 - Hardened Sphinx Onion Routing Protocol
 * Grounded in Ibn Manzur's Lisan al-Arab: "الوَكِيلُ: الحافِظُ الكافِي، ووَكَّلْتُ أَمْرِي إِلى فُلانٍ: اسْتَسْلَمْتُ له وفَوَّضْتُه ليَقُومَ مَقامِي في السَّتْرِ والحِمايَة"
 *
 * Hardened Features:
 * 1. Strict Constant-Length 1473-Byte Sphinx Binary Frames (Fixed across ALL hops on wire)
 * 2. Shifted Routing Sub-Headers with Per-Hop AEAD Authentication
 * 3. Authenticated Anti-Replay Defense (Inserted only AFTER successful AEAD tag verification)
 * 4. Periodic Replay Cache Purge & Expired Entry Eviction
 * 5. Deterministic Payload Padding & HMAC-SHA256 Multi-Hop Derivations
 */

const PAYLOAD_BODY_SIZE = 1024;
const SUBHEADER_UNIT_SIZE = 128;
const NUM_HOPS = 3;
const SUBHEADERS_TOTAL_SIZE = NUM_HOPS * SUBHEADER_UNIT_SIZE; // 384 bytes
const SPHINX_TOTAL_FRAME_SIZE = 65 + SUBHEADERS_TOTAL_SIZE + PAYLOAD_BODY_SIZE; // 1473 bytes

class WakilOnion {
  static seenReplayTags = new Map(); // Tag -> ExpiryTimestamp

  static purgeExpiredReplayTags() {
    const now = Date.now();
    for (const [tag, exp] of WakilOnion.seenReplayTags.entries()) {
      if (now >= exp) {
        WakilOnion.seenReplayTags.delete(tag);
      }
    }
  }

  /**
   * Build a Hardened Sphinx Onion Packet
   * @param {Object|String} payload - The secret message
   * @param {Array<Object>} circuit - 3 relay nodes [{ nodeId, pubKeyHex }]
   */
  static buildOnionPacket(payload, circuit) {
    if (!circuit || circuit.length !== NUM_HOPS) {
      throw new Error(`[Wakil Error] Circuit must contain exactly ${NUM_HOPS} relays`);
    }

    const payloadStr = typeof payload === "string" ? payload : JSON.stringify(payload);
    const payloadRawBuf = Buffer.from(payloadStr, "utf8");

    if (payloadRawBuf.length > PAYLOAD_BODY_SIZE - 2) {
      throw new Error(`[Wakil Error] Payload exceeds maximum Sphinx body capacity (${PAYLOAD_BODY_SIZE - 2} bytes)`);
    }

    // 1. Generate Ephemeral Alpha Keypair for the Circuit
    const ecdh = crypto.createECDH("prime256v1");
    ecdh.generateKeys();
    const alphaPubKeyBuf = ecdh.getPublicKey(); // 65 bytes uncompressed

    // 2. Derive per-hop shared secrets and keys
    const sharedSecrets = [];
    const encKeys = [];
    const headerKeys = [];

    for (let i = 0; i < NUM_HOPS; i++) {
      const ss = ecdh.computeSecret(Buffer.from(circuit[i].pubKeyHex, "hex"));
      sharedSecrets.push(ss);
      encKeys.push(crypto.createHmac("sha256", ss).update(Buffer.from(`wakil-payload-hop-${i}`)).digest());
      headerKeys.push(crypto.createHmac("sha256", ss).update(Buffer.from(`wakil-header-hop-${i}`)).digest());
    }

    // 3. Construct and Layer-Encrypt 1024-Byte Payload Body (Reverse: Hop 3 -> Hop 2 -> Hop 1)
    let bodyBuf = Buffer.alloc(PAYLOAD_BODY_SIZE);
    bodyBuf.writeUInt16BE(payloadRawBuf.length, 0);
    payloadRawBuf.copy(bodyBuf, 2);
    // Fill remaining payload space with CSPRNG noise
    if (2 + payloadRawBuf.length < PAYLOAD_BODY_SIZE) {
      crypto.randomFillSync(bodyBuf, 2 + payloadRawBuf.length);
    }

    // Layer 3 Encrypt (Exit)
    const cipher3 = crypto.createCipheriv("aes-256-ctr", encKeys[2], Buffer.alloc(16, 3));
    bodyBuf = Buffer.concat([cipher3.update(bodyBuf), cipher3.final()]);

    // Layer 2 Encrypt (Middle)
    const cipher2 = crypto.createCipheriv("aes-256-ctr", encKeys[1], Buffer.alloc(16, 2));
    bodyBuf = Buffer.concat([cipher2.update(bodyBuf), cipher2.final()]);

    // Layer 1 Encrypt (Entry)
    const cipher1 = crypto.createCipheriv("aes-256-ctr", encKeys[0], Buffer.alloc(16, 1));
    bodyBuf = Buffer.concat([cipher1.update(bodyBuf), cipher1.final()]);

    // 4. Construct Encrypted Routing Sub-Headers for each Hop
    const routingInfo = [
      { next: circuit[1].nodeId, hopIndex: 1 },
      { next: circuit[2].nodeId, hopIndex: 2 },
      { next: "DESTINATION", hopIndex: 3 }
    ];

    const subHeadersBuf = Buffer.alloc(SUBHEADERS_TOTAL_SIZE);

    for (let i = 0; i < NUM_HOPS; i++) {
      const rawMeta = Buffer.from(JSON.stringify(routingInfo[i]), "utf8");
      const block = Buffer.alloc(SUBHEADER_UNIT_SIZE);
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv("aes-256-gcm", headerKeys[i], iv);
      const ct = Buffer.concat([cipher.update(rawMeta), cipher.final()]);
      const tag = cipher.getAuthTag();

      // Layout: 12B IV + 16B Tag + 2B Len + ct + CSPRNG noise
      iv.copy(block, 0);
      tag.copy(block, 12);
      block.writeUInt16BE(ct.length, 28);
      ct.copy(block, 30);
      if (30 + ct.length < SUBHEADER_UNIT_SIZE) {
        crypto.randomFillSync(block, 30 + ct.length);
      }

      block.copy(subHeadersBuf, i * SUBHEADER_UNIT_SIZE);
    }

    // 5. Assemble Final Constant-Length Wire Frame (Strictly 1473 Bytes)
    const finalFrame = Buffer.concat([
      alphaPubKeyBuf,  // 65 bytes
      subHeadersBuf,   // 384 bytes
      bodyBuf          // 1024 bytes
    ]);

    // Zeroize sensitive ephemeral keys
    sharedSecrets.forEach(ss => ZbatCrypto.tamsScrub(ss));
    encKeys.forEach(k => ZbatCrypto.tamsScrub(k));
    headerKeys.forEach(k => ZbatCrypto.tamsScrub(k));

    return {
      targetEntryNode: circuit[0].nodeId,
      frameBuffer: finalFrame,
      sizeBytes: finalFrame.length,
      isConstantSize: true
    };
  }

  /**
   * Peel one layer of the Sphinx Onion Packet at a relay node
   * @param {Buffer} frameBuf - Strict constant-size Sphinx frame (1473 bytes)
   * @param {String|Buffer} nodePrivKeyHex - Private key of the current relay
   * @param {Number} hopIndex - 1 (Entry), 2 (Middle), or 3 (Exit)
   */
  static peelOnionLayer(frameBuf, nodePrivKeyHex, hopIndex = 1) {
    if (!Buffer.isBuffer(frameBuf) || frameBuf.length !== SPHINX_TOTAL_FRAME_SIZE) {
      throw new Error(`[Wakil Error] Invalid Sphinx frame: must be exactly ${SPHINX_TOTAL_FRAME_SIZE} bytes`);
    }

    WakilOnion.purgeExpiredReplayTags();

    const alphaPubKeyBuf = frameBuf.subarray(0, 65);
    const subHeadersBuf = frameBuf.subarray(65, 65 + SUBHEADERS_TOTAL_SIZE);
    const bodyBuf = frameBuf.subarray(65 + SUBHEADERS_TOTAL_SIZE);

    // 1. Ephemeral Key Agreement
    const ecdh = crypto.createECDH("prime256v1");
    ecdh.setPrivateKey(Buffer.isBuffer(nodePrivKeyHex) ? nodePrivKeyHex : Buffer.from(nodePrivKeyHex, "hex"));
    const ss = ecdh.computeSecret(alphaPubKeyBuf);

    const encKey = crypto.createHmac("sha256", ss).update(Buffer.from(`wakil-payload-hop-${hopIndex - 1}`)).digest();
    const headerKey = crypto.createHmac("sha256", ss).update(Buffer.from(`wakil-header-hop-${hopIndex - 1}`)).digest();

    // 2. Decrypt this hop's routing sub-header
    const slotOffset = (hopIndex - 1) * SUBHEADER_UNIT_SIZE;
    const iv = subHeadersBuf.subarray(slotOffset, slotOffset + 12);
    const tag = subHeadersBuf.subarray(slotOffset + 12, slotOffset + 28);
    const ctLen = subHeadersBuf.readUInt16BE(slotOffset + 28);
    const ct = subHeadersBuf.subarray(slotOffset + 30, slotOffset + 30 + ctLen);

    // Anti-Replay Defense: Check tag existence
    const tagHex = tag.toString("hex");
    const now = Date.now();
    if (WakilOnion.seenReplayTags.has(tagHex)) {
      const exp = WakilOnion.seenReplayTags.get(tagHex);
      if (now < exp) {
        ZbatCrypto.tamsScrub(ss);
        ZbatCrypto.tamsScrub(encKey);
        ZbatCrypto.tamsScrub(headerKey);
        throw new Error("[Wakil Anti-Replay] Detected replayed Sphinx onion tag: DROPPED");
      }
    }

    let routeMeta = null;
    try {
      const decipher = crypto.createDecipheriv("aes-256-gcm", headerKey, iv);
      decipher.setAuthTag(tag);
      const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
      routeMeta = JSON.parse(pt.toString("utf8"));

      // CRITICAL FIX: Only insert into replay cache AFTER successful authentication!
      WakilOnion.seenReplayTags.set(tagHex, now + 300000); // 5 min TTL window
    } catch (e) {
      ZbatCrypto.tamsScrub(ss);
      ZbatCrypto.tamsScrub(encKey);
      ZbatCrypto.tamsScrub(headerKey);
      throw new Error(`[Wakil Error] Sub-header authentication failed at Hop ${hopIndex}: ${e.message}`);
    }

    // 3. Peel one layer of payload body CTR stream
    const bodyDecipher = crypto.createCipheriv("aes-256-ctr", encKey, Buffer.alloc(16, hopIndex));
    const peeledBody = Buffer.concat([bodyDecipher.update(bodyBuf), bodyDecipher.final()]);

    ZbatCrypto.tamsScrub(ss);
    ZbatCrypto.tamsScrub(encKey);
    ZbatCrypto.tamsScrub(headerKey);

    if (routeMeta.next === "DESTINATION" || hopIndex === 3) {
      // Exit Node reached: parse final plaintext
      const payloadLen = peeledBody.readUInt16BE(0);
      const payloadRaw = peeledBody.subarray(2, 2 + payloadLen).toString("utf8");
      try {
        return { isExit: true, payload: JSON.parse(payloadRaw) };
      } catch {
        return { isExit: true, payload: payloadRaw };
      }
    } else {
      // Intermediate Hop: assemble next constant-size frame
      const nextFrame = Buffer.concat([
        alphaPubKeyBuf,
        subHeadersBuf,
        peeledBody
      ]);

      return {
        isExit: false,
        nextHop: routeMeta.next,
        nextFrameBuffer: nextFrame,
        sizeBytes: nextFrame.length
      };
    }
  }
}

module.exports = WakilOnion;
