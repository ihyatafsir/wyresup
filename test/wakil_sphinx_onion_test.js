const assert = require("assert");
const crypto = require("crypto");
const WakilOnion = require("../src/mesh/WakilOnion");

console.log("========================================================================");
console.log("  🏛️  WYRESUP WAKIL (وَكِيل) 3-HOP SPHINX ONION ROUTING TEST SUITE      ");
console.log("========================================================================\n");

// 1. Setup 3 Relay Nodes with ECDH Keypairs
function generateRelayNode(nodeId) {
  const dh = crypto.createECDH("prime256v1");
  dh.generateKeys();
  return {
    nodeId,
    privKeyHex: dh.getPrivateKey("hex"),
    pubKeyHex: dh.getPublicKey("hex")
  };
}

console.log("[1] Setting Up 3-Hop Decentralized Onion Circuit...");
const relay1 = generateRelayNode("relay-1-entry");
const relay2 = generateRelayNode("relay-2-middle");
const relay3 = generateRelayNode("relay-3-exit");

const circuit = [
  { nodeId: relay1.nodeId, pubKeyHex: relay1.pubKeyHex },
  { nodeId: relay2.nodeId, pubKeyHex: relay2.pubKeyHex },
  { nodeId: relay3.nodeId, pubKeyHex: relay3.pubKeyHex }
];

console.log(`  - Entry Node (وَكِيل أَوَّل):  ${relay1.nodeId}`);
console.log(`  - Middle Relay (وَكِيل أَوْسَط): ${relay2.nodeId}`);
console.log(`  - Exit Node (وَكِيل آخِر):    ${relay3.nodeId}\n`);

// 2. Encapsulate Secret Message into 3-Hop Onion
console.log("[2] Encapsulating Secret Message into 3-Hop Sphinx Onion...");
const secretMessage = {
  text: "Sovereign P2P Encrypted Mesh Transmission",
  sourceHandle: "alice@mesh",
  targetHandle: "bob@mesh",
  timestamp: Date.now()
};

const { targetEntryNode, onionPacket } = WakilOnion.buildOnionPacket(secretMessage, circuit);
assert.strictEqual(targetEntryNode, relay1.nodeId);
console.log("  ✅ Onion packet constructed: Layer 1 sealed with ephemeral ECDH!");

// 3. Hop 1: Entry Node Peeling Layer 1
console.log("\n[3] Hop 1: Entry Guard Peeling Layer 1...");
const hop1Result = WakilOnion.peelOnionLayer(onionPacket, relay1.privKeyHex);
assert.strictEqual(hop1Result.isExit, false);
assert.strictEqual(hop1Result.nextHop, relay2.nodeId);
console.log(`  ✅ Layer 1 peeled! Next hop forward instruction: ${hop1Result.nextHop}`);

// 4. Hop 2: Middle Relay Peeling Layer 2
console.log("\n[4] Hop 2: Middle Relay Peeling Layer 2 (Zero Knowledge of Sender/Recipient)...");
const hop2Result = WakilOnion.peelOnionLayer(hop1Result.forwardPacket, relay2.privKeyHex);
assert.strictEqual(hop2Result.isExit, false);
assert.strictEqual(hop2Result.nextHop, relay3.nodeId);
console.log(`  ✅ Layer 2 peeled! Next hop forward instruction: ${hop2Result.nextHop}`);

// 5. Hop 3: Exit Node Peeling Layer 3 & Delivering Payload
console.log("\n[5] Hop 3: Exit Node Peeling Final Layer & Extracting Payload...");
const hop3Result = WakilOnion.peelOnionLayer(hop2Result.forwardPacket, relay3.privKeyHex);
assert.strictEqual(hop3Result.isExit, true);
assert.deepStrictEqual(hop3Result.payload, secretMessage);
console.log(`  ✅ Layer 3 peeled! Final payload recovered with 100% fidelity: "${hop3Result.payload.text}"`);

// 6. Test Active Tamper Resistance
console.log("\n[6] Testing Active Malicious Intermediary Tamper Resistance...");
const tamperedPacket = JSON.parse(JSON.stringify(onionPacket));
const ctBuf = Buffer.from(tamperedPacket.ciphertext, "hex");
ctBuf[0] ^= 0xFF; // flip bits
tamperedPacket.ciphertext = ctBuf.toString("hex");

let tamperDetected = false;
try {
  WakilOnion.peelOnionLayer(tamperedPacket, relay1.privKeyHex);
} catch (e) {
  tamperDetected = true;
  console.log(`  ✅ Tamper detected! Bit-flipped layer rejected by AuthTag: ${e.message}`);
}
assert.strictEqual(tamperDetected, true, "Tampered onion packet must be rejected");

// 7. Micro-Benchmark: 3-Hop Onion Throughput
console.log("\n[7] Running 3-Hop Onion Encapsulation & Peeling Benchmark (5,000 circuits)...");
const ITERATIONS = 5000;
const t0 = process.hrtime.bigint();
for (let i = 0; i < ITERATIONS; i++) {
  const { onionPacket: op } = WakilOnion.buildOnionPacket(secretMessage, circuit);
  const r1 = WakilOnion.peelOnionLayer(op, relay1.privKeyHex);
  const r2 = WakilOnion.peelOnionLayer(r1.forwardPacket, relay2.privKeyHex);
  const r3 = WakilOnion.peelOnionLayer(r2.forwardPacket, relay3.privKeyHex);
}
const t1 = process.hrtime.bigint();
const durationMs = Number(t1 - t0) / 1e6;
const circuitsPerSec = Math.round((ITERATIONS / durationMs) * 1000);

console.log(`  - 3-Hop Full Circuit Time:  ${(durationMs / ITERATIONS).toFixed(2)} ms / complete 3-hop circuit`);
console.log(`  - Onion Circuit Throughput: ${circuitsPerSec.toLocaleString()} full circuits / sec`);

console.log("\n========================================================================");
console.log("  🎉 ALL WAKIL (وَكِيل) 3-HOP SPHINX ONION TESTS PASSED 100%!           ");
console.log("========================================================================\n");
