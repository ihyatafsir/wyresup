/**
 * Standalone Node.js Test Runner for 5G Lite Protocol
 * Run with: npx ts-node src/test/runTests.ts
 * 
 * Tests protocol functions without needing React Native
 */

// Polyfill crypto for Node.js
import { webcrypto } from 'crypto';
if (!globalThis.crypto) {
    (globalThis as any).crypto = webcrypto;
}

// Polyfill Buffer if needed
if (typeof Buffer === 'undefined') {
    global.Buffer = require('buffer').Buffer;
}

console.log('═══════════════════════════════════════════════════════');
console.log(' 5G Lite Protocol Test Suite');
console.log(' خَامِس الجِيل الخَفِيف - اختبار');
console.log('═══════════════════════════════════════════════════════\n');

interface TestResult {
    name: string;
    passed: boolean;
    duration: number;
    error?: string;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<void>): Promise<void> {
    const start = Date.now();
    try {
        await fn();
        results.push({ name, passed: true, duration: Date.now() - start });
        console.log(`  ✓ ${name} (${Date.now() - start}ms)`);
    } catch (e: any) {
        results.push({ name, passed: false, duration: Date.now() - start, error: e.message });
        console.log(`  ✗ ${name} - ${e.message}`);
    }
}

function assert(condition: boolean, msg: string): void {
    if (!condition) throw new Error(msg);
}

// ═══════════════════════════════════════════════════════════════════
// Test Suites
// ═══════════════════════════════════════════════════════════════════

async function testMiftah(): Promise<void> {
    console.log('\n[MIFTAH] مِفْتَاح - Puncturable Encryption Tests\n');

    // Import dynamically to handle any module issues
    const Miftah = await import('../network/MiftahEncryption');

    await test('Create key (فَتَحَ)', async () => {
        const privateKey = new Uint8Array(32);
        crypto.getRandomValues(privateKey);
        const publicKey = new Uint8Array(32);
        crypto.getRandomValues(publicKey);

        const key = await Miftah.fataha('test@peer', privateKey, publicKey);
        assert(key !== null, 'Key creation failed');
        assert(key.peerId === 'test@peer', 'Wrong peer ID');

        Miftah.aghlaqa('test@peer');
    });

    await test('Encrypt message (تَشْفِير)', async () => {
        const privateKey = new Uint8Array(32);
        crypto.getRandomValues(privateKey);
        const publicKey = new Uint8Array(32);
        crypto.getRandomValues(publicKey);

        await Miftah.fataha('encrypt@test', privateKey, publicKey);
        const result = await Miftah.tashfir('encrypt@test', 'السلام عليكم');

        assert(result !== null, 'Encryption failed');
        assert(result!.encrypted.length > 0, 'Empty ciphertext');
        assert(result!.sequence === 0, 'Wrong sequence');

        Miftah.aghlaqa('encrypt@test');
    });

    await test('Decrypt message (فَكّ)', async () => {
        const privateKey = new Uint8Array(32);
        crypto.getRandomValues(privateKey);
        const publicKey = new Uint8Array(32);
        crypto.getRandomValues(publicKey);

        await Miftah.fataha('decrypt@test', privateKey, publicKey);
        const encrypted = await Miftah.tashfir('decrypt@test', 'Test message');
        const decrypted = await Miftah.fakk('decrypt@test', encrypted!.encrypted);

        assert(decrypted === 'Test message', `Wrong decryption: ${decrypted}`);

        Miftah.aghlaqa('decrypt@test');
    });

    await test('Replay protection (ثَقْب)', async () => {
        const privateKey = new Uint8Array(32);
        crypto.getRandomValues(privateKey);
        const publicKey = new Uint8Array(32);
        crypto.getRandomValues(publicKey);

        await Miftah.fataha('replay@test', privateKey, publicKey);
        const encrypted = await Miftah.tashfir('replay@test', 'Replay test');

        // First decrypt should work
        const first = await Miftah.fakk('replay@test', encrypted!.encrypted);
        assert(first === 'Replay test', 'First decrypt failed');

        // Second decrypt (replay) should fail
        const replay = await Miftah.fakk('replay@test', encrypted!.encrypted);
        assert(replay === null, 'Replay attack succeeded - SECURITY ISSUE!');

        Miftah.aghlaqa('replay@test');
    });
}

async function testBarq(): Promise<void> {
    console.log('\n[BARQ] بَرْق - Lightning Protocol Tests\n');

    const Barq = await import('../network/BarqProtocol');

    await test('0-RTT Connection', async () => {
        const privateKey = new Uint8Array(32);
        crypto.getRandomValues(privateKey);
        const publicKey = new Uint8Array(32);
        crypto.getRandomValues(publicKey);

        const conn = await Barq.createConnection(privateKey, 'barq@test', publicKey);
        assert(conn !== null, 'Connection failed');
        assert(conn.peerId === 'barq@test', 'Wrong peer ID');

        Barq.closeConnection('barq@test');
    });

    await test('Create data packet', async () => {
        const privateKey = new Uint8Array(32);
        crypto.getRandomValues(privateKey);
        const publicKey = new Uint8Array(32);
        crypto.getRandomValues(publicKey);

        await Barq.createConnection(privateKey, 'packet@test', publicKey);
        const packet = await Barq.createDataPacket('packet@test', 'Hello Barq');

        assert(packet !== null, 'Packet creation failed');
        assert(packet!.length > 16, 'Packet too small');

        Barq.closeConnection('packet@test');
    });
}

async function testNabd(): Promise<void> {
    console.log('\n[NABD] نَبْض - Pulse Timing Tests\n');

    const Nabd = await import('../network/NabdTiming');

    await test('Gap detection', async () => {
        Nabd.initTiming('nabd@test');

        // Receive 0, 1, skip 2, receive 3
        Nabd.onReceive('nabd@test', 0);
        Nabd.onReceive('nabd@test', 1);
        const gaps = Nabd.onReceive('nabd@test', 3);

        assert(gaps.includes(2), 'Gap at sequence 2 not detected');

        Nabd.cleanup('nabd@test');
    });

    await test('Health check', async () => {
        Nabd.initTiming('health@test');
        Nabd.onReceive('health@test', 0);

        const healthy = Nabd.isHealthy('health@test');
        assert(healthy === true, 'Should be healthy after receive');

        Nabd.cleanup('health@test');
    });
}

async function testSayl(): Promise<void> {
    console.log('\n[SAYL] سَيْل - Flow Control Tests\n');

    const Sayl = await import('../network/SaylFlow');

    await test('Initial window', async () => {
        Sayl.initFlow('sayl@test');

        const canSend = Sayl.canSend('sayl@test');
        assert(canSend === true, 'Should allow sending initially');

        Sayl.cleanup('sayl@test');
    });

    await test('Congestion response', async () => {
        Sayl.initFlow('cong@test');

        // Get initial stats
        const before = Sayl.getStats('cong@test');

        // Simulate loss
        Sayl.onLoss('cong@test');

        const after = Sayl.getStats('cong@test');
        assert(after!.congestionWindow < before!.congestionWindow,
            'Window should decrease on loss');

        Sayl.cleanup('cong@test');
    });
}

// ═══════════════════════════════════════════════════════════════════
// Run all tests
// ═══════════════════════════════════════════════════════════════════

async function main(): Promise<void> {
    try {
        await testMiftah();
        await testBarq();
        await testNabd();
        await testSayl();
    } catch (e: any) {
        console.error('\nFatal error:', e.message);
    }

    // Summary
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;

    console.log('\n═══════════════════════════════════════════════════════');
    console.log(` Results: ${passed} passed, ${failed} failed`);
    console.log('═══════════════════════════════════════════════════════\n');

    if (failed > 0) {
        console.log('Failed tests:');
        results.filter(r => !r.passed).forEach(r => {
            console.log(`  - ${r.name}: ${r.error}`);
        });
        process.exit(1);
    }
}

main();
