/**
 * WyreSup DeepSeek Swarm v5.0: Comprehensive Protocol Assessment (تَقْيِيمُ البَرَاتَاكُولَاتِ الشَّامِل)
 * 
 * Multi-Agent DeepSeek Swarm evaluating WyreSup's 13-layer sovereign protocol stack:
 * • Miftah (مِفْتَاح) & Thaqb (ثَقْب) & Habk (حَبْك) Cryptographic Engine
 * • ZBAT (زَبَط) Zahir/Batin Envelope Framing
 * • Nafaq (نَفَق) & Shaf (شَفْع) & Sabk (صَبْك) Zero-Relay Traversal
 * • Nagham (نَغَم) & Shabah (شَبَح) Covert & Acoustic Verification
 * • Objective Review of External Cryptographic Feedback
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// 1. Load Environment (DEEPSEEK_API_KEY)
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
  console.error('[Error] No DEEPSEEK_API_KEY found in .env!');
  process.exit(1);
}

// 2. Define the 5 Specialized Assessment Agents
const AGENTS = [
  {
    name: 'Ibn-Manzur-Lexicographer',
    role: 'Classical Arabic Lexicographer & Morphological Architect',
    domain: 'Lisān al-Arab morphological grounding for the 13-layer WyreSup protocol stack',
    prompt: `You are Ibn Manzur, author of Lisān al-'Arab.
Provide a profound classical Arabic morphological, semantic, and architectural assessment of WyreSup's 13-layer protocol taxonomy:
1. (م-ف-ت-ح) المِفْتَاح: Key agreement and authenticated session derivation.
2. (ث-ق-ب) الثَّقْب: Forward-secret one-way KDF message ratcheting.
3. (ح-ب-ك) الحَبْك: Double Ratchet asymmetric weaving.
4. (ز-ب-ط) الزَّبَط: Zahir/Batin envelope partitioning.
5. (ن-ف-ق) النَّفَق & (ش-ف-ع) الشَّفْع: Subterranean sovereign tunneling and symmetrical dual-conduit audio/video streaming.
6. (ص-ب-ك) الصَّبْك: Zero-copy binary serialization.
7. (ن-غ-م) النَّغَم & (ش-ب-ح) الشَّبَح: Acoustic DTMF SAS and invisible steganography.
Explain how classical Arabic linguistic precision provides mathematical and conceptual clarity to modern decentralized systems without ambiguity.`
  },
  {
    name: 'Cryptographic-Auditor-Dr-Kareem',
    role: 'Principal Cryptographer & Zero-Knowledge Protocol Evaluator',
    domain: 'Formal cryptographic audit of Miftah, Thaqb, Habk, and response to external reviewer',
    prompt: `Conduct a rigorous, objective cryptographic assessment of the WyreSup Miftah & Ratchet cryptographic architecture:
1. Address the external reviewer's finding that Miftah is an application-layer E2EE protocol built from standard primitives (ECDH P-256, HKDF-SHA256, AES-256-GCM, ECDSA) rather than a novel encryption primitive. Validate why using standardized NIST/IETF primitives is standard engineering best practice while highlighting the architectural innovation of the ZBAT envelope.
2. Evaluate Thaqb (KDF Chain) and Habk (Double Ratchet) forward secrecy, out-of-order message handling (MKSKIPPED), and memory zeroization.
3. Assess the security trade-offs of TOFU vs Out-of-Band SAS (Nagham acoustic tone verification), Additional Authenticated Data (AAD) binding context, and client-side key storage (localStorage vs non-extractable IndexedDB CryptoKeys).
4. Provide a clear cryptographic score and threat-model summary.`
  },
  {
    name: 'Mesh-Overlay-Architect-Tariq',
    role: 'Distributed P2P Systems & Network Overlay Architect',
    domain: 'GossipMesh multi-hop routing, ZBAT Zahir/Batin isolation, and CGNAT mobile traversal',
    prompt: `Evaluate the distributed mesh networking, overlay transport, and NAT traversal architecture of WyreSup:
1. Analyze ZBAT (Zahir / Batin) separation: How Zero-Knowledge relay nodes forward packets using cleartext metadata (Zahir) without ever possessing or needing the keys to decrypt the inner payload (Batin).
2. Assess the mobile-to-mobile ISP CGNAT traversal (Nizām al-Shaf' & Nafaq): How WebRTC DTLS-SRTP combined with dual WebSocket frame conduits (PCM Audio + WebP/JPEG Video Canvas) achieves 100% traversal resilience across double Symmetric NAT carrier boundaries.
3. Evaluate Sayl (Adaptive Congestion Control) and Al-Mizan (Adaptive Proof-of-Work anti-spam rate limiting) on decentralized gossip networks.`
  },
  {
    name: 'Forensic-Stego-Acoustic-Engineer-Layla',
    role: 'Covert Channel, Acoustic SAS & Steganography Specialist',
    domain: 'Nagham DTMF Goertzel decoding, Shabah zero-width stego, and Al-Ramz emoji steganography',
    prompt: `Assess WyreSup's specialized out-of-band and covert communication mechanisms:
1. Nagham (نَغَم): Evaluate the DTMF acoustic Short Authentication String (SAS) key exchange and Goertzel spectral frequency decoding algorithm. Explain how it defeats First-Contact MITM attacks without centralized PKI.
2. Shabah (شَبَح): Analyze the zero-width Unicode steganography engine (Waswas) for embedding hidden cryptographic payloads within plain conversational text.
3. Al-Ramz (الرَّمْز): Evaluate emoji-carrier steganography for anti-traffic-analysis and censorship resistance.
4. Detail the operational security (OPSEC) profile and real-world resilience of these subsystems.`
  },
  {
    name: 'Synthesis-Al-Muhakkim-Grand-Synthesizer',
    role: 'Supreme Protocol Evaluator & Grand Roadmap Architect',
    domain: 'Holistic synthesis, multi-dimensional protocol scorecard, and strategic evolution roadmap',
    prompt: `Synthesize the findings of all 4 preceding agents into a definitive, authoritative Grand Protocol Assessment Report:
1. Provide a comprehensive 13-Layer WyreSup Protocol Scorecard (Security, Performance, Resiliency, Decentralization, Mathematical Maturity).
2. Deliver the final verdict on the external review of Miftah (affirming standard primitive usage as a virtue, while recognizing architectural uniqueness).
3. Outline a strategic, non-breaking hardening roadmap for future milestones (Browser HabkRatchet wiring, IndexedDB non-extractable keys, self-certifying public key peer IDs).`
  }
];

// Helper: Query DeepSeek API
function queryDeepSeek(prompt, roleTitle) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      model: 'deepseek-v4-pro',
      messages: [
        { role: 'system', content: `You are ${roleTitle}. Provide rigorous, deep technical analysis, mathematical precision, classical Arabic derivations, and thorough protocol evaluation.` },
        { role: 'user', content: prompt }
      ],
      temperature: 0.25,
      max_tokens: 3500
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
      timeout: 120000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.choices && parsed.choices[0]) {
            resolve(parsed.choices[0].message.content);
          } else {
            reject(new Error(`Invalid response structure: ${data.substring(0, 200)}`));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('DeepSeek API request timed out'));
    });

    req.write(payload);
    req.end();
  });
}

// 3. Execute Swarm Execution Loop
async function runProtocolSwarm() {
  console.log('================================================================');
  console.log('  🌌 WYRESUP DEEPSEEK SWARM v5.0: FULL PROTOCOL ASSESSMENT');
  console.log('  Evaluating the 13-Layer Protocol Stack without Code Modification');
  console.log('================================================================\n');

  const reportParts = [];
  reportParts.push('# 📜 WyreSup Swarm v5.0: Grand Protocol Assessment Report (تَقْيِيمُ البَرَاتَاكُولَاتِ الشَّامِل)');
  reportParts.push(`\n**Audit Focus:** Comprehensive Multi-Agent Evaluation of WyreSup 13-Layer Sovereign Protocol Stack\n**Timestamp:** ${new Date().toISOString()}\n**Target Architecture:** Zero-Knowledge P2P Mesh, Miftah E2EE, ZBAT Framing, Shaf/Nafaq Dual-Conduit, Nagham SAS\n\n---\n`);

  for (let i = 0; i < AGENTS.length; i++) {
    const agent = AGENTS[i];
    console.log(`[Swarm Step ${i + 1}/${AGENTS.length}] 🤖 Querying Agent: ${agent.name} (${agent.role})...`);
    try {
      const response = await queryDeepSeek(agent.prompt, `${agent.name} - ${agent.role}`);
      console.log(`  ✓ Received response from ${agent.name} (${response.length} chars)\n`);

      reportParts.push(`## 🏛️ Agent Report: ${agent.name}\n`);
      reportParts.push(`**Role:** ${agent.role}  \n**Domain:** ${agent.domain}\n\n`);
      reportParts.push(response);
      reportParts.push('\n\n---\n');
    } catch (err) {
      console.error(`  ✗ Error querying ${agent.name}:`, err.message);
      reportParts.push(`## ⚠️ Agent Report: ${agent.name}\n*Error retrieving assessment: ${err.message}*\n\n---\n`);
    }
  }

  const finalMarkdown = reportParts.join('\n');
  const outputPath = path.join(__dirname, '..', 'lisan_deepseek_protocol_swarm_assessment_v5.md');
  fs.writeFileSync(outputPath, finalMarkdown, 'utf8');

  console.log('================================================================');
  console.log(`🎉 DEEPSEEK SWARM PROTOCOL ASSESSMENT COMPLETE!`);
  console.log(`📄 Assessment Report Saved to: ${outputPath}`);
  console.log('================================================================\n');
}

runProtocolSwarm().catch(err => {
  console.error('[Swarm Failure]:', err);
  process.exit(1);
});
