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
const ImamRaziLibrary = require('./src/mesh/ImamRaziLibrary');
const ImamGhazaliLibrary = require('./src/mesh/ImamGhazaliLibrary');
const ImamNawawiLibrary = require('./src/mesh/ImamNawawiLibrary');
const ImamRaghibLibrary = require('./src/mesh/ImamRaghibLibrary');
const ClassicalHeritageLibrary = require('./src/mesh/ClassicalHeritageLibrary');
const { NafaqLisanTunnel, NAFAQ_MAGIC } = require('./src/mesh/NafaqLisanTunnel');
const ShabahStego = require('./src/mesh/ShabahStego');
const WyreNetGateway = require('./src/mesh/WyreNetGateway');

const PORT = process.env.PORT || 5195;

// Initialize Core Managers
const majlisManager = new MajlisManager();
const presenceManager = new HudurPresence();
const serverNodeIdentity = ZbatCrypto.generateIdentity('wyresup-hub');
const gossipMesh = new GossipMesh({ nodeId: serverNodeIdentity.fullId });
const nafaqTunnel = new NafaqLisanTunnel({ peerId: 'wyresup-hub@nafaq' });
const wyreNetGateway = new WyreNetGateway({ chainId: 51950, nodeHost: '127.0.0.1', nodePort: 9656 });

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
  '.m4a': 'audio/mp4',
  '.epub': 'application/epub+zip',
  '.pdf': 'application/pdf'
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
  // --- WyreNet Sovereign L1 Blockchain API ---
  if (pathname === '/api/wyrenet/status' && req.method === 'GET') {
    wyreNetGateway.getStatus().then(status => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(status));
    }).catch(err => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    });
    return;
  }

  if (pathname.startsWith('/api/wyrenet/balance/') && req.method === 'GET') {
    const address = pathname.replace('/api/wyrenet/balance/', '').trim();
    wyreNetGateway.getBalance(address).then(bal => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(bal));
    }).catch(err => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    });
    return;
  }

    if (pathname === '/api/wyrenet/notarize' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const channelId = payload.channelId || payload.type || 'GLOBAL_REGISTRY';
        const msgContent = payload.msgContent || payload.title || payload.name || payload.filename || 'CONTENT_PROOF';
        const senderDid = payload.senderDid || payload.creatorDid || payload.publisherDid || 'did:wyre:anonymous';
        const targetHash = payload.hash || payload.messageHash || null;

        const proof = wyreNetGateway.notarizeMessage(channelId, msgContent, senderDid, targetHash);
        if (payload.title) proof.title = payload.title;
        if (payload.type) proof.type = payload.type;
        if (payload.filename) proof.filename = payload.filename;
        if (payload.author) proof.author = payload.author;

        broadcastSystemEvent('WYRENET_NOTARIZATION', proof);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, status: 'CONFIRMED', proof, txHash: proof.txHash, blockNumber: proof.blockHeight }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  
  if (pathname.startsWith('/api/wyrenet/verify/') && req.method === 'GET') {
    const hash = pathname.replace('/api/wyrenet/verify/', '').trim();
    const result = wyreNetGateway.verifyMessageProof(hash);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
    return;
  }

  if (pathname === '/api/wyrenet/verify' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { hash } = JSON.parse(body);
        const result = wyreNetGateway.verifyMessageProof(hash);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  
  if (pathname.startsWith('/api/wyrenet/auth/challenge/') && req.method === 'GET') {
    const address = pathname.replace('/api/wyrenet/auth/challenge/', '').trim();
    const challenge = wyreNetGateway.generateChallenge(address);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(challenge));
    return;
  }

  if (pathname === '/api/wyrenet/auth/verify' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { address, signature } = JSON.parse(body);
        const result = wyreNetGateway.verifySignature(address, signature);
        if (result.verified) {
          broadcastSystemEvent('DID_VERIFIED_KEYHOLDER', result.record);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        } else {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        }
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (pathname === '/api/wyrenet/did/register' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { did, address, pubKey } = JSON.parse(body);
        const result = wyreNetGateway.registerDid(did, address, pubKey);
        broadcastSystemEvent('DID_REGISTERED', result);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (pathname.startsWith('/api/wyrenet/did/') && req.method === 'GET') {
    const did = decodeURIComponent(pathname.replace('/api/wyrenet/did/', ''));
    const rec = wyreNetGateway.getDid(did);
    if (rec) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ found: true, record: rec }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ found: false, error: 'DID not found' }));
    }
    return;
  }

  if (pathname === '/api/wyrenet/rpc' && (req.method === 'POST' || req.method === 'GET')) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        let payload = null;
        if (body && body.trim().length > 0) {
          try { payload = JSON.parse(body); } catch (e) { payload = null; }
        }
        const rpcRes = await wyreNetGateway.forwardRpc(payload, req.method);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(rpcRes, null, 2));
      } catch (err) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error: ' + err.message } }));
      }
    });
    return;
  }

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

  if (pathname === '/api/channels/clear' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        const channelId = data.channelId || 'chan-general';
        gossipMesh.clearChannelHistory(channelId);
        broadcastSystemEvent('MESSAGES_CLEARED', { channelId });
        console.log(`[Mesh Admin]  Channel ${channelId} history wiped clean.`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, channelId, message: `Channel ${channelId} wiped clean` }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
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
      nafaqTunnelStats: nafaqTunnel.stats,
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

  if (pathname === '/api/library/razi' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(ImamRaziLibrary.getCatalog()));
    return;
  }

  if ((pathname === '/api/library/ghazali' || pathname === '/api/library/abuhami') && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(ImamGhazaliLibrary.getCatalog()));
    return;
  }

  if (pathname === '/api/library/nawawi' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(ImamNawawiLibrary.getCatalog()));
    return;
  }

  if ((pathname === '/api/library/raghib' || pathname === '/api/library/isfahani') && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(ImamRaghibLibrary.getCatalog()));
    return;
  }

  if ((pathname === '/api/library/heritage' || pathname === '/api/library/classical') && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(ClassicalHeritageLibrary.getCatalog()));
    return;
  }

  if (pathname === '/api/library/manifest' && req.method === 'GET') {
    const manifestPath = path.join(__dirname, 'public/epubs/wyrenet_classical_corpus_l1_manifest.json');
    if (fs.existsSync(manifestPath)) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(fs.readFileSync(manifestPath, 'utf8'));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Manifest not found' }));
    }
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
  if (pathname === '/wyrenet' || pathname === '/wyrenet/' || pathname === '/wyresup' || pathname === '/wyresup/') {
    filePath = path.join(__dirname, 'public', 'wyrenet', 'index.html');
  }
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
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (messageRaw) => {
    //  Check for Nafaq al-Lisan Zero-Copy Binary Shards
    const buf = Buffer.isBuffer(messageRaw) ? messageRaw : Buffer.from(messageRaw);
    if (buf.length >= 12 && buf.readUIntBE(0, 3) === NAFAQ_MAGIC) {
      // Broadcast zero-copy binary shard to peer sockets (Zero-Knowledge Blind Relay)
      for (const [targetWs] of connectedClients.entries()) {
        if (targetWs !== ws && targetWs.readyState === WebSocket.OPEN) {
          targetWs.send(buf);
        }
      }
      return;
    }

    try {
      const msg = JSON.parse(messageRaw.toString());
      handleClientMessage(ws, msg);
    } catch (e) {
      console.error('[WS Error] Invalid JSON received:', e.message);
    }
  });

  ws.on('close', () => {
    const record = connectedClients.get(ws);
    if (record) {
      presenceManager.removePeer(record.peerId);
      connectedClients.delete(ws);
      gossipMesh.removeNeighbor(record.peerId);
      broadcastPresenceUpdate();
      console.log(`[Mesh] Peer disconnected: ${record.peerId}`);
    } else {
      connectedClients.delete(ws);
    }
  });

  ws.on('error', (err) => {
    console.error('[WS Socket Error]:', err.message);
  });
});

// Cellular Carrier Pinhole & Half-Open Socket Sweeper (نبض الشبكة وصيانة الوصل)
const keepAliveInterval = setInterval(() => {
  for (const [ws, client] of connectedClients.entries()) {
    if (ws.isAlive === false) {
      console.log(`[Mesh Keepalive] Terminating dead half-open socket for: ${client ? client.peerId : "unknown"}`);
      try { ws.terminate(); } catch (e) {}
      connectedClients.delete(ws);
      if (client?.peerId) {
        presenceManager.removePeer(client.peerId);
        gossipMesh.removeNeighbor(client.peerId);
      }
      broadcastPresenceUpdate();
      continue;
    }
    ws.isAlive = false;
    try { ws.ping(); } catch (e) {}
  }
}, 30000);

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

      // Symmetrical Pinhole Guardian: Prune duplicate/stale sockets for this peer
      for (const [existingWs, existingRecord] of connectedClients.entries()) {
        if (existingWs !== ws && (existingRecord.peerId === peerId || existingRecord.prefix === prefix)) {
          try {
            existingWs.terminate();
          } catch (e) {}
          connectedClients.delete(existingWs);
          console.log(`[Mesh] Pruned stale socket for peer: ${peerId}`);
        }
      }

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
      ws.isAlive = true;
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
      const targetPrefix = targetPeer ? targetPeer.split('@')[0] : '';
      let forwardedCount = 0;

      // 1. Exact peerId match (Pillar 4: Kitāb al-ʿAyn - unambiguous targeting)
      let matchedSockets = [];
      for (const [targetWs, targetRecord] of connectedClients.entries()) {
        if (targetWs === ws || targetWs.readyState !== WebSocket.OPEN) continue;
        if (targetRecord.peerId === targetPeer) {
          matchedSockets.push(targetWs);
        }
      }

      // 2. If no exact peerId match and targetPeer has no '@', match by exact prefix (human clients only, never bots)
      if (matchedSockets.length === 0 && targetPeer && !targetPeer.includes('@')) {
        for (const [targetWs, targetRecord] of connectedClients.entries()) {
          if (targetWs === ws || targetWs.readyState !== WebSocket.OPEN) continue;
          if (targetRecord.prefix === targetPeer && !targetRecord.peerId.endsWith('@mesh')) {
            matchedSockets.push(targetWs);
          }
        }
      }

      // 3. Fallback prefix matching: never route human calls to bots (@mesh) unless explicitly targeted
      if (matchedSockets.length === 0 && targetPrefix) {
        for (const [targetWs, targetRecord] of connectedClients.entries()) {
          if (targetWs === ws || targetWs.readyState !== WebSocket.OPEN) continue;
          const clientPrefix = targetRecord.prefix || (targetRecord.peerId ? targetRecord.peerId.split('@')[0] : '');
          if (clientPrefix === targetPrefix) {
            if (targetPeer.endsWith('@mesh') || !targetRecord.peerId.endsWith('@mesh')) {
              matchedSockets.push(targetWs);
            }
          }
        }
      }

      for (const targetWs of matchedSockets) {
        targetWs.send(JSON.stringify({
          type: 'CALL_SIGNAL',
          payload: {
            ...payload,
            senderPeer: client.peerId,
            senderPrefix: client.prefix
          }
        }));
        forwardedCount++;
      }
      if (payload.signalType !== 'NAFAQ_PCM' && payload.signalType !== 'SHAF_HD_FRAME' && payload.signalType !== 'WASAM_PING') {
        console.log(`[CALL_SIGNAL] ${payload.signalType} from ${client.peerId} -> ${targetPeer} (Forwarded to ${forwardedCount} peer socket(s))`);
      }
      if (forwardedCount === 0 && (payload.signalType === 'OFFER' || payload.signalType === 'ANSWER')) {
        ws.send(JSON.stringify({
          type: 'CALL_SIGNAL',
          payload: {
            signalType: 'PEER_UNREACHABLE',
            targetPeer,
            reason: `Peer ${targetPeer} is currently offline or unreachable.`
          }
        }));
      }
      break;
    }

    case 'KEY_REQUEST': {
      const { targetPeer, targetPrefix } = payload;
      const allPeers = presenceManager.getAllPeers();
      const match = allPeers.find(p => p.peerId === targetPeer || p.prefix === targetPrefix || p.peerId.startsWith(`${targetPrefix}@`));
      if (match && match.ecdhPubKey) {
        ws.send(JSON.stringify({
          type: 'KEY_RESPONSE',
          payload: {
            peerId: match.peerId,
            prefix: match.prefix,
            ecdhPubKey: match.ecdhPubKey,
            signPubKey: match.signPubKey
          }
        }));
        console.log(`[Miftah] Responded with on-demand public key for @${match.prefix || match.peerId}`);
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


// Seed Imam Razi EPUB Library Catalog into #imam-razi channel
function seedImamRaziLibrary() {
  const channelId = 'chan-imam-razi';
  const spaceId = 'space-public-mesh';
  const catalog = ImamRaziLibrary.getCatalog();

  // Clear existing messages to apply clean restored layout
  const channelMsgs = gossipMesh.getChannelHistory(channelId);
  if (channelMsgs && channelMsgs.length > 0) {
    gossipMesh.clearChannelHistory(channelId);
  }

  // 1. Welcome Message
  gossipMesh.publish(spaceId, channelId, {
    content: `🏛️ **مَكْتَبَة الإِمَام فَخْر الدِّين الرَّازِيّ // COMPLETE EPUB TRANSLATIONS LIBRARY**

Welcome to the official digital library of **Imam Fakhr al-Din al-Razi's (544–606 AH / 1149–1209 CE)** translated masterworks. All volumes are available below as standalone EPUB e-books for offline reading and direct P2P download.`
  }, { senderId: 'ibn-manzur@lisan' });

  // 2. Tafsir al-Kabir (Volumes 1-32)
  if (catalog.tafsirKabir && catalog.tafsirKabir.length > 0) {
    const atts = catalog.tafsirKabir.map(item => ({
      name: item.filename,
      type: 'application/epub+zip',
      size: 1500000,
      data: item.downloadUrl,
      title: item.title,
      arabicTitle: item.arabicTitle
    }));

    gossipMesh.publish(spaceId, channelId, {
      content: `📖 **Tafsir al-Kabir (Mafatih al-Ghayb) — Volumes 1 to 32 (Complete)**
*The monumental commentary on the Holy Quran by Imam Fakhr al-Din al-Razi. Complete 32-volume English translation.* `,
      attachments: atts
    }, { senderId: 'ibn-manzur@lisan' });
  }

  // 3. Al-Matalib al-'Aliyyah (Volumes 1-9 + Complete)
  if (catalog.matalib && catalog.matalib.length > 0) {
    const atts = catalog.matalib.map(item => ({
      name: item.filename,
      type: 'application/epub+zip',
      size: 1200000,
      data: item.downloadUrl,
      title: item.title,
      arabicTitle: item.arabicTitle
    }));

    gossipMesh.publish(spaceId, channelId, {
      content: `📜 **Al-Matalib al-'Aliyyah min al-'Ilm al-Ilahi (The Sublime Quests in Divine Science)**
*Imam al-Razi's final philosophical and theological magnum opus (Vols 1–9 + Complete Compendium in Pure English & Arabic Lexical Editions).* `,
      attachments: atts
    }, { senderId: 'ibn-manzur@lisan' });
  }

  // 4. I'tiqadat Firaq al-Muslimin wa'l-Mushrikin (Comparative Heresiography & World Religions)
  const itiqadatItems = (catalog.firaqAndFiqh || []).filter(item => item.filename.includes('itiqadat'));
  if (itiqadatItems.length > 0) {
    const atts = itiqadatItems.map(item => ({
      name: item.filename,
      type: 'application/epub+zip',
      size: 100000,
      data: item.downloadUrl,
      title: item.title,
      arabicTitle: item.arabicTitle
    }));

    gossipMesh.publish(spaceId, channelId, {
      content: `📌 **Iʿtiqādāt Firaq al-Muslimīn wa-al-Mushrikīn (اعتقادات فرق المسلمين والمشركين)**\n*Imam Fakhr al-Din al-Razi's seminal classical treatise on world religions, theological sects, and Islamic heresiography. Complete translations available in Pure English Scholarly Edition and Bilingual 5-Pillar Apparatus Edition.*`,
      attachments: atts
    }, { senderId: 'ibn-manzur@lisan' });
  }

  // 5. Al-Mahsul fi 'Ilm Usul al-Fiqh (Jurisprudence Opus)
  const mahsulItems = (catalog.firaqAndFiqh || []).filter(item => item.filename.includes('mahsul'));
  if (mahsulItems.length > 0) {
    const atts = mahsulItems.map(item => ({
      name: item.filename,
      type: 'application/epub+zip',
      size: 2000000,
      data: item.downloadUrl,
      title: item.title,
      arabicTitle: item.arabicTitle
    }));

    gossipMesh.publish(spaceId, channelId, {
      content: `⚖️ **Al-Mahsul fi 'Ilm Usul al-Fiqh (المحصول في علم أصول الفقه)**\n*Imam al-Razi's monumental compendium on legal theory and jurisprudence methodology in both Pure English and Bilingual Scholarly Editions.*`,
      attachments: atts
    }, { senderId: 'ibn-manzur@lisan' });
  }

  // 5. Core Kalam & Theological Treatises
  if (catalog.kalamTreatises && catalog.kalamTreatises.length > 0) {
    const atts = catalog.kalamTreatises.map(item => ({
      name: item.filename,
      type: 'application/epub+zip',
      size: 900000,
      data: item.downloadUrl,
      title: item.title,
      arabicTitle: item.arabicTitle
    }));

    gossipMesh.publish(spaceId, channelId, {
      content: `💎 **Core Kalam & Philosophical Theology Treatises**
*Including Asas al-Taqdis, Lawami' al-Bayyinat, Kitab al-Arba'in, 'Ismat al-Anbiya', Ma'alim Usul al-Din, and Al-Qada' wa'l-Qadar.* `,
      attachments: atts
    }, { senderId: 'ibn-manzur@lisan' });
  }
}

// Seed Imam Abu Hamid al-Ghazali EPUB Library Catalog into #imam-abuhamid channel
function seedImamGhazaliLibrary() {
  const channelId = "chan-imam-abuhamidd";
  const spaceId = "space-public-mesh";
  const catalog = ImamGhazaliLibrary.getCatalog();

  gossipMesh.clearChannelHistory(channelId);

  gossipMesh.publish(spaceId, channelId, {
    content: "**Maktabat Hujjat al-Islam al-Imam Abi Hamid al-Ghazali (450-505 AH / 1058-1111 CE)**\n\nWelcome to the complete digitized classical library of **Imam Abu Hamid al-Ghazali**.\n\nIncluded below are the complete full-text unabridged editions:\n- **Ihya Ulum al-Din**: The Monumental 4-Volume Master Corpus (All 40 Books Complete).\n- **Pure English Scholarly Editions**: Direct 1st-person authorial translations.\n- **Bilingual Scholarly Apparatus Editions**: Classical Arabic text + Quad-Lexical semantic apparatus (Al-Raghib, Asas al-Balaghah, Lisan al-Arab, Sibawayh)."
  }, { senderId: "ibn-manzur@lisan" });

  if (catalog.ihyaVolumes && catalog.ihyaVolumes.length > 0) {
    const atts = catalog.ihyaVolumes.map(item => ({
      name: item.filename,
      type: "application/epub+zip",
      size: 700000,
      data: item.downloadUrl,
      title: item.title,
      arabicTitle: item.arabicTitle
    }));

    gossipMesh.publish(spaceId, channelId, {
      content: "**IHYA ULUM AL-DIN - THE MONUMENTAL 4-VOLUME MAGNUM OPUS (COMPLETE 40 BOOKS)**\n*The definitive English translation of the 4 quarters: Acts of Devotion, Norms of Daily Life, Ways to Perdition, and Ways to Salvation.*\n\n- **Vol 1**: *Rub al-Ibadat* (Books 1-10)\n- **Vol 2**: *Rub al-Adat* (Books 11-20)\n- **Vol 3**: *Rub al-Muhlikat* (Books 21-30)\n- **Vol 4**: *Rub al-Munjiyat* (Books 31-40)",
      attachments: atts
    }, { senderId: "ibn-manzur@lisan" });
  }

  if (catalog.pureEditions && catalog.pureEditions.length > 0) {
    const atts = catalog.pureEditions.map(item => ({
      name: item.filename,
      type: "application/epub+zip",
      size: 500000,
      data: item.downloadUrl,
      title: item.title,
      arabicTitle: item.arabicTitle
    }));

    gossipMesh.publish(spaceId, channelId, {
      content: "**Edition 1: Pure English Scholarly Corpus (" + catalog.pureEditions.length + " Volumes)**\n*Direct, unabridged English translations of Al-Munqidh min al-Dalal, Tahafut al-Falasifa, Mishkat al-Anwar, Al-Mustasfa, Bidayat al-Hidayah, Kimiya-yi Saadat, and the entire philosophical, ethical, and legal corpus.*",
      attachments: atts
    }, { senderId: "ibn-manzur@lisan" });
  }

  if (catalog.bilingualEditions && catalog.bilingualEditions.length > 0) {
    const atts = catalog.bilingualEditions.map(item => ({
      name: item.filename,
      type: "application/epub+zip",
      size: 800000,
      data: item.downloadUrl,
      title: item.title,
      arabicTitle: item.arabicTitle
    }));

    gossipMesh.publish(spaceId, channelId, {
      content: "**Edition 2: Bilingual Scholarly Apparatus Corpus (" + catalog.bilingualEditions.length + " Volumes)**\n*Full classical Arabic text with Quad-Lexical semantic anchors and aligned English translations for research, memorization, and scholarly study.*",
      attachments: atts
    }, { senderId: "ibn-manzur@lisan" });
  }
}

function seedImamNawawiLibrary() {
  const channelId = "chan-imam-nawawi";
  const spaceId = "space-public-mesh";
  const catalog = ImamNawawiLibrary.getCatalog();

  gossipMesh.clearChannelHistory(channelId);

  gossipMesh.publish(spaceId, channelId, {
    content: "**Maktabat al-Imam Muhyi al-Din Yahya ibn Sharaf al-Nawawi (631-676 AH / 1233-1277 CE)**\n\nWelcome to the complete digital classical library of **Imam Abu Zakariyya Yahya ibn Sharaf al-Nawawi**.\n\nAll 22 revered Hadith, devotional, and legal masterworks are available below in **Two Distinct Publishing Editions**:\n1. **Pure English Scholarly Editions**: Direct authorial translations.\n2. **Bilingual Scholarly Apparatus Editions**: Classical Arabic text + Quad-Lexical apparatus + English translation."
  }, { senderId: "ibn-manzur@lisan" });

  if (catalog.pureEditions && catalog.pureEditions.length > 0) {
    const atts = catalog.pureEditions.map(item => ({
      name: item.filename,
      type: "application/epub+zip",
      size: 500000,
      data: item.downloadUrl,
      title: item.title,
      arabicTitle: item.arabicTitle
    }));

    gossipMesh.publish(spaceId, channelId, {
      content: "**Edition 1: Pure English Scholarly Corpus (" + catalog.pureEditions.length + " Volumes)**\n*The Forty Hadith (Al-Arbain), Riyad al-Salihin, Al-Tibyan, Kitab al-Adhkar, Minhaj al-Talibin, Sharh Sahih Muslim, Al-Majmu, and all 22 masterworks.*",
      attachments: atts
    }, { senderId: "ibn-manzur@lisan" });
  }

  if (catalog.bilingualEditions && catalog.bilingualEditions.length > 0) {
    const atts = catalog.bilingualEditions.map(item => ({
      name: item.filename,
      type: "application/epub+zip",
      size: 800000,
      data: item.downloadUrl,
      title: item.title,
      arabicTitle: item.arabicTitle
    }));

    gossipMesh.publish(spaceId, channelId, {
      content: "**Edition 2: Bilingual Scholarly Apparatus Corpus (" + catalog.bilingualEditions.length + " Volumes)**\n*Full Arabic text with classical Hadith, Fiqh, and Quad-Lexical semantic annotations alongside English translations.*",
      attachments: atts
    }, { senderId: "ibn-manzur@lisan" });
  }
}


function seedImamRaghibLibrary() {
  const channelId = "chan-imam-raghib";
  const spaceId = "space-public-mesh";
  const catalog = ImamRaghibLibrary.getCatalog();

  gossipMesh.clearChannelHistory(channelId);

  gossipMesh.publish(spaceId, channelId, {
    content: "📖 **Maktabat al-Imam al-Raghib al-Isfahani (d. 502 AH / 1108 CE)**\n\nWelcome to the complete digital classical library of **Imam Abu al-Qasim al-Husayn ibn Muhammad al-Raghib al-Isfahani** (الإمام الراغب الأصفهاني), the supreme classical authority on Quranic lexicography, semantic taxonomy, and ethics.\n\nAll classical masterworks are available below in **Two Distinct Publishing Editions**:\n1. **Pure English Scholarly Editions**: Direct, continuous authorial translations.\n2. **Bilingual Scholarly Apparatus Editions**: Classical Arabic text + 5-Pillar Lexical Apparatus (Al-Mufradat, Asas al-Balaghah, Lisan al-Arab, Kitab al-Ayn, Sibawayh) + English translation."
  }, { senderId: "ibn-manzur@lisan" });

  if (catalog.pureEditions && catalog.pureEditions.length > 0) {
    const atts = catalog.pureEditions.map(item => ({
      name: item.filename,
      type: "application/epub+zip",
      size: 500000,
      data: item.downloadUrl,
      title: item.title,
      arabicTitle: item.arabicTitle
    }));

    gossipMesh.publish(spaceId, channelId, {
      content: "**Edition 1: Pure English Scholarly Corpus (" + catalog.pureEditions.length + " Volumes)**\n*Al-Mufradat fi Gharib al-Qur'an, Al-Dhari'ah ila Makarim al-Shari'ah, Tafsil al-Nash'atayn, and Adab Ikhtilat al-Nas.*",
      attachments: atts
    }, { senderId: "ibn-manzur@lisan" });
  }

  if (catalog.bilingualEditions && catalog.bilingualEditions.length > 0) {
    const atts = catalog.bilingualEditions.map(item => ({
      name: item.filename,
      type: "application/epub+zip",
      size: 800000,
      data: item.downloadUrl,
      title: item.title,
      arabicTitle: item.arabicTitle
    }));

    gossipMesh.publish(spaceId, channelId, {
      content: "**Edition 2: Bilingual Scholarly Apparatus Corpus (" + catalog.bilingualEditions.length + " Volumes)**\n*Classical Arabic text aligned with 5-Pillar Lexicographical annotations and rigorous theological apparatus alongside English translations.*",
      attachments: atts
    }, { senderId: "ibn-manzur@lisan" });
  }
}

function seedClassicalHeritageLibrary() {
  const channelId = 'chan-classical-heritage';
  const spaceId = 'space-public-mesh';
  const catalog = ClassicalHeritageLibrary.getCatalog();

  gossipMesh.clearChannelHistory(channelId);

  // 1. Welcome Message
  gossipMesh.publish(spaceId, channelId, {
    content: "🏛️ **مَكْتَبَة التُّرَاث الإِسْلَامِي وَالعِرْفَان // CLASSICAL ISLAMIC HERITAGE & SPIRITUAL MASTERWORKS**\n\nWelcome to the decentralized classical digital library of timeless Islamic spiritual, metaphysical, and prophetic masterworks. Available below as standalone EPUB e-books for offline reading, scholarly research, and direct P2P mesh distribution."
  }, { senderId: "ibn-manzur@lisan" });

  // 2. Prophetic Biography & Shama'il: Kitab al-Shifa (Qadi 'Iyad)
  if (catalog.shamailAndSira && catalog.shamailAndSira.length > 0) {
    const atts = catalog.shamailAndSira.map(item => ({
      name: item.filename,
      type: "application/epub+zip",
      size: 2000000,
      data: item.downloadUrl,
      title: item.title,
      arabicTitle: item.arabicTitle
    }));

    gossipMesh.publish(spaceId, channelId, {
      content: "✨ **Kitab al-Shifa bi-Ta'rif Huquq al-Mustafa — Qadi 'Iyad al-Yahsubi (476–544 AH)**\n*The classic masterwork on the reverence, virtues, miracles, and rights of the Prophet Muhammad ﷺ (English & Albanian / Shqip editions).* ",
      attachments: atts
    }, { senderId: "ibn-manzur@lisan" });
  }

  // 3. Metaphysics & 'Irfan: Al-Futuhat al-Makkiyya (Ibn 'Arabi)
  if (catalog.irfanAndMetaphysics && catalog.irfanAndMetaphysics.length > 0) {
    const atts = catalog.irfanAndMetaphysics.map(item => ({
      name: item.filename,
      type: "application/epub+zip",
      size: 23000000,
      data: item.downloadUrl,
      title: item.title,
      arabicTitle: item.arabicTitle
    }));

    gossipMesh.publish(spaceId, channelId, {
      content: "🌌 **Al-Futuhat al-Makkiyya (The Meccan Revelations) — Shaykh al-Akbar Ibn 'Arabi (560–638 AH)**\n*The monumental compendium of Islamic metaphysics, spiritual cosmology, and divine illumination (Complete English & Albanian / Shqip editions).* ",
      attachments: atts
    }, { senderId: "ibn-manzur@lisan" });
  }

  // 4. Spiritual Conduct & Ethics: Sunan al-Muhtadin (Al-Mawwaq)
  if (catalog.spiritualConduct && catalog.spiritualConduct.length > 0) {
    const atts = catalog.spiritualConduct.map(item => ({
      name: item.filename,
      type: "application/epub+zip",
      size: 800000,
      data: item.downloadUrl,
      title: item.title,
      arabicTitle: item.arabicTitle
    }));

    gossipMesh.publish(spaceId, channelId, {
      content: "📜 **Sunan al-Muhtadin fi Maqamat al-Din — Imam al-Mawwaq al-Gharnati (797–897 AH)**\n*Essential classical manual on spiritual states, stations, and orthodox spiritual etiquette (Pure English, Bilingual Lexical & Oversight Critical editions).* ",
      attachments: atts
    }, { senderId: "ibn-manzur@lisan" });
  }

  // 5. Classical Devotional Treasures & Reading Editions
  if (catalog.classicalTreasures && catalog.classicalTreasures.length > 0) {
    const atts = catalog.classicalTreasures.map(item => ({
      name: item.filename,
      type: "application/epub+zip",
      size: 600000,
      data: item.downloadUrl,
      title: item.title,
      arabicTitle: item.arabicTitle
    }));

    gossipMesh.publish(spaceId, channelId, {
      content: "💎 **Classical Treasures & Comparative Study Editions**\n*Takhmis al-Ghanima, Bilingual Corpus apparatus editions, and continuous classical study volumes.* ",
      attachments: atts
    }, { senderId: "ibn-manzur@lisan" });
  }
}

server.listen(PORT, () => {
  seedImamRaziLibrary();
  seedImamGhazaliLibrary();
  seedImamNawawiLibrary();
  seedImamRaghibLibrary();
  seedClassicalHeritageLibrary();
  console.log();
  console.log();
  console.log();
  console.log();
  console.log();
});
