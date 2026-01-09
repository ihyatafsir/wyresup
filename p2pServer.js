/**
 * WyreSup P2P Test Server
 * Run this on your machine, connect from your phone app
 * 
 * Usage: node p2pServer.js
 */

const dgram = require('dgram');
const crypto = require('crypto');

const PORT = 5188;
const server = dgram.createSocket('udp4');

console.log('═══════════════════════════════════════════════════════');
console.log(' WyreSup P2P Test Server');
console.log(' خَادِم الاِخْتِبار - Test Server');
console.log('═══════════════════════════════════════════════════════\n');

// Track connected peers
const peers = new Map();

server.on('error', (err) => {
    console.error(`Server error: ${err.message}`);
    server.close();
});

server.on('message', (msg, rinfo) => {
    const peerKey = `${rinfo.address}:${rinfo.port}`;
    const now = Date.now();

    console.log(`\n[RECEIVED] From ${peerKey}`);
    console.log(`  Time: ${new Date().toISOString()}`);
    console.log(`  Size: ${msg.length} bytes`);

    // Try to parse as JSON
    try {
        const data = JSON.parse(msg.toString());
        console.log(`  Type: ${data.type || 'unknown'}`);
        console.log(`  Content: ${JSON.stringify(data).slice(0, 100)}...`);

        // Handle different message types
        if (data.type === 'PING') {
            // Respond with PONG
            const response = JSON.stringify({ type: 'PONG', time: now });
            server.send(response, rinfo.port, rinfo.address, (err) => {
                if (err) console.error('Send error:', err.message);
                else console.log(`  [SENT] PONG to ${peerKey}`);
            });
        } else if (data.type === 'HELLO') {
            // Register peer
            peers.set(peerKey, {
                address: rinfo.address,
                port: rinfo.port,
                id: data.id || 'unknown',
                lastSeen: now
            });
            console.log(`  [NEW PEER] ${data.id || peerKey}`);

            // Send welcome
            const response = JSON.stringify({
                type: 'WELCOME',
                serverId: 'server@wyresup',
                time: now
            });
            server.send(response, rinfo.port, rinfo.address);
        } else if (data.type === 'MSG') {
            // Echo message back
            console.log(`  [MESSAGE] "${data.content}"`);
            const response = JSON.stringify({
                type: 'MSG',
                from: 'server@wyresup',
                content: `Echo: ${data.content}`,
                time: now
            });
            server.send(response, rinfo.port, rinfo.address);
        }
    } catch (e) {
        // Not JSON, show raw
        console.log(`  Raw: ${msg.toString().slice(0, 100)}`);

        // Check for Barq packet
        if (msg[0] === 0x42 && msg[1] === 0x51) {
            console.log('  [BARQ PACKET] Magic detected!');
        }
    }

    // Update peer
    if (!peers.has(peerKey)) {
        peers.set(peerKey, { address: rinfo.address, port: rinfo.port, lastSeen: now });
    } else {
        peers.get(peerKey).lastSeen = now;
    }
});

server.on('listening', () => {
    const address = server.address();
    console.log(`Server listening on ${address.address}:${address.port}\n`);
    console.log('Waiting for connections...');
    console.log('Your phone should send to: 46.140.121.18:5188\n');
});

// Bind and start
server.bind(PORT, '0.0.0.0');

// Periodically show connected peers
setInterval(() => {
    if (peers.size > 0) {
        console.log(`\n[PEERS] ${peers.size} connected:`);
        peers.forEach((peer, key) => {
            const ago = Math.floor((Date.now() - peer.lastSeen) / 1000);
            console.log(`  ${key} (${ago}s ago)`);
        });
    }
}, 30000);

console.log('Press Ctrl+C to stop\n');
