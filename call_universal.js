#!/usr/bin/env node
/**
 * Universal Video Call Dispatcher - Dials all active user identities across all nodes
 */
const { WebSocket } = require('ws');

const HUBS = [
  'ws://127.0.0.1:5195',
  'ws://10.10.10.10:5195'
];

const STREAM_URL = '/cached_videos/5CSvAZt9TRI.mp4';
const STREAM_TITLE = 'Gimmick — Jünge (Die Ärzte Parodie)';
const YT_URL = 'https://www.youtube.com/watch?v=5CSvAZt9TRI';
const CALLER_ID = 'caller_companion@mesh';
const CALLER_PREFIX = 'caller';

function dispatchToHub(hubUrl) {
  console.log(`[UniversalCall] Connecting to ${hubUrl}...`);
  const ws = new WebSocket(hubUrl);

  ws.on('open', () => {
    console.log(`[UniversalCall] ✓ Connected to ${hubUrl}`);

    ws.send(JSON.stringify({
      type: 'IDENTIFY',
      payload: {
        peerId: CALLER_ID,
        prefix: CALLER_PREFIX,
        shortHash: 'mesh',
        spaceId: 'space-public-mesh',
        channelId: 'chan-general'
      }
    }));
  });

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'IDENTIFIED') {
        const peers = msg.payload.peers || [];
        console.log(`[UniversalCall] Hub ${hubUrl} reported ${peers.length} peers.`);

        // 1. Broadcast chat card
        const card = {
          zahir: {
            spaceId: 'space-public-mesh',
            channelId: 'chan-general',
            senderId: CALLER_ID,
            senderPrefix: CALLER_PREFIX,
            messageId: 'msg_call_' + Date.now(),
            timestamp: Date.now(),
            isEncrypted: false,
            ttl: 5
          },
          batin: {
            content: `/vcwyvl ${YT_URL}\n\n🎸 **Gimmick — Jünge (Die Ärzte German Parody)**\n*„Jünge, warum hast du nichts gelernt? Guck dir den Dieter an, der hat sogar ein Auto!“*\n\n▶️ Tap **Launch Call** below to start the video stream call!`,
            senderId: CALLER_ID,
            timestamp: Date.now()
          }
        };
        ws.send(JSON.stringify({ type: 'GOSSIP_PACKET', payload: card }));

        // 2. Ring every single peer on this hub
        peers.forEach(p => {
          if (!p || !p.peerId || p.peerId === CALLER_ID) return;
          console.log(`[UniversalCall] 🔔 Ringing peer @${p.peerId} on ${hubUrl}...`);
          ws.send(JSON.stringify({
            type: 'CALL_SIGNAL',
            payload: {
              targetPeer: p.peerId,
              senderPeer: CALLER_ID,
              senderPrefix: CALLER_PREFIX,
              signalType: 'OFFER',
              callType: 'video',
              streamUrl: STREAM_URL,
              streamTitle: STREAM_TITLE,
              sdp: { type: 'offer', sdp: 'v=0\r\no=- 123456 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n' }
            }
          }));
        });
      }
    } catch (e) {
      console.warn('[UniversalCall Parse Error]:', e.message);
    }
  });

  ws.on('error', (err) => {
    console.error(`[UniversalCall] Error on ${hubUrl}:`, err.message);
  });
}

HUBS.forEach(h => dispatchToHub(h));

setTimeout(() => {
  console.log('[UniversalCall] Dispatched successfully across all active peers.');
  process.exit(0);
}, 4000);
