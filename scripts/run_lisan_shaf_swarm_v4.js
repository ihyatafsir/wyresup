/**
 * DeepSeek Swarm v4.0: Lisān al-'Arab Lexical Analysis & Mobile ISP Symmetric NAT Solver
 * Resolving One-Sided Cellular Video/Voice Calls through Classical Arabic Root Paradigms (شَفْع / نَفَق / صَبْك / وَصْل)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// 1. Load API Key from .env
let DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const envPath = path.join(__dirname, '..', '.env');
if (!DEEPSEEK_API_KEY && fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const match = line.match(/^DEEPSEEK_API_KEY=(.+)$/);
    if (match) {
      DEEPSEEK_API_KEY = match[1].trim();
      break;
    }
  }
}

if (!DEEPSEEK_API_KEY) {
  console.error('[Error] DEEPSEEK_API_KEY not found in environment or .env file.');
  process.exit(1);
}

// 2. Define the 6 Specialized Swarm Agents
const AGENTS = [
  {
    name: 'Ibn-Manzur-Lexicographer',
    role: 'Classical Arabic Lexicographer & Morphological Architect',
    domain: 'Lisān al-Arab root analysis for (ش-ف-ع / ن-ف-ق / ص-ب-ك / و-ص-ل)',
    prompt: `You are Ibn Manzur, master author of Lisān al-'Arab (لسان العرب).
Analyze the classical Arabic roots:
1. (ش-ف-ع) الشَّفْعُ: ضِدُّ الوَتْرِ، وَهُوَ الزَّوْجُ — How pairing and dual symmetry governs bidirectional full-duplex communication.
2. (ن-ف-ق) النَّفَقُ: سَرَبٌ فِي الأَرْضِ لَهُ مَخْلَصٌ إِلَى مَكَانٍ آخَرَ — Subterranean sovereign tunneling bypassing cellular ISP barriers.
3. (ص-ب-ك) الصَّبْكُ: إِفْرَاغُ المَعْدِنِ فِي القَالَبِ — Zero-copy binary stream casting without serialization overhead.
4. (و-ص-ل) الوَصْلُ: ضِدُّ الفَصْلِ، الاتِّصَالُ الدَّائِمُ — Unbroken continuous bidirectional session binding.
Derive the linguistic, conceptual, and protocol architecture of 'Nizām al-Shaf' al-Matīn' (نظام الشفع المتين) to solve one-sided mobile ISP cellular calls.`
  },
  {
    name: 'Cellular-CGNAT-Specialist',
    role: 'Mobile ISP CGNAT & Asymmetric UDP Pinholing Engineer',
    domain: 'Cellular ISP NAT asymmetry, one-sided UDP streaming, and STUN/TURN traversal',
    prompt: `Analyze why two mobile smartphones on cellular 4G/5G data connections (Vodafone, Swisscom, Orange, T-Mobile) experience "one-sided video/audio" during WebRTC calls:
1. Explain asymmetric NAT pinholing (one carrier drops incoming UDP while the other allows outbound).
2. Detail how mobile browser SDP negotiation (sendrecv vs sendonly/recvonly) fails on mobile Chrome/Safari when getUserMedia encounters partial permissions or background tab throttling.
3. Formulate how an explicit Dual-Conduit Relay architecture (Nizām al-Shaf') bypasses asymmetric CGNAT firewalls with 100% mathematical certainty.`
  },
  {
    name: 'Al-Sabk-Binary-Multiplexer',
    role: 'Zero-Copy Binary Stream Engine Architect',
    domain: 'Framing two-way Video (JPEG/WebP/VP8) and Audio (16-bit PCM) over WebSocket',
    prompt: `Design the binary wire protocol for Nizām al-Shaf' (نظام الشفع) using Al-Sabk (الصَّبْك) zero-copy headers:
1. Define a 32-byte binary header: [Magic 2B: 0x53 0x42] [StreamType 1B: Audio=0x01, Video=0x02, Control=0x03] [ConduitID 1B: Shaf_A=0x10, Shaf_B=0x20] [Seq 4B] [Timestamp 8B] [PayloadLen 4B] [AuthTag 12B].
2. Calculate wire bandwidth for 48kHz 16-bit PCM audio (~32 KB/s) + 15 FPS mobile video (~80 KB/s) = ~112 KB/s total wire budget.
3. Demonstrate why this guarantees two-way audio and video between any two smartphones on cellular data with zero third-party STUN/TURN dependencies.`
  },
  {
    name: 'Mobile-WebAudio-Resilience-Engineer',
    role: 'Mobile Browser Autoplay & AudioContext Pipeline Specialist',
    domain: 'Chrome/Safari AudioContext unlock, ScriptProcessor/AudioWorklet, and linear PCM resampling',
    prompt: `Analyze the client-side audio pipeline on Android Chrome and iOS Safari:
1. How to ensure both phones unlock AudioContext and start sending/receiving audio immediately upon tapping 'Accept'.
2. Explain the high-fidelity linear resampling algorithm (44.1kHz <-> 48kHz) to prevent audio distortion or drift between different phone hardware.
3. Provide the exact JavaScript implementation pattern for seamless dual-stream playback without glitching or clipping.`
  },
  {
    name: 'Sphinx-Wakil-Security-Auditor',
    role: 'Zero-Knowledge Cryptographic & E2EE Auditor',
    domain: 'ChaCha20-Poly1305 & AES-256-GCM authenticated media tunneling',
    prompt: `Audit the cryptographic integrity of Nizām al-Shaf' over the WyreSup mesh:
1. Verify that all binary media frames (both Shaf' A and Shaf' B) are encrypted end-to-end using symmetric session keys derived via ECDH (Miftah).
2. Prove that the relay hub (10.10.10.10) acts as a pure Zero-Knowledge forwarder (Wakil) with zero ability to inspect, tamper with, or eavesdrop on video/voice payloads.
3. Validate anti-replay sequence tracking and forward secrecy enforcement.`
  },
  {
    name: 'Chief-Synthesis-Architect',
    role: 'Chief Protocol & Implementation Synthesizer',
    domain: 'Master synthesis, complete architectural specification, and code deployment plan',
    prompt: `Synthesize the findings from all 5 agents into a master implementation blueprint for 'Nizām al-Shaf' al-Matīn' (نظام الشفع المتين):
1. Executive summary of root causes of one-sided mobile cellular calls.
2. Complete Lisān al-Arab classical derivation table.
3. Step-by-step full-duplex dual-conduit protocol flow diagram.
4. Exact JavaScript client & server code integration blueprint for immediate deployment on WyreSup.`
  }
];

// Helper: Query DeepSeek API
function queryDeepSeek(prompt, roleTitle) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: `You are ${roleTitle}. Provide rigorous, deep technical analysis, mathematical precision, classical Arabic derivations, and exact code implementations.` },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 3000
    });

    const req = https.request({
      hostname: 'api.deepseek.com',
      path: '/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: 90000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.choices && parsed.choices[0]) {
            resolve(parsed.choices[0].message.content);
          } else {
            reject(new Error(parsed.error?.message || 'Empty response from DeepSeek'));
          }
        } catch (e) {
          reject(new Error(`JSON Parse Error: ${e.message} | Raw: ${data.substring(0, 100)}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('DeepSeek API request timed out after 90s'));
    });

    req.write(payload);
    req.end();
  });
}

async function runSwarm() {
  console.log('================================================================');
  console.log('  🚀 Launching DeepSeek Swarm v4.0: Lisān al-Arab Shaf\' Audit');
  console.log('  Resolving Mobile ISP One-Sided Cellular Video/Audio Traversal');
  console.log('================================================================\n');

  const results = {};

  for (let i = 0; i < AGENTS.length; i++) {
    const agent = AGENTS[i];
    console.log(`[Agent ${i+1}/${AGENTS.length}] 🤖 Querying ${agent.name} (${agent.role})...`);
    try {
      const output = await queryDeepSeek(agent.prompt, `${agent.name} - ${agent.role}`);
      results[agent.name] = output;
      console.log(`  ✓ Received ${output.length} characters of rigorous analysis from ${agent.name}\n`);
    } catch (err) {
      console.error(`  ✗ Error querying ${agent.name}:`, err.message);
      results[agent.name] = `Error: ${err.message}`;
    }
  }

  // Generate Master Markdown Artifact
  let report = `# 📜 Lisān al-'Arab Swarm v4.0: Nizām al-Shaf' al-Matīn (نظام الشفع المتين)\n\n`;
  report += `**Audit Focus:** Complete Resolution of One-Sided Mobile ISP Cellular Calls via Classical Arabic Lexical Architecture\n`;
  report += `**Timestamp:** ${new Date().toISOString()}\n\n`;
  report += `---\n\n`;

  for (const [name, content] of Object.entries(results)) {
    report += `## 🏛️ Agent Report: ${name}\n\n${content}\n\n---\n\n`;
  }

  const outputPath = path.join(__dirname, '..', 'lisan_deepseek_swarm_v4_shaf_report.md');
  fs.writeFileSync(outputPath, report, 'utf8');
  console.log(`🎉 Master synthesis report generated successfully at: ${outputPath}`);
}

runSwarm().catch(err => {
  console.error('Fatal Swarm Error:', err);
  process.exit(1);
});
