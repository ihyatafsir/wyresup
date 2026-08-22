#!/usr/bin/env node
/**
 * Dispatch Video Call - Gimmick: Jünge (Die Ärzte Parodie)
 */

const { WebSocket } = require('ws');

const SERVERS = [
  'ws://10.10.10.10:5195',
  'ws://127.0.0.1:5195'
];

const STREAM_URL = '/cached_videos/5CSvAZt9TRI.mp4';
const STREAM_TITLE = 'Gimmick — Jünge (Die Ärzte Parodie)';
const YT_URL = 'https://www.youtube.com/watch?v=5CSvAZt9TRI';

function dispatchCall(hubUrl) {
  console.log(`[JüngeCall] Connecting to ${hubUrl}...`);
  const ws = new WebSocket(hubUrl);

  ws.on('open', () => {
    console.log(`[JüngeCall] ✓ Connected to ${hubUrl}`);

    ws.send(JSON.stringify({
      type: 'IDENTIFY',
      payload: {
        peerId: 'antigravity@mesh',
        prefix: 'antigravity',
        shortHash: 'mesh',
        spaceId: 'space-public-mesh',
        channelId: 'chan-general'
      }
    }));

    setTimeout(() => {
      // 1. Broadcast interactive stream card to #chan-general
      const card = {
        zahir: {
          spaceId: 'space-public-mesh',
          channelId: 'chan-general',
          senderId: 'antigravity@mesh',
          senderPrefix: 'antigravity',
          messageId: 'msg_junge_' + Date.now(),
          timestamp: Date.now(),
          isEncrypted: false,
          ttl: 5
        },
        batin: {
          content: `/vcwyvl ${YT_URL}\n\n🎸 **Gimmick — Jünge (Die Ärzte German Parody)**\n*„Jünge, warum hast du nichts gelernt? Guck dir den Dieter an, der hat sogar ein Auto!“*\n\n▶️ Tap **Launch Call** below to start the video stream call!`,
          senderId: 'antigravity@mesh',
          timestamp: Date.now()
        }
      };

      ws.send(JSON.stringify({
        type: 'GOSSIP_PACKET',
        payload: card
      }));
      console.log(`[JüngeCall] ✓ Broadcasted stream card to #chan-general on ${hubUrl}`);

      // 2. Dispatch Incoming Video Call Ring to active peers (enver and all prefixes)
      const targets = ['enver@d68723c4', 'enver', 'peer', 'absolut7'];
      targets.forEach(t => {
        const callOffer = {
          type: 'CALL_SIGNAL',
          payload: {
            targetPeer: t,
            senderPeer: 'antigravity@mesh',
            senderPrefix: 'antigravity',
            signalType: 'OFFER',
            callType: 'video',
            streamUrl: STREAM_URL,
            streamTitle: STREAM_TITLE,
            sdp: { type: 'offer', sdp: 'v=0\r\no=- 123456 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n' }
          }
        };
        ws.send(JSON.stringify(callOffer));
      });
      console.log(`[JüngeCall] ✓ Dispatched incoming video call ring with Jünge stream on ${hubUrl}`);

      setTimeout(() => {
        ws.close();
      }, 1500);
    }, 500);
  });

  ws.on('error', (err) => {
    console.error(`[JüngeCall] Error on ${hubUrl}:`, err.message);
  });
}

SERVERS.forEach(url => dispatchCall(url));

setTimeout(() => {
  console.log('[JüngeCall] Video call dispatched across all nodes.');
  process.exit(0);
}, 3000);
