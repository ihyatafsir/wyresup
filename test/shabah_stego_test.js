/**
 * WyreSup Shabah (شَبَح) Steganography & Sayl (سَيْل) Flow Control Test Suite
 * (اِخْتِبَارَات الشَّبَح لِلإِخْفَاء الخَفِيّ و السَّيْل لِلتَّدَفُّق الأَقْصَى)
 */

const assert = require("assert");
const ShabahStego = require("../src/mesh/ShabahStego");
const SaylFlow = require("../src/mesh/SaylFlow");

console.log("=== 👻 WyreSup Shabah (شَبَح) & Sayl (سَيْل) Test Suite ===");

// 1. Shabah Waswas Zero-Width Steganography
console.log("\n[1] Testing Shabah Waswas (وَسْوَس) Invisible Text Steganography...");
const coverText = "Peace and blessings upon you my friend.";
const secretMessage = {
  secretCoordinates: "31.9522° N, 35.2332° E",
  authCode: "0xdeadbeef"
};

const stegoResult = ShabahStego.hideInText(coverText, secretMessage);
console.log(`  - Cover Text:       "${coverText}"`);
console.log(`  - Stego Text Length: ${stegoResult.length} chars (contains invisible zero-width unicode)`);

// Extract secret back
const recoveredSecret = ShabahStego.extractFromText(stegoResult);
assert.deepStrictEqual(recoveredSecret, secretMessage, "Recovered secret must match original object exactly");
console.log(`  - Recovered Secret: `, recoveredSecret);
console.log("  ✅ Shabah invisible steganography verified (100% lossless hidden transport)!");

// 2. Sayl Flow Control (AIMD & RTT Smoothing)
console.log("\n[2] Testing Sayl (سَيْل) Adaptive Congestion Window & Flow Control...");
const sayl = new SaylFlow({ initialCwnd: 10, minCwnd: 2, maxCwnd: 50 });
const peerId = "peer@wire_speed_node";

assert.strictEqual(sayl.canTransmit(peerId), true, "Initially must allow transmission");

// Simulate sending 5 packets
for (let i = 0; i < 5; i++) {
  sayl.onPacketSent(peerId, 1024);
}

// Simulate 5 successful ACKs with 20ms RTT -> Congestion window should expand
for (let i = 0; i < 5; i++) {
  sayl.onPacketAck(peerId, 1024, 20);
}

const stateAfterAcks = sayl.flows.get(peerId);
const windowBeforeLoss = stateAfterAcks.congestionWindow;
assert(stateAfterAcks.congestionWindow > 10, "Congestion window must grow via Additive Increase");
console.log(`  - Congestion Window grew to: ${stateAfterAcks.congestionWindow} packets in flight`);
console.log(`  - Smoothed RTT: ${stateAfterAcks.rttSmoothed.toFixed(1)} ms`);

// Simulate packet loss -> Multiplicative Decrease
sayl.onPacketLoss(peerId);
const stateAfterLoss = sayl.flows.get(peerId);
console.log(`  - Congestion Window after loss: ${stateAfterLoss.congestionWindow} (Multiplicative Decrease)`);
assert(stateAfterLoss.congestionWindow < windowBeforeLoss, "Window must shrink on loss");

console.log("  ✅ Sayl adaptive flow control validated!");

console.log("\n🎉 ALL SHABAH & SAYL TESTS PASSED PERFECTLY!");
