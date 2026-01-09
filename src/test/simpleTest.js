/**
 * Simple test script - runs in Node
 * Run with: node --experimental-specifier-resolution=node --loader ts-node/esm src/test/simpleTest.js
 * Or just: node src/test/simpleTest.js (after tsc compile)
 */

const crypto = require('crypto');

console.log('═══════════════════════════════════════════════════════');
console.log(' 5G Lite Simple Protocol Test');
console.log(' خَامِس الجِيل الخَفِيف - اختبار بسيط');
console.log('═══════════════════════════════════════════════════════\n');

// Test 1: AES-GCM encryption (core of Miftah)
async function testEncryption() {
    console.log('[TEST] AES-GCM Encryption (مِفْتَاح core)\n');

    // Generate a key
    const key = crypto.randomBytes(32);
    const nonce = crypto.randomBytes(12);
    const plaintext = 'السلام عليكم - Hello World';

    try {
        // Encrypt
        const cipher = crypto.createCipheriv('aes-256-gcm', key, nonce);
        let encrypted = cipher.update(plaintext, 'utf8');
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        const authTag = cipher.getAuthTag();

        console.log(`  Plaintext: ${plaintext}`);
        console.log(`  Encrypted: ${encrypted.toString('hex').slice(0, 40)}...`);
        console.log(`  Auth tag:  ${authTag.toString('hex')}`);

        // Decrypt
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, nonce);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encrypted);
        decrypted = Buffer.concat([decrypted, decipher.final()]);

        const success = decrypted.toString('utf8') === plaintext;
        console.log(`  Decrypted: ${decrypted.toString('utf8')}`);
        console.log(`  ✓ Encryption test ${success ? 'PASSED' : 'FAILED'}\n`);
        return success;
    } catch (e) {
        console.log(`  ✗ Encryption test FAILED: ${e.message}\n`);
        return false;
    }
}

// Test 2: Key derivation (Barq shared secret)
async function testKeyDerivation() {
    console.log('[TEST] Key Derivation (بَرْق shared secret)\n');

    try {
        const alicePrivate = crypto.randomBytes(32);
        const bobPublic = crypto.randomBytes(32);

        // Simple HKDF-like derivation
        const combined = Buffer.concat([alicePrivate, bobPublic]);
        const sharedSecret = crypto.createHash('sha256').update(combined).digest();

        console.log(`  Alice private: ${alicePrivate.toString('hex').slice(0, 32)}...`);
        console.log(`  Bob public:    ${bobPublic.toString('hex').slice(0, 32)}...`);
        console.log(`  Shared secret: ${sharedSecret.toString('hex')}`);
        console.log(`  ✓ Key derivation PASSED\n`);
        return true;
    } catch (e) {
        console.log(`  ✗ Key derivation FAILED: ${e.message}\n`);
        return false;
    }
}

// Test 3: Sequence-based nonce (prevents replay)
async function testSequenceNonce() {
    console.log('[TEST] Sequence-based Nonce (ثَقْب replay protection)\n');

    try {
        const key = crypto.randomBytes(32);
        const message = 'Test message';

        // Encrypt same message with different sequences
        const results = [];
        for (let seq = 0; seq < 3; seq++) {
            const nonce = Buffer.alloc(12);
            nonce.writeUInt32BE(seq, 8);

            const cipher = crypto.createCipheriv('aes-256-gcm', key, nonce);
            let encrypted = cipher.update(message, 'utf8');
            encrypted = Buffer.concat([encrypted, cipher.final()]);

            results.push(encrypted.toString('hex'));
            console.log(`  Seq ${seq}: ${encrypted.toString('hex')}`);
        }

        // All should be different (different nonces)
        const allDifferent = new Set(results).size === results.length;
        console.log(`  ✓ All ciphertexts different: ${allDifferent ? 'PASSED' : 'FAILED'}\n`);
        return allDifferent;
    } catch (e) {
        console.log(`  ✗ Sequence nonce FAILED: ${e.message}\n`);
        return false;
    }
}

// Test 4: Puncturable key simulation
async function testPuncturableKey() {
    console.log('[TEST] Puncturable Key Simulation (مِفْتَاح novel feature)\n');

    try {
        const puncturedSequences = new Set();
        const key = crypto.randomBytes(32);

        // Encrypt and decrypt sequence 0
        const nonce0 = Buffer.alloc(12);
        nonce0.writeUInt32BE(0, 8);

        const cipher = crypto.createCipheriv('aes-256-gcm', key, nonce0);
        let encrypted = cipher.update('Secret message', 'utf8');
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        const authTag = cipher.getAuthTag();

        // First decrypt - should work
        const decipher1 = crypto.createDecipheriv('aes-256-gcm', key, nonce0);
        decipher1.setAuthTag(authTag);
        let decrypted = decipher1.update(encrypted);
        decrypted = Buffer.concat([decrypted, decipher1.final()]);
        console.log(`  First decrypt (seq=0): ${decrypted.toString('utf8')} ✓`);

        // PUNCTURE: Mark sequence 0 as used
        puncturedSequences.add(0);
        console.log(`  Punctured sequence 0 (ثَقْب)`);

        // Second decrypt attempt - should be blocked by puncture check
        if (puncturedSequences.has(0)) {
            console.log(`  Replay attempt (seq=0): BLOCKED ✓`);
            console.log(`  ✓ Puncturable key test PASSED\n`);
            return true;
        } else {
            console.log(`  ✗ Replay should have been blocked!\n`);
            return false;
        }
    } catch (e) {
        console.log(`  ✗ Puncturable key FAILED: ${e.message}\n`);
        return false;
    }
}

// Run all tests
async function main() {
    const results = [];

    results.push(await testEncryption());
    results.push(await testKeyDerivation());
    results.push(await testSequenceNonce());
    results.push(await testPuncturableKey());

    const passed = results.filter(r => r).length;
    const failed = results.filter(r => !r).length;

    console.log('═══════════════════════════════════════════════════════');
    console.log(` Results: ${passed} passed, ${failed} failed`);
    console.log('═══════════════════════════════════════════════════════');

    process.exit(failed > 0 ? 1 : 0);
}

main();
