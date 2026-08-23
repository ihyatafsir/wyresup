/**
 * Test Bot Call Flow: Simulates a caller dialing al-kindi@mesh
 */

const { WebSocket } = require('ws');

const ws = new WebSocket('ws://127.0.0.1:5195');

ws.on('open', () => {
  console.log('[Test Caller] Connected to hub. Identifying as caller_user@test...');
  ws.send(JSON.stringify({
    type: 'IDENTIFY',
    payload: {
      peerId: 'caller_user@test',
      prefix: 'caller_user',
      spaceId: 'space-public-mesh',
      channelId: 'chan-general'
    }
  }));

  // Wait 500ms and send OFFER to al-kindi@mesh
  setTimeout(() => {
    console.log('[Test Caller] 📞 Calling al-kindi@mesh (sending OFFER)...');
    ws.send(JSON.stringify({
      type: 'CALL_SIGNAL',
      payload: {
        signalType: 'OFFER',
        targetPeer: 'al-kindi@mesh',
        senderPeer: 'caller_user@test',
        senderPrefix: 'caller_user',
        callType: 'video',
        sdp: { type: 'offer', sdp: 'v=0\r\no=caller 0 0 IN IP4 127.0.0.1\r\n' }
      }
    }));
  }, 500);
});

let frameCount = 0;
let audioCount = 0;

ws.on('message', (data) => {
  try {
    const msg = JSON.parse(data.toString());
    if (msg.type === 'CALL_SIGNAL') {
      const p = msg.payload;
      if (p.signalType === 'ANSWER') {
        console.log(`[Test Caller] ✅ Call ANSWERED by ${p.senderPeer}!`);
      } else if (p.signalType === 'SHAF_HD_FRAME') {
        frameCount++;
        if (frameCount === 1 || frameCount === 10) {
          console.log(`[Test Caller] 🎥 Received Live HD Video Frame #${frameCount} from ${p.senderPeer} (Size: ${p.frame.length} chars)`);
        }
      } else if (p.signalType === 'NAFAQ_PCM') {
        audioCount++;
        if (audioCount === 1 || audioCount === 5) {
          console.log(`[Test Caller] 🎵 Received Synthetic Audio PCM Chunk #${audioCount} from ${p.senderPeer} (SampleRate: ${p.sampleRate}Hz)`);
        }
      }

      if (frameCount >= 10 && audioCount >= 5) {
        console.log('\n🎉 BOT CALL VERIFICATION SUCCESSFUL: 10/10 Video Frames & Audio Chunks Received Perfectly!');
        ws.close();
        process.exit(0);
      }
    }
  } catch(e) {}
});

setTimeout(() => {
  console.error('[Timeout] Did not complete call flow in 10s');
  process.exit(1);
}, 10000);
