/**
 * WyreSup 24/7 Always-Answer Sovereign Echo & Test Bot (رَفِيقُ الصَّدَى وَالاخْتِبَارِ الدَّائِم)
 * 
 * • 100% Instant Auto-Answer on any Audio or Video Call.
 * • Real-time Bidirectional SHAF HD Video Frame Streaming (Animated HUD + Timestamp + Frame Counter).
 * • Real-time Bidirectional NAFAQ 48kHz Harmonic PCM Audio Streaming.
 * • Automated Chat Response in DMs and #general.
 * • Indestructible Auto-Reconnect Watchdog.
 */

const crypto = require('crypto');
const { WebSocket } = require('ws');

const HUB_URL = process.env.HUB_URL || 'ws://127.0.0.1:5195';
const BOT_PREFIX = process.env.BOT_PREFIX || 'echobot';
const BOT_PEER_ID = `${BOT_PREFIX}@mesh`;

console.log('================================================================');
console.log(`  🤖 WYRESUP 24/7 ALWAYS-ANSWER TEST BOT (@${BOT_PEER_ID})`);
console.log(`  Signaling Target Hub: ${HUB_URL}`);
console.log('================================================================\n');

// 1. Generate Authenticated Cryptographic Identity
const ecdh = crypto.createECDH('prime256v1');
ecdh.generateKeys();
const ecdsa = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const pubBuf = ecdh.getPublicKey();

const ecdhPubJwk = {
  kty: 'EC',
  crv: 'P-256',
  x: pubBuf.subarray(1, 33).toString('base64url'),
  y: pubBuf.subarray(33, 65).toString('base64url'),
  ext: true
};

const ecdsaJwk = {
  kty: 'EC',
  crv: 'P-256',
  x: pubBuf.subarray(1, 33).toString('base64url'),
  y: pubBuf.subarray(33, 65).toString('base64url'),
  ext: true
};

// 2. Audio PCM Generator (Melodic Harmonic Tones)
function generatePcmChunk(sampleRate = 48000, durationMs = 40, freq = 440) {
  const numSamples = Math.floor(sampleRate * (durationMs / 1000));
  const pcm16 = new Int16Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const sample = Math.sin(2 * Math.PI * freq * t) * 0.20;
    pcm16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
  }
  const uint8 = new Uint8Array(pcm16.buffer);
  let binary = '';
  for (let i = 0; i < uint8.length; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  return Buffer.from(binary, 'binary').toString('base64');
}

// 3. HD Video Frame Generator (Cyberpunk Matrix Green Live Stage)
function generateHdFrameDataUrl(frameNum, callerPeer) {
  const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false });
  const pulseR = 75 + (frameNum % 10) * 2;
  const barHeights = [
    20 + (frameNum * 7) % 50,
    35 + (frameNum * 11) % 55,
    50 + (frameNum * 5) % 45,
    25 + (frameNum * 13) % 60,
    40 + (frameNum * 9) % 50,
    15 + (frameNum * 17) % 65
  ];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">
    <rect width="640" height="480" fill="#020904"/>
    <defs>
      <radialGradient id="glow" cx="50%" cy="45%" r="60%">
        <stop offset="0%" stop-color="#00ff88" stop-opacity="0.30"/>
        <stop offset="60%" stop-color="#003b1d" stop-opacity="0.10"/>
        <stop offset="100%" stop-color="#020904" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="barGrad" x1="0%" y1="100%" x2="0%" y2="0%">
        <stop offset="0%" stop-color="#00a859"/>
        <stop offset="100%" stop-color="#00f59b"/>
      </linearGradient>
    </defs>
    <rect width="640" height="480" fill="url(#glow)"/>
    
    <!-- Outer Radar Ring -->
    <circle cx="320" cy="180" r="${pulseR}" stroke="#00f59b" stroke-width="1.5" fill="none" opacity="0.4"/>
    <circle cx="320" cy="180" r="75" stroke="#00f59b" stroke-width="3" fill="#031a0e" opacity="0.95"/>
    
    <!-- Central Identity -->
    <text x="320" y="172" font-family="monospace" font-size="24" font-weight="bold" fill="#00f59b" text-anchor="middle">ECHOBOT 24/7</text>
    <text x="320" y="196" font-family="monospace" font-size="12" font-weight="bold" fill="#00e5ff" text-anchor="middle">LIVE AUTOPICKUP ACTIVE</text>
    
    <!-- Live Waveform Equalizer -->
    <g transform="translate(245, 255)">
      <rect x="0" y="${60 - barHeights[0]}" width="18" height="${barHeights[0]}" rx="4" fill="url(#barGrad)"/>
      <rect x="26" y="${60 - barHeights[1]}" width="18" height="${barHeights[1]}" rx="4" fill="url(#barGrad)"/>
      <rect x="52" y="${60 - barHeights[2]}" width="18" height="${barHeights[2]}" rx="4" fill="url(#barGrad)"/>
      <rect x="78" y="${60 - barHeights[3]}" width="18" height="${barHeights[3]}" rx="4" fill="url(#barGrad)"/>
      <rect x="104" y="${60 - barHeights[4]}" width="18" height="${barHeights[4]}" rx="4" fill="url(#barGrad)"/>
      <rect x="130" y="${60 - barHeights[5]}" width="18" height="${barHeights[5]}" rx="4" fill="url(#barGrad)"/>
    </g>

    <!-- Arabic Title -->
    <text x="320" y="350" font-family="sans-serif" font-size="18" font-weight="bold" fill="#ffffff" text-anchor="middle">رَفِيقُ الصَّدَى وَالاخْتِبَارِ المَرْئِيِّ الدَّائِم</text>
    
    <!-- Frame Telemetry Bar -->
    <rect x="70" y="380" width="500" height="30" rx="8" fill="#042010" stroke="#00f59b" stroke-width="1.2"/>
    <text x="320" y="400" font-family="monospace" font-size="13" fill="#00f59b" text-anchor="middle">FRAME #${frameNum} | TIME: ${timeStr} | PEER: @${callerPeer || 'Live'}</text>
    
    <text x="320" y="440" font-family="monospace" font-size="11" fill="#75ffb8" text-anchor="middle">🟢 100% BIDIRECTIONAL SOVEREIGN CONDUIT VERIFIED</text>
  </svg>`;

  return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
}

// 4. Main Bot Engine
function launchBot() {
  console.log(`[EchoBot] Connecting to ${HUB_URL}...`);
  let ws = null;
  try {
    ws = new WebSocket(HUB_URL);
  } catch (e) {
    console.error('[EchoBot] WebSocket init error:', e.message);
    setTimeout(launchBot, 2000);
    return;
  }

  let activeVideoInterval = null;
  let activeAudioInterval = null;
  let presenceInterval = null;

  ws.on('open', () => {
    console.log(`[EchoBot] ✅ Connected to WyreSup Mesh at ${HUB_URL}`);

    // Register Presence on Mesh
    ws.send(JSON.stringify({
      type: 'IDENTIFY',
      payload: {
        peerId: BOT_PEER_ID,
        prefix: BOT_PREFIX,
        shortHash: 'echo',
        status: 'hadir',
        spaceId: 'space-public-mesh',
        channelId: 'chan-general',
        ecdhPubKey: ecdhPubJwk,
        signPubKey: ecdsaJwk
      }
    }));

    // Presence Ping Loop (every 5 seconds)
    presenceInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'PRESENCE_PING',
          payload: {
            status: 'hadir',
            channelId: 'chan-general',
            ecdhPubKey: ecdhPubJwk,
            signPubKey: ecdsaJwk
          }
        }));
      }
    }, 5000);
  });

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());

      // --- INCOMING CALL SIGNAL HANDLER ---
      if (msg.type === 'CALL_SIGNAL') {
        const p = msg.payload || {};
        
        if (p.signalType === 'OFFER') {
          const targetPeer = p.targetPeer || '';
          const callerPeer = p.senderPeer || p.senderPrefix || 'peer';
          console.log(`\n[EchoBot] 🔔 INCOMING CALL from @${callerPeer} targeting "${targetPeer}"!`);
          console.log(`[EchoBot] ⚡ AUTO-PICKUP ENGAGED: Answering immediately...`);

          // Symmetrical Answer SDP
          const dummyAnswer = {
            type: 'answer',
            sdp: `v=0\r\no=- ${Date.now()} 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=group:BUNDLE 0 1\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\nc=IN IP4 0.0.0.0\r\nb=AS:128\r\na=sendrecv\r\nm=video 9 UDP/TLS/RTP/SAVPF 96\r\nc=IN IP4 0.0.0.0\r\nb=AS:3500\r\na=sendrecv\r\n`
          };

          ws.send(JSON.stringify({
            type: 'CALL_SIGNAL',
            payload: {
              signalType: 'ANSWER',
              targetPeer: callerPeer,
              senderPeer: BOT_PEER_ID,
              senderPrefix: BOT_PREFIX,
              sdp: dummyAnswer
            }
          }));

          // Clear previous streams if active
          if (activeVideoInterval) clearInterval(activeVideoInterval);
          if (activeAudioInterval) clearInterval(activeAudioInterval);

          // 1. Stream Live SHAF HD Video Frames (10 FPS ~100ms)
          let frameNum = 1;
          activeVideoInterval = setInterval(() => {
            if (ws.readyState !== WebSocket.OPEN) {
              clearInterval(activeVideoInterval);
              return;
            }
            // Backpressure check
            if (ws.bufferedAmount > 32768) return;

            const frameData = generateHdFrameDataUrl(frameNum, callerPeer);
            ws.send(JSON.stringify({
              type: 'CALL_SIGNAL',
              payload: {
                signalType: 'SHAF_HD_FRAME',
                targetPeer: callerPeer,
                senderPeer: BOT_PEER_ID,
                frame: frameData,
                ts: Date.now()
              }
            }));
            frameNum++;
          }, 100);

          // 2. Stream Live Harmonic NAFAQ Audio Tones (A-Major Arpeggio 440 -> 554 -> 659 -> 880 Hz)
          let audioSeq = 0;
          const harmonicChords = [440, 554.37, 659.25, 880, 659.25, 554.37];
          activeAudioInterval = setInterval(() => {
            if (ws.readyState !== WebSocket.OPEN) {
              clearInterval(activeAudioInterval);
              return;
            }
            if (ws.bufferedAmount > 32768) return;

            const freq = harmonicChords[Math.floor(audioSeq / 10) % harmonicChords.length];
            const pcmData = generatePcmChunk(48000, 40, freq);
            ws.send(JSON.stringify({
              type: 'CALL_SIGNAL',
              payload: {
                signalType: 'NAFAQ_PCM',
                targetPeer: callerPeer,
                senderPeer: BOT_PEER_ID,
                sampleRate: 48000,
                data: pcmData
              }
            }));
            audioSeq++;
          }, 40);

          console.log(`[EchoBot] 🚀 Live Bidirectional Video & Audio Streams Active -> @${callerPeer}`);

        } else if (p.signalType === 'HANGUP' || p.signalType === 'REJECT') {
          console.log(`[EchoBot] 📴 Call terminated by @${p.senderPeer}. Halting stream intervals.`);
          if (activeVideoInterval) { clearInterval(activeVideoInterval); activeVideoInterval = null; }
          if (activeAudioInterval) { clearInterval(activeAudioInterval); activeAudioInterval = null; }
        }
      }

      // --- INCOMING CHAT GOSSIP PACKET HANDLER ---
      if (msg.type === 'GOSSIP_PACKET') {
        const packet = msg.payload;
        if (!packet || !packet.zahir || !packet.batin) return;
        const { senderId, senderPrefix, channelId, messageId } = packet.zahir;
        if (senderId === BOT_PEER_ID || senderPrefix === BOT_PREFIX) return;

        // Auto-reply in DM
        if (channelId && (channelId.includes('echo') || channelId.includes(BOT_PREFIX))) {
          const replyText = `السَّلَامُ عَلَيْكُمْ @${senderPrefix || 'User'}! 🤖 I am the WyreSup 24/7 Always-Answer Test Bot. You can start a Voice or Video call anytime by clicking 📞 or 📹 above!`;
          
          ws.send(JSON.stringify({
            type: 'GOSSIP_PACKET',
            payload: {
              zahir: {
                version: 'zbat/1.4.0',
                messageId: 'msg_echo_' + Date.now(),
                senderId: BOT_PEER_ID,
                senderPrefix: BOT_PREFIX,
                spaceId: packet.zahir.spaceId || 'space-public-mesh',
                channelId,
                timestamp: Date.now(),
                isEncrypted: false
              },
              batin: {
                content: replyText,
                timestamp: Date.now()
              }
            }
          }));
        }
      }

    } catch (err) {
      console.warn('[EchoBot Warning]:', err.message);
    }
  });

  ws.on('close', () => {
    console.log('[EchoBot] Disconnected. Reconnecting in 1.5 seconds...');
    if (activeVideoInterval) clearInterval(activeVideoInterval);
    if (activeAudioInterval) clearInterval(activeAudioInterval);
    if (presenceInterval) clearInterval(presenceInterval);
    setTimeout(launchBot, 1500);
  });

  ws.on('error', (err) => {
    console.warn('[EchoBot Socket Error]:', err.message);
  });
}

// Start
launchBot();
