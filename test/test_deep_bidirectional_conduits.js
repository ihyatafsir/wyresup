/**
 * WyreSup Deep Bidirectional Conduits & Signaling Test Suite
 * Tests:
 * 1. Mutual Peer Identification with ECDH/ECDSA Public Keys
 * 2. Active On-Demand Key Discovery (KEY_REQUEST / KEY_RESPONSE)
 * 3. Bidirectional WebRTC Signaling Handshake (OFFER -> ANSWER -> ICE -> HANGUP)
 * 4. Concurrent Full-Duplex NAFAQ Containerless PCM Audio Streaming
 * 5. Concurrent SHAF HD Video Frame Relay
 * 6. Reachability Feedback (PEER_UNREACHABLE on offline peer)
 * 7. Socket Disconnect Pruning & Clean Presence Reclaim
 */

const { WebSocket } = require('ws');
const assert = require('assert');

const WS_URL = 'ws://127.0.0.1:5195';

function createTestPeer(peerId, prefix, ecdhKey, signKey) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    const peer = {
      ws,
      peerId,
      prefix,
      ecdhKey,
      signKey,
      receivedSignals: [],
      receivedKeyResponses: [],
      receivedPcmFrames: [],
      receivedVideoFrames: [],
      presenceEvents: []
    };

    ws.on('open', () => {
      ws.send(JSON.stringify({
        type: 'IDENTIFY',
        payload: {
          peerId,
          prefix,
          ecdhPubKey: ecdhKey,
          signPubKey: signKey,
          spaceId: 'space-public-mesh',
          channelId: 'chan-general',
          userAgent: 'WyreSup-DeepTest/2.0'
        }
      }));
      resolve(peer);
    });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'CALL_SIGNAL') {
          peer.receivedSignals.push(msg.payload);
          if (msg.payload.signalType === 'NAFAQ_PCM') {
            peer.receivedPcmFrames.push(msg.payload);
          } else if (msg.payload.signalType === 'SHAF_HD_FRAME') {
            peer.receivedVideoFrames.push(msg.payload);
          }
        } else if (msg.type === 'KEY_RESPONSE') {
          peer.receivedKeyResponses.push(msg.payload);
        } else if (msg.type === 'PRESENCE_SYNC') {
          peer.presenceEvents.push(msg.payload);
        }
      } catch (err) {
        console.error(`[${peerId}] Failed to parse message:`, err);
      }
    });

    ws.on('error', reject);
  });
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runConduitTestSuite() {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(' 🔬 WYRESUP DEEP BIDIRECTIONAL CONDUITS & SIGNALING TEST SUITE');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  // 1. Spawning Alice and Bob
  console.log('[Step 1] Connecting Alice & Bob with cryptographic identity...');
  const aliceKey = 'ecdh_pub_alice_3a9f02948cba01';
  const aliceSign = 'ecdsa_pub_alice_9824bcadef';
  const bobKey = 'ecdh_pub_bob_b91834cd7182ae';
  const bobSign = 'ecdsa_pub_bob_7749182390';

  const alice = await createTestPeer('alice@11111111', 'alice', aliceKey, aliceSign);
  const bob = await createTestPeer('bob@22222222', 'bob', bobKey, bobSign);

  await delay(300); // Allow presence sync to settle
  console.log('  ✅ Alice and Bob connected and registered in presenceManager.');

  // 2. Active On-Demand Key Discovery
  console.log('\n[Step 2] Testing Active On-Demand Key Discovery (KEY_REQUEST)...');
  alice.ws.send(JSON.stringify({
    type: 'KEY_REQUEST',
    payload: {
      targetPeer: 'bob@22222222',
      targetPrefix: 'bob'
    }
  }));
  await delay(200);

  assert.strictEqual(alice.receivedKeyResponses.length, 1, 'Alice should receive 1 KEY_RESPONSE for Bob');
  assert.strictEqual(alice.receivedKeyResponses[0].ecdhPubKey, bobKey, 'Returned ECDH key must match Bob');
  assert.strictEqual(alice.receivedKeyResponses[0].prefix, 'bob', 'Returned prefix must be bob');
  console.log(`  ✅ Alice retrieved Bob's ECDH public key on-demand: ${alice.receivedKeyResponses[0].ecdhPubKey}`);

  // Also test reverse discovery (Bob queries Alice)
  bob.ws.send(JSON.stringify({
    type: 'KEY_REQUEST',
    payload: {
      targetPeer: 'alice@11111111',
      targetPrefix: 'alice'
    }
  }));
  await delay(200);

  assert.strictEqual(bob.receivedKeyResponses.length, 1, 'Bob should receive 1 KEY_RESPONSE for Alice');
  assert.strictEqual(bob.receivedKeyResponses[0].ecdhPubKey, aliceKey, 'Returned ECDH key must match Alice');
  console.log(`  ✅ Bob retrieved Alice's ECDH public key on-demand: ${bob.receivedKeyResponses[0].ecdhPubKey}`);

  // 3. WebRTC Bilateral Signaling: OFFER -> ANSWER -> ICE Candidates
  console.log('\n[Step 3] Testing Bilateral WebRTC Signaling Handshake...');
  const mockOfferSdp = { type: 'offer', sdp: 'v=0\r\no=alice 12345 2 IN IP4 127.0.0.1\r\ns=WyreSup Session\r\n' };
  alice.ws.send(JSON.stringify({
    type: 'CALL_SIGNAL',
    payload: {
      signalType: 'OFFER',
      targetPeer: 'bob',
      callType: 'video',
      sdp: mockOfferSdp
    }
  }));
  await delay(200);

  const bobOffer = bob.receivedSignals.find(s => s.signalType === 'OFFER');
  assert(bobOffer, 'Bob must receive CALL_SIGNAL OFFER from Alice');
  assert.strictEqual(bobOffer.senderPrefix, 'alice', 'Sender prefix must be alice');
  console.log('  ✅ Alice -> Bob OFFER forwarded cleanly.');

  // Bob answers
  const mockAnswerSdp = { type: 'answer', sdp: 'v=0\r\no=bob 67890 2 IN IP4 127.0.0.1\r\ns=WyreSup Session\r\n' };
  bob.ws.send(JSON.stringify({
    type: 'CALL_SIGNAL',
    payload: {
      signalType: 'ANSWER',
      targetPeer: 'alice',
      callType: 'video',
      sdp: mockAnswerSdp
    }
  }));
  await delay(200);

  const aliceAnswer = alice.receivedSignals.find(s => s.signalType === 'ANSWER');
  assert(aliceAnswer, 'Alice must receive CALL_SIGNAL ANSWER from Bob');
  assert.strictEqual(aliceAnswer.senderPrefix, 'bob', 'Sender prefix must be bob');
  console.log('  ✅ Bob -> Alice ANSWER forwarded cleanly.');

  // Symmetrical ICE Candidate Exchanges
  console.log('\n[Step 4] Testing Symmetrical ICE Candidate Forwarding...');
  for (let i = 0; i < 3; i++) {
    alice.ws.send(JSON.stringify({
      type: 'CALL_SIGNAL',
      payload: {
        signalType: 'ICE',
        targetPeer: 'bob',
        candidate: { candidate: `candidate:1 1 UDP 2122260223 192.168.1.${100 + i} 5000 typ host`, sdpMid: '0', sdpMLineIndex: 0 }
      }
    }));
    bob.ws.send(JSON.stringify({
      type: 'CALL_SIGNAL',
      payload: {
        signalType: 'ICE',
        targetPeer: 'alice',
        candidate: { candidate: `candidate:2 1 UDP 2122260223 10.0.0.${200 + i} 6000 typ srflx raddr 192.168.1.50 rport 6000`, sdpMid: '0', sdpMLineIndex: 0 }
      }
    }));
  }
  await delay(200);

  const bobIces = bob.receivedSignals.filter(s => s.signalType === 'ICE');
  const aliceIces = alice.receivedSignals.filter(s => s.signalType === 'ICE');
  assert.strictEqual(bobIces.length, 3, 'Bob must receive 3 ICE candidates from Alice');
  assert.strictEqual(aliceIces.length, 3, 'Alice must receive 3 ICE candidates from Bob');
  console.log(`  ✅ Alice received ${aliceIces.length} ICE candidates; Bob received ${bobIces.length} ICE candidates.`);

  // 5. Full-Duplex Bidirectional NAFAQ PCM Audio Conduits
  console.log('\n[Step 5] Testing Concurrent Full-Duplex NAFAQ PCM Audio Streaming...');
  const sampleCount = 20;
  const pcmBytes = 640; // 20ms of 16kHz 16-bit mono

  for (let seq = 1; seq <= sampleCount; seq++) {
    // Alice sends PCM frame to Bob
    const aliceData = Buffer.alloc(pcmBytes, 0x11 * (seq % 10 + 1)).toString('base64');
    alice.ws.send(JSON.stringify({
      type: 'CALL_SIGNAL',
      payload: {
        signalType: 'NAFAQ_PCM',
        targetPeer: 'bob',
        seq,
        data: aliceData,
        sampleRate: 16000,
        ts: Date.now()
      }
    }));

    // Bob sends PCM frame to Alice concurrently
    const bobData = Buffer.alloc(pcmBytes, 0x22 * (seq % 10 + 1)).toString('base64');
    bob.ws.send(JSON.stringify({
      type: 'CALL_SIGNAL',
      payload: {
        signalType: 'NAFAQ_PCM',
        targetPeer: 'alice',
        seq,
        data: bobData,
        sampleRate: 16000,
        ts: Date.now()
      }
    }));

    // Small inter-packet timing
    await delay(15);
  }
  await delay(300);

  console.log(`  - Alice received ${alice.receivedPcmFrames.length} PCM audio frames from Bob.`);
  console.log(`  - Bob received ${bob.receivedPcmFrames.length} PCM audio frames from Alice.`);
  assert.strictEqual(alice.receivedPcmFrames.length, sampleCount, 'Alice should receive all PCM frames');
  assert.strictEqual(bob.receivedPcmFrames.length, sampleCount, 'Bob should receive all PCM frames');
  console.log('  ✅ Concurrent full-duplex NAFAQ PCM voice streaming validated with 0% frame loss!');

  // 6. Concurrent SHAF HD Video Frame Relay
  console.log('\n[Step 6] Testing Concurrent SHAF HD Video Frame Relay...');
  for (let f = 1; f <= 5; f++) {
    alice.ws.send(JSON.stringify({
      type: 'CALL_SIGNAL',
      payload: {
        signalType: 'SHAF_HD_FRAME',
        targetPeer: 'bob',
        frame: `data:image/jpeg;base64,mockAliceFrame${f}`,
        frameIndex: f,
        ts: Date.now()
      }
    }));
    bob.ws.send(JSON.stringify({
      type: 'CALL_SIGNAL',
      payload: {
        signalType: 'SHAF_HD_FRAME',
        targetPeer: 'alice',
        frame: `data:image/jpeg;base64,mockBobFrame${f}`,
        frameIndex: f,
        ts: Date.now()
      }
    }));
  }
  await delay(200);

  assert.strictEqual(alice.receivedVideoFrames.length, 5, 'Alice must receive 5 SHAF video frames');
  assert.strictEqual(bob.receivedVideoFrames.length, 5, 'Bob must receive 5 SHAF video frames');
  console.log('  ✅ Bidirectional SHAF HD video frames relayed with 100% throughput.');

  // 7. Reachability Feedback: Calling Offline Peer triggers PEER_UNREACHABLE
  console.log('\n[Step 7] Testing Offline Reachability Feedback (PEER_UNREACHABLE)...');
  alice.ws.send(JSON.stringify({
    type: 'CALL_SIGNAL',
    payload: {
      signalType: 'OFFER',
      targetPeer: 'ghost_peer@99999999',
      callType: 'audio'
    }
  }));
  await delay(200);

  const unreachableSignal = alice.receivedSignals.find(s => s.signalType === 'PEER_UNREACHABLE');
  assert(unreachableSignal, 'Alice must receive PEER_UNREACHABLE for offline peer');
  assert.strictEqual(unreachableSignal.targetPeer, 'ghost_peer@99999999');
  console.log(`  ✅ Verified: Server promptly returned PEER_UNREACHABLE: "${unreachableSignal.reason}"`);

  // 8. Call Termination (HANGUP)
  console.log('\n[Step 8] Testing Call Termination (HANGUP)...');
  alice.ws.send(JSON.stringify({
    type: 'CALL_SIGNAL',
    payload: {
      signalType: 'HANGUP',
      targetPeer: 'bob'
    }
  }));
  await delay(200);

  const bobHangup = bob.receivedSignals.find(s => s.signalType === 'HANGUP');
  assert(bobHangup, 'Bob must receive HANGUP signal from Alice');
  console.log('  ✅ Bilateral HANGUP handshake cleanly completed.');

  // 9. Socket Disconnect & Reconnect Pruning
  console.log('\n[Step 9] Testing Socket Lifecycle & Stale Pruning...');
  // Bob disconnects
  bob.ws.close();
  await delay(300);

  // Alice checks if calling Bob now triggers PEER_UNREACHABLE
  alice.receivedSignals = [];
  alice.ws.send(JSON.stringify({
    type: 'CALL_SIGNAL',
    payload: {
      signalType: 'OFFER',
      targetPeer: 'bob',
      callType: 'audio'
    }
  }));
  await delay(200);

  const postCloseUnreachable = alice.receivedSignals.find(s => s.signalType === 'PEER_UNREACHABLE');
  assert(postCloseUnreachable, 'Disconnected Bob must immediately trigger PEER_UNREACHABLE');
  console.log('  ✅ Disconnected socket immediately pruned from presenceManager; target marked unreachable.');

  // Clean Alice close
  alice.ws.close();
  await delay(100);

  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log(' 🎉 ALL 9 BIDIRECTIONAL CONDUIT TESTS PASSED (100% SUCCESS)');
  console.log('═══════════════════════════════════════════════════════════════════\n');
}

runConduitTestSuite().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
