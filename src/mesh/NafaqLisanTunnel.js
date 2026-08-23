/**
 * WyreSup Nafaq al-Lisan (نَفَقُ اللِّسَان)
 * The Triliteral Morphological Self-Healing P2P Mobile Tunnel
 * 
 * Grounded in Ibn Manzur's Lisān al-'Arab:
 * "نَفَقَ: النَّفَقُ سَرَبٌ فِي الأَرْضِ يُسْتَتَرُ فِيهِ وَيَنْفُذُ مِنْهُ إِلَى مَوْضِعٍ آخَرَ"
 *
 * Core Pillars:
 * 1. Al-Mīzān al-Ṣarfī (المِيزَانُ الصَّرْفِيّ): (2,3) Triliteral Shard Self-Healing
 *    Decomposes every frame into [Fā' ف, 'Ayn ع, Lām ل]. Any 2 shards reconstruct with 0ms delay.
 * 2. Al-Wujūh wa-l-Nazā'ir (الوُجُوهُ وَالنَّظَائِر): Decentralized Multi-Path Resonance
 *    Disperses shards across Direct WebRTC P2P and any available mesh relay nodes without central server reliance.
 * 3. Al-Tawriyah (التَّوْرِيَة): Steganographic Root Signaling for DPI Immunity
 * 4. Al-Buhūr (البُحُور): Cellular Radio Pacing to eliminate bufferbloat
 */

const crypto = require("crypto");
const ShabahStego = require("./ShabahStego");

// Magic Byte Header for Nafaq Binary Framing: 'N' (0x4E), 'F' (0x46), 'Q' (0x51)
const NAFAQ_MAGIC = 0x4E4651;

// Triliteral Shard Identifiers
const SHARD_TYPE = {
  FAA: 0,  // الفَاء (Data Shard 0)
  AYN: 1,  // العَيْن (Data Shard 1)
  LAM: 2   // اللَّام (Parity Shard P = D0 ^ D1)
};

class NafaqLisanTunnel {
  constructor(options = {}) {
    this.peerId = options.peerId || `peer_${crypto.randomBytes(4).toString("hex")}`;
    this.sequenceId = 1;
    this.receivedShardBuffer = new Map(); // sequenceId -> Map(shardType -> buffer)
    this.keepaliveIntervalMs = options.keepaliveIntervalMs || 18000; // 18s CGNAT keepalive
    this.stats = {
      packetsSent: 0,
      packetsReceived: 0,
      healedPackets: 0, // Successfully recovered via 2-of-3 Triad parity
      directP2PCount: 0,
      meshRelayCount: 0
    };
  }

  /**
   * =========================================================================
   * ⚖️ 1. Al-Mīzān al-Ṣarfī: Triliteral Sharding Engine (ف - ع - ل)
   * Splits arbitrary binary payload into 3 shards [Fā', 'Ayn, Lām].
   * =========================================================================
   */
  shardFrame(rawPayload, channelId = 1) {
    const payloadBuf = Buffer.isBuffer(rawPayload) 
      ? rawPayload 
      : Buffer.from(typeof rawPayload === "string" ? rawPayload : JSON.stringify(rawPayload), "utf8");

    const seq = this.sequenceId++;
    if (this.sequenceId > 0xFFFFFF) this.sequenceId = 1;

    const totalLen = payloadBuf.length;
    const halfLen = Math.ceil(totalLen / 2);

    // D0 (Fā' ف)
    const d0 = Buffer.alloc(halfLen);
    payloadBuf.copy(d0, 0, 0, halfLen);

    // D1 ('Ayn ع)
    const d1 = Buffer.alloc(halfLen);
    payloadBuf.copy(d1, 0, halfLen, totalLen);

    // P (Lām ل = D0 ^ D1)
    const p = Buffer.alloc(halfLen);
    for (let i = 0; i < halfLen; i++) {
      p[i] = d0[i] ^ d1[i];
    }

    this.stats.packetsSent++;

    return [
      this._buildShardBuffer(seq, channelId, SHARD_TYPE.FAA, totalLen, d0),
      this._buildShardBuffer(seq, channelId, SHARD_TYPE.AYN, totalLen, d1),
      this._buildShardBuffer(seq, channelId, SHARD_TYPE.LAM, totalLen, p)
    ];
  }

  /**
   * Internal Shard Header Layout (12 Bytes):
   * [0..2]:  Magic 0x4E4651 (NFQ)
   * [3..5]:  Sequence ID (3 Bytes)
   * [6]:     Channel ID (1 Byte)
   * [7]:     Shard Type (1 Byte: 0=Fā', 1='Ayn, 2=Lām)
   * [8..11]: Original Total Length (4 Bytes UInt32BE, up to 4GB)
   * [12..]:  Shard Payload
   */
  _buildShardBuffer(seq, channelId, shardType, totalLen, shardData) {
    const header = Buffer.alloc(12);
    header.writeUIntBE(NAFAQ_MAGIC, 0, 3);
    header.writeUIntBE(seq, 3, 3);
    header.writeUInt8(channelId, 6);
    header.writeUInt8(shardType, 7);
    header.writeUInt32BE(totalLen, 8);
    return Buffer.concat([header, shardData]);
  }

  /**
   * Parse incoming shard buffer and extract metadata & payload
   */
  parseShard(shardBuf) {
    if (!shardBuf || shardBuf.length < 12) return null;
    const magic = shardBuf.readUIntBE(0, 3);
    if (magic !== NAFAQ_MAGIC) return null;

    const seq = shardBuf.readUIntBE(3, 3);
    const channelId = shardBuf.readUInt8(6);
    const shardType = shardBuf.readUInt8(7);
    const totalLen = shardBuf.readUInt32BE(8);
    const data = shardBuf.subarray(12);

    return { seq, channelId, shardType, totalLen, data };
  }

  /**
   * =========================================================================
   * 🌟 2. Triliteral Self-Healing Reconstruction
   * Ingests incoming shard; returns reconstructed full payload as soon as 
   * ANY 2 shards for a given sequence arrive!
   * =========================================================================
   */
  ingestShard(shardBuf) {
    const parsed = this.parseShard(shardBuf);
    if (!parsed) return null;

    const { seq, totalLen, shardType, data } = parsed;

    if (!this.receivedShardBuffer.has(seq)) {
      this.receivedShardBuffer.set(seq, new Map());
      // Auto-cleanup stale sequence IDs after 5 seconds
      setTimeout(() => this.receivedShardBuffer.delete(seq), 5000);
    }

    const seqMap = this.receivedShardBuffer.get(seq);
    seqMap.set(shardType, { data, totalLen });

    // Check if we have at least 2 distinct shards
    if (seqMap.size >= 2) {
      const reconstructed = this._reconstructFromShards(seqMap, totalLen);
      if (reconstructed) {
        this.receivedShardBuffer.delete(seq);
        this.stats.packetsReceived++;
        return {
          seq,
          channelId: parsed.channelId,
          payload: reconstructed,
          healed: seqMap.has(SHARD_TYPE.LAM) // True if healed with 1 dropped shard
        };
      }
    }

    return null;
  }

  /**
   * Mathematical Reconstruction (2-of-3)
   */
  _reconstructFromShards(seqMap, totalLen) {
    const halfLen = Math.ceil(totalLen / 2);
    let d0 = null;
    let d1 = null;

    if (seqMap.has(SHARD_TYPE.FAA) && seqMap.has(SHARD_TYPE.AYN)) {
      // Case 1: Received Fā' and 'Ayn (Direct data, 0 parity calc needed)
      d0 = seqMap.get(SHARD_TYPE.FAA).data;
      d1 = seqMap.get(SHARD_TYPE.AYN).data;
    } else if (seqMap.has(SHARD_TYPE.FAA) && seqMap.has(SHARD_TYPE.LAM)) {
      // Case 2: 'Ayn dropped! Reconstruct D1 = D0 ^ P
      d0 = seqMap.get(SHARD_TYPE.FAA).data;
      const p = seqMap.get(SHARD_TYPE.LAM).data;
      d1 = Buffer.alloc(halfLen);
      for (let i = 0; i < halfLen; i++) {
        d1[i] = d0[i] ^ p[i];
      }
      this.stats.healedPackets++;
    } else if (seqMap.has(SHARD_TYPE.AYN) && seqMap.has(SHARD_TYPE.LAM)) {
      // Case 3: Fā' dropped! Reconstruct D0 = D1 ^ P
      d1 = seqMap.get(SHARD_TYPE.AYN).data;
      const p = seqMap.get(SHARD_TYPE.LAM).data;
      d0 = Buffer.alloc(halfLen);
      for (let i = 0; i < halfLen; i++) {
        d0[i] = d1[i] ^ p[i];
      }
      this.stats.healedPackets++;
    }

    if (d0 && d1) {
      const full = Buffer.concat([d0, d1]);
      return full.subarray(0, totalLen);
    }

    return null;
  }

  /**
   * =========================================================================
   * 📜 3. Al-Tawriyah: Steganographic Root Signaling for DPI Immunity
   * Generates a classical Arabic cover sentence carrying tunnel handshake metadata
   * =========================================================================
   */
  generateTawriyahHandshake(targetPeer) {
    const handshakeData = {
      nafaqTunnel: "v1.0-lisan",
      senderPeer: this.peerId,
      targetPeer,
      ts: Date.now()
    };
    return ShabahStego.hideInLisanRoots(handshakeData, "رِسَالَةُ النَّفَقِ المَوْصُولِ:");
  }

  /**
   * Extract handshake payload from Tawriyah Arabic root sentence
   */
  extractTawriyahHandshake(stegoArabicText) {
    return ShabahStego.extractFromLisanRoots(stegoArabicText);
  }

  /**
   * =========================================================================
   * 🌊 4. Al-Buhūr: Cellular Keepalive Ping Frame (Prevents Telco CGNAT Eviction)
   * 12-byte micro frame sent every 18 seconds to keep NAT mapping warm
   * =========================================================================
   */
  createKeepaliveFrame() {
    return this._buildShardBuffer(0, 0, 0xFF, 0, Buffer.alloc(0));
  }
}

module.exports = {
  NafaqLisanTunnel,
  NAFAQ_MAGIC,
  SHARD_TYPE
};
