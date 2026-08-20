/**
 * WyreSup ZBAT Crypto & Utility Layer (مِعْيَار التَّرْمِيز و البَاطِن)
 * Provides deterministic hashing, pseudo-identity generation,
 * ZBAT framing (Zahir public header / Batin hidden payload), and DTMF tone mapping.
 */

const crypto = require('crypto');

class ZbatCrypto {
  /**
   * Generates a deterministic or random WyreSup persona: prefix@8byteHash
   */
  static generateIdentity(prefix = 'peer') {
    const rawSecret = crypto.randomBytes(32);
    const pubKey = crypto.createHash('sha256').update(rawSecret).digest('hex');
    const shortHash = pubKey.substring(0, 8);
    return {
      prefix,
      shortHash,
      fullId: `${prefix}@${shortHash}`,
      pubKey,
      secretKey: rawSecret.toString('hex')
    };
  }

  /**
   * Generate deterministic unique message ID from content and metadata
   */
  static generateMessageId(senderId, spaceId, channelId, timestamp, content) {
    const data = `${senderId}:${spaceId}:${channelId}:${timestamp}:${content}`;
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
  }

  /**
   * ZBAT Framing:
   * - Zahir (ظَاهِر): Manifest routing metadata visible to mesh routers
   * - Batin (بَاطِن): Payload container (optionally encrypted with channel key)
   */
  static wrapZbat(senderId, spaceId, channelId, payload, options = {}) {
    const timestamp = options.timestamp || Date.now();
    const messageId = options.messageId || this.generateMessageId(senderId, spaceId, channelId, timestamp, JSON.stringify(payload));
    const ttl = options.ttl !== undefined ? options.ttl : 5; // max 5 hops

    return {
      zahir: {
        version: 'zbat/1.3.0',
        messageId,
        senderId,
        spaceId,
        channelId,
        timestamp,
        ttl,
        hops: options.hops || 0,
        routeType: options.routeType || 'gossip',
        priority: options.priority || 'normal',
        isVoice: !!options.isVoice
      },
      batin: {
        content: payload.content || '',
        mediaUrl: payload.mediaUrl || null,
        voiceData: payload.voiceData || null, // Base64 audio or PCM
        attachments: payload.attachments || null, // P2P File transfers
        replyTo: payload.replyTo || null,
        reactions: payload.reactions || {},
        sig: crypto.createHash('sha256').update(`${senderId}:${messageId}:${payload.content || ''}`).digest('hex').substring(0, 12)
      }
    };
  }

  /**
   * DTMF Frequencies (Dual-Tone Multi-Frequency) for Nagham Voice Protocol
   */
  static getDtmfFrequencies() {
    return {
      '1': [697, 1209], '2': [697, 1336], '3': [697, 1477], 'A': [697, 1633],
      '4': [770, 1209], '5': [770, 1336], '6': [770, 1477], 'B': [770, 1633],
      '7': [852, 1209], '8': [852, 1336], '9': [852, 1477], 'C': [852, 1633],
      '*': [941, 1209], '0': [941, 1336], '#': [941, 1477], 'D': [941, 1633]
    };
  }
}

module.exports = ZbatCrypto;
