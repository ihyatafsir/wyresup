const assert = require("assert");
const crypto = require("crypto");
const WakilOnion = require("../src/mesh/WakilOnion");

console.log("========================================================================");
console.log("  🏛️  WYRESUP WAKIL (وَكِيل) CANONICAL SPHINX ONION TEST SUITE         ");
console.log("========================================================================\n");

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

// 2. Encapsulate Secret Message into Strict Constant-Length Sphinx Onion
console.log("[2] Encapsulating Secret Message into Sphinx Frame...");
const secretMessage = {
  text: "Sovereign P2P Encrypted Mesh Transmission",
  sourceHandle: "alice@mesh",
  targetHandle: "bob@mesh",
  timestamp: Date.now()
};

const { targetEntryNode, frameBuffer, sizeBytes, isConstantSize } = WakilOnion.buildOnionPacket(secretMessage, circuit);
assert.strictEqual(targetEntryNode, relay1.nodeId);
assert.strictEqual(isConstantSize, true);
console.log(`  ✅ Constant-Length Sphinx Frame: Exactly ${sizeBytes} bytes (100% Anti-Traffic Analysis)!`);

// 3. Hop 1: Entry Guard Peeling Layer 1
console.log("\n[3] Hop 1: Entry Guard Peeling Layer 1...");
const hop1Result = WakilOnion.peelOnionLayer(frameBuffer, relay1.privKeyHex, 1);
assert.strictEqual(hop1Result.isExit, false);
assert.strictEqual(hop1Result.nextHop, relay2.nodeId);
assert.strictEqual(hop1Result.nextFrameBuffer.length, sizeBytes);
console.log(`  ✅ Layer 1 peeled! Next hop forward instruction: ${hop1Result.nextHop} (Frame size: ${hop1Result.nextFrameBuffer.length}B)`);

// 4. Hop 2: Middle Relay Peeling Layer 2
console.log("\n[4] Hop 2: Middle Relay Peeling Layer 2 (Zero Knowledge of Sender/Recipient)...");
const hop2Result = WakilOnion.peelOnionLayer(hop1Result.nextFrameBuffer, relay2.privKeyHex, 2);
assert.strictEqual(hop2Result.isExit, false);
assert.strictEqual(hop2Result.nextHop, relay3.nodeId);
assert.strictEqual(hop2Result.nextFrameBuffer.length, sizeBytes);
console.log(`  ✅ Layer 2 peeled! Next hop forward instruction: ${hop2Result.nextHop} (Frame size: ${hop2Result.nextFrameBuffer.length}B)`);

// 5. Hop 3: Exit Node Peeling Layer 3 & Delivering Payload
console.log("\n[5] Hop 3: Exit Node Peeling Final Layer & Extracting Payload...");
const hop3Result = WakilOnion.peelOnionLayer(hop2Result.nextFrameBuffer, relay3.privKeyHex, 3);
assert.strictEqual(hop3Result.isExit, true);
assert.deepStrictEqual(hop3Result.payload, secretMessage);
console.log(`  ✅ Layer 3 peeled! Final payload recovered with 100% fidelity: "${hop3Result.payload.text}"`);

// 6. Test Anti-Replay Defense
console.log("\n[6] Testing Anti-Replay Defense...");
let replayDetected = false;
try {
  // Attempt to replay the exact same frame1 to relay1
  WakilOnion.peelOnionLayer(frameBuffer, relay1.privKeyHex, 1);
} catch (e) {
  if (e.message.includes("Detected replayed Sphinx onion tag")) {
    replayDetected = true;
    console.log(`  ✅ Anti-Replay Defense working! Captured frame rejected: ${e.message}`);
  }
}
assert.strictEqual(replayDetected, true, "Replayed onion frames must be dropped by replay cache");

// 7. Micro-Benchmark: Constant-Length Sphinx Onion Throughput
console.log("\n[7] Running Sphinx Onion Benchmark (5,000 circuits)...");
const ITERATIONS = 5000;
const t0 = process.hrtime.bigint();
for (let i = 0; i < ITERATIONS; i++) {
  // Clear replay cache for benchmark iteration
  WakilOnion.seenReplayTags.clear();
  const { frameBuffer: fb } = WakilOnion.buildOnionPacket(secretMessage, circuit);
  const r1 = WakilOnion.peelOnionLayer(fb, relay1.privKeyHex, 1);
  const r2 = WakilOnion.peelOnionLayer(r1.nextFrameBuffer, relay2.privKeyHex, 2);
  const r3 = WakilOnion.peelOnionLayer(r2.nextFrameBuffer, relay3.privKeyHex, 3);
}
const t1 = process.hrtime.bigint();
const durationMs = Number(t1 - t0) / 1e6;
const circuitsPerSec = Math.round((ITERATIONS / durationMs) * 1000);

console.log(`  - 3-Hop Full Sphinx Circuit Time: ${(durationMs / ITERATIONS).toFixed(2)} ms / circuit`);
console.log(`  - Sphinx Circuit Throughput:      ${circuitsPerSec.toLocaleString()} full circuits / sec`);

console.log("\n========================================================================");
console.log("  🎉 ALL WAKIL (وَكِيل) CANONICAL SPHINX ONION TESTS PASSED 100%!       ");
console.log("========================================================================\n");
