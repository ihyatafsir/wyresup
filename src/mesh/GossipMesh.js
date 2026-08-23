/**
 * WyreSup Gossip Mesh Layer (نِظَام البَثّ و السِّلْسِلَة - Bathth & Silsila)
 * Decentralized epidemic gossip protocol for multi-channel rooms.
 * Handles packet routing, loop prevention via seen-cache, hop count decrements,
 * and topic/channel subscription filtering.
 */

const EventEmitter = require('events');
const ZbatCrypto = require('./ZbatCrypto');

class GossipMesh extends EventEmitter {
  constructor(options = {}) {
    super();
    this.nodeId = options.nodeId || ZbatCrypto.generateIdentity('mesh-node').fullId;
    this.maxHops = options.maxHops || 6;
    this.seenCacheLimit = options.seenCacheLimit || 5000;
    
    // Set of seen message IDs for loop prevention
    this.seenMessages = new Set();
    this.seenHistoryOrder = [];

    // Channel subscriptions for this node: Set of channelId
    this.subscriptions = new Set(['chan-general', 'chan-protocol-dev', 'chan-announcements', 'chan-voice-lounge']);

    // Direct peer connections: peerId -> connectionObject
    this.neighbors = new Map();

    // In-memory message backlog: channelId -> Array of messages
    this.channelBacklog = new Map();

    // Diagnostics / Metrics
    this.stats = {
      messagesPublished: 0,
      messagesReceived: 0,
      messagesForwarded: 0,
      duplicatesDropped: 0,
      hopsObserved: []
    };
  }

  /**
   * Subscribe or unsubscribe to specific room channels
   */
  subscribe(channelId) {
    this.subscriptions.add(channelId);
  }

  unsubscribe(channelId) {
    this.subscriptions.delete(channelId);
  }

  isSubscribed(channelId) {
    return this.subscriptions.has(channelId);
  }

  /**
   * Register a direct peer / transport neighbor in the mesh
   */
  addNeighbor(peerId, sendFunction, metadata = {}) {
    this.neighbors.set(peerId, {
      peerId,
      send: sendFunction,
      metadata,
      joinedAt: Date.now()
    });
    this.emit('neighbor_joined', { peerId, metadata });
  }

  removeNeighbor(peerId) {
    if (this.neighbors.has(peerId)) {
      this.neighbors.delete(peerId);
      this.emit('neighbor_left', { peerId });
    }
  }

  /**
   * Check and record seen message to prevent loops (Thaqb al-Takrar)
   */
  markSeen(messageId) {
    if (this.seenMessages.has(messageId)) {
      return true; // Already seen!
    }
    this.seenMessages.add(messageId);
    this.seenHistoryOrder.push(messageId);
    if (this.seenHistoryOrder.length > this.seenCacheLimit) {
      const oldest = this.seenHistoryOrder.shift();
      this.seenMessages.delete(oldest);
    }
    return false;
  }

  /**
   * Publish a new message from this node into the mesh
   */
  publish(spaceId, channelId, payload, options = {}) {
    const senderId = options.senderId || this.nodeId;
    const packet = ZbatCrypto.wrapZbat(senderId, spaceId, channelId, payload, {
      ...options,
      ttl: options.ttl || this.maxHops,
      hops: 0
    });

    this.markSeen(packet.zahir.messageId);
    this.stats.messagesPublished++;

    // Store in local channel backlog
    this._storeInBacklog(channelId, packet);

    // Emit locally
    this.emit('message', { packet, fromPeer: null, isLocal: true });

    // Broadcast (Bathth) to all neighbors
    this._broadcastToNeighbors(packet, null);

    return packet;
  }

  /**
   * Ingest an incoming gossip packet from a neighbor
   */
  receivePacket(packet, fromNeighborId) {
    if (!packet || !packet.zahir || !packet.batin) {
      return { status: 'invalid_packet' };
    }

    const { messageId, ttl, channelId, senderId } = packet.zahir;
    const currentHops = (packet.zahir.hops || 0) + 1;

    // 1. Check if already seen
    if (this.markSeen(messageId)) {
      this.stats.duplicatesDropped++;
      return { status: 'duplicate_dropped', messageId };
    }

    this.stats.messagesReceived++;
    this.stats.hopsObserved.push(currentHops);

    const receivedPacket = {
      ...packet,
      zahir: {
        ...packet.zahir,
        hops: currentHops
      }
    };

    // 2. Store in local backlog if relevant
    this._storeInBacklog(channelId, receivedPacket);

    // 3. Emit event for local consumers if subscribed or for general routing
    this.emit('message', {
      packet: receivedPacket,
      fromPeer: fromNeighborId,
      isLocal: senderId === this.nodeId
    });

    // 4. Forward (Silsila) to other neighbors if TTL allows
    if (ttl > 1) {
      const forwardedPacket = {
        ...receivedPacket,
        zahir: {
          ...receivedPacket.zahir,
          ttl: ttl - 1,
          hops: currentHops
        }
      };
      this.stats.messagesForwarded++;
      this._broadcastToNeighbors(forwardedPacket, fromNeighborId);
    }

    return { status: 'delivered', messageId, hops: currentHops };
  }

  /**
   * Broadcast packet to all neighbors except origin
   */
  _broadcastToNeighbors(packet, exceptPeerId) {
    for (const [peerId, neighbor] of this.neighbors.entries()) {
      if (peerId !== exceptPeerId) {
        try {
          neighbor.send(packet);
        } catch (err) {
          console.error(`[GossipMesh] Failed sending packet to neighbor ${peerId}:`, err.message);
        }
      }
    }
  }

  _storeInBacklog(channelId, packet) {
    if (!this.channelBacklog.has(channelId)) {
      this.channelBacklog.set(channelId, []);
    }
    const backlog = this.channelBacklog.get(channelId);
    backlog.push(packet);
    if (backlog.length > 200) {
      backlog.shift(); // keep last 200 messages per channel
    }
  }

  getChannelHistory(channelId) {
    return this.channelBacklog.get(channelId) || [];
  }

  clearChannelHistory(channelId) {
    if (channelId) {
      this.channelBacklog.set(channelId, []);
    } else {
      this.channelBacklog.clear();
    }
  }

  getDiagnostics() {
    return {
      nodeId: this.nodeId,
      neighborCount: this.neighbors.size,
      neighbors: Array.from(this.neighbors.keys()),
      subscriptions: Array.from(this.subscriptions),
      seenCacheSize: this.seenMessages.size,
      stats: this.stats
    };
  }
}

module.exports = GossipMesh;
