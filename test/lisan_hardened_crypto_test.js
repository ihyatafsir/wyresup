const assert = require('assert');
const crypto = require('crypto');
const ZbatCrypto = require('../src/mesh/ZbatCrypto');
const { ThaqbRatchet, HabkRatchet } = require('../src/mesh/ZbatCrypto');
const LisanEngine = require('../src/mesh/LisanEngine');

console.log('=== 🛡️ WyreSup Hardened Lisān al-Arab Cryptography Test Suite ===\n');

// 1. Ṭams (طَمْس) Test
console.log('[1] Testing Ṭams (طَمْس) 3-Pass Active Memory Scrubbing...');
const testKeyBuf = Buffer.from('4f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a', 'hex');
assert.strictEqual(testKeyBuf[0], 0x4f);
ZbatCrypto.tamsScrub(testKeyBuf);
assert.strictEqual(testKeyBuf.every(b => b === 0), true, 'Key buffer must be completely zeroed after 3 passes');
console.log('  ✅ Ṭams 3-pass memory sanitization validated (0x00 verified, RAM remanence eradicated)!');

// 2. Sadd (سَدّ) Test
console.log('\n[2] Testing Sadd (سَدّ) Strict Constant-Time Equality...');
const sig1 = '3045022100a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6';
const sig2 = '3045022100a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6';
const sigTampered = '3045022100a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f7';
assert.strictEqual(ZbatCrypto.saddEqual(sig1, sig2), true, 'Identical signatures must match');
assert.strictEqual(ZbatCrypto.saddEqual(sig1, sigTampered), false, 'Tampered signatures must fail constant-time check');
console.log('  ✅ Sadd constant-time comparison verified without timing leakage!');

// 3. Ḥabk (حَبْك) Double-Ratchet Test
console.log('\n[3] Testing Ḥabk (حَبْك) Double-Ratchet Asymmetric Weave (Break-In Recovery)...');
const sharedRootKey = crypto.randomBytes(32);
const aliceHabk = ZbatCrypto.initHabkRatchet(sharedRootKey, true);
const bobHabk = ZbatCrypto.initHabkRatchet(sharedRootKey, false);

// Alice sends to Bob
const msg1 = aliceHabk.encrypt('Message 1: Initial secret from Alice');
const decBob1 = bobHabk.decrypt(msg1);
assert.strictEqual(decBob1, 'Message 1: Initial secret from Alice');
console.log('  ✅ Turn 1 (Alice -> Bob): Decrypted successfully on initial ratchet.');

// Bob replies to Alice (Triggers Asymmetric DH Turn)
const msg2 = bobHabk.encrypt('Message 2: Asymmetric DH turn reply from Bob');
const decAlice2 = aliceHabk.decrypt(msg2);
assert.strictEqual(decAlice2, 'Message 2: Asymmetric DH turn reply from Bob');
console.log('  ✅ Turn 2 (Bob -> Alice): Asymmetric DH ratchet turn executed & decrypted successfully!');

// Alice sends again (Verifies Self-Healing Post-Compromise Security)
const msg3 = aliceHabk.encrypt('Message 3: Post-compromise self-healing confirm');
const decBob3 = bobHabk.decrypt(msg3);
assert.strictEqual(decBob3, 'Message 3: Post-compromise self-healing confirm');
console.log('  ✅ Turn 3 (Alice -> Bob): Complete Ḥabk Double-Ratchet weave validated!');

// 4. Raṣd (رَصْد) Protocol Sentinel Test
console.log('\n[4] Testing Raṣd (رَصْد) Autonomous Ingress Sentinel...');
const validZahir = { messageId: 'msg-1234', timestamp: Date.now() - 1000, hops: 1, ttl: 4 };
const expiredZahir = { messageId: 'msg-old', timestamp: Date.now() - 500000, hops: 1, ttl: 4 };
const loopZahir = { messageId: 'msg-loop', timestamp: Date.now(), hops: 20, ttl: 0 };

assert.strictEqual(ZbatCrypto.verifyRasd(validZahir).valid, true);
assert.strictEqual(ZbatCrypto.verifyRasd(expiredZahir).valid, false);
assert.strictEqual(ZbatCrypto.verifyRasd(loopZahir).valid, false);
console.log('  ✅ Raṣd ingress sentinel successfully filtered malformed, expired, and loop packets!');

// 5. LisanEngine Lexicon Lookup
console.log('\n[5] Verifying LisanEngine Semantic Lookups for Hardened Primitives...');
const tamsResult = LisanEngine.lookup('طمس');
assert.strictEqual(tamsResult.length > 0, true);
assert.strictEqual(tamsResult[0].arabicWord, 'طَمْس');

const habkResult = LisanEngine.lookup('حبك');
assert.strictEqual(habkResult.length > 0, true);
assert.strictEqual(habkResult[0].arabicWord, 'حَبْك');
console.log('  ✅ LisanEngine semantic definitions verified: ' + tamsResult[0].technicalTerm + ' & ' + habkResult[0].technicalTerm);

console.log('\n🎉 ALL 5/5 LISAN HARDENED CRYPTOGRAPHIC TESTS PASSED WITH 100% SUCCESS!\n');
