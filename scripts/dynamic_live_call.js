#!/usr/bin/env node
/**
 * Dynamic Sovereign Caller Engine
 * Discovers live peers, rings them smoothly, and terminates all dialing upon answer.
 */
const { WebSocket } = require('ws');
const http = require('http');

const HUBS = [
  'ws://127.0.0.1:5195',
  'ws://10.10.10.10:5195'
];

const STREAM_URL = '/cached_videos/5CSvAZt9TRI.mp4';
const STREAM_TITLE = 'Gimmick — Jünge (Die Ärzte Parodie)';
const CALLER_ID = 'sovereign_caller@mesh';
const CALLER_PREFIX = 'sovereign_caller';

let isCallConnected = false;
const hubSessions = [];

function setupHub(hubUrl) {
  const ws = new WebSocket(hubUrl);
  const session = { ws, hubUrl, interval: null };
  hubSessions.push(session);

  ws.on('open', () => {
    console.log(`[Caller] Connected to ${hubUrl}`);
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

    // Single-shot dialing with controlled refresh
    session.interval = setInterval(() => {
      if (isCallConnected || ws.readyState !== WebSocket.OPEN) {
        clearInterval(session.interval);
        return;
      }

      const httpUrl = hubUrl.replace('ws://', 'http://') + '/api/diagnostics';
      http.get(httpUrl, res => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => {
          try {
            const data = JSON.parse(raw);
            const targets = (data.allPeers || []).filter(p =>
              p && p.status === 'hadir' &&
              p.peerId !== CALLER_ID &&
              !p.peerId.startsWith('yasiin') &&
              !p.peerId.startsWith('sovereign_caller') && p.peerId !== 'antigravity@mesh' && p.peerId !== 'caller_companion@mesh' && p.peerId !== 'umi_says@mesh'
            );

            targets.forEach(t => {
              if (isCallConnected) return;
              console.log(`[Caller] 🔔 Ringing @${t.peerId} on ${hubUrl}...`);
              ws.send(JSON.stringify({
                type: 'CALL_SIGNAL',
                payload: {
                  targetPeer: t.peerId,
                  senderPeer: CALLER_ID,
                  senderPrefix: 'Antigravity AI',
                  signalType: 'OFFER',
                  callType: 'video',
                  streamUrl: STREAM_URL,
                  streamTitle: STREAM_TITLE,
                  sdp: { type: 'offer', sdp: 'v=0\r\no=- 123456 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n' }
                }
              }));
            });
          } catch(e){}
        });
      }).on('error', () => {});
    }, 4000);
  });

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'CALL_SIGNAL') {
        const p = msg.payload || {};
        if (p.signalType === 'ANSWER' && p.senderPeer !== 'antigravity@mesh' && p.senderPeer !== 'umi_says@mesh') {
          isCallConnected = true;
          hubSessions.forEach(s => {
            if (s.interval) clearInterval(s.interval);
          });
          console.log(`\n🎉 [Caller] Call accepted by @${p.senderPeer}! All dialing loops halted.`);
        } else if (p.signalType === 'HANGUP' || p.signalType === 'REJECT') {
          console.log(`[Caller] Call ended by @${p.senderPeer}.`);
          isCallConnected = false;
        }
      }
    } catch(e){}
  });

  ws.on('error', err => console.warn(`[Caller Warning on ${hubUrl}]:`, err.message));
}

HUBS.forEach(h => setupHub(h));
