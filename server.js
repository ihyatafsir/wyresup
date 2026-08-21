/**
 * WyreSup Mesh Server (خَادِم المَجَالِس و شَبَكَة البَثّ)
 * Lightweight HTTP & WebSocket server providing:
 * - Discord-style Spaces & Channels API
 * - Real-time P2P Gossip Broadcast Relay
 * - Sawt Voice Note transmission
 * - Simulated Bot Peers Generator
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer, WebSocket } = require('ws');

const ZbatCrypto = require('./src/mesh/ZbatCrypto');
const MajlisManager = require('./src/mesh/MajlisManager');
const LisanEngine = require('./src/mesh/LisanEngine');
const GossipMesh = require('./src/mesh/GossipMesh');
const HudurPresence = require('./src/mesh/HudurPresence');
const YouTubeStreamer = require('./src/mesh/YouTubeStreamer');

const PORT = process.env.PORT || 5195;

// Initialize Core Managers
const majlisManager = new MajlisManager();
const presenceManager = new HudurPresence();
const serverNodeIdentity = ZbatCrypto.generateIdentity('wyresup-hub');
const gossipMesh = new GossipMesh({ nodeId: serverNodeIdentity.fullId });

// Track connected WebSocket clients: ws -> { peerId, prefix, shortHash, spaceId, channelId }
const connectedClients = new Map();

// Helper for MIME types
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.zip': 'application/zip',
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg',
  '.webm': 'video/webm',
  '.m4a': 'audio/mp4'
};

// HTTP Server
const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // --- API Endpoints ---
  // --- Lisan al-Arab Linguistic Engine API ---
  if (pathname === '/api/lisan' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(LisanEngine.getLexicon()));
    return;
  }

  if (pathname === '/api/lisan/lookup' && req.method === 'GET') {
    const q = parsedUrl.searchParams.get('q') || '';
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(LisanEngine.lookup(q)));
    return;
  }

  if (pathname === '/api/spaces' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(majlisManager.getAllSpaces()));
    return;
  }

  if (pathname === '/api/spaces' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const newSpace = majlisManager.createSpace(data);
        broadcastSystemEvent('SPACE_CREATED', newSpace);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(newSpace));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (pathname.match(/^\/api\/spaces\/([^/]+)\/channels$/) && req.method === 'POST') {
    const spaceId = pathname.split('/')[3];
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const newChan = majlisManager.addChannel(spaceId, data);
        broadcastSystemEvent('CHANNEL_CREATED', { spaceId, channel: newChan });
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(newChan));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (pathname.startsWith('/api/history/') && req.method === 'GET') {
    const channelId = pathname.replace('/api/history/', '');
    const history = gossipMesh.getChannelHistory(channelId);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(history));
    return;
  }

  if (pathname === '/api/peers' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(presenceManager.getAllPeers()));
    return;
  }

  if (pathname === '/api/diagnostics' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      hubNode: serverNodeIdentity,
      connectedClientsCount: connectedClients.size,
      meshStats: gossipMesh.getDiagnostics(),
      activeSpaces: majlisManager.getAllSpaces().length,
      allPeers: presenceManager.getAllPeers()
    }));
    return;
  }

  if (pathname === '/api/bots/spawn' && req.method === 'POST') {
    spawnVirtualPeerBot();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'Virtual mesh bot spawned' }));
    return;
  }

  // --- YouTube Streaming & Watch Party API ---
  if (pathname === '/api/youtube/prepare' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const data = JSON.parse(body || '{}');
        const streamInfo = await YouTubeStreamer.prepareStream(data.url || data.query);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(streamInfo));
      } catch (err) {
        console.error('[YouTubeStreamer Error]:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (pathname === '/api/youtube/search' && req.method === 'GET') {
    const q = parsedUrl.searchParams.get('q') || '';
    YouTubeStreamer.searchVideos(q)
      .then(results => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(results));
      })
      .catch(err => {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      });
    return;
  }

  // --- Static Files ---
  let filePath = path.join(__dirname, 'public', pathname === '/' ? 'index.html' : pathname);
  const extname = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';

  // Check file stats for range streaming
  fs.stat(filePath, (statErr, stats) => {
    if (statErr) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const range = req.headers.range;
    if (range && (extname === '.mp4' || extname === '.mp3' || extname === '.webm')) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
      const chunksize = (end - start) + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stats.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType
      });
      fileStream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': stats.size,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      });
      fs.createReadStream(filePath).pipe(res);
    }
  });
});

// WebSocket Server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  let clientPeer = null;

  ws.on('message', (messageRaw) => {
    try {
      const msg = JSON.parse(messageRaw.toString());
      handleClientMessage(ws, msg);
    } catch (e) {
      console.error('[WS Error] Invalid JSON received:', e.message);
    }
  });

  ws.on('close', () => {
    if (clientPeer) {
      presenceManager.removePeer(clientPeer.peerId);
      connectedClients.delete(ws);
      gossipMesh.removeNeighbor(clientPeer.peerId);
      broadcastPresenceUpdate();
      console.log(`[Mesh] Peer disconnected: ${clientPeer.peerId}`);
    }
  });

  ws.on('error', (err) => {
    console.error('[WS Socket Error]:', err.message);
  });
});

function handleClientMessage(ws, msg) {
  const { type, payload } = msg;

  switch (type) {
    case 'IDENTIFY': {
      const peerId = payload.peerId || ZbatCrypto.generateIdentity(payload.prefix || 'anon').fullId;
      const prefix = payload.prefix || peerId.split('@')[0];
      const shortHash = peerId.split('@')[1] || '00000000';

      const peerRecord = presenceManager.updatePeer({
        peerId,
        prefix,
        shortHash,
        currentSpaceId: payload.spaceId || 'space-public-mesh',
        ecdhPubKey: payload.ecdhPubKey || null,
        signPubKey: payload.signPubKey || null,
        currentChannelId: payload.channelId || 'chan-general',
        transport: 'ws',
        latency: Math.floor(Math.random() * 10) + 12
      });

      connectedClients.set(ws, peerRecord);

      // Register neighbor with GossipMesh
      gossipMesh.addNeighbor(peerId, (packet) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'GOSSIP_PACKET', payload: packet }));
        }
      }, { transport: 'ws' });

      // Send ACK back to client
      ws.send(JSON.stringify({
        type: 'IDENTIFIED',
        payload: {
          identity: peerRecord,
          spaces: majlisManager.getAllSpaces(),
          peers: presenceManager.getAllPeers()
        }
      }));

      broadcastPresenceUpdate();
      console.log(`[Mesh] Peer identified: ${peerId}`);
      break;
    }

    case 'SEND_MESSAGE': {
      const client = connectedClients.get(ws);
      if (!client) return;

      let targetChannel = client.currentChannelId;

      if (payload.zahir && payload.batin) {
        // Direct pre-wrapped / encrypted ZBAT packet from client (Zero-Knowledge Relay)
        targetChannel = payload.zahir.channelId;
        gossipMesh.receivePacket(payload, client.peerId);
      } else {
        const spaceId = payload.spaceId || client.currentSpaceId;
        targetChannel = payload.channelId || client.currentChannelId;

        gossipMesh.publish(spaceId, targetChannel, {
          content: payload.content,
          mediaUrl: payload.mediaUrl,
          voiceData: payload.voiceData,
          attachments: payload.attachments,
          replyTo: payload.replyTo
        }, {
          senderId: client.peerId,
          isVoice: !!payload.voiceData
        });
      }

      // Clear typing indicator for sender
      presenceManager.clearTyping(client.peerId);
      broadcastTypingUpdate(targetChannel);
      break;
    }

    case 'GOSSIP_PACKET': {
      const client = connectedClients.get(ws);
      if (client && payload) {
        gossipMesh.receivePacket(payload, client.peerId);
      }
      break;
    }

    case 'TYPING': {
      const client = connectedClients.get(ws);
      if (client && payload.channelId) {
        presenceManager.setTyping(client.peerId, payload.channelId, 4000);
        broadcastTypingUpdate(payload.channelId);
      }
      break;
    }

    case 'HEARTBEAT': {
      const client = connectedClients.get(ws);
      if (client) {
        presenceManager.updatePeer({ peerId: client.peerId, latency: payload.latency || 15 });
      }
      break;
    }

    case 'SWITCH_CHANNEL': {
      const client = connectedClients.get(ws);
      if (client) {
        client.currentSpaceId = payload.spaceId;
        client.currentChannelId = payload.channelId;
        presenceManager.updatePeer(client);
        broadcastPresenceUpdate();
      }
      break;
    }

    case 'CALL_SIGNAL': {
      const client = connectedClients.get(ws);
      if (!client) return;
      const targetPeer = payload.targetPeer;
      for (const [targetWs, targetRecord] of connectedClients.entries()) {
        const matches = targetRecord.peerId === targetPeer ||
                        targetRecord.prefix === targetPeer ||
                        targetRecord.peerId.startsWith(`${targetPeer}@`);
        if (matches && targetWs !== ws && targetWs.readyState === WebSocket.OPEN) {
          targetWs.send(JSON.stringify({
            type: 'CALL_SIGNAL',
            payload: {
              ...payload,
              senderPeer: client.peerId,
              senderPrefix: client.prefix
            }
          }));
        }
      }
      break;
    }
  }
}

// Forward GossipMesh messages to all connected clients
gossipMesh.on('message', ({ packet, isLocal }) => {
  const jsonStr = JSON.stringify({ type: 'GOSSIP_PACKET', payload: packet });
  for (const [wsClient] of connectedClients.entries()) {
    if (wsClient.readyState === WebSocket.OPEN) {
      wsClient.send(jsonStr);
    }
  }
});

function broadcastPresenceUpdate() {
  const peers = presenceManager.getAllPeers();
  const jsonStr = JSON.stringify({ type: 'PRESENCE_SYNC', payload: { peers } });
  for (const [wsClient] of connectedClients.entries()) {
    if (wsClient.readyState === WebSocket.OPEN) {
      wsClient.send(jsonStr);
    }
  }
}

function broadcastTypingUpdate(channelId) {
  const typing = presenceManager.getTypingPeersInChannel(channelId);
  const jsonStr = JSON.stringify({ type: 'TYPING_UPDATE', payload: { channelId, typing } });
  for (const [wsClient] of connectedClients.entries()) {
    if (wsClient.readyState === WebSocket.OPEN) {
      wsClient.send(jsonStr);
    }
  }
}

function broadcastSystemEvent(eventType, data) {
  const jsonStr = JSON.stringify({ type: eventType, payload: data });
  for (const [wsClient] of connectedClients.entries()) {
    if (wsClient.readyState === WebSocket.OPEN) {
      wsClient.send(jsonStr);
    }
  }
}

// Spawn virtual peer bot (e.g. Al-Kindi, Ibn-Sina, Farabi) for realistic mesh simulation
const BOT_NAMES = ['al-kindi', 'ibn-sina', 'al-farabi', 'al-biruni', 'al-khwarizmi', 'ibn-rushd'];
const BOT_QUOTES = [
  'Establishing ZBAT packet link across mesh node.',
  'Miftah key verified. Thaqb sequence clean (PFS=Active).',
  'Broadcasting presence pulse (Nabd) to #general.',
  'Sawt acoustic waveform decoded at 48kHz.',
  'Carrier Wasam hint detected: wyrenet-wasam-mesh.',
  'Decentralized channel state synced across 4 hops.'
];

function spawnVirtualPeerBot() {
  const randomName = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
  const botId = ZbatCrypto.generateIdentity(randomName).fullId;
  
  presenceManager.updatePeer({
    peerId: botId,
    prefix: randomName,
    shortHash: botId.split('@')[1],
    currentSpaceId: 'space-public-mesh',
    currentChannelId: 'chan-general',
    transport: 'tcp',
    latency: Math.floor(Math.random() * 8) + 4
  });

  broadcastPresenceUpdate();

  // Send a greeting after 500ms
  setTimeout(() => {
    const quote = BOT_QUOTES[Math.floor(Math.random() * BOT_QUOTES.length)];
    gossipMesh.publish('space-public-mesh', 'chan-general', {
      content: `[مُحَاكَاة Mesh Bot] ${quote}`
    });
  }, 600);
}

// Start Server
server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`  WyreSup Mesh Server running on http://localhost:${PORT}`);
  console.log(`  Protocol: 13-Layer Stack (ZBAT + Miftah + Bathth)`);
  console.log(`  Hub Node: ${serverNodeIdentity.fullId}`);
  console.log(`=======================================================`);
});
