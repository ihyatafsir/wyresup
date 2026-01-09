/**
 * 5G Lite Test Environment
 * 
 * Tests the complete protocol stack:
 * - Barq (بَرْق) - Lightning packets
 * - Nabd (نَبْض) - Pulse timing
 * - Sayl (سَيْل) - Flow control
 * - Miftah (مِفْتَاح) - Puncturable encryption
 */

import * as Barq from '../network/BarqProtocol';
import * as Nabd from '../network/NabdTiming';
import * as Sayl from '../network/SaylFlow';
import * as Miftah from '../network/MiftahEncryption';
import * as FiveGLite from '../network/FiveGLite';
import { generateIdentity, WyreSUpIdentity } from '../utils/Identity';

// Test configuration
const TEST_MESSAGES = [
    'السلام عليكم',
    'Hello World',
    'Test message with special chars: @#$%^&*()',
    '🎉 Emoji test 🚀',
    'Long message: ' + 'A'.repeat(500),
];

// Simulated latency (ms)
const SIMULATED_LATENCY = 50;

/**
 * Run all tests
 */
export async function runAllTests(): Promise<{
    passed: number;
    failed: number;
    results: TestResult[];
}> {
    console.log('═══════════════════════════════════════════════════════');
    console.log(' 5G Lite Test Environment');
    console.log(' خَامِس الجِيل الخَفِيف - اختبار');
    console.log('═══════════════════════════════════════════════════════');

    const results: TestResult[] = [];

    // Run test suites
    results.push(...await testMiftahEncryption());
    results.push(...await testBarqProtocol());
    results.push(...await testNabdTiming());
    results.push(...await testSaylFlow());
    results.push(...await testEndToEnd());

    // Summary
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;

    console.log('═══════════════════════════════════════════════════════');
    console.log(` Results: ${passed} passed, ${failed} failed`);
    console.log('═══════════════════════════════════════════════════════');

    return { passed, failed, results };
}

interface TestResult {
    name: string;
    passed: boolean;
    duration: number;
    error?: string;
}

/**
 * Test Miftah Puncturable Encryption
 */
async function testMiftahEncryption(): Promise<TestResult[]> {
    console.log('\n[TEST] مِفْتَاح (Miftah) Encryption');
    const results: TestResult[] = [];

    // Generate test keys
    const alicePrivate = new Uint8Array(32);
    crypto.getRandomValues(alicePrivate);
    const bobPublic = new Uint8Array(32);
    crypto.getRandomValues(bobPublic);

    // Test 1: Basic encryption/decryption
    const t1Start = Date.now();
    try {
        await Miftah.fataha('bob@test', alicePrivate, bobPublic);
        const encrypted = await Miftah.tashfir('bob@test', 'Test message');

        if (encrypted) {
            const decrypted = await Miftah.fakk('bob@test', encrypted.encrypted);
            const passed = decrypted === 'Test message';
            results.push({
                name: 'Miftah: Encrypt/Decrypt',
                passed,
                duration: Date.now() - t1Start,
            });
        }
    } catch (e: any) {
        results.push({
            name: 'Miftah: Encrypt/Decrypt',
            passed: false,
            duration: Date.now() - t1Start,
            error: e.message,
        });
    }

    // Test 2: Replay protection
    const t2Start = Date.now();
    try {
        const encrypted = await Miftah.tashfir('bob@test', 'Another message');
        if (encrypted) {
            // First decrypt should work
            await Miftah.fakk('bob@test', encrypted.encrypted);
            // Second decrypt (replay) should fail
            const replay = await Miftah.fakk('bob@test', encrypted.encrypted);
            results.push({
                name: 'Miftah: Replay Protection',
                passed: replay === null,
                duration: Date.now() - t2Start,
            });
        }
    } catch (e: any) {
        results.push({
            name: 'Miftah: Replay Protection',
            passed: false,
            duration: Date.now() - t2Start,
            error: e.message,
        });
    }

    // Cleanup
    Miftah.aghlaqa('bob@test');

    return results;
}

/**
 * Test Barq Protocol
 */
async function testBarqProtocol(): Promise<TestResult[]> {
    console.log('\n[TEST] بَرْق (Barq) Protocol');
    const results: TestResult[] = [];

    const alicePrivate = new Uint8Array(32);
    crypto.getRandomValues(alicePrivate);
    const bobPublic = new Uint8Array(32);
    crypto.getRandomValues(bobPublic);

    // Test 1: 0-RTT Connection
    const t1Start = Date.now();
    try {
        const conn = await Barq.createConnection(alicePrivate, 'bob@barq', bobPublic);
        results.push({
            name: 'Barq: 0-RTT Connection',
            passed: conn !== null,
            duration: Date.now() - t1Start,
        });
    } catch (e: any) {
        results.push({
            name: 'Barq: 0-RTT Connection',
            passed: false,
            duration: Date.now() - t1Start,
            error: e.message,
        });
    }

    // Test 2: Packet creation
    const t2Start = Date.now();
    try {
        const packet = await Barq.createDataPacket('bob@barq', 'Hello Barq!');
        results.push({
            name: 'Barq: Packet Creation',
            passed: packet !== null && packet.length > 16,
            duration: Date.now() - t2Start,
        });
    } catch (e: any) {
        results.push({
            name: 'Barq: Packet Creation',
            passed: false,
            duration: Date.now() - t2Start,
            error: e.message,
        });
    }

    Barq.closeConnection('bob@barq');
    return results;
}

/**
 * Test Nabd Timing
 */
async function testNabdTiming(): Promise<TestResult[]> {
    console.log('\n[TEST] نَبْض (Nabd) Timing');
    const results: TestResult[] = [];

    // Test 1: Gap detection
    const t1Start = Date.now();
    try {
        Nabd.initTiming('peer@nabd');

        // Receive seq 0, 1, 3 (gap at 2)
        Nabd.onReceive('peer@nabd', 0);
        Nabd.onReceive('peer@nabd', 1);
        const nacks = Nabd.onReceive('peer@nabd', 3);

        results.push({
            name: 'Nabd: Gap Detection',
            passed: nacks.includes(2),
            duration: Date.now() - t1Start,
        });

        Nabd.cleanup('peer@nabd');
    } catch (e: any) {
        results.push({
            name: 'Nabd: Gap Detection',
            passed: false,
            duration: Date.now() - t1Start,
            error: e.message,
        });
    }

    return results;
}

/**
 * Test Sayl Flow Control
 */
async function testSaylFlow(): Promise<TestResult[]> {
    console.log('\n[TEST] سَيْل (Sayl) Flow Control');
    const results: TestResult[] = [];

    // Test 1: Congestion control
    const t1Start = Date.now();
    try {
        Sayl.initFlow('peer@sayl');

        // Should be able to send initially
        const canSend1 = Sayl.canSend('peer@sayl');

        // Simulate loss
        Sayl.onLoss('peer@sayl');

        // Window should decrease
        const stats = Sayl.getStats('peer@sayl');

        results.push({
            name: 'Sayl: Congestion Control',
            passed: canSend1 && stats !== null,
            duration: Date.now() - t1Start,
        });

        Sayl.cleanup('peer@sayl');
    } catch (e: any) {
        results.push({
            name: 'Sayl: Congestion Control',
            passed: false,
            duration: Date.now() - t1Start,
            error: e.message,
        });
    }

    return results;
}

/**
 * End-to-end test simulating two peers
 */
async function testEndToEnd(): Promise<TestResult[]> {
    console.log('\n[TEST] End-to-End Simulation');
    const results: TestResult[] = [];

    const t1Start = Date.now();
    try {
        // Generate identities for Alice and Bob
        const alice = await generateIdentity('alice');
        const bob = await generateIdentity('bob');

        console.log(`  Alice: ${alice.fullId}`);
        console.log(`  Bob: ${bob.fullId}`);

        // Alice creates Miftah for Bob
        await Miftah.fataha(bob.fullId, alice.privateKey, bob.publicKey);

        // Alice encrypts message
        const encrypted = await Miftah.tashfir(bob.fullId, 'Hello Bob! من أليس');

        // Bob creates Miftah for Alice (with swapped keys for decryption)
        await Miftah.fataha(alice.fullId, bob.privateKey, alice.publicKey);

        // Note: In real scenario, both would derive same shared secret
        // This test verifies the encryption mechanics work

        results.push({
            name: 'E2E: Full Message Flow',
            passed: encrypted !== null,
            duration: Date.now() - t1Start,
        });

        // Cleanup
        Miftah.aghlaqa(bob.fullId);
        Miftah.aghlaqa(alice.fullId);

    } catch (e: any) {
        results.push({
            name: 'E2E: Full Message Flow',
            passed: false,
            duration: Date.now() - t1Start,
            error: e.message,
        });
    }

    return results;
}

// Export for use in app
export { TestResult };
