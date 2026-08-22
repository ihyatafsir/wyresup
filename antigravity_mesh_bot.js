/**
 * WyreSup Antigravity AI DM Bot (رَفِيق أَنْتِي غْرَافِيتِي الذَّكِيّ)
 * Listens for private DMs in dm-antigravity and responds with full AI intelligence.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
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

const SYSTEM_PROMPT = `You are Antigravity AI (الرَّفِيق المُسَاعِد), the sovereign AI assistant and pair programmer embedded inside WyreSup.
You are chatting privately in a secure Direct Message (DM) with your user.
You are authoritative, respectful, highly skilled in code, cryptography, Linux, Lisan al-Arab linguistic derivations, and Imam Razi's classical library.
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
      model: 'deepseek-chat',
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

function startBot() {
  console.log(`[AntigravityBot] Connecting to ${HUB_URL}...`);
  const ws = new WebSocket(HUB_URL);

  ws.on('open', () => {
    console.log(`[AntigravityBot] ✓ Connected to WyreSup Mesh at ${HUB_URL}`);

    // Identify as Antigravity AI
    ws.send(JSON.stringify({
      type: 'IDENTIFY',
      payload: {
        peerId: 'antigravity@mesh',
        prefix: 'antigravity',
        shortHash: 'ai',
        status: 'hadir',
        spaceId: 'space-public-mesh',
        channelId: 'dm-antigravity'
      }
    }));

    // Presence heartbeat
    setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'PRESENCE_PING',
          payload: { status: 'hadir', channelId: 'dm-antigravity' }
        }));
      }
    }, 15000);
  });

  const processedMessages = new Set();

  ws.on('message', async (data) => {
    try {
      const msg = JSON.parse(data.toString());

      if (msg.type === 'GOSSIP_PACKET') {
        const packet = msg.payload;
        if (!packet || !packet.zahir || !packet.batin) return;

        const { channelId, messageId, senderId, senderPrefix } = packet.zahir;
        const rawContent = (packet.batin.content || '').trim();

        // 1. Strict Scope Check: ONLY respond in DMs targeting antigravity
        const isTargetedDm = channelId === 'dm-antigravity' ||
                             channelId.includes('antigravity') ||
                             packet.zahir.encryptionMeta?.targetPeer === 'antigravity@mesh';

        if (!isTargetedDm) return; // Ignore all public channels!
        if (senderId === 'antigravity@mesh' || senderPrefix === 'antigravity') return; // Ignore self
        if (processedMessages.has(messageId)) return;
        processedMessages.add(messageId);

        console.log(`[AntigravityBot] 📩 Received DM prompt from @${senderPrefix || senderId} in ${channelId}: "${rawContent.substring(0, 60)}..."`);

        // Send typing indicator
        ws.send(JSON.stringify({
          type: 'TYPING',
          payload: { channelId }
        }));

        // Retrieve conversation history
        if (!conversationHistory.has(channelId)) {
          conversationHistory.set(channelId, []);
        }
        const history = conversationHistory.get(channelId);

        // Generate AI Response
        const aiResponse = await callDeepSeekChat(history, rawContent);

        // Update history
        history.push({ role: 'user', content: rawContent });
        history.push({ role: 'assistant', content: aiResponse });

        // Dispatch response packet
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
    } catch(e) {
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
