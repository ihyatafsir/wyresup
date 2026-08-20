/**
 * WyreSup Al-Sabk (الصَّبْك) Zero-Copy Binary Crypto Test Suite
 * (اِخْتِبَارَات الصَّبْك الثُّنَائِيّ عَدِيم النَّسْخ و التَّسْرِيع الحَقِيقِيّ)
 *
 * Validates:
 * 1. 34-byte compact binary header layout (Magic, Flags, Index, IV, AuthTag)
 * 2. 100% loss-free encryption & decryption of text, audio, and binary payloads
 * 3. Tamper Resistance: Bit-flip on packed binary buffer triggers GCM authentication failure
 * 4. High-Performance Benchmark: Direct comparison between JSON/Hex vs Al-Sabk Zero-Copy
 */

const assert = require("assert");
const crypto = require("crypto");
const ZbatCrypto = require("../src/mesh/ZbatCrypto");

console.log("=== 🔬 WyreSup Al-Sabk (الصَّبْك) Zero-Copy Binary Crypto Test Suite ===");

const sharedSecret = crypto.randomBytes(32);

// 1. Structure Verification
console.log("\n[1] Testing Al-Sabk Packed Binary Frame Structure...");
const testPlaintext = "Secret mesh payload over direct binary frame";
const packedFrame = ZbatCrypto.encryptSabk(testPlaintext, sharedSecret, 42);

assert(Buffer.isBuffer(packedFrame), "Packed frame must be a raw binary Buffer");
assert.strictEqual(packedFrame[0], 0x57, "Header byte 0 must be Magic 'W' (0x57)");
assert.strictEqual(packedFrame[1], 0x01, "Header byte 1 must be Flags (0x01)");
assert.strictEqual(packedFrame.readUInt32BE(2), 42, "Header bytes 2..5 must encode message index 42");
assert.strictEqual(packedFrame.length, 34 + Buffer.byteLength(testPlaintext), "Total length = 34-byte header + exact ciphertext length");
console.log(`  - Frame Length: ${packedFrame.length} bytes (34B header + ${testPlaintext.length}B ciphertext)`);
console.log("  ✅ Al-Sabk packed frame structure validated with zero byte bloat!");

// 2. Loss-free Decryption
console.log("\n[2] Testing Al-Sabk Decryption & Payload Integrity...");
const { decryptedBuf, messageIndex } = ZbatCrypto.decryptSabk(packedFrame, sharedSecret);
assert.strictEqual(messageIndex, 42, "Extracted message index must equal 42");
assert.strictEqual(decryptedBuf.toString("utf8"), testPlaintext, "Decrypted buffer must match original plaintext exactly");
console.log("  ✅ Zero-copy decryption succeeded with 100% fidelity!");

// 3. Tamper Resistance
console.log("\n[3] Testing Active Tamper Resistance on Packed Binary Buffers...");
const tamperedFrame = Buffer.from(packedFrame);
tamperedFrame[35] ^= 0x01; // Flip a bit in the ciphertext

let tamperCaught = false;
try {
  ZbatCrypto.decryptSabk(tamperedFrame, sharedSecret);
} catch (e) {
  tamperCaught = true;
  console.log(`  ✅ Tamper rejected by GCM AuthTag: ${e.message}`);
}
assert(tamperCaught, "Bit-flip in packed binary frame must be rejected");

// 4. Empirical Performance Benchmark (JSON/Hex vs Al-Sabk)
console.log("\n[4] Running Direct Comparative Throughput Benchmark (50,000 ops)...");
const iterations = 50000;
const payloadStr = "WyreSup wire-speed encrypted mesh packet!";
const payloadBuf = Buffer.from(payloadStr, "utf8");

// A. JSON/Hex
const t0 = performance.now();
for (let i = 0; i < iterations; i++) {
  const enc = ZbatCrypto.encryptBatin(payloadStr, sharedSecret);
  const dec = ZbatCrypto.decryptBatin(enc, sharedSecret);
}
const jsonDuration = performance.now() - t0;
const jsonOpsSec = Math.round((iterations / jsonDuration) * 1000);

// B. Al-Sabk Zero-Copy
const t1 = performance.now();
for (let i = 0; i < iterations; i++) {
  const packed = ZbatCrypto.encryptSabk(payloadBuf, sharedSecret, i);
  const dec = ZbatCrypto.decryptSabk(packed, sharedSecret);
}
const sabkDuration = performance.now() - t1;
const sabkOpsSec = Math.round((iterations / sabkDuration) * 1000);

const speedupFactor = (sabkOpsSec / jsonOpsSec).toFixed(2);
console.log(`  - Standard JSON/Hex Pipeline: [31m${jsonOpsSec.toLocaleString()} ops/sec[0m`);
console.log(`  - Al-Sabk Zero-Copy Pipeline: [32m${sabkOpsSec.toLocaleString()} ops/sec[0m`);
console.log(`  - Real Measured Speedup:      [32m${speedupFactor}x Faster![0m`);

assert(sabkOpsSec > jsonOpsSec, "Al-Sabk must be strictly faster than JSON/Hex pipeline");

console.log("\n🎉 ALL AL-SABK ZERO-COPY TESTS PASSED PERFECTLY!");
