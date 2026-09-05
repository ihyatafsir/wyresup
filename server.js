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
          try { payload = JSON.parse(body); } catch (parseErr) { console.warn("[Wyrenet RPC] Malformed JSON payload:", parseErr.message); payload = null; }
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
      try { ws.terminate(); } catch (termErr) { console.warn("[Mesh Keepalive] Safe terminate notice:", termErr.message); }
      connectedClients.delete(ws);
      if (client?.peerId) {
        presenceManager.removePeer(client.peerId);
        gossipMesh.removeNeighbor(client.peerId);
      }
      broadcastPresenceUpdate();
      continue;
    }
    ws.isAlive = false;
    try { ws.ping(); } catch (pingErr) { console.warn("[Mesh Keepalive] Safe ping notice:", pingErr.message); }
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
          } catch (pruneErr) { console.warn("[Mesh] Safe prune notice:", pruneErr.message); }
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


// Seed Imam Razi EPUB Library Catalog into #imam-razi and #razi-archive
function seedImamRaziLibrary() {
  const spaceId = 'space-public-mesh';
  const mainChannelId = 'chan-imam-razi';
  const archiveChannelId = 'chan-imam-razi-archive';
  const catalog = ImamRaziLibrary.getCatalog();

  // ==========================================
  // 1. MAIN CHANNEL: ONLY v4 & v5 MASTERWORKS
  // ==========================================
  gossipMesh.clearChannelHistory(mainChannelId);

  // 1.1 Welcome Banner
  gossipMesh.publish(spaceId, mainChannelId, {
    content: `🏛️ **مَكْتَبَة الإِمَام فَخْر الدِّين الرَّازِيّ // OFFICIAL MASTERWORKS (AYNENGINE AI v4 & v5)**

Welcome to the sovereign digital library of **Imam Fakhr al-Din al-Razi (544–606 AH / 1149–1209 CE)**.

Featured exclusively on this main channel are the **Official AynEngine AI v4 & v5 Masterworks**:
• **Tafsir al-Kabir (Mafatih al-Ghayb)**: The complete 32-in-1 unified masterwork editions (Pure English & Bilingual Apparatus).
• **Al-Matalib al-'Aliyyah min al-'Ilm al-Ilahi**: Complete 9 Volumes (Official v4/v5 Pure & Bilingual).
• **Classical Kalam & Usul Treatises**: Asas al-Taqdis, Lawami' al-Bayyinat, Kitab al-Arba'in, Al-Mahsul, Asrar al-Tanzil, 'Ismat al-Anbiya', I'tiqadat Firaq al-Muslimin, Al-Qada wa'l-Qadar, Risalah fi al-I'tiqad, and Jami' al-Tafsir.

📦 *Looking for earlier translation trials (< v4) or the individual 32-volume split drafts of Tafsir al-Kabir? Please navigate to the dedicated sub-channel **#razi-archive**.*`
  }, { senderId: 'ibn-manzur@lisan' });

  // 1.2 Tafsir al-Kabir Unified (32-in-1 Masterwork)
  if (catalog.tafsirKabirUnified && catalog.tafsirKabirUnified.length > 0) {
    const atts = catalog.tafsirKabirUnified.map(item => ({
      name: item.filename,
      type: 'application/epub+zip',
      size: item.filename.includes('bilingual') ? 32000000 : 16000000,
      data: item.downloadUrl,
      title: item.title,
      arabicTitle: item.arabicTitle
    }));

    gossipMesh.publish(spaceId, mainChannelId, {
      content: `📖 **Tafsir al-Kabir (Mafatih al-Ghayb) — Sovereign 32-in-1 Masterwork Editions (v4/v5)**
*The monumental commentary on the Holy Quran by Imam Fakhr al-Din al-Razi, translated with AynEngine AI classical vocabulary. Complete unified 32-in-1 editions in Pure Scholarly English and Bilingual Quad-Lexical Apparatus.*`,
      attachments: atts
    }, { senderId: 'ibn-manzur@lisan' });
  }

  // 1.3 Al-Matalib al-'Aliyyah (Vols 1-9)
  if (catalog.matalib && catalog.matalib.length > 0) {
    const atts = catalog.matalib.map(item => ({
      name: item.filename,
      type: 'application/epub+zip',
      size: 1200000,
      data: item.downloadUrl,
      title: item.title,
      arabicTitle: item.arabicTitle
    }));

    gossipMesh.publish(spaceId, mainChannelId, {
      content: `📚 **Al-Matalib al-'Aliyyah min al-'Ilm al-Ilahi — Volumes 1 to 9 (Official v4/v5 Editions)**
*The supreme metaphysical and philosophical opus of Imam al-Razi, spanning Cosmology, Divine Attributes, Subatomic Physics, The Rational Soul, and Eschatology (Pure English & Bilingual editions).*`,
      attachments: atts
    }, { senderId: 'ibn-manzur@lisan' });
  }

  // 1.4 Kalam Treatises & Usul al-Fiqh (v4/v5)
  if (catalog.kalamTreatises && catalog.kalamTreatises.length > 0) {
    const atts = catalog.kalamTreatises.map(item => ({
      name: item.filename,
      type: 'application/epub+zip',
      size: 900000,
      data: item.downloadUrl,
      title: item.title,
      arabicTitle: item.arabicTitle
    }));

    gossipMesh.publish(spaceId, mainChannelId, {
      content: `💎 **Classical Kalam, Usul al-Fiqh & Heresiography Masterworks (Official v4/v5 Editions)**
*Definitive translations of Asas al-Taqdis, Lawami' al-Bayyinat, Kitab al-Arba'in, Al-Mahsul fi 'Ilm Usul al-Fiqh, Asrar al-Tanzil, 'Ismat al-Anbiya', I'tiqadat Firaq al-Muslimin, Al-Qada' wa'l-Qadar, and Jami' al-Tafsir.*`,
      attachments: atts
    }, { senderId: 'ibn-manzur@lisan' });
  }

  // ==========================================
  // 2. ARCHIVE SUB-CHANNEL: PRE-v4 DRAFTS (< v4)
  // ==========================================
  gossipMesh.clearChannelHistory(archiveChannelId);

  gossipMesh.publish(spaceId, archiveChannelId, {
    content: `📦 **أَرْشِيف الإِمَام فَخْر الدِّين الرَّازِيّ // HISTORICAL & LEGACY ARCHIVE (< v4)**

This dedicated sub-channel preserves earlier translation drafts, experimental milestones, and historical split volumes (< v4) of Imam Fakhr al-Din al-Razi's works.

*For the official, unified v4 & v5 masterworks, please visit the main channel **#imam-razi**.*`
  }, { senderId: 'ibn-manzur@lisan' });

  if (catalog.legacyArchive && catalog.legacyArchive.length > 0) {
    const tkv2 = catalog.legacyArchive.filter(item => item.filename.startsWith('tafsir_kabir_v2_vol_'));
    const others = catalog.legacyArchive.filter(item => !item.filename.startsWith('tafsir_kabir_v2_vol_'));

    if (tkv2.length > 0) {
      const atts = tkv2.map(item => ({
        name: item.filename,
        type: 'application/epub+zip',
        size: 1500000,
        data: item.downloadUrl,
        title: item.title,
        arabicTitle: item.arabicTitle
      }));

      gossipMesh.publish(spaceId, archiveChannelId, {
        content: `📜 **Tafsir al-Kabir (Mafatih al-Ghayb) — 32 Individual Volume Split Drafts (v2 Legacy)**
*The historical 32-volume split translation drafts of Imam al-Razi's Tafsir.*`,
        attachments: atts
      }, { senderId: 'ibn-manzur@lisan' });
    }

    if (others.length > 0) {
      const atts = others.map(item => ({
        name: item.filename,
        type: 'application/epub+zip',
        size: 1000000,
        data: item.downloadUrl,
        title: item.title,
        arabicTitle: item.arabicTitle
      }));

      gossipMesh.publish(spaceId, archiveChannelId, {
        content: `📜 **Al-Matalib & Classical Kalam Treatises — Historical Pre-v4 Drafts (${others.length} Files)**
*Early translation trials, guided editions, and v2/v3 lexicographical experiments.*`,
        attachments: atts
      }, { senderId: 'ibn-manzur@lisan' });
    }
  }
}

// Seed Imam Abu Hamid al-Ghazali EPUB Library Catalog into #imam-abuhamid and #abuhamid-archive
function seedImamGhazaliLibrary() {
  const spaceId = 'space-public-mesh';
  const mainChannelId = 'chan-imam-abuhamidd';
  const archiveChannelId = 'chan-imam-abuhamid-archive';
  const catalog = ImamGhazaliLibrary.getCatalog();

  // ==========================================
  // 1. MAIN CHANNEL: ONLY v4 & v5 MASTERWORKS
  // ==========================================
  gossipMesh.clearChannelHistory(mainChannelId);

  // 1.1 Welcome Banner
  gossipMesh.publish(spaceId, mainChannelId, {
    content: `🏛️ **مَكْتَبَة حُجَّة الإِسْلَام أَبِي حَامِد الغَزَالِي // OFFICIAL MASTERWORKS (AYNENGINE AI v4 & v5)**

Welcome to the sovereign digital library of **Hujjat al-Islam Imam Abu Hamid al-Ghazali (450–505 AH / 1058–1111 CE)**.

Featured exclusively on this main channel are the **Official AynEngine AI v4 & v5 Masterworks**:
• **Ihya 'Ulum al-Din**: The Complete 40-Book Masterwork in unified single-volume editions (Pure English & Bilingual Apparatus).
• **Pure English Scholarly Corpus**: Direct 1st-person authorial translations across 25+ classical treatises.
• **Bilingual Scholarly Apparatus Corpus**: Classical Arabic text + Quad-Lexical semantic apparatus (Al-Raghib, Asas al-Balaghah, Lisan al-Arab, Sibawayh).

📦 *Looking for earlier translation drafts (< v4) or the 4-volume split files of Ihya 'Ulum al-Din? Please navigate to the dedicated sub-channel **#abuhamid-archive**.*`
  }, { senderId: 'ibn-manzur@lisan' });

  // 1.2 Unified Ihya 'Ulum al-Din (Complete 40 Books)
  const ihyaUnified = [
    ...catalog.pureEditions.filter(item => item.slug === 'ihya_ulum_al_din'),
    ...catalog.bilingualEditions.filter(item => item.slug === 'ihya_ulum_al_din')
  ];
  if (ihyaUnified.length > 0) {
    const atts = ihyaUnified.map(item => ({
      name: item.filename,
      type: 'application/epub+zip',
      size: item.filename.includes('bilingual') ? 7900000 : 3460000,
      data: item.downloadUrl,
      title: item.title,
      arabicTitle: item.arabicTitle
    }));

    gossipMesh.publish(spaceId, mainChannelId, {
      content: `📖 **Ihya 'Ulum al-Din (Revival of the Religious Sciences) — Complete 40 Books Masterwork (v4/v5)**
*The definitive, unabridged 40-book masterwork of Imam al-Ghazali in unified sovereign editions. Available in Pure Scholarly English and Bilingual Apparatus with Quad-Lexical semantic anchors.*`,
      attachments: atts
    }, { senderId: 'ibn-manzur@lisan' });
  }

  // 1.3 Pure English Scholarly Corpus (excluding ihya since featured above)
  const pureNonIhya = catalog.pureEditions.filter(item => item.slug !== 'ihya_ulum_al_din');
  if (pureNonIhya.length > 0) {
    const atts = pureNonIhya.map(item => ({
      name: item.filename,
      type: 'application/epub+zip',
      size: 500000,
      data: item.downloadUrl,
      title: item.title,
      arabicTitle: item.arabicTitle
    }));

    gossipMesh.publish(spaceId, mainChannelId, {
      content: `📚 **Edition 1: Pure English Scholarly Masterworks (${pureNonIhya.length} Volumes)**
*Direct, unabridged translations of Al-Munqidh min al-Dalal, Tahafut al-Falasifa, Mishkat al-Anwar, Al-Mustasfa, Bidayat al-Hidayah, Kimiya-yi Sa'adat, Maqasid al-Falasifah, Mizan al-'Amal, Al-Iqtisad, Al-Wasit, and all classical treatises.*`,
      attachments: atts
    }, { senderId: 'ibn-manzur@lisan' });
  }

  // 1.4 Bilingual Apparatus Corpus (excluding ihya since featured above)
  const bilNonIhya = catalog.bilingualEditions.filter(item => item.slug !== 'ihya_ulum_al_din');
  if (bilNonIhya.length > 0) {
    const atts = bilNonIhya.map(item => ({
      name: item.filename,
      type: 'application/epub+zip',
      size: 800000,
      data: item.downloadUrl,
      title: item.title,
      arabicTitle: item.arabicTitle
    }));

    gossipMesh.publish(spaceId, mainChannelId, {
      content: `📖 **Edition 2: Bilingual Classical Apparatus Corpus (${bilNonIhya.length} Volumes)**
*Full classical Arabic text with Quad-Lexical semantic anchors (Al-Mufradat, Asas al-Balaghah, Lisan al-Arab, Sibawayh) and aligned English translations for research and scholarly study.*`,
      attachments: atts
    }, { senderId: 'ibn-manzur@lisan' });
  }

  // ==========================================
  // 2. ARCHIVE SUB-CHANNEL: PRE-v4 DRAFTS (< v4)
  // ==========================================
  gossipMesh.clearChannelHistory(archiveChannelId);

  gossipMesh.publish(spaceId, archiveChannelId, {
    content: `📦 **أَرْشِيف حُجَّة الإِسْلَام الغَزَالِي // HISTORICAL & LEGACY ARCHIVE (< v4)**

This dedicated sub-channel preserves earlier translation drafts, split volumes, and historical trials (< v4) of Imam Abu Hamid al-Ghazali's works.

*For the official, unified v4 & v5 masterworks, please visit the main channel **#imam-abuhamid**.*`
  }, { senderId: 'ibn-manzur@lisan' });

  if (catalog.legacyArchive && catalog.legacyArchive.length > 0) {
    const ihyaSplit = catalog.legacyArchive.filter(item => item.filename.startsWith('ihya_ulum_al_din_vol_'));
    const otherDrafts = catalog.legacyArchive.filter(item => !item.filename.startsWith('ihya_ulum_al_din_vol_'));

    if (ihyaSplit.length > 0) {
      const atts = ihyaSplit.map(item => ({
        name: item.filename,
        type: 'application/epub+zip',
        size: 700000,
        data: item.downloadUrl,
        title: item.title,
        arabicTitle: item.arabicTitle
      }));

      gossipMesh.publish(spaceId, archiveChannelId, {
        content: `📜 **Ihya 'Ulum al-Din — Historical 4-Volume Split Editions (v2/v3 Legacy)**
*The early 4-volume quarter split translations: Rub' al-'Ibadat (Vol 1), Rub' al-'Adat (Vol 2), Rub' al-Muhlikat (Vol 3), and Rub' al-Munjiyat (Vol 4).*`,
        attachments: atts
      }, { senderId: 'ibn-manzur@lisan' });
    }

    if (otherDrafts.length > 0) {
      const atts = otherDrafts.map(item => ({
        name: item.filename,
        type: 'application/epub+zip',
        size: 800000,
        data: item.downloadUrl,
        title: item.title,
        arabicTitle: item.arabicTitle
      }));

      gossipMesh.publish(spaceId, archiveChannelId, {
        content: `📜 **Tahafut al-Falasifa — Early 76-Sections Translation Drafts (pre-v4)**
*Pre-v4 translation milestone drafts of The Incoherence of the Philosophers.*`,
        attachments: atts
      }, { senderId: 'ibn-manzur@lisan' });
    }
  }
}

// Seed Imam Nawawi EPUB Library Catalog into #imam-nawawi and #nawawi-archive
function seedImamNawawiLibrary() {
  const spaceId = 'space-public-mesh';
  const mainChannelId = 'chan-imam-nawawi';
  const archiveChannelId = 'chan-imam-nawawi-archive';
  const catalog = ImamNawawiLibrary.getCatalog();

  // ==========================================
  // 1. MAIN CHANNEL: ONLY v4 & v5 MASTERWORKS
  // ==========================================
  gossipMesh.clearChannelHistory(mainChannelId);

  gossipMesh.publish(spaceId, mainChannelId, {
    content: `🏛️ **مَكْتَبَة الإِمَام مُحْيِي الدِّين يَحْيَى بن شَرَف النَّوَوِي // OFFICIAL MASTERWORKS (AYNENGINE AI v4 & v5)**

Welcome to the complete digital classical library of **Imam Abu Zakariyya Yahya ibn Sharaf al-Nawawi (631–676 AH / 1233–1277 CE)**.

All revered Hadith, devotional, and legal masterworks are available below in **Official AynEngine AI v4 & v5 Editions**:
1. **Pure English Scholarly Editions**: Direct authorial translations.
2. **Bilingual Scholarly Apparatus Editions**: Classical Arabic text + Quad-Lexical apparatus + English translation.

📦 *Looking for earlier translation drafts (< v4)? Please navigate to the dedicated sub-channel **#nawawi-archive**.*`
  }, { senderId: 'ibn-manzur@lisan' });

  if (catalog.pureEditions && catalog.pureEditions.length > 0) {
    const atts = catalog.pureEditions.map(item => ({
      name: item.filename,
      type: 'application/epub+zip',
      size: 500000,
      data: item.downloadUrl,
      title: item.title,
      arabicTitle: item.arabicTitle
    }));

    gossipMesh.publish(spaceId, mainChannelId, {
      content: `📚 **Edition 1: Pure English Scholarly Corpus (${catalog.pureEditions.length} Volumes)**
*The Forty Hadith (Al-Arba'in), Riyad al-Salihin, Al-Tibyan, Kitab al-Adhkar, Minhaj al-Talibin, Sharh Sahih Muslim, Rawdat al-Talibin, and all masterworks.*`,
      attachments: atts
    }, { senderId: 'ibn-manzur@lisan' });
  }

  if (catalog.bilingualEditions && catalog.bilingualEditions.length > 0) {
    const atts = catalog.bilingualEditions.map(item => ({
      name: item.filename,
      type: 'application/epub+zip',
      size: 800000,
      data: item.downloadUrl,
      title: item.title,
      arabicTitle: item.arabicTitle
    }));

    gossipMesh.publish(spaceId, mainChannelId, {
      content: `📖 **Edition 2: Bilingual Scholarly Apparatus Corpus (${catalog.bilingualEditions.length} Volumes)**
*Full Arabic text with classical Hadith, Fiqh, and Quad-Lexical semantic annotations alongside English translations.*`,
      attachments: atts
    }, { senderId: 'ibn-manzur@lisan' });
  }

  // ==========================================
  // 2. ARCHIVE SUB-CHANNEL: PRE-v4 DRAFTS (< v4)
  // ==========================================
  gossipMesh.clearChannelHistory(archiveChannelId);

  gossipMesh.publish(spaceId, archiveChannelId, {
    content: `📦 **أَرْشِيف الإِمَام النَّوَوِي // HISTORICAL & LEGACY ARCHIVE (< v4)**

This dedicated sub-channel preserves earlier translation drafts and experimental trials (< v4) of Imam Yahya al-Nawawi's works.

*For the official, unified v4 & v5 masterworks, please visit the main channel **#imam-nawawi**.*`
  }, { senderId: 'ibn-manzur@lisan' });

  if (catalog.legacyArchive && catalog.legacyArchive.length > 0) {
    const atts = catalog.legacyArchive.map(item => ({
      name: item.filename,
      type: 'application/epub+zip',
      size: 400000,
      data: item.downloadUrl,
      title: item.title,
      arabicTitle: item.arabicTitle
    }));

    gossipMesh.publish(spaceId, archiveChannelId, {
      content: `📜 **Early Translation Trials & Legacy Files (${catalog.legacyArchive.length} Files)**`,
      attachments: atts
    }, { senderId: 'ibn-manzur@lisan' });
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
