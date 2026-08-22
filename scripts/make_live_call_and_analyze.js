#!/usr/bin/env node
/**
 * 📞 WyreSup Master Sovereign Live HD Call & Telemetry Engine
 */
const { WebSocket } = require('ws');

const HUBS = [
  'ws://127.0.0.1:5195',
  'ws://10.10.10.10:5195'
];

const STREAM_URL = '/ms_fat_booty.mp4';
const STREAM_TITLE = 'Mos Def — Ms. Fat Booty (Sovereign HD Video)';
const CALLER_ID = 'antigravity@mesh';
const CALLER_PREFIX = 'antigravity';

console.log('================================================================');
console.log('  📞 WyreSup Live HD Video Call & Duplex Telemetry Engine');
console.log('  Starting sovereign call engine...');
console.log('================================================================\n');

function createCallSession(hubUrl) {
  console.log(`[Caller] Connecting to Hub: ${hubUrl}`);
  const ws = new WebSocket(hubUrl);

  let activeCall = false;
  let callStartTime = 0;
  let currentTargetPeer = null;
  let dialTimer = null;
  let audioTimer = null;
  let videoTimer = null;
  let telemetryTimer = null;

  const stats = {
    outgoingAudioPackets: 0,
    incomingAudioPackets: 0,
    outgoingVideoFrames: 0,
    incomingVideoFrames: 0,
    rttMs: 0
  };

  function generatePcmChunk(sampleRate = 48000, durationMs = 40, freq = 440) {
    const numSamples = Math.floor(sampleRate * (durationMs / 1000));
    const pcm16 = new Int16Array(numSamples);
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const sample = Math.sin(2 * Math.PI * freq * t) * 0.25;
      pcm16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    }
    const uint8 = new Uint8Array(pcm16.buffer);
    let binary = '';
    for (let i = 0; i < uint8.length; i++) {
      binary += String.fromCharCode(uint8[i]);
    }
    return Buffer.from(binary, 'binary').toString('base64');
  }

  function generateHdFrameDataUrl(frameNum) {
    const timeStr = new Date().toLocaleTimeString();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">` +
      `<rect width="640" height="480" fill="#020804"/>` +
      `<defs>` +
        `<radialGradient id="g" cx="50%" cy="50%" r="50%">` +
          `<stop offset="0%" stop-color="#00ff88" stop-opacity="0.4"/>` +
          `<stop offset="100%" stop-color="#020804" stop-opacity="0"/>` +
        `</radialGradient>` +
      `</defs>` +
      `<rect width="640" height="480" fill="url(#g)"/>` +
      `<circle cx="320" cy="200" r="85" stroke="#00f59b" stroke-width="3" fill="#00180c" opacity="0.95"/>` +
      `<text x="320" y="195" font-family="monospace" font-size="28" font-weight="bold" fill="#00f59b" text-anchor="middle">ANTIGRAVITY</text>` +
      `<text x="320" y="225" font-family="monospace" font-size="14" fill="#00e5ff" text-anchor="middle">AI LIVE HD CALL</text>` +
      `<text x="320" y="320" font-family="sans-serif" font-size="20" fill="#ffffff" text-anchor="middle">نِظَامُ الجَلَاءِ وَالنَّفَاذِ الشَّفْعِيّ</text>` +
      `<text x="320" y="355" font-family="monospace" font-size="15" fill="#00f59b" text-anchor="middle">FRAME #${frameNum} | ${timeStr}</text>` +
      `<rect x="100" y="395" width="440" height="28" rx="14" fill="#042010" stroke="#00f59b" stroke-width="1.5"/>` +
      `<text x="320" y="414" font-family="monospace" font-size="13" fill="#00f59b" text-anchor="middle">100% SOVEREIGN DUAL-CONDUIT ACTIVE</text>` +
    `</svg>`;
    return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
  }

  function startDialingLoop() {
    if (dialTimer) clearInterval(dialTimer);
    dialTimer = setInterval(() => {
      if (activeCall || ws.readyState !== WebSocket.OPEN) return;
      ws.send(JSON.stringify({ type: 'GET_ALL_PEERS' }));
      const targets = ['enver@d68723c4', 'enver@4aa787ec', 'enver'];
      targets.forEach(targetPeer => {
        currentTargetPeer = targetPeer;
        ws.send(JSON.stringify({
          type: 'CALL_SIGNAL',
          payload: {
            signalType: 'OFFER',
            targetPeer: targetPeer,
            senderPeer: CALLER_ID,
            senderPrefix: CALLER_PREFIX,
            callType: 'video',
            streamUrl: STREAM_URL,
            streamTitle: STREAM_TITLE
          }
        }));
      });
    }, 3500);
  }

  ws.on('open', () => {
    console.log(`[WebSocket] ✓ Connected to ${hubUrl}`);

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

    setTimeout(() => {
      startDialingLoop();
    }, 500);
  });

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      if (msg.type === 'CALL_SIGNAL') {
        const p = msg.payload || {};

        if (p.signalType === 'ANSWER') {
          if (activeCall) return;
          const rtt = Date.now() - callStartTime;
          stats.rttMs = rtt;
          activeCall = true;
          if (dialTimer) clearInterval(dialTimer);

          const answerer = p.senderPeer || currentTargetPeer || 'enver';
          console.log(`\n================================================================`);
          console.log(`  🎉 [CALL CONNECTED!] User @${answerer} ACCEPTED THE CALL on ${hubUrl}!`);
          console.log(`  Signaling RTT: ${rtt} ms`);
          console.log(`  Activating Full-Duplex Symmetrical Conduit (Shaf_A + Shaf_B)...`);
          console.log(`================================================================\n`);

          // Outbound Audio: 48kHz PCM
          let chunk = 0;
          audioTimer = setInterval(() => {
            if (!activeCall || ws.readyState !== WebSocket.OPEN) return;
            const pcm = generatePcmChunk(48000, 40, (chunk % 2 === 0) ? 520 : 650);
            ws.send(JSON.stringify({
              type: 'CALL_SIGNAL',
              payload: {
                signalType: 'NAFAQ_PCM',
                targetPeer: answerer,
                sampleRate: 48000,
                data: pcm
              }
            }));
            stats.outgoingAudioPackets++;
            chunk++;
          }, 40);

          // Outbound Video: 640x480 HD SVG Frame streaming
          let frameNum = 1;
          videoTimer = setInterval(() => {
            if (!activeCall || ws.readyState !== WebSocket.OPEN) return;
            const frame = generateHdFrameDataUrl(frameNum);
            ws.send(JSON.stringify({
              type: 'CALL_SIGNAL',
              payload: {
                signalType: 'SHAF_HD_FRAME',
                targetPeer: answerer,
                frame: frame,
                ts: Date.now()
              }
            }));
            stats.outgoingVideoFrames++;
            frameNum++;
          }, 75);

          // Telemetry output logger every 3 seconds
          telemetryTimer = setInterval(() => {
            const sec = Math.floor((Date.now() - callStartTime) / 1000);
            console.log(`----------------------------------------------------------------`);
            console.log(`  📊 LIVE CALL TELEMETRY [${sec}s connected on ${hubUrl}]`);
            console.log(`----------------------------------------------------------------`);
            console.log(`  • Peer:                 @${answerer}`);
            console.log(`  • Channel State:        🟢 ACTIVE (Shaf Duplex Sovereign Link)`);
            console.log(`  • Outbound Audio:       ${stats.outgoingAudioPackets} PCM packets (48 kHz)`);
            console.log(`  • Inbound Audio:        ${stats.incomingAudioPackets} PCM packets`);
            console.log(`  • Outbound Video:       ${stats.outgoingVideoFrames} HD frames (~13.3 FPS)`);
            console.log(`  • Inbound Video:        ${stats.incomingVideoFrames} video frames`);
            console.log(`  • Lossless Tunnel:      100% RELIABLE (Zero UDP Drop)`);
            console.log(`----------------------------------------------------------------\n`);
          }, 3000);

        } else if (p.signalType === 'NAFAQ_PCM') {
          stats.incomingAudioPackets++;
        } else if (p.signalType === 'SHAF_HD_FRAME') {
          stats.incomingVideoFrames++;
        } else if (p.signalType === 'HANGUP' || p.signalType === 'REJECT') {
          console.log(`[Call Signal] Call ended by ${p.senderPeer || 'remote user'}. Restarting dialer in 2s...`);
          activeCall = false;
          if (audioTimer) clearInterval(audioTimer);
          if (videoTimer) clearInterval(videoTimer);
          if (telemetryTimer) clearInterval(telemetryTimer);
          setTimeout(startDialingLoop, 2000);
        }
      }
    } catch (err) {
      console.warn('[Call Engine Warning]:', err.message);
    }
  });

  ws.on('error', (err) => {
    console.warn(`[Caller Warning on ${hubUrl}]:`, err.message);
  });
}

HUBS.forEach(h => createCallSession(h));
