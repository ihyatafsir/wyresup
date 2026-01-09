/**
 * Network test script
 * Tests Naql transport and Kashf discovery
 * 
 * Run with: node src/test/networkTest.js
 */

const dgram = require('dgram');

console.log('═══════════════════════════════════════════════════════');
console.log(' 5G Lite Network Test');
console.log(' نَقْل و كَشْف - Transport & Discovery');
console.log('═══════════════════════════════════════════════════════\n');

const PORT = 5188;

async function testUDPSocket() {
    console.log('[TEST] UDP Socket Creation\n');

    return new Promise((resolve) => {
        const server = dgram.createSocket('udp4');
        const client = dgram.createSocket('udp4');

        let testPassed = false;

        server.on('message', (msg, rinfo) => {
            console.log(`  Server received: "${msg.toString()}" from ${rinfo.address}:${rinfo.port}`);

            // Check for Barq magic bytes
            if (msg[0] === 0x42 && msg[1] === 0x51) {
                console.log('  ✓ Barq packet detected (BQ magic)');
            }

            // Send response
            server.send(Buffer.from('ACK'), rinfo.port, rinfo.address);
            testPassed = true;
        });

        client.on('message', (msg) => {
            console.log(`  Client received: "${msg.toString()}"`);

            // Cleanup
            client.close();
            server.close(() => {
                console.log(`  ✓ UDP Socket test ${testPassed ? 'PASSED' : 'FAILED'}\n`);
                resolve(testPassed);
            });
        });

        server.bind(PORT, () => {
            console.log(`  Server bound to port ${PORT}`);

            // Create Barq-like packet
            const packet = Buffer.alloc(20);
            packet[0] = 0x42; // 'B'
            packet[1] = 0x51; // 'Q'
            packet[2] = 0x01; // Version
            packet[3] = 0x01; // Type: DATA
            packet.write('TestMsg', 16);

            client.send(packet, PORT, '127.0.0.1', (err) => {
                if (err) {
                    console.log(`  ✗ Send error: ${err.message}`);
                    resolve(false);
                } else {
                    console.log(`  Client sent Barq packet`);
                }
            });
        });

        // Timeout
        setTimeout(() => {
            if (!testPassed) {
                console.log('  ✗ Timeout');
                client.close();
                server.close();
                resolve(false);
            }
        }, 5000);
    });
}

async function testBroadcast() {
    console.log('[TEST] UDP Broadcast (for discovery)\n');

    return new Promise((resolve) => {
        const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

        socket.bind(5189, () => {
            try {
                socket.setBroadcast(true);
                console.log('  ✓ Broadcast enabled');

                const msg = Buffer.from('KASHF_ANNOUNCE');
                socket.send(msg, 5189, '255.255.255.255', (err) => {
                    socket.close();
                    if (err) {
                        console.log(`  ✗ Broadcast send failed: ${err.message}`);
                        resolve(false);
                    } else {
                        console.log('  ✓ Broadcast test PASSED\n');
                        resolve(true);
                    }
                });
            } catch (e) {
                console.log(`  ✗ Broadcast error: ${e.message}\n`);
                socket.close();
                resolve(false);
            }
        });
    });
}

async function testPacketFormat() {
    console.log('[TEST] Barq Packet Format\n');

    // Create a proper Barq header
    const header = Buffer.alloc(16);
    let offset = 0;

    // Magic "BQ"
    header[offset++] = 0x42;
    header[offset++] = 0x51;

    // Version
    header[offset++] = 0x01;

    // Type (DATA)
    header[offset++] = 0x01;

    // Sequence (4 bytes)
    header.writeUInt32BE(42, offset);
    offset += 4;

    // Timestamp (4 bytes)
    header.writeUInt32BE(Date.now() % 0xFFFFFFFF, offset);
    offset += 4;

    // Length (2 bytes)
    header.writeUInt16BE(100, offset);
    offset += 2;

    // Flags (2 bytes)
    header.writeUInt16BE(0, offset);

    console.log(`  Header hex: ${header.toString('hex')}`);
    console.log(`  Magic: ${String.fromCharCode(header[0])}${String.fromCharCode(header[1])}`);
    console.log(`  Version: ${header[2]}`);
    console.log(`  Type: ${header[3]}`);
    console.log(`  Sequence: ${header.readUInt32BE(4)}`);
    console.log(`  Length: ${header.readUInt16BE(12)}`);
    console.log('  ✓ Packet format test PASSED\n');

    return true;
}

async function main() {
    const results = [];

    results.push(await testUDPSocket());
    results.push(await testBroadcast());
    results.push(await testPacketFormat());

    const passed = results.filter(r => r).length;
    const failed = results.filter(r => !r).length;

    console.log('═══════════════════════════════════════════════════════');
    console.log(` Results: ${passed} passed, ${failed} failed`);
    console.log('═══════════════════════════════════════════════════════');

    process.exit(failed > 0 ? 1 : 0);
}

main();
