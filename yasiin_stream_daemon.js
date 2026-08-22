/**
 * WyreSup Yasiin Bey (Mos Def) Stream Daemon
 * Continuously offers the Umi Says stream and auto-answers call requests.
 */

const { WebSocket } = require('ws');

const HUB_URL = process.env.HUB_URL || 'ws://10.10.10.10:5195';
const STREAM_URL = '/cached_videos/vntLKOd9saI.mp4';
const STREAM_TITLE = 'Mos Def (Yasiin Bey) — Umi Says';
const YT_URL = 'https://www.youtube.com/watch?v=vntLKOd9saI';

function startDaemon() {
  console.log(`[YasiinDaemon] Connecting to ${HUB_URL}...`);
  const ws = new WebSocket(HUB_URL);

  ws.on('open', () => {
    console.log(`[YasiinDaemon] ✓ Connected to ${HUB_URL}`);

    ws.send(JSON.stringify({
      type: 'IDENTIFY',
      payload: {
        peerId: 'yasiin_bey@mesh',
        prefix: 'yasiin_bey',
        shortHash: 'mesh',
        status: 'hadir',
        spaceId: 'space-public-mesh',
        channelId: 'chan-general'
      }
    }));

    // Broadcast stream card
    const card = {
      zahir: {
        spaceId: 'space-public-mesh',
        channelId: 'chan-general',
        senderId: 'yasiin_bey@mesh',
        senderPrefix: 'yasiin_bey',
        messageId: 'msg_umi_' + Date.now(),
        timestamp: Date.now(),
        isEncrypted: false,
        ttl: 5
      },
      batin: {
        content: `/vcwyvl ${YT_URL}\n\n🎵 **Yasiin Bey (Mos Def) — Umi Says (Official HD Video)**\n*„My Umi said shine your light on the world... Shine your light for the world to see.“*\n\n▶️ Tap **Launch Call** to start the video stream!`,
        senderId: 'yasiin_bey@mesh',
        timestamp: Date.now()
      }
    };
    ws.send(JSON.stringify({ type: 'GOSSIP_PACKET', payload: card }));

    // Send Call Ring to all active users
    const sendRing = () => {
      const targets = ['enver@d68723c4', 'enver', 'peer', 'absolut7', 'antigravity@24b31d5b'];
      targets.forEach(t => {
        ws.send(JSON.stringify({
          type: 'CALL_SIGNAL',
          payload: {
            targetPeer: t,
            senderPeer: 'yasiin_bey@mesh',
            senderPrefix: 'yasiin_bey',
            signalType: 'OFFER',
            callType: 'video',
            streamUrl: STREAM_URL,
            streamTitle: STREAM_TITLE,
            sdp: { type: 'offer', sdp: 'v=0\r\no=- 123456 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n' }
          }
        }));
      });
      console.log(`[YasiinDaemon] Dispatched video call ring for Umi Says to peers.`);
    };

    sendRing();

    // Heartbeat presence ping
    setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'PRESENCE_PING',
          payload: { status: 'hadir', channelId: 'chan-general' }
        }));
      }
    }, 15000);
  });

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'CALL_SIGNAL') {
        const { signalType, senderPeer, senderPrefix, targetPeer } = msg.payload || {};
        if (targetPeer === 'yasiin_bey@mesh' || targetPeer === 'yasiin_bey') {
          if (signalType === 'OFFER') {
            console.log(`[YasiinDaemon] Received call OFFER from @${senderPrefix || senderPeer}. Answering with Umi Says stream...`);
            ws.send(JSON.stringify({
              type: 'CALL_SIGNAL',
              payload: {
                targetPeer: senderPeer,
                senderPeer: 'yasiin_bey@mesh',
                senderPrefix: 'yasiin_bey',
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
    } catch(e) {}
  });

  ws.on('close', () => {
    console.log('[YasiinDaemon] Disconnected. Reconnecting in 3s...');
    setTimeout(startDaemon, 3000);
  });

  ws.on('error', (err) => {
    console.error('[YasiinDaemon] WS Error:', err.message);
  });
}

startDaemon();
