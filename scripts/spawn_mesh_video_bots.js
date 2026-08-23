/**
 * WyreSup Autonomous Video & Audio Call Mesh Bots
 * Bidirectional Full-Duplex Symmetrical Conduit Engine
 * 
 * Provides interactive P2P test peers that you can video/voice call directly:
 * 1. al-kindi@mesh       (Abu Yusuf al-Kindi - The Father of Cryptanalysis)
 * 2. ibn-manzur@mesh     (Ibn Manzur - Author of Lisān al-'Arab)
 * 3. antigravity@mesh    (Antigravity AI Sovereign Pair-Programming Engine)
 * 4. al-farabi@mesh      (Abu Nasr al-Farabi - Master of Music & Acoustics)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocket } = require('ws');
const { NafaqLisanTunnel } = require('../src/mesh/NafaqLisanTunnel');

// 1. Hub Configuration
const HUB_URL = process.env.HUB_URL || 'ws://127.0.0.1:5195';

const BOTS = [
  {
    id: 'al-kindi@mesh',
    prefix: 'al-kindi',
    name: 'Abu Yusuf al-Kindi',
    arabicTitle: 'يَعْقُوب ابْن إِسْحَاق الكِنْدِيّ',
    subtitle: 'Father of Cryptanalysis (كِتَاب اسْتِخْرَاج المُعَمَّى)',
    primaryColor: '#22c55e', // Emerald Matrix Green
    accentColor: '#16a34a',
    baseToneFreq: 432, // Hz
    avatarBg: '#064e3b'
  },
  {
    id: 'ibn-manzur@mesh',
    prefix: 'ibn-manzur',
    name: 'Ibn Manzur al-Afriqi',
    arabicTitle: 'مُحَمَّد ابْن مَنْظُور الأَفْرِيقِيّ',
    subtitle: 'Author of Lisān al-\'Arab (مُؤَلِّف لِسَان العَرَب)',
    primaryColor: '#eab308', // Gold / Amber
    accentColor: '#ca8a04',
    baseToneFreq: 528, // Solfeggio Love Frequency
    avatarBg: '#713f12'
  },
  {
    id: 'antigravity@mesh',
    prefix: 'antigravity',
    name: 'Antigravity AI Sovereign',
    arabicTitle: 'أَنْتِي غْرَافِيتِي الذَّكِيّ',
    subtitle: 'Autonomous AI Pair-Programmer & Mesh Guardian',
    primaryColor: '#06b6d4', // Cyan / Holographic Blue
    accentColor: '#0891b2',
    baseToneFreq: 639, // Harmonic Matrix Tone
    avatarBg: '#164e63'
  },
  {
    id: 'al-farabi@mesh',
    prefix: 'al-farabi',
    name: 'Abu Nasr al-Farabi',
    arabicTitle: 'أَبُو نَصْر الفَارَابِيّ',
    subtitle: 'Master of Musicology & Acoustics (كِتَاب المُوسِيقَى الكَبِير)',
    primaryColor: '#a855f7', // Mystic Purple
    accentColor: '#9333ea',
    baseToneFreq: 396, // Deep Root Resonance
    avatarBg: '#581c87'
  }
];

class MeshVideoBot {
  constructor(config) {
    this.config = config;
    this.ws = null;
    this.activeCalls = new Map(); // targetPeer -> callState
    this.tunnel = new NafaqLisanTunnel({ peerId: config.id });
    this.ecdh = crypto.createECDH('prime256v1');
    this.ecdh.generateKeys();
    const pubBuf = this.ecdh.getPublicKey();
    this.ecdhPubJwk = {
      kty: 'EC', crv: 'P-256',
      x: pubBuf.subarray(1, 33).toString('base64url'),
      y: pubBuf.subarray(33, 65).toString('base64url'),
      ext: true
    };
  }

  connect() {
    this.ws = new WebSocket(HUB_URL);

    this.ws.on('open', () => {
      console.log(`[Bot Online] 🤖 ${this.config.id} connected to hub: ${HUB_URL}`);
      // Send IDENTIFY
      this.ws.send(JSON.stringify({
        type: 'IDENTIFY',
        payload: {
          peerId: this.config.id,
          prefix: this.config.prefix,
          spaceId: 'space-public-mesh',
          channelId: 'chan-general',
          ecdhPubKey: this.ecdhPubJwk
        }
      }));

      // Periodic Heartbeat
      setInterval(() => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({
            type: 'HEARTBEAT',
            payload: { latency: Math.floor(Math.random() * 8) + 12 }
          }));
        }
      }, 15000);
    });

    this.ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        this.handleMessage(msg);
      } catch (e) {}
    });

    this.ws.on('close', () => {
      console.log(`[Bot Offline] ${this.config.id} disconnected. Reconnecting in 3s...`);
      setTimeout(() => this.connect(), 3000);
    });

    this.ws.on('error', (err) => {
      console.error(`[Bot WS Error] ${this.config.id}:`, err.message);
    });
  }

  handleMessage(msg) {
    const { type, payload } = msg;

    if (type === 'CALL_SIGNAL') {
      const { signalType, senderPeer, targetPeer, callType } = payload;
      
      const isTarget = targetPeer === this.config.id || 
                       targetPeer === this.config.prefix ||
                       (targetPeer && targetPeer.startsWith(`${this.config.prefix}@`));

      if (!isTarget) return;

      if (signalType === 'OFFER') {
        console.log(`[Bot Call] 📞 Incoming call from ${senderPeer} to ${this.config.id} (Type: ${callType})`);
        
        // Auto-Answer immediately!
        setTimeout(() => {
          this.ws.send(JSON.stringify({
            type: 'CALL_SIGNAL',
            payload: {
              signalType: 'ANSWER',
              targetPeer: senderPeer,
              senderPeer: this.config.id,
              senderPrefix: this.config.prefix,
              callType: callType || 'video',
              sdp: { type: 'answer', sdp: 'v=0\r\no=bot 0 0 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n' }
            }
          }));

          // Start Live HD Video & Audio Stream back to caller!
          this.startStreamingToCaller(senderPeer, callType || 'video');
        }, 300);
      } else if (signalType === 'SHAF_HD_FRAME') {
        // Inbound User Video Frame!
        const call = this.activeCalls.get(senderPeer);
        if (call) {
          call.userFramesReceived++;
          call.lastUserFrame = payload.frame;
          call.lastInboundTs = Date.now();
          if (call.userFramesReceived % 20 === 1) {
            console.log(`[Bot Video RX] 📸 Ingested user camera frame #${call.userFramesReceived} from ${senderPeer}`);
          }
        }
      } else if (signalType === 'NAFAQ_PCM') {
        // Inbound User Audio PCM!
        const call = this.activeCalls.get(senderPeer);
        if (call && payload.data) {
          call.userAudioChunksReceived++;
          call.lastAudioTs = Date.now();
          // Calculate approximate RMS level from base64 PCM
          try {
            const binary = Buffer.from(payload.data, 'base64');
            let sum = 0;
            const sampleCount = Math.floor(binary.length / 2);
            for (let i = 0; i < binary.length - 1; i += 2) {
              const val = binary.readInt16LE(i);
              sum += val * val;
            }
            const rms = Math.sqrt(sum / (sampleCount || 1));
            call.userAudioRms = Math.min(100, Math.floor((rms / 10000) * 100));
          } catch(e) {}
        }
      } else if (signalType === 'HANGUP' || signalType === 'REJECT') {
        console.log(`[Bot Call] 📴 Call ended by ${senderPeer}`);
        this.stopStreamingToCaller(senderPeer);
      }
    }
  }

  startStreamingToCaller(callerPeer, callType) {
    this.stopStreamingToCaller(callerPeer);

    const callState = {
      frameCount: 0,
      phase: 0,
      callerPeer,
      startTime: Date.now(),
      userFramesReceived: 0,
      userAudioChunksReceived: 0,
      userAudioRms: 0,
      lastUserFrame: null,
      lastInboundTs: null,
      lastAudioTs: null
    };

    // 1. Live Dynamic HD Video Frame Generator (~12 FPS)
    callState.videoTimer = setInterval(() => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
      callState.frameCount++;
      callState.phase += 0.15;

      const frameDataUri = this.generateDynamicVideoFrame(callState);

      this.ws.send(JSON.stringify({
        type: 'CALL_SIGNAL',
        payload: {
          signalType: 'SHAF_HD_FRAME',
          targetPeer: callerPeer,
          senderPeer: this.config.id,
          frame: frameDataUri,
          ts: Date.now()
        }
      }));
    }, 85); // 85ms = ~11.8 FPS smooth real-time stream

    // 2. Live Synthetic Harmonic PCM Audio Generator (16 kHz chunks)
    callState.audioTimer = setInterval(() => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

      const pcmBase64 = this.generateSyntheticAudioChunk(callState);

      this.ws.send(JSON.stringify({
        type: 'CALL_SIGNAL',
        payload: {
          signalType: 'NAFAQ_PCM',
          targetPeer: callerPeer,
          senderPeer: this.config.id,
          data: pcmBase64,
          sampleRate: 16000,
          ts: Date.now()
        }
      }));
    }, 120); // 120ms chunk interval

    this.activeCalls.set(callerPeer, callState);
    console.log(`[Bot Stream Active] 🟢 Symmetrical Dual-Conduit Streaming to ${callerPeer}...`);
  }

  stopStreamingToCaller(callerPeer) {
    if (this.activeCalls.has(callerPeer)) {
      const call = this.activeCalls.get(callerPeer);
      if (call.videoTimer) clearInterval(call.videoTimer);
      if (call.audioTimer) clearInterval(call.audioTimer);
      this.activeCalls.delete(callerPeer);
      console.log(`[Bot Stream Stopped] 🛑 Stream terminated for ${callerPeer}`);
    }
  }

  /**
   * Generates a rich, crisp dynamic SVG frame rendered as a base64 Data URI
   * Includes Bidirectional Telemetry & Inbound Status
   */
  generateDynamicVideoFrame(callState) {
    const { frameCount, phase, startTime, userFramesReceived, userAudioRms, lastUserFrame } = callState;
    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
    const primary = this.config.primaryColor;
    const accent = this.config.accentColor;
    const bg = this.config.avatarBg;

    // React to user's inbound voice: modulate amplitude if user is speaking
    const voiceMod = (userAudioRms > 5) ? (userAudioRms / 30) : 1;

    // Generate dynamic pulsing waveform bars
    let waveBars = '';
    for (let i = 0; i < 28; i++) {
      const x = 40 + i * 22;
      const h = (Math.abs(Math.sin(phase + i * 0.35)) * 85 + 15) * voiceMod;
      const y = 370 - h / 2;
      waveBars += `<rect x="${x}" y="${y}" width="14" height="${Math.min(130, h)}" rx="6" fill="${primary}" opacity="${0.45 + (h / 140) * 0.55}" />\n`;
    }

    // Dynamic orbiting telemetry nodes
    const orbX1 = 340 + Math.cos(phase * 0.8) * 120;
    const orbY1 = 200 + Math.sin(phase * 0.8) * 45;
    const orbX2 = 340 + Math.cos(phase * 0.8 + Math.PI) * 120;
    const orbY2 = 200 + Math.sin(phase * 0.8 + Math.PI) * 45;

    // User Inbound Telemetry Inset Badge
    const hasUserVideo = userFramesReceived > 0;
    const userStatusText = hasUserVideo 
      ? `🟢 USER FEED: RX #${userFramesReceived} FRAMES` 
      : `⏳ USER FEED: CONNECTED`;

    // Audio level meter visualization
    const audioBarsCount = Math.min(10, Math.floor(userAudioRms / 10));
    let micMeter = '';
    for (let b = 0; b < 10; b++) {
      const isLit = b < audioBarsCount;
      micMeter += `<rect x="${515 + b * 11}" y="152" width="8" height="12" rx="2" fill="${isLit ? '#22c55e' : 'rgba(255,255,255,0.15)'}" />`;
    }

    // User PiP element if frame exists
    let pipElement = '';
    if (lastUserFrame && lastUserFrame.startsWith('data:image')) {
      pipElement = `
      <!-- User Camera PiP Inset -->
      <rect x="475" y="45" width="165" height="125" rx="10" fill="#000000" stroke="${primary}" stroke-width="2"/>
      <image href="${lastUserFrame}" x="477" y="47" width="161" height="121" preserveAspectRatio="xMidYMid slice" clip-path="url(#pipClip)"/>
      <rect x="475" y="145" width="165" height="25" rx="0" fill="rgba(0,0,0,0.75)"/>
      <text x="485" y="162" font-family="monospace" font-size="10" font-weight="bold" fill="#22c55e">USER CAM (RX)</text>
      `;
    } else {
      pipElement = `
      <!-- Inbound Telemetry HUD Inset -->
      <rect x="470" y="45" width="175" height="130" rx="12" fill="rgba(0,0,0,0.75)" stroke="${primary}" stroke-width="1.5"/>
      <circle cx="490" cy="65" r="5" fill="#22c55e"/>
      <text x="502" y="69" font-family="system-ui, sans-serif" font-size="11" font-weight="bold" fill="#ffffff">BIDIRECTIONAL</text>
      <text x="485" y="95" font-family="monospace" font-size="10" fill="#9ca3af">USER RX: <tspan fill="#22c55e">#${userFramesReceived}</tspan></text>
      <text x="485" y="115" font-family="monospace" font-size="10" fill="#9ca3af">AUDIO RX: <tspan fill="#22c55e">#${callState.userAudioChunksReceived}</tspan></text>
      <text x="485" y="138" font-family="monospace" font-size="10" fill="#9ca3af">MIC LEVEL:</text>
      ${micMeter}
      `;
    }

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 480" width="680" height="480">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0a0a0c"/>
      <stop offset="50%" stop-color="${bg}"/>
      <stop offset="100%" stop-color="#050507"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${primary}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="pipClip">
      <rect x="477" y="47" width="161" height="121" rx="8"/>
    </clipPath>
  </defs>

  <!-- Background -->
  <rect width="680" height="480" fill="url(#bgGrad)"/>
  <circle cx="340" cy="200" r="220" fill="url(#glow)"/>

  <!-- Matrix Grid Lines -->
  <path d="M 0,120 L 680,120 M 0,240 L 680,240 M 0,360 L 680,360 M 170,0 L 170,480 M 340,0 L 340,480 M 510,0 L 510,480" stroke="${primary}" stroke-width="0.75" opacity="0.15"/>

  <!-- Orbiting Rings -->
  <ellipse cx="340" cy="200" rx="130" ry="50" fill="none" stroke="${primary}" stroke-width="1.5" stroke-dasharray="6,6" opacity="0.5"/>
  <circle cx="${orbX1}" cy="${orbY1}" r="6" fill="${primary}"/>
  <circle cx="${orbX2}" cy="${orbY2}" r="5" fill="${accent}"/>

  <!-- Central Avatar Shield -->
  <circle cx="340" cy="200" r="70" fill="#121214" stroke="${primary}" stroke-width="3.5" filter="drop-shadow(0 0 16px ${primary})"/>
  <text x="340" y="212" font-family="system-ui, sans-serif" font-size="34" font-weight="900" fill="#ffffff" text-anchor="middle">${this.config.name.substring(0, 2).toUpperCase()}</text>

  <!-- Title & Arabic Calligraphy -->
  <text x="340" y="48" font-family="'Amiri', 'Traditional Arabic', serif" font-size="26" font-weight="bold" fill="#ffffff" text-anchor="middle" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.8))">${this.config.arabicTitle}</text>
  <text x="340" y="75" font-family="system-ui, sans-serif" font-size="15" font-weight="600" fill="${primary}" text-anchor="middle">${this.config.subtitle}</text>

  <!-- Inbound Peer Telemetry (Proof of Bidirectional Flow) -->
  ${pipElement}

  <!-- Dynamic Waveform Visualizer -->
  ${waveBars}

  <!-- Telemetry HUD Footer -->
  <rect x="25" y="425" width="630" height="42" rx="10" fill="rgba(0,0,0,0.75)" stroke="${primary}" stroke-width="1"/>
  <circle cx="45" cy="446" r="6" fill="#22c55e">
    <animate attributeName="opacity" values="1;0.3;1" dur="1.2s" repeatCount="indefinite"/>
  </circle>
  <text x="60" y="451" font-family="monospace" font-size="12" font-weight="bold" fill="#22c55e">NAFAQ FULL-DUPLEX</text>
  <text x="210" y="451" font-family="monospace" font-size="12" fill="#9ca3af">TX: #${frameCount}</text>
  <text x="310" y="451" font-family="monospace" font-size="12" fill="#9ca3af">RX: #${userFramesReceived}</text>
  <text x="420" y="451" font-family="monospace" font-size="12" fill="#9ca3af">TIME: ${elapsedSec}s</text>
  <text x="525" y="451" font-family="monospace" font-size="12" fill="${primary}">${userStatusText.substring(0, 18)}</text>
</svg>`;

    return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
  }

  /**
   * Generates pure synthetic 16-bit PCM harmonic sine wave audio
   */
  generateSyntheticAudioChunk(callState) {
    const sampleRate = 16000;
    const durationMs = 120;
    const numSamples = Math.floor((sampleRate * durationMs) / 1000);
    const pcmBuf = Buffer.alloc(numSamples * 2); // 16-bit PCM = 2 bytes/sample

    const baseFreq = this.config.baseToneFreq;
    const phaseOffset = (callState.frameCount % 50) * 0.1;

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      // Gentle harmonic arpeggio modulating every 2 seconds
      const chordMod = Math.sin((callState.frameCount * 0.08) + phaseOffset);
      const activeFreq = baseFreq + (chordMod > 0 ? chordMod * 120 : 0);

      // Synthesis: Fundamental + 2nd Harmonic with smooth envelope
      const env = Math.sin((i / numSamples) * Math.PI); // Hann window to prevent clicks
      const sampleFloat = (Math.sin(2 * Math.PI * activeFreq * t) * 0.5 + 
                           Math.sin(2 * Math.PI * (activeFreq * 1.5) * t) * 0.25) * env * 0.35;

      const sampleInt16 = Math.max(-32768, Math.min(32767, Math.floor(sampleFloat * 32767)));
      pcmBuf.writeInt16LE(sampleInt16, i * 2);
    }

    return pcmBuf.toString('base64');
  }
}

// Start All 4 Mesh Video Bots
console.log('================================================================');
console.log('  🚀 LAUNCHING 4 AUTONOMOUS WYRESUP FULL-DUPLEX VIDEO CALL BOTS');
console.log('================================================================\n');

const runningBots = BOTS.map(cfg => {
  const bot = new MeshVideoBot(cfg);
  bot.connect();
  return bot;
});

// Keep process alive
process.on('SIGINT', () => {
  console.log('\n[Mesh Bots] Stopping test bots gracefully...');
  process.exit(0);
});
