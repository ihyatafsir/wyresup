/**
 * مَنارة (Manara) Local Test Server
 * Simulates Cloudflare Worker for local testing
 * 
 * Run: node manaraServer.js
 * Connect to: http://localhost:5191
 */

const http = require('http');

const PORT = 5191;

// In-memory peer store
const peers = new Map();

// Clean expired peers
function cleanExpired() {
    const now = Date.now();
    for (const [port, portPeers] of peers) {
        for (const [peerId, peer] of portPeers) {
            if (now - peer.timestamp > 60000) {
                portPeers.delete(peerId);
                console.log(`[MANARA] ✗ Expired: ${peerId.split('@')[0]}`);
            }
        }
        if (portPeers.size === 0) {
            peers.delete(port);
        }
    }
}

const server = http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Parse route: /mawid/:port
    const match = req.url.match(/^\/mawid\/(\d+)$/);
    if (!match) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Not found' }));
        return;
    }

    const port = match[1];
    cleanExpired();

    // POST - Register presence (حُضُور)
    if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const beacon = JSON.parse(body);

                if (!beacon.peerId || !beacon.publicKey) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'Missing fields' }));
                    return;
                }

                if (!peers.has(port)) {
                    peers.set(port, new Map());
                }

                peers.get(port).set(beacon.peerId, {
                    peerId: beacon.peerId,
                    publicKey: beacon.publicKey,
                    mawIdPort: parseInt(port),
                    timestamp: Date.now(),
                    lastSeen: Date.now(),
                });

                const name = beacon.peerId.split('@')[0];
                console.log(`[MANARA] حُضُور: ${name} at مَوْعِد ${port}`);
                console.log(`         Total peers at ${port}: ${peers.get(port).size}`);

                res.writeHead(200);
                res.end(JSON.stringify({ ok: true }));
            } catch (e) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        });
        return;
    }

    // GET - Get peers at this maw'id
    if (req.method === 'GET') {
        const portPeers = peers.get(port);
        const peerList = portPeers ? Array.from(portPeers.values()) : [];

        console.log(`[MANARA] لِقَاء query: ${peerList.length} peers at مَوْعِد ${port}`);

        res.writeHead(200);
        res.end(JSON.stringify(peerList));
        return;
    }

    res.writeHead(405);
    res.end(JSON.stringify({ error: 'Method not allowed' }));
});

server.listen(PORT, '0.0.0.0', () => {
    console.log('════════════════════════════════════════════════════════');
    console.log(' مَنارة (Manara) - WyreSup Discovery Server');
    console.log(' Local Test Server for Peer Discovery');
    console.log('════════════════════════════════════════════════════════\n');
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
    console.log('Emulators connect to: http://10.0.2.2:5191\n');
    console.log('Press Ctrl+C to stop\n');
});
