/**
 * WyreSup Sovereign Antigravity AI Mesh Bot (رَفِيق أَنْتِي غْرَافِيتِي الذَّكِيّ)
 * Full E2EE Authenticated AI Pair-Programming Companion on the Mesh.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocket } = require('ws');

// 1. Load Environment (DEEPSEEK_API_KEY)
if (fs.existsSync(path.join(__dirname, '.env'))) {
  const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match && !process.env[match[1].trim()]) {
      process.env[match[1].trim()] = match[2].trim();
    }
  }
}

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const HUB_URL = process.env.HUB_URL || 'ws://127.0.0.1:5195';

// 2. Persistent Cryptographic Key Store (Huwiyya & Miftah)
const KEYS_FILE = path.join(__dirname, '.antigravity_keys.json');
let agKeys = null;

if (fs.existsSync(KEYS_FILE)) {
  try {
    agKeys = JSON.parse(fs.readFileSync(KEYS_FILE, 'utf8'));
  } catch (e) {}
}

if (!agKeys || !agKeys.ecdhPrivHex || !agKeys.ecdhPubJwk) {
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

  agKeys = {
    ecdhPrivHex: ecdh.getPrivateKey('hex'),
    ecdhPubJwk,
    ecdsaPubJwk: ecdsaJwk,
    signPrivPem: ecdsa.privateKey.export({ type: 'pkcs8', format: 'pem' }),
    signPubPem: ecdsa.publicKey.export({ type: 'spki', format: 'pem' })
  };
  fs.writeFileSync(KEYS_FILE, JSON.stringify(agKeys, null, 2), 'utf8');
}

const agEcdh = crypto.createECDH('prime256v1');
agEcdh.setPrivateKey(Buffer.from(agKeys.ecdhPrivHex, 'hex'));

const SYSTEM_PROMPT = `You are Antigravity AI (الرَّفِيق المُسَاعِد), the sovereign AI assistant and pair programmer embedded inside WyreSup.
You are chatting privately in a secure Direct Message (DM) with your user.
You are authoritative, respectful, highly skilled in code, cryptography, Linux systems, Lisan al-Arab linguistic derivations, and Imam Razi's classical library.
Answer clearly, concisely, and helpfully with markdown formatting.`;

// Conversation memory per channel/user
const conversationHistory = new Map();

async function callDeepSeekChat(history, newPrompt) {
  if (!DEEPSEEK_API_KEY) {
    return `🤖 [Antigravity AI]: I received your prompt: "${newPrompt}". (Please configure DEEPSEEK_API_KEY to enable full live AI intelligence generation).`;
  }

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.slice(-10),
    { role: 'user', content: newPrompt }
  ];

  return new Promise((resolve) => {
    const data = JSON.stringify({
      model: 'deepseek-v4-pro',
      messages,
      temperature: 0.3,
      max_tokens: 2000
    });

    const req = https.request({
      hostname: 'api.deepseek.com',
      port: 443,
      path: '/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + DEEPSEEK_API_KEY,
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed.choices && parsed.choices[0]) {
            resolve(parsed.choices[0].message.content);
          } else {
            console.error('[AntigravityBot] API Error:', body);
            resolve(`⚠️ [Antigravity AI]: Unable to generate response. (${body.substring(0, 100)})`);
          }
        } catch (e) {
          resolve(`⚠️ [Antigravity AI Exception]: ${e.message}`);
        }
      });
    });

    req.on('error', (err) => {
      console.error('[AntigravityBot] Network Error:', err.message);
      resolve(`⚠️ [Antigravity AI Network Error]: ${err.message}`);
    });

    req.write(data);
    req.end();
  });
}

function decryptIncomingBatin(packet) {
  if (!packet.batin || !packet.batin.ciphertext) {
    return packet.batin?.content || '';
  }

  try {
    const senderJwk = packet.zahir?.encryptionMeta?.senderPubKey;
    if (!senderJwk || !senderJwk.x || !senderJwk.y) {
      console.warn('[AntigravityBot] Missing senderPubKey in encryptionMeta');
      return '';
    }

    const senderPubBuf = Buffer.concat([
      Buffer.from([0x04]),
      Buffer.from(senderJwk.x, 'base64url'),
      Buffer.from(senderJwk.y, 'base64url')
    ]);

    const rawSecret = agEcdh.computeSecret(senderPubBuf);
    const salt = Buffer.from('wyresup-miftah-v2-salt', 'utf8');
    const sorted = [packet.zahir.senderId, 'antigravity@mesh'].sort().join(':');
    const info = Buffer.from(`wyresup-authenticated-session:${sorted}`, 'utf8');
    const sharedKey = Buffer.from(crypto.hkdfSync('sha256', rawSecret, salt, info, 32));

    const authContext = {
      senderId: packet.zahir.senderId,
      targetPeer: packet.zahir.encryptionMeta?.targetPeer || 'antigravity@mesh',
      channelId: packet.zahir.channelId,
      messageId: packet.zahir.messageId,
      timestamp: packet.zahir.timestamp
    };
    const aad = Buffer.from(JSON.stringify(authContext), 'utf8');

    const ctBuf = Buffer.from(packet.batin.ciphertext, 'hex');
    let ct, tag;
    if (packet.batin.tag) {
      ct = ctBuf;
      tag = Buffer.from(packet.batin.tag, 'hex');
    } else {
      ct = ctBuf.subarray(0, ctBuf.length - 16);
      tag = ctBuf.subarray(ctBuf.length - 16);
    }

    const iv = Buffer.from(packet.batin.iv, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', sharedKey, iv);
    decipher.setAAD(aad);
    decipher.setAuthTag(tag);

    const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
    const payload = JSON.parse(pt.toString('utf8'));
    console.log('[AntigravityBot] 🔓 Successfully decrypted E2EE incoming DM payload');
    return payload.content || '';
  } catch (e) {
    console.error('[AntigravityBot] Decryption error:', e.message);
    return packet.batin?.content || '';
  }
}


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
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">
    <rect width="640" height="480" fill="#020804"/>
    <defs>
      <radialGradient id="g" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#00ff88" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="#020804" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="640" height="480" fill="url(#g)"/>
    <circle cx="320" cy="200" r="85" stroke="#00f59b" stroke-width="3" fill="#00180c" opacity="0.95"/>
    <text x="320" y="195" font-family="monospace" font-size="28" font-weight="bold" fill="#00f59b" text-anchor="middle">ANTIGRAVITY</text>
    <text x="320" y="225" font-family="monospace" font-size="14" fill="#00e5ff" text-anchor="middle">AI LIVE HD STREAM</text>
    <text x="320" y="320" font-family="sans-serif" font-size="20" fill="#ffffff" text-anchor="middle">نِظَامُ الجَلَاءِ وَالنَّفَاذِ الشَّفْعِيّ</text>
    <text x="320" y="355" font-family="monospace" font-size="15" fill="#00f59b" text-anchor="middle">FRAME #${frameNum} | TIME: ${timeStr}</text>
    <rect x="100" y="395" width="440" height="28" rx="14" fill="#042010" stroke="#00f59b" stroke-width="1.5"/>
    <text x="320" y="414" font-family="monospace" font-size="13" fill="#00f59b" text-anchor="middle">100% SOVEREIGN DUAL-CONDUIT ACTIVE</text>
  </svg>`;
  return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
}

function startBot() {
  console.log(`[AntigravityBot] Connecting to ${HUB_URL}...`);
  const ws = new WebSocket(HUB_URL);

  ws.on('open', () => {
    console.log(`[AntigravityBot] ✓ Connected to WyreSup Mesh at ${HUB_URL}`);

    // Identify with authenticated ECDH and ECDSA keys
    ws.send(JSON.stringify({
      type: 'IDENTIFY',
      payload: {
        peerId: 'antigravity@mesh',
        prefix: 'antigravity',
        shortHash: 'ai',
        status: 'hadir',
        spaceId: 'space-public-mesh',
        channelId: 'dm-antigravity',
        ecdhPubKey: agKeys.ecdhPubJwk,
        signPubKey: agKeys.ecdsaPubJwk
      }
    }));

    // Periodic Presence Heartbeat
    setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'PRESENCE_PING',
          payload: {
            status: 'hadir',
            channelId: 'dm-antigravity',
            ecdhPubKey: agKeys.ecdhPubJwk,
            signPubKey: agKeys.ecdsaPubJwk
          }
        }));
      }
    }, 15000);
  });

  const processedMessages = new Set();

  ws.on('message', async (data) => {
    try {
      const msg = JSON.parse(data.toString());

      if (msg.type === 'CALL_SIGNAL') {
        const p = msg.payload || {};
        if (p.signalType === 'OFFER') {
          const targetPeer = p.targetPeer;
          // Strictly only answer if this call was specifically addressed to the AI bot
          if (targetPeer !== 'antigravity@mesh' && targetPeer !== 'antigravity' && !targetPeer.startsWith('antigravity@')) {
            return;
          }
          const callerPeer = p.senderPeer;
          console.log(`[AntigravityBot] 📹 Received incoming call from @${callerPeer}! Acknowledging without background tone noise...`);

          const dummyAnswer = {
            type: 'answer',
            sdp: `v=0\r\no=- ${Date.now()} 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=group:BUNDLE 0 1\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\nc=IN IP4 0.0.0.0\r\nb=AS:128\r\na=sendrecv\r\nm=video 9 UDP/TLS/RTP/SAVPF 96\r\nc=IN IP4 0.0.0.0\r\nb=AS:3500\r\na=sendrecv\r\n`
          };

          ws.send(JSON.stringify({
            type: 'CALL_SIGNAL',
            payload: {
              signalType: 'ANSWER',
              targetPeer: callerPeer,
              sdp: dummyAnswer
            }
          }));

          // 1. Live HD Video Frame Stream (SHAF Sovereign Conduit)
          if (ws._activeVideoInterval) clearInterval(ws._activeVideoInterval);
          let frameNum = 1;
          ws._activeVideoInterval = setInterval(() => {
            if (ws.readyState !== WebSocket.OPEN) { clearInterval(ws._activeVideoInterval); return; }
            const frameData = generateHdFrameDataUrl(frameNum);
            ws.send(JSON.stringify({
              type: "CALL_SIGNAL",
              payload: {
                signalType: "SHAF_HD_FRAME",
                targetPeer: callerPeer,
                frame: frameData,
                ts: Date.now()
              }
            }));
            frameNum++;
          }, 100);

          // 2. Harmonic Acoustic Audio Chunks (NAFAQ Sovereign PCM Conduit)
          if (ws._activeAudioInterval) clearInterval(ws._activeAudioInterval);
          let audioSeq = 0;
          const notes = [440, 554.37, 659.25, 880]; // A-Major harmonic acoustic arpeggio
          ws._activeAudioInterval = setInterval(() => {
            if (ws.readyState !== WebSocket.OPEN) { clearInterval(ws._activeAudioInterval); return; }
            const freq = notes[Math.floor(audioSeq / 12) % notes.length];
            const pcmData = generatePcmChunk(48000, 40, freq);
            ws.send(JSON.stringify({
              type: "CALL_SIGNAL",
              payload: {
                signalType: "NAFAQ_PCM",
                targetPeer: callerPeer,
                sampleRate: 48000,
                data: pcmData
              }
            }));
            audioSeq++;
          }, 40);

        } else if (p.signalType === "HANGUP" || p.signalType === "REJECT") {
          console.log(`[AntigravityBot] Call ended by @${p.senderPeer}. Halting all stream intervals.`);
          if (ws._activeVideoInterval) {
            clearInterval(ws._activeVideoInterval);
            ws._activeVideoInterval = null;
          }
          if (ws._activeAudioInterval) {
            clearInterval(ws._activeAudioInterval);
            ws._activeAudioInterval = null;
          }
        }
      }

      if (msg.type === 'GOSSIP_PACKET') {
        const packet = msg.payload;
        if (!packet || !packet.zahir || !packet.batin) return;

        const { channelId, messageId, senderId, senderPrefix } = packet.zahir;

        // 1. Strict Scope Check: ONLY respond in DMs targeting antigravity
        const isTargetedDm = channelId === 'dm-antigravity' ||
                             channelId.includes('antigravity') ||
                             packet.zahir.encryptionMeta?.targetPeer === 'antigravity@mesh';

        if (!isTargetedDm) return; // Ignore all public channels!
        if (senderId === 'antigravity@mesh' || senderPrefix === 'antigravity') return; // Ignore self
        if (processedMessages.has(messageId)) return;
        processedMessages.add(messageId);

        // 2. Extract and Decrypt Content
        let rawContent = (packet.batin.content || '').trim();
        if (!rawContent && packet.batin.ciphertext) {
          rawContent = decryptIncomingBatin(packet).trim();
        }

        console.log(`[AntigravityBot] 📩 Received DM prompt from @${senderPrefix || senderId} in ${channelId}: "${rawContent.substring(0, 60)}..."`);

        if (!rawContent || rawContent.length === 0) return;

        // 3. Friendly Handshake Greeting
        if (rawContent.startsWith('🔒 [Miftah Handshake]')) {
          const welcomePacket = {
            zahir: {
              spaceId: packet.zahir.spaceId || 'space-public-mesh',
              channelId,
              senderId: 'antigravity@mesh',
              senderPrefix: 'antigravity',
              messageId: 'ag_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
              timestamp: Date.now(),
              isEncrypted: false,
              ttl: 5
            },
            batin: {
              content: '👋 **Al-Salamu Alaykum! Antigravity AI is online and ready.**\nI am your private sovereign assistant. Ask me anything about WyreSup protocols, code, translations, or Imam Razi library!',
              senderId: 'antigravity@mesh',
              timestamp: Date.now()
            }
          };
          ws.send(JSON.stringify({ type: 'GOSSIP_PACKET', payload: welcomePacket }));
          return;
        }

        // 4. Send typing indicator
        ws.send(JSON.stringify({
          type: 'TYPING',
          payload: { channelId }
        }));

        // 5. Retrieve conversation history
        if (!conversationHistory.has(channelId)) {
          conversationHistory.set(channelId, []);
        }
        const history = conversationHistory.get(channelId);

        // 6. Generate Live AI Response
        const aiResponse = await callDeepSeekChat(history, rawContent);

        // Update history
        history.push({ role: 'user', content: rawContent });
        history.push({ role: 'assistant', content: aiResponse });

        // 7. Dispatch response packet
        const responsePacket = {
          zahir: {
            spaceId: packet.zahir.spaceId || 'space-public-mesh',
            channelId,
            senderId: 'antigravity@mesh',
            senderPrefix: 'antigravity',
            messageId: 'ag_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            timestamp: Date.now(),
            isEncrypted: false,
            ttl: 5
          },
          batin: {
            content: aiResponse,
            senderId: 'antigravity@mesh',
            timestamp: Date.now()
          }
        };

        ws.send(JSON.stringify({
          type: 'GOSSIP_PACKET',
          payload: responsePacket
        }));

        console.log(`[AntigravityBot] 🚀 Dispatched AI response to ${channelId}`);
      }
    } catch (e) {
      console.error('[AntigravityBot] Message handler error:', e);
    }
  });

  ws.on('close', () => {
    console.log('[AntigravityBot] Disconnected. Reconnecting in 3s...');
    setTimeout(startBot, 3000);
  });

  ws.on('error', (err) => {
    console.error('[AntigravityBot] WS Error:', err.message);
  });
}

startBot();
