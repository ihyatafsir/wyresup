#!/usr/bin/env node
/**
 * WyreSup Video Call Dispatcher - Mos Def (Yasiin Bey) "Umi Says"
 * Broadcasts stream cards and dispatches incoming video call offers to all active peers.
 */

const { WebSocket } = require('ws');

const SERVERS = [
  'ws://127.0.0.1:5195',
  'ws://10.10.10.10:5195'
];

const STREAM_URL = '/cached_videos/vntLKOd9saI.mp4';
const STREAM_TITLE = 'Mos Def (Yasiin Bey) — Umi Says (My Umi Says)';
const YT_URL = 'https://www.youtube.com/watch?v=vntLKOd9saI';

function dispatchToHub(hubUrl) {
  console.log(`[UmiSaysCall] Connecting to ${hubUrl}...`);
  const ws = new WebSocket(hubUrl);

  ws.on('open', () => {
    console.log(`[UmiSaysCall] ✓ Connected to ${hubUrl}`);

    // 1. Identify as Mos Def / Yasiin Bey stream bot
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

    setTimeout(() => {
      // 2. Broadcast the interactive /vcwyvl launch card to #chan-general
      const card = {
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
          content: `/vcwyvl ${YT_URL}\n\n✨ **Mos Def (Yasiin Bey) — Umi Says (My Umi Says)**\n*"My Umi says, shine your light on the world... Shine your light for the world to see."*\n\n▶️ Tap **Launch Call** below to start your video stream call!`,
          senderId: 'yasiin_bey@mesh',
          timestamp: Date.now()
        }
      };

      ws.send(JSON.stringify({
        type: 'GOSSIP_PACKET',
        payload: card
      }));
      console.log(`[UmiSaysCall] ✓ Broadcasted Umi Says stream card to #chan-general on ${hubUrl}`);

      // 3. Request Peer List to find targets for incoming call ring
      ws.send(JSON.stringify({ type: 'GET_ALL_PEERS' }));
    }, 600);
  });

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'ALL_PEERS' || msg.type === 'PEER_PRESENCE') {
        const peers = Array.isArray(msg.payload) ? msg.payload : [msg.payload];
        const targets = peers.filter(p => p && p.peerId && p.peerId !== 'yasiin_bey@mesh');

        console.log(`[UmiSaysCall] Discovered ${targets.length} target peers on ${hubUrl}`);
        targets.forEach(p => {
          console.log(`[UmiSaysCall] 📞 Ringing ${p.peerId} with Mos Def "Umi Says" video call...`);
          const callOffer = {
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
          };
          ws.send(JSON.stringify(callOffer));
        });
      }
    } catch(e) {}
  });

  ws.on('error', (err) => {
    console.error(`[UmiSaysCall] Error on ${hubUrl}:`, err.message);
  });
}

SERVERS.forEach(url => dispatchToHub(url));

setTimeout(() => {
  console.log('[UmiSaysCall] Video call dispatched across all mesh nodes.');
  process.exit(0);
}, 3000);
