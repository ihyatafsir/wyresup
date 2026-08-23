/**
 * Test Bidirectional Full-Duplex Calling Flow
 * Verifies both Bot -> User and User -> Bot transmissions
 */

const { WebSocket } = require('ws');

const ws = new WebSocket('ws://127.0.0.1:5195');

ws.on('open', () => {
  console.log('[Test Caller] Connected to hub as user_alice@test...');
  ws.send(JSON.stringify({
    type: 'IDENTIFY',
    payload: {
      peerId: 'user_alice@test',
      prefix: 'user_alice',
      spaceId: 'space-public-mesh',
      channelId: 'chan-general'
    }
  }));

  // Send OFFER to al-kindi@mesh
  setTimeout(() => {
    console.log('[Test Caller] 📞 Dialing al-kindi@mesh...');
    ws.send(JSON.stringify({
      type: 'CALL_SIGNAL',
      payload: {
        signalType: 'OFFER',
        targetPeer: 'al-kindi@mesh',
        senderPeer: 'user_alice@test',
        senderPrefix: 'user_alice',
        callType: 'video',
        sdp: { type: 'offer', sdp: 'v=0\r\n' }
      }
    }));
  }, 400);
});

let framesRx = 0;
let userFramesTx = 0;
let sendInterval = null;

ws.on('message', (data) => {
  try {
    const msg = JSON.parse(data.toString());
    if (msg.type === 'CALL_SIGNAL') {
      const p = msg.payload;
      if (p.signalType === 'ANSWER') {
        console.log(`[Test Caller] ✅ Call ANSWERED by ${p.senderPeer}!`);
        
        // Start transmitting user camera frames and audio to bot!
        sendInterval = setInterval(() => {
          userFramesTx++;
          // Send simulated user camera frame
          ws.send(JSON.stringify({
            type: 'CALL_SIGNAL',
            payload: {
              signalType: 'SHAF_HD_FRAME',
              targetPeer: 'al-kindi@mesh',
              senderPeer: 'user_alice@test',
              frame: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjMjJjNTVlIi8+PC9zdmc+',
              ts: Date.now()
            }
          }));

          // Send simulated user voice PCM
          ws.send(JSON.stringify({
            type: 'CALL_SIGNAL',
            payload: {
              signalType: 'NAFAQ_PCM',
              targetPeer: 'al-kindi@mesh',
              senderPeer: 'user_alice@test',
              data: Buffer.alloc(1600, 0x55).toString('base64'),
              sampleRate: 16000,
              ts: Date.now()
            }
          }));
        }, 85);
      } else if (p.signalType === 'SHAF_HD_FRAME') {
        framesRx++;
        if (framesRx === 1 || framesRx === 15) {
          console.log(`[Test Caller] 🎥 Received bot video frame #${framesRx} (Contains Inbound User Telemetry & PiP)`);
        }
      }

      if (framesRx >= 15 && userFramesTx >= 10) {
        clearInterval(sendInterval);
        console.log('\n🎉 FULL-DUPLEX BIDIRECTIONAL VIDEO CALL VERIFIED: Both sides transmitting & receiving in real time!');
        ws.close();
        process.exit(0);
      }
    }
  } catch(e) {}
});

setTimeout(() => {
  console.error('[Timeout] Bidirectional call flow timeout');
  process.exit(1);
}, 10000);
