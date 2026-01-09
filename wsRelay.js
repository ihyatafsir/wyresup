/**
 * وَسيط (WASIT) - WebSocket Relay Server
 * From Lisan al-Arab: الوسيط - The Intermediary
 * 
 * Bridges P2P connections via WebSocket for testing and NAT traversal fallback
 * 
 * Usage: node wsRelay.js
 */

const WebSocket = require('ws');
const http = require('http');

const PORT = 5190;

// Create HTTP server
const server = http.createServer();
const wss = new WebSocket.Server({ server });

// Track connected peers
const peers = new Map(); // peerId -> { ws, lastSeen, identity }

console.log('════════════════════════════════════════════════════════');
console.log(' وَسيط (WASIT) - WyreSup WebSocket Relay');
console.log(' Peer Discovery & Message Relay Server');
console.log('════════════════════════════════════════════════════════\\n');

wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress;
    let peerId = null;

    console.log(`[CONNECT] New connection from ${clientIp}`);

    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data.toString());

            switch (msg.type) {
                case 'REGISTER':
                    // Register peer with their identity
                    peerId = msg.identity;
                    peers.set(peerId, {
                        ws,
                        lastSeen: Date.now(),
                        identity: msg.identity,
                        ip: clientIp
                    });
                    console.log(`[REGISTER] ${peerId} registered`);

                    // Send back confirmation with peer list
                    ws.send(JSON.stringify({
                        type: 'REGISTERED',
                        peerId,
                        peerCount: peers.size,
                        peers: Array.from(peers.keys()).filter(id => id !== peerId)
                    }));

                    // Broadcast new peer to others
                    broadcast({
                        type: 'PEER_JOINED',
                        peerId,
                        timestamp: Date.now()
                    }, peerId);
                    break;

                case 'MSG':
                    // Relay message to specific peer or broadcast
                    console.log(`[MSG] ${peerId} → ${msg.to || 'all'}: ${msg.content?.slice(0, 50)}`);

                    if (msg.to) {
                        // Direct message
                        const targetPeer = peers.get(msg.to);
                        if (targetPeer && targetPeer.ws.readyState === WebSocket.OPEN) {
                            targetPeer.ws.send(JSON.stringify({
                                type: 'MSG',
                                from: peerId,
                                content: msg.content,
                                timestamp: Date.now()
                            }));
                            console.log(`[RELAY] Delivered to ${msg.to}`);
                        } else {
                            ws.send(JSON.stringify({
                                type: 'ERROR',
                                error: 'PEER_NOT_FOUND',
                                peerId: msg.to
                            }));
                        }
                    } else {
                        // Broadcast
                        broadcast({
                            type: 'MSG',
                            from: peerId,
                            content: msg.content,
                            timestamp: Date.now()
                        }, peerId);
                    }
                    break;

                case 'PING':
                    ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
                    break;

                case 'GET_PEERS':
                    ws.send(JSON.stringify({
                        type: 'PEERS',
                        peers: Array.from(peers.keys()).filter(id => id !== peerId)
                    }));
                    break;

                default:
                    console.log(`[UNKNOWN] Type: ${msg.type}`);
            }
        } catch (e) {
            console.error(`[ERROR] Parse error: ${e.message}`);
        }
    });

    ws.on('close', () => {
        console.log(`[DISCONNECT] ${peerId || clientIp}`);
        if (peerId) {
            peers.delete(peerId);
            broadcast({
                type: 'PEER_LEFT',
                peerId,
                timestamp: Date.now()
            });
        }
    });

    ws.on('error', (err) => {
        console.error(`[ERROR] ${peerId}: ${err.message}`);
    });
});

// Broadcast to all peers except sender
function broadcast(msg, exceptPeerId = null) {
    const data = JSON.stringify(msg);
    peers.forEach((peer, id) => {
        if (id !== exceptPeerId && peer.ws.readyState === WebSocket.OPEN) {
            peer.ws.send(data);
        }
    });
}

// Start server
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on ws://0.0.0.0:${PORT}`);
    console.log(`\\nEmulators connect to: ws://10.0.2.2:${PORT}`);
    console.log('(10.0.2.2 is the host from Android emulator)\\n');
});

// Periodic status
setInterval(() => {
    if (peers.size > 0) {
        console.log(`\\n[STATUS] ${peers.size} peers online:`);
        peers.forEach((peer, id) => {
            const ago = Math.floor((Date.now() - peer.lastSeen) / 1000);
            console.log(`  ${id} (${ago}s ago)`);
        });
    }
}, 30000);

console.log('Press Ctrl+C to stop\\n');
