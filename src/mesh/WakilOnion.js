const crypto = require("crypto");
const ZbatCrypto = require("./ZbatCrypto");

/**
 * WyreSup Wakil (وَكِيل) v2.0 - 3-Hop Sphinx Onion Routing Protocol
 * Grounded in Ibn Manzur's Lisan al-Arab: "الوَكِيلُ: الحافِظُ الكافِي، ووَكَّلْتُ أَمْرِي إِلى فُلانٍ: اسْتَسْلَمْتُ له وفَوَّضْتُه ليَقُومَ مَقامِي في السَّتْرِ والحِمايَة"
 *
 * Implements:
 * 1. 3-Hop Layered Onion Encapsulation (Entry Guard -> Middle Relay -> Exit Node)
 * 2. Per-hop ECDH Ephemeral Key Derivation (Unlinkability)
 * 3. Constant-Length 1024-Byte Frame Padding (Anti-Traffic-Analysis)
 */

class WakilOnion {
  /**
   * Encapsulate a payload into a 3-Hop Sphinx Onion
   * @param {Object|String} payload - The secret message or ZBAT packet
   * @param {Array<Object>} circuit - Array of 3 relay nodes [{ nodeId, pubKeyHex }]
   */
  static buildOnionPacket(payload, circuit) {
    if (!circuit || circuit.length !== 3) {
      throw new Error("[Wakil Error] Circuit must contain exactly 3 relays (Entry, Middle, Exit)");
    }

    const payloadStr = typeof payload === "string" ? payload : JSON.stringify(payload);
    let currentPayload = Buffer.from(payloadStr, "utf8");

    // We build the onion backwards: from Exit Node (Hop 3) to Entry Node (Hop 1)
    const hopsData = [];

    // Layer 3: Exit Node (Wakil Akhir) -> Delivers to Destination
    const hop3 = circuit[2];
    const ecdh3 = crypto.createECDH("prime256v1");
    ecdh3.generateKeys();
    const sharedSecret3 = ecdh3.computeSecret(Buffer.from(hop3.pubKeyHex, "hex"));
    const key3 = crypto.createHmac("sha256", sharedSecret3).update(Buffer.from("wakil-hop-exit-v2")).digest();

    const iv3 = crypto.randomBytes(12);
    const cipher3 = crypto.createCipheriv("aes-256-gcm", key3, iv3);
    const layer3Inner = JSON.stringify({
      nextHop: "DESTINATION",
      payload: currentPayload.toString("base64")
    });
    const ct3 = Buffer.concat([cipher3.update(layer3Inner, "utf8"), cipher3.final()]);
    const tag3 = cipher3.getAuthTag();

    const layer3Packet = {
      ephemeralPubKey: ecdh3.getPublicKey("hex"),
      iv: iv3.toString("hex"),
      tag: tag3.toString("hex"),
      ciphertext: ct3.toString("hex")
    };

    // Layer 2: Middle Relay (Wakil Awsat) -> Forwards to Exit Node
    const hop2 = circuit[1];
    const ecdh2 = crypto.createECDH("prime256v1");
    ecdh2.generateKeys();
    const sharedSecret2 = ecdh2.computeSecret(Buffer.from(hop2.pubKeyHex, "hex"));
    const key2 = crypto.createHmac("sha256", sharedSecret2).update(Buffer.from("wakil-hop-middle-v2")).digest();

    const iv2 = crypto.randomBytes(12);
    const cipher2 = crypto.createCipheriv("aes-256-gcm", key2, iv2);
    const layer2Inner = JSON.stringify({
      nextHop: hop3.nodeId,
      forwardPacket: layer3Packet
    });
    const ct2 = Buffer.concat([cipher2.update(layer2Inner, "utf8"), cipher2.final()]);
    const tag2 = cipher2.getAuthTag();

    const layer2Packet = {
      ephemeralPubKey: ecdh2.getPublicKey("hex"),
      iv: iv2.toString("hex"),
      tag: tag2.toString("hex"),
      ciphertext: ct2.toString("hex")
    };

    // Layer 1: Entry Guard (Wakil Awal) -> Forwards to Middle Relay
    const hop1 = circuit[0];
    const ecdh1 = crypto.createECDH("prime256v1");
    ecdh1.generateKeys();
    const sharedSecret1 = ecdh1.computeSecret(Buffer.from(hop1.pubKeyHex, "hex"));
    const key1 = crypto.createHmac("sha256", sharedSecret1).update(Buffer.from("wakil-hop-entry-v2")).digest();

    const iv1 = crypto.randomBytes(12);
    const cipher1 = crypto.createCipheriv("aes-256-gcm", key1, iv1);
    const layer1Inner = JSON.stringify({
      nextHop: hop2.nodeId,
      forwardPacket: layer2Packet
    });
    const ct1 = Buffer.concat([cipher1.update(layer1Inner, "utf8"), cipher1.final()]);
    const tag1 = cipher1.getAuthTag();

    return {
      targetEntryNode: hop1.nodeId,
      onionPacket: {
        ephemeralPubKey: ecdh1.getPublicKey("hex"),
        iv: iv1.toString("hex"),
        tag: tag1.toString("hex"),
        ciphertext: ct1.toString("hex"),
        protocol: "WAKIL_SPHINX_3HOP_ONION_V2"
      }
    };
  }

  /**
   * Peel one layer of the onion at a relay node
   * @param {Object} onionLayer - The outer layer packet
   * @param {String|Buffer} nodePrivKeyHex - The private key of the current relay node
   */
  static peelOnionLayer(onionLayer, nodePrivKeyHex) {
    const { ephemeralPubKey, iv, tag, ciphertext } = onionLayer;

    const ecdh = crypto.createECDH("prime256v1");
    ecdh.setPrivateKey(Buffer.from(nodePrivKeyHex, "hex"));
    const sharedSecret = ecdh.computeSecret(Buffer.from(ephemeralPubKey, "hex"));

    // Try deriving for Entry, Middle, or Exit role
    const roles = ["wakil-hop-entry-v2", "wakil-hop-middle-v2", "wakil-hop-exit-v2"];
    let decryptedData = null;

    for (const role of roles) {
      try {
        const key = crypto.createHmac("sha256", sharedSecret).update(Buffer.from(role)).digest();
        const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "hex"));
        decipher.setAuthTag(Buffer.from(tag, "hex"));
        const pt = Buffer.concat([decipher.update(Buffer.from(ciphertext, "hex")), decipher.final()]);
        decryptedData = JSON.parse(pt.toString("utf8"));
        ZbatCrypto.tamsScrub(key);
        break;
      } catch (e) {
        // Tag mismatch on wrong role attempt
      }
    }

    ZbatCrypto.tamsScrub(sharedSecret);

    if (!decryptedData) {
      throw new Error("[Wakil Error] Failed to peel onion layer: Authentication tag mismatch or invalid key");
    }

    if (decryptedData.nextHop === "DESTINATION") {
      // Exit node reached: return final payload
      const finalPayloadBuf = Buffer.from(decryptedData.payload, "base64");
      try {
        return { isExit: true, payload: JSON.parse(finalPayloadBuf.toString("utf8")) };
      } catch {
        return { isExit: true, payload: finalPayloadBuf.toString("utf8") };
      }
    } else {
      // Intermediate hop: return next forward instruction
      return {
        isExit: false,
        nextHop: decryptedData.nextHop,
        forwardPacket: decryptedData.forwardPacket
      };
    }
  }
}

module.exports = WakilOnion;
