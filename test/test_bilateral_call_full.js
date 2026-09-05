const { WebSocket } = require('ws');

const HUB_URL = 'ws://127.0.0.1:5195';

async function testBilateralCallFull() {
  console.log('🧪 [Test 2] Testing Bilateral Call Signaling & Full Session Lifecycle...');

  const wsA = new WebSocket(HUB_URL);
  const wsB = new WebSocket(HUB_URL);

  const peerA = { peerId: 'user_alpha@node1', prefix: 'user_alpha' };
  const peerB = { peerId: 'user_beta@node2', prefix: 'user_beta' };

  let iceCandidatesAtoB = 0;
  let iceCandidatesBtoA = 0;
  let hangupReceived = false;

  await Promise.all([
    new Promise(r => wsA.on('open', r)),
    new Promise(r => wsB.on('open', r))
  ]);

  wsA.send(JSON.stringify({ type: 'IDENTIFY', payload: peerA }));
  wsB.send(JSON.stringify({ type: 'IDENTIFY', payload: peerB }));

  await new Promise(r => setTimeout(r, 500));

  wsB.on('message', data => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'CALL_SIGNAL') {
        const { signalType, candidate } = msg.payload;
        if (signalType === 'OFFER') {
          // Send answer
          wsB.send(JSON.stringify({
            type: 'CALL_SIGNAL',
            payload: {
              signalType: 'ANSWER',
              targetPeer: peerA.peerId,
              sdp: { type: 'answer', sdp: 'v=0\r\no=b 1 1 IN IP4 127.0.0.1\r\ns=-\r\n' }
            }
          }));
          // Send 2 ICE candidates
          wsB.send(JSON.stringify({
            type: 'CALL_SIGNAL',
            payload: { signalType: 'ICE', targetPeer: peerA.peerId, candidate: { candidate: 'cand_b_1', sdpMid: '0' } }
          }));
          wsB.send(JSON.stringify({
            type: 'CALL_SIGNAL',
            payload: { signalType: 'ICE', targetPeer: peerA.peerId, candidate: { candidate: 'cand_b_2', sdpMid: '1' } }
          }));
        } else if (signalType === 'ICE') {
          iceCandidatesAtoB++;
        } else if (signalType === 'HANGUP') {
          hangupReceived = true;
        }
      }
    } catch (e) {}
  });

  wsA.on('message', data => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'CALL_SIGNAL') {
        const { signalType } = msg.payload;
        if (signalType === 'ANSWER') {
          // Send 2 ICE candidates
          wsA.send(JSON.stringify({
            type: 'CALL_SIGNAL',
            payload: { signalType: 'ICE', targetPeer: peerB.peerId, candidate: { candidate: 'cand_a_1', sdpMid: '0' } }
          }));
          wsA.send(JSON.stringify({
            type: 'CALL_SIGNAL',
            payload: { signalType: 'ICE', targetPeer: peerB.peerId, candidate: { candidate: 'cand_a_2', sdpMid: '1' } }
          }));
        } else if (signalType === 'ICE') {
          iceCandidatesBtoA++;
        }
      }
    } catch (e) {}
  });

  // Start call
  wsA.send(JSON.stringify({
    type: 'CALL_SIGNAL',
    payload: {
      signalType: 'OFFER',
      targetPeer: peerB.peerId,
      callType: 'video',
      sdp: { type: 'offer', sdp: 'v=0\r\no=a 1 1 IN IP4 127.0.0.1\r\ns=-\r\n' }
    }
  }));

  await new Promise(r => setTimeout(r, 1200));

  // Hangup from A
  wsA.send(JSON.stringify({
    type: 'CALL_SIGNAL',
    payload: { signalType: 'HANGUP', targetPeer: peerB.peerId }
  }));

  await new Promise(r => setTimeout(r, 600));

  wsA.close();
  wsB.close();

  console.log(`• ICE Candidates Sent A -> B: ${iceCandidatesAtoB} (Expected 2)`);
  console.log(`• ICE Candidates Sent B -> A: ${iceCandidatesBtoA} (Expected 2)`);
  console.log(`• Hangup Received by B: ${hangupReceived ? 'PASSED ✅' : 'FAILED ❌'}`);

  if (iceCandidatesAtoB === 2 && iceCandidatesBtoA === 2 && hangupReceived) {
    console.log('🎉 BILATERAL P2P CALL LIFECYCLE TEST PASSED!\n');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

testBilateralCallFull().catch(err => {
  console.error(err);
  process.exit(1);
});
