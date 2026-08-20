/**
 * WyreSup Miftah & ZBAT End-to-End Cryptographic Test Suite (اِخْتِبَارَات عَقْد المِفْتَاح و التَّعْمِيَة)
 * Mathematically validates:
 * 1. ECDH Key Agreement (Aqd al-Miftah) between Alice and Bob
 * 2. AES-256-GCM Authenticated Encryption & Decryption
 * 3. Zero-Knowledge Relay: Eavesdropper (Eve) cannot decrypt
 * 4. Tamper Resistance: Ciphertext bit-flip triggers auth tag failure
 * 5. ECDSA Signature validation
 */

const assert = require("assert");
const ZbatCrypto = require("../src/mesh/ZbatCrypto");

console.log("=== 🛡️ WyreSup Miftah E2EE Cryptographic Engine Test Suite ===");

// 1. Identity & Key Generation
console.log("\n[1] Generating Cryptographic Personas (Huwiyya)...");
const alice = ZbatCrypto.generateIdentity("alice");
const bob = ZbatCrypto.generateIdentity("bob");
const eve = ZbatCrypto.generateIdentity("eve");

console.log(`  - Alice ID: ${alice.fullId} (Pub: ${alice.pubKey.substring(0, 16)}...)`);
console.log(`  - Bob ID:   ${bob.fullId} (Pub: ${bob.pubKey.substring(0, 16)}...)`);
console.log(`  - Eve ID:   ${eve.fullId} (Pub: ${eve.pubKey.substring(0, 16)}...)`);

assert(alice.pubKey && alice.secretKey, "Alice must have ECDH keypair");
assert(bob.pubKey && bob.secretKey, "Bob must have ECDH keypair");

// 2. ECDH Key Agreement (Aqd al-Miftah)
console.log("\n[2] Performing ECDH Key Agreement (عَقْد المِفْتَاح)...");
const aliceSharedKey = ZbatCrypto.deriveSharedKey(alice.secretKey, bob.pubKey);
const bobSharedKey = ZbatCrypto.deriveSharedKey(bob.secretKey, alice.pubKey);
const eveSharedKey = ZbatCrypto.deriveSharedKey(eve.secretKey, bob.pubKey);

assert.strictEqual(
  aliceSharedKey.toString("hex"),
  bobSharedKey.toString("hex"),
  "Alice and Bob derived shared keys MUST be mathematically identical!"
);
console.log(`  ✅ Alice & Bob derived identical 256-bit symmetric session key: ${aliceSharedKey.toString("hex").substring(0, 24)}...`);

assert.notStrictEqual(
  eveSharedKey.toString("hex"),
  aliceSharedKey.toString("hex"),
  "Eve must NOT be able to derive Alice and Bob shared key!"
);
console.log("  ✅ Third-party (Eve) key is completely distinct.");

// 3. Encrypting Batin Payload via AES-256-GCM
console.log("\n[3] Encapsulating & Encrypting in ZBAT Envelope (Zahir/Batin)...");
const confidentialSecret = {
  content: "السَّلَامُ عَلَيْكُمْ — Highly confidential P2P mesh coordinates: 31.9522° N, 35.2332° E.",
  timestamp: Date.now(),
  securityLevel: "ZBAT_MIFTAH_TOP_SECRET"
};

const packet = ZbatCrypto.wrapZbat(alice.fullId, "space-public-mesh", "dm-bob", confidentialSecret, {
  sharedKey: aliceSharedKey,
  senderPubKey: alice.pubKey,
  targetPeer: bob.fullId,
  signPrivKey: alice.signPrivKey
});

console.log("  - Zahir (Public Routing):", JSON.stringify(packet.zahir));
console.log("  - Batin (Encrypted Payload):", JSON.stringify(packet.batin));

// Assertions on wire safety
assert(packet.zahir.isEncrypted === true, "Zahir must mark packet as encrypted");
assert(!JSON.stringify(packet).includes("31.9522"), "Plaintext MUST NOT appear anywhere in the transmitted packet!");
assert(packet.batin.ciphertext && packet.batin.iv && packet.batin.tag, "Batin must contain GCM ciphertext, IV, and tag");
console.log("  ✅ Transmitted packet is 100% encrypted ciphertext. Relay sees zero plaintext!");

// 4. Decryption by Intended Recipient (Bob)
console.log("\n[4] Bob Decrypting & Authenticating Incoming Packet...");
const decryptedByBob = ZbatCrypto.decryptBatin(packet.batin, bobSharedKey);
console.log("  - Decrypted Content:", decryptedByBob.content);

assert.strictEqual(
  decryptedByBob.content,
  confidentialSecret.content,
  "Decrypted content must match original plaintext exactly!"
);
console.log("  ✅ Bob successfully decrypted the confidential message!");

// 5. Zero-Knowledge Eavesdropping Protection (Eve fails)
console.log("\n[5] Testing Eavesdropper Protection (Eve attempting decryption)...");
let eveFailed = false;
try {
  ZbatCrypto.decryptBatin(packet.batin, eveSharedKey);
} catch (err) {
  eveFailed = true;
  console.log(`  ✅ Eve decryption rejected by AES-GCM AuthTag: ${err.message}`);
}
assert(eveFailed, "Eve MUST fail to decrypt the ciphertext!");

// 6. Tamper Detection (Bit-flip attack on ciphertext)
console.log("\n[6] Testing Active Network Tamper Resistance (Bit-flip detection)...");
const tamperedBatin = {
  ...packet.batin,
  ciphertext: packet.batin.ciphertext.substring(0, packet.batin.ciphertext.length - 2) + "00"
};

let tamperDetected = false;
try {
  ZbatCrypto.decryptBatin(tamperedBatin, bobSharedKey);
} catch (err) {
  tamperDetected = true;
  console.log(`  ✅ Tamper detected! AES-GCM authentication tag verification failed: ${err.message}`);
}
assert(tamperDetected, "Any modification to ciphertext MUST cause authentication tag rejection!");

// 7. ECDSA Signature Verification
console.log("\n[7] Testing ECDSA Signature Verification...");
const isValidSig = ZbatCrypto.verifyPayload(
  `${alice.fullId}:${packet.zahir.messageId}:${packet.batin.ciphertext}`,
  packet.batin.sig,
  alice.signPubKey
);
assert(isValidSig, "Signature must verify against Alice public key");
console.log("  ✅ Cryptographic signature verified against Alice public key!");

console.log("\n🎉 ALL 7/7 CRYPTOGRAPHIC PROOFS PASSED PERFECTLY!");
