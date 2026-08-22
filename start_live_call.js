#!/usr/bin/env node
/**
 * Persistent Video Call Daemon
 * Rings all active peers and stays connected to handle Answer, ICE, and stream session.
 */
const { WebSocket } = require('ws');

const HUBS = [
  'ws://127.0.0.1:5195',
  'ws://10.10.10.10:5195'
];

const STREAM_URL = '/cached_videos/5CSvAZt9TRI.mp4';
const STREAM_TITLE = 'Gimmick — Jünge (Die Ärzte Parodie)';
const YT_URL = 'https://www.youtube.com/watch?v=5CSvAZt9TRI';
const CALLER_ID = 'antigravity@mesh';
const CALLER_PREFIX = 'antigravity';

console.log('===============================================================');
console.log('  📞 WyreSup Persistent Video Call Engine (Live Companion)');
console.log('===============================================================\n');

function connectHub(hubUrl) {
  console.log(`[CallEngine] Connecting to ${hubUrl}...`);
  const ws = new WebSocket(hubUrl);
  let activeCall = false;

  ws.on('open', () => {
    console.log(`[CallEngine] ✓ Connected to ${hubUrl}`);

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
        console.log(`[CallEngine] ${hubUrl} has ${peers.length} active peers.`);

        // Broadcast chat card to general channel
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

        // Ring all active human peers
        peers.forEach(p => {
          if (!p || !p.peerId || p.peerId === CALLER_ID) return;
          console.log(`[CallEngine] 🔔 Dialing peer @${p.peerId} on ${hubUrl}...`);
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

      if (msg.type === 'CALL_SIGNAL') {
        const p = msg.payload || {};
        if (p.signalType === 'ANSWER') {
          activeCall = true;
          console.log(`\n🎉 [CallEngine] User @${p.senderPeer} ACCEPTED the call on ${hubUrl}! Session is ACTIVE.`);
        } else if (p.signalType === 'HANGUP' || p.signalType === 'REJECT') {
          console.log(`[CallEngine] User @${p.senderPeer} hung up on ${hubUrl}.`);
          activeCall = false;
        }
      }
    } catch(e) {}
  });

  ws.on('error', (err) => {
    console.warn(`[CallEngine] Warning on ${hubUrl}:`, err.message);
  });
}

HUBS.forEach(h => connectHub(h));
