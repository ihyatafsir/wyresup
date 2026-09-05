const { WebSocket } = require('ws');

const HUB_URL = 'ws://127.0.0.1:5195';

async function testP2PCallIsolation() {
  console.log('🧪 [Test] Starting P2P Call Isolation & Non-Interference Verification...');

  const wsA = new WebSocket(HUB_URL);
  const wsB = new WebSocket(HUB_URL);

  const peerA = { peerId: 'khalid@hash_a', prefix: 'khalid' };
  const peerB = { peerId: 'antigravity@hash_b', prefix: 'antigravity' };

  let offerReceivedByB = false;
  let answerReceivedByA = false;
  let botInterferenceDetected = false;
  let botPcmDetected = false;

  await Promise.all([
    new Promise(resolve => wsA.on('open', resolve)),
    new Promise(resolve => wsB.on('open', resolve))
  ]);

  // Register both peers
  wsA.send(JSON.stringify({ type: 'IDENTIFY', payload: peerA }));
  wsB.send(JSON.stringify({ type: 'IDENTIFY', payload: peerB }));

  await new Promise(r => setTimeout(r, 600));

  // Listeners
  wsB.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'CALL_SIGNAL') {
        if (msg.payload.signalType === 'OFFER' && msg.payload.senderPeer === peerA.peerId) {
          offerReceivedByB = true;
          console.log('  ✅ Peer B received OFFER directly from Peer A');
          // Peer B sends ANSWER
          wsB.send(JSON.stringify({
            type: 'CALL_SIGNAL',
            payload: {
              signalType: 'ANSWER',
              targetPeer: peerA.peerId,
              senderPeer: peerB.peerId,
              sdp: { type: 'answer', sdp: 'v=0\r\no=peerB 12345 12345 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\nm=audio 50000 UDP/TLS/RTP/SAVPF 111\r\n' }
            }
          }));
        }
      }
    } catch(e) {}
  });

  wsA.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'CALL_SIGNAL') {
        const { signalType, senderPeer } = msg.payload;
        if (signalType === 'ANSWER') {
          console.log(`  📩 Peer A received ANSWER from: ${senderPeer}`);
          if (senderPeer === peerB.peerId) {
            answerReceivedByA = true;
            console.log('  ✅ Peer A received legitimate ANSWER from Peer B!');
          } else if (senderPeer.includes('@mesh') || senderPeer.includes('bot')) {
            botInterferenceDetected = true;
            console.error(`  ❌ FAIL: Peer A received bot ANSWER from ${senderPeer}!`);
          }
        } else if (signalType === 'NAFAQ_PCM') {
          if (senderPeer.includes('@mesh') || senderPeer.includes('bot')) {
            botPcmDetected = true;
            console.error(`  ❌ FAIL: Test sound PCM received from bot ${senderPeer}!`);
          }
        }
      }
    } catch(e) {}
  });

  // Peer A calls Peer B
  console.log(`  📞 Peer A (${peerA.peerId}) initiating call to Peer B (${peerB.peerId})...`);
  wsA.send(JSON.stringify({
    type: 'CALL_SIGNAL',
    payload: {
      signalType: 'OFFER',
      targetPeer: peerB.peerId,
      callType: 'video',
      sdp: { type: 'offer', sdp: 'v=0\r\no=peerA 12345 12345 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\nm=audio 50000 UDP/TLS/RTP/SAVPF 111\r\n' }
    }
  }));

  // Wait 3 seconds to observe signaling and verify no bot hijacking occurs
  await new Promise(r => setTimeout(r, 3000));

  wsA.close();
  wsB.close();

  console.log('\n--- Test Results Summary ---');
  console.log(`• Offer received by Callee (B): ${offerReceivedByB ? 'PASSED ✅' : 'FAILED ❌'}`);
  console.log(`• Answer received by Caller (A) from B: ${answerReceivedByA ? 'PASSED ✅' : 'FAILED ❌'}`);
  console.log(`• Bot Call Interception: ${!botInterferenceDetected ? 'ZERO (PASSED) ✅' : 'DETECTED (FAILED) ❌'}`);
  console.log(`• Bot Synthetic Audio Leakage: ${!botPcmDetected ? 'ZERO (PASSED) ✅' : 'DETECTED (FAILED) ❌'}`);

  if (offerReceivedByB && answerReceivedByA && !botInterferenceDetected && !botPcmDetected) {
    console.log('\n🎉 ALL P2P CALL ISOLATION & AUDIO TESTS PASSED WITH ZERO LOSS!');
    process.exit(0);
  } else {
    console.error('\n❌ P2P Call Isolation Test FAILED!');
    process.exit(1);
  }
}

testP2PCallIsolation().catch(err => {
  console.error('Test Execution Error:', err);
  process.exit(1);
});
