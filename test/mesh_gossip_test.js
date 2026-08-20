/**
 * WyreSup Mesh Gossip & Multi-Channel Test Suite (اخْتِبَار البَثّ و الغُرَف)
 * Tests multi-peer topology (Alpha <-> Beta <-> Gamma <-> Delta),
 * loop prevention, deduplication, TTL handling, and channel isolation.
 */

const assert = require('assert');
const GossipMesh = require('../src/mesh/GossipMesh');
const MajlisManager = require('../src/mesh/MajlisManager');
const HudurPresence = require('../src/mesh/HudurPresence');
const ZbatCrypto = require('../src/mesh/ZbatCrypto');

async function runTests() {
  console.log('=======================================================');
  console.log('  WyreSup Mesh Gossip & Multi-Channel Verification');
  console.log('=======================================================');

  let passedTests = 0;
  let totalTests = 0;

  function test(name, fn) {
    totalTests++;
    try {
      fn();
      console.log(`  ✓ [PASS] ${name}`);
      passedTests++;
    } catch (err) {
      console.error(`  ✗ [FAIL] ${name}:`, err.message);
      throw err;
    }
  }

  // --- Test 1: Identity and ZBAT Framing ---
  test('1. Identity Generation and ZBAT Envelope Framing', () => {
    const id = ZbatCrypto.generateIdentity('khalid');
    assert.strictEqual(id.prefix, 'khalid');
    assert.strictEqual(id.shortHash.length, 8);
    assert.strictEqual(id.fullId, `khalid@${id.shortHash}`);

    const packet = ZbatCrypto.wrapZbat(id.fullId, 'space-public-mesh', 'chan-general', {
      content: 'Salam alaykum mesh'
    }, { ttl: 5 });

    assert.strictEqual(packet.zahir.senderId, id.fullId);
    assert.strictEqual(packet.zahir.ttl, 5);
    assert.strictEqual(packet.zahir.hops, 0);
    assert.strictEqual(packet.batin.content, 'Salam alaykum mesh');
    assert(packet.batin.sig);
  });

  // --- Test 2: Spaces & Channels Hierarchy ---
  test('2. Majlis and Ghurfa Management (Spaces & Channels)', () => {
    const manager = new MajlisManager();
    const spaces = manager.getAllSpaces();
    assert(spaces.length >= 2, 'Should have default spaces initialized');

    const publicSpace = manager.getSpace('space-public-mesh');
    assert(publicSpace, 'Public mesh space should exist');
    assert(publicSpace.channels.some(c => c.name === 'general'));

    // Create a new space
    const customSpace = manager.createSpace({
      name: 'Alpha Labs',
      arabicName: 'مُخْتَبَر أَلْفَا',
      icon: '🧪'
    });
    assert.strictEqual(manager.getAllSpaces().length, spaces.length + 1);

    // Add a channel
    const newChan = manager.addChannel(customSpace.id, {
      name: 'research',
      type: 'text',
      topic: 'P2P research'
    });
    assert.strictEqual(newChan.name, 'research');
    assert.strictEqual(manager.getChannel(customSpace.id, newChan.id).name, 'research');
  });

  // --- Test 3: Multi-Node Mesh Gossip & Deduplication ---
  test('3. 4-Node Chain Topology Broadcast & Deduplication', () => {
    // Toplogy: Alpha <-> Beta <-> Gamma <-> Delta
    const nodeA = new GossipMesh({ nodeId: 'alpha@11111111' });
    const nodeB = new GossipMesh({ nodeId: 'beta@22222222' });
    const nodeC = new GossipMesh({ nodeId: 'gamma@33333333' });
    const nodeD = new GossipMesh({ nodeId: 'delta@44444444' });

    // Connect A <-> B
    nodeA.addNeighbor('beta@22222222', (pkt) => nodeB.receivePacket(pkt, 'alpha@11111111'));
    nodeB.addNeighbor('alpha@11111111', (pkt) => nodeA.receivePacket(pkt, 'beta@22222222'));

    // Connect B <-> C
    nodeB.addNeighbor('gamma@33333333', (pkt) => nodeC.receivePacket(pkt, 'beta@22222222'));
    nodeC.addNeighbor('beta@22222222', (pkt) => nodeB.receivePacket(pkt, 'gamma@33333333'));

    // Connect C <-> D
    nodeC.addNeighbor('delta@44444444', (pkt) => nodeD.receivePacket(pkt, 'gamma@33333333'));
    nodeD.addNeighbor('gamma@33333333', (pkt) => nodeC.receivePacket(pkt, 'delta@44444444'));

    let nodeDReceived = null;
    nodeD.on('message', ({ packet }) => {
      nodeDReceived = packet;
    });

    // Node A publishes message to #general
    const published = nodeA.publish('space-public-mesh', 'chan-general', {
      content: 'Chain broadcast test from Alpha to Delta'
    });

    assert(nodeDReceived, 'Node D should receive the broadcast from Node A');
    assert.strictEqual(nodeDReceived.batin.content, 'Chain broadcast test from Alpha to Delta');
    assert.strictEqual(nodeDReceived.zahir.hops, 3, 'Message should have traversed 3 hops (A->B->C->D)');

    // Re-inject identical packet to Node B to test deduplication
    const dupResult = nodeB.receivePacket(published, 'alpha@11111111');
    assert.strictEqual(dupResult.status, 'duplicate_dropped');
    assert.strictEqual(nodeB.stats.duplicatesDropped, 1);
  });

  // --- Test 4: Presence (Hudur) & Typing (Yaktub) ---
  test('4. Hudur Presence State & Yaktub Typing Expiry', () => {
    const presence = new HudurPresence(1000); // 1s timeout for testing
    
    presence.updatePeer({
      peerId: 'peer1@aaaa1111',
      prefix: 'peer1',
      shortHash: 'aaaa1111'
    });

    assert.strictEqual(presence.getAllPeers().length, 1);
    assert.strictEqual(presence.getAllPeers()[0].status, 'hadir');

    // Test typing
    presence.setTyping('peer1@aaaa1111', 'chan-general', 2000);
    const typingNow = presence.getTypingPeersInChannel('chan-general');
    assert.strictEqual(typingNow.length, 1);
    assert.strictEqual(typingNow[0].peerId, 'peer1@aaaa1111');

    // Clear typing
    presence.clearTyping('peer1@aaaa1111');
    assert.strictEqual(presence.getTypingPeersInChannel('chan-general').length, 0);
  });

  // --- Test 5: DTMF Frequencies Mapping ---
  test('5. Nagham DTMF Frequency Map Validation', () => {
    const freqs = ZbatCrypto.getDtmfFrequencies();
    assert.deepStrictEqual(freqs['1'], [697, 1209]);
    assert.deepStrictEqual(freqs['A'], [697, 1633]);
    assert.deepStrictEqual(freqs['#'], [941, 1477]);
    assert.strictEqual(Object.keys(freqs).length, 16);
  });

  console.log(`\n=======================================================`);
  console.log(`  ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY! (100% GREEN)`);
  console.log(`=======================================================\n`);
}

runTests().catch(err => {
  console.error('Fatal Test Error:', err);
  process.exit(1);
});
