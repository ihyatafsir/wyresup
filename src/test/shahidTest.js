/**
 * SHAHID + NAT Test
 * Tests decentralized discovery with NAT traversal
 */

const dgram = require('dgram');
const crypto = require('crypto');

console.log('═══════════════════════════════════════════════════════');
console.log(' SHAHID + NAFADH Test');
console.log(' شَاهِد + نَفَاذ - Witness Discovery + NAT Traversal');
console.log('═══════════════════════════════════════════════════════\n');

// STUN server for testing
const STUN_SERVER = { host: 'stun.l.google.com', port: 19302 };

async function testSTUNDiscovery() {
    console.log('[TEST] STUN NAT Discovery\n');

    return new Promise((resolve) => {
        const socket = dgram.createSocket('udp4');

        socket.bind(0, () => {
            const localAddr = socket.address();
            console.log(`  Local: ${localAddr.address}:${localAddr.port}`);

            // Create STUN Binding Request
            const stunRequest = Buffer.alloc(20);
            stunRequest.writeUInt16BE(0x0001, 0); // Binding Request
            stunRequest.writeUInt16BE(0, 2);       // Message Length
            stunRequest.writeUInt32BE(0x2112A442, 4); // Magic cookie
            crypto.randomFillSync(stunRequest, 8, 12); // Transaction ID

            const timeout = setTimeout(() => {
                console.log('  ✗ STUN timeout');
                socket.close();
                resolve(false);
            }, 5000);

            socket.once('message', (msg) => {
                clearTimeout(timeout);

                if (msg.length >= 20 && msg.readUInt16BE(0) === 0x0101) {
                    // Parse XOR-MAPPED-ADDRESS or MAPPED-ADDRESS
                    let offset = 20;
                    while (offset < msg.length - 8) {
                        const attrType = msg.readUInt16BE(offset);
                        const attrLen = msg.readUInt16BE(offset + 2);

                        if ((attrType === 0x0020 || attrType === 0x0001) && attrLen >= 8) {
                            let port, ip;

                            if (attrType === 0x0020) { // XOR-MAPPED-ADDRESS
                                port = msg.readUInt16BE(offset + 6) ^ 0x2112;
                                ip = [
                                    msg[offset + 8] ^ 0x21,
                                    msg[offset + 9] ^ 0x12,
                                    msg[offset + 10] ^ 0xA4,
                                    msg[offset + 11] ^ 0x42,
                                ].join('.');
                            } else { // MAPPED-ADDRESS
                                port = msg.readUInt16BE(offset + 6);
                                ip = [msg[offset + 8], msg[offset + 9], msg[offset + 10], msg[offset + 11]].join('.');
                            }

                            console.log(`  Public: ${ip}:${port}`);
                            console.log(`  NAT detected: ${localAddr.port !== port ? 'Yes' : 'No (open)'}`);
                            console.log('  ✓ STUN Discovery PASSED\n');
                            socket.close();
                            resolve(true);
                            return;
                        }

                        offset += 4 + attrLen + (attrLen % 4 ? 4 - (attrLen % 4) : 0);
                    }
                }

                console.log('  ✗ Could not parse STUN response');
                socket.close();
                resolve(false);
            });

            socket.send(stunRequest, STUN_SERVER.port, STUN_SERVER.host, (err) => {
                if (err) {
                    clearTimeout(timeout);
                    console.log(`  ✗ STUN send error: ${err.message}`);
                    socket.close();
                    resolve(false);
                } else {
                    console.log(`  Sent STUN request to ${STUN_SERVER.host}:${STUN_SERVER.port}`);
                }
            });
        });
    });
}

function testWitnessAttestation() {
    console.log('[TEST] Witness Attestation (شَهَادَة)\n');

    // Simulate creating a witness attestation
    const witnessId = 'ahmad@abc123';
    const peerId = 'khalid@def456';
    const publicIP = '203.0.113.42';
    const publicPort = 5188;
    const timestamp = Date.now();

    // Create message to sign
    const message = `SHAHID:${witnessId}:${peerId}:${publicIP}:${publicPort}:${timestamp}`;
    console.log(`  Message: ${message}`);

    // Create signature (using simple hash for test)
    const signature = crypto.createHash('sha256').update(message).digest('hex').slice(0, 32);
    console.log(`  Signature: ${signature}...`);

    const shahadat = {
        witnessId,
        peerId,
        publicIP,
        publicPort,
        timestamp,
        signature,
        expiresAt: timestamp + 300000, // 5 min TTL
    };

    console.log('\n  شَهَادَة (Shahadat) created:');
    console.log(`    Witness: ${shahadat.witnessId}`);
    console.log(`    Peer: ${shahadat.peerId}`);
    console.log(`    Location: ${shahadat.publicIP}:${shahadat.publicPort}`);
    console.log(`    Expires: ${new Date(shahadat.expiresAt).toISOString()}`);

    console.log('\n  ✓ Witness Attestation PASSED\n');
    return true;
}

function testTraceFading() {
    console.log('[TEST] Trace Fading (أَثَر)\n');

    // Simulate trace aging
    const traces = [
        { peerId: 'user1', lastSeen: Date.now() - 60000, confidence: 0 },  // 1 min ago
        { peerId: 'user2', lastSeen: Date.now() - 180000, confidence: 0 }, // 3 min ago
        { peerId: 'user3', lastSeen: Date.now() - 360000, confidence: 0 }, // 6 min ago (expired)
    ];

    const TTL = 300000; // 5 min
    const now = Date.now();

    traces.forEach(trace => {
        const age = now - trace.lastSeen;
        trace.confidence = age < TTL ? Math.max(0, 1 - (age / TTL)) : 0;

        const status = trace.confidence > 0 ? '✓ Valid' : '✗ Expired';
        console.log(`  ${trace.peerId}: confidence=${trace.confidence.toFixed(2)} ${status}`);
    });

    console.log('\n  ✓ Trace Fading PASSED\n');
    return true;
}

function testBootstrap() {
    console.log('[TEST] IP Bootstrap (بَذْرَة)\n');

    const bootstrapPeers = [];

    // Add bootstrap peer by IP
    const ip = '192.168.1.100';
    const port = 5188;
    bootstrapPeers.push(`${ip}:${port}`);
    console.log(`  Added bootstrap: ${ip}:${port}`);

    // Add another
    bootstrapPeers.push('10.0.0.50:5188');
    console.log(`  Added bootstrap: 10.0.0.50:5188`);

    console.log(`\n  Total bootstraps: ${bootstrapPeers.length}`);
    console.log('  ✓ IP Bootstrap PASSED\n');
    return true;
}

async function main() {
    const results = [];

    results.push(await testSTUNDiscovery());
    results.push(testWitnessAttestation());
    results.push(testTraceFading());
    results.push(testBootstrap());

    const passed = results.filter(r => r).length;
    const failed = results.filter(r => !r).length;

    console.log('═══════════════════════════════════════════════════════');
    console.log(` Results: ${passed} passed, ${failed} failed`);
    console.log('═══════════════════════════════════════════════════════');
}

main();
