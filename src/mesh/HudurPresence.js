/**
 * WyreSup Hudur Presence Layer (نِظَام الحُضُور و النَّبْض)
 * Tracks peer presence (Hadir/Ghaib), typing indicators (Yaktub),
 * transport latencies, and connection routes.
 */

class HudurPresence {
  constructor(heartbeatTimeoutMs = 45000) {
    this.heartbeatTimeoutMs = heartbeatTimeoutMs;
    // peerId -> { peerId, prefix, shortHash, status: 'hadir'|'ghaib'|'mashghul', currentSpaceId, currentChannelId, lastSeen, latency, transport: 'tcp'|'ws'|'mesh', isTypingUntil: number }
    this.peers = new Map();
  }

  updatePeer(peerData) {
    const peerId = peerData.peerId;
    if (!peerId) return null;

    const existing = this.peers.get(peerId) || {
      peerId,
      prefix: peerData.prefix || peerId.split('@')[0] || 'peer',
      shortHash: peerData.shortHash || (peerId.split('@')[1] || '').substring(0, 8),
      status: 'hadir',
      currentSpaceId: 'space-public-mesh',
      currentChannelId: 'chan-general',
      transport: 'ws',
      latency: 15,
      isTypingUntil: 0
    };

    const updated = {
      ...existing,
      ...peerData,
      lastSeen: Date.now(),
      status: 'hadir'
    };

    this.peers.set(peerId, updated);
    return updated;
  }

  setTyping(peerId, channelId, durationMs = 4000) {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.isTypingUntil = Date.now() + durationMs;
      peer.typingChannelId = channelId;
    }
  }

  clearTyping(peerId) {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.isTypingUntil = 0;
      peer.typingChannelId = null;
    }
  }

  getTypingPeersInChannel(channelId) {
    const now = Date.now();
    const typing = [];
    for (const peer of this.peers.values()) {
      if (peer.isTypingUntil > now && peer.typingChannelId === channelId) {
        typing.push(peer);
      }
    }
    return typing;
  }

  removePeer(peerId) {
    this.peers.delete(peerId);
  }

  getPeersInSpace(spaceId) {
    const now = Date.now();
    const result = [];
    for (const peer of this.peers.values()) {
      // Check timeout
      if (now - peer.lastSeen > this.heartbeatTimeoutMs) {
        peer.status = 'ghaib';
      }
      result.push(peer);
    }
    return result;
  }

  getAllPeers() {
    const now = Date.now();
    for (const peer of this.peers.values()) {
      if (now - peer.lastSeen > this.heartbeatTimeoutMs) {
        peer.status = 'ghaib';
      }
    }
    return Array.from(this.peers.values());
  }
}

module.exports = HudurPresence;
