/**
 * WyreSup Autonomous Video Call Stream Bot
 * Peer: yasiin_bey@mesh (Mos Def / Yasiin Bey)
 * Streams: Mos Def - Umi Says (vntLKOd9saI.mp4)
 */

const { WebSocket } = require('ws');
const HUB_URL = process.env.HUB_URL || 'ws://127.0.0.1:5195';

const STREAM_URL = '/cached_videos/vntLKOd9saI.mp4';
const STREAM_TITLE = 'Mos Def (Yasiin Bey) — Umi Says (My Umi Says)';
const YT_URL = 'https://www.youtube.com/watch?v=vntLKOd9saI';

function startBot() {
  console.log(`[UmiSaysBot] Connecting to ${HUB_URL}...`);
  const ws = new WebSocket(HUB_URL);

  ws.on('open', () => {
    console.log('[UmiSaysBot] ✓ Connected to WyreSup Mesh!');
    ws.send(JSON.stringify({
      type: 'IDENTIFY',
      payload: {
        peerId: 'yasiin_bey@mesh',
        prefix: 'yasiin',
        shortHash: 'bey',
        spaceId: 'space-public-mesh',
        channelId: 'chan-general'
      }
    }));

    // Periodically post stream card
    const broadcastCard = () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'GOSSIP_PACKET',
          payload: {
            zahir: {
              spaceId: 'space-public-mesh',
              channelId: 'chan-general',
              senderId: 'yasiin_bey@mesh',
              senderPrefix: 'yasiin',
              messageId: 'msg_umi_' + Date.now(),
              timestamp: Date.now(),
              isEncrypted: false,
              ttl: 5
            },
            batin: {
              content: `/vcwyvl ${YT_URL}\n\n✨ **Mos Def (Yasiin Bey) — Umi Says (My Umi Says)**\n*"My Umi says, shine your light on the world... Shine your light for the world to see."*\n\n▶️ Tap **Launch Call** below to start the video stream call!`,
              senderId: 'yasiin_bey@mesh',
              timestamp: Date.now()
            }
          }
        }));
      }
    };

    broadcastCard();
    setInterval(broadcastCard, 60000);
  });

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());

      // Auto-answer any call signal
      if (msg.type === 'CALL_SIGNAL') {
        const signal = msg.payload;
        if (signal.targetPeer === 'yasiin_bey@mesh' || signal.targetPeer === 'yasiin') {
          if (signal.signalType === 'OFFER') {
            console.log(`[UmiSaysBot] Answering incoming call offer from ${signal.senderPeer}...`);
            ws.send(JSON.stringify({
              type: 'CALL_SIGNAL',
              payload: {
                targetPeer: signal.senderPeer,
                senderPeer: 'yasiin_bey@mesh',
                senderPrefix: 'yasiin',
                signalType: 'ANSWER',
                callType: 'video',
                streamUrl: STREAM_URL,
                streamTitle: STREAM_TITLE,
                sdp: { type: 'answer', sdp: 'v=0\r\no=- 123456 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n' }
              }
            }));
          }
        }
      }

      // If user announces presence, ring them
      if (msg.type === 'PEER_PRESENCE') {
        const p = msg.payload;
        if (p && p.peerId && p.peerId !== 'yasiin_bey@mesh' && p.status === 'hadir') {
          console.log(`[UmiSaysBot] Detected active peer ${p.peerId}. Ringing...`);
          ws.send(JSON.stringify({
            type: 'CALL_SIGNAL',
            payload: {
              targetPeer: p.peerId,
              senderPeer: 'yasiin_bey@mesh',
              senderPrefix: 'yasiin',
              signalType: 'OFFER',
              callType: 'video',
              streamUrl: STREAM_URL,
              streamTitle: STREAM_TITLE,
              sdp: { type: 'offer', sdp: 'v=0\r\no=- 123456 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n' }
            }
          }));
        }
      }
    } catch(e) {}
  });

  ws.on('close', () => {
    console.log('[UmiSaysBot] Disconnected. Reconnecting in 3s...');
    setTimeout(startBot, 3000);
  });

  ws.on('error', (err) => {
    console.error('[UmiSaysBot] WS Error:', err.message);
  });
}

startBot();
