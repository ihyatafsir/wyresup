/**
 * 🏛️ WyreSup Comprehensive DeepSeek Swarm Audit (v3.0)
 * Deep inspection across Code Quality, Edge Cases, Mobile WebAudio,
 * Network CGNAT Traversal, E2EE Cryptography, and UI/UX Resilience.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Load DEEPSEEK_API_KEY from .env
if (fs.existsSync(path.join(__dirname, '../.env'))) {
  const envContent = fs.readFileSync(path.join(__dirname, '../.env'), 'utf8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match && !process.env[match[1].trim()]) {
      process.env[match[1].trim()] = match[2].trim();
    }
  }
}

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
if (!DEEPSEEK_API_KEY) {
  console.error('[Error] No DEEPSEEK_API_KEY found in .env!');
  process.exit(1);
}

async function callDeepSeek(agentName, systemPrompt, userPrompt) {
  console.log(`[Swarm-v3] 🤖 Launching ${agentName}...`);
  return new Promise((resolve) => {
    const data = JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,
      max_tokens: 3500
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
            console.log(`[Swarm-v3] ✅ ${agentName} completed audit.`);
            resolve(parsed.choices[0].message.content);
          } else {
            console.error(`[Swarm-v3] ⚠️ ${agentName} API error:`, body);
            resolve(`Error response from ${agentName}: ${body}`);
          }
        } catch (e) {
          resolve(`Exception in ${agentName}: ${e.message}`);
        }
      });
    });

    req.on('error', (err) => {
      console.error(`[Swarm-v3] ❌ ${agentName} network error:`, err.message);
      resolve(`Network error in ${agentName}: ${err.message}`);
    });

    req.write(data);
    req.end();
  });
}

async function runDeepSwarmV3() {
  console.log('========================================================================');
  console.log('  🏛️  WYRESUP COMPREHENSIVE MULTI-AGENT SWARM AUDIT (v3.0)              ');
  console.log('  Scope: Full Codebase, Mobile Audio, CGNAT, Cryptography & UX           ');
  console.log('========================================================================\n');

  const appCode = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
  const serverCode = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');

  // Extract slices for specialized agents
  const pcmAudioSlice = appCode.substring(appCode.indexOf('// --- NAFAQ'), appCode.indexOf('// --- NAFAQ') + 3500);
  const callSignalingSlice = appCode.substring(appCode.indexOf('async function handleIncomingCallSignal'), appCode.indexOf('async function handleIncomingCallSignal') + 4000);

  const agents = [
    {
      name: 'Agent-1: Edge Case Hunter & Code Quality Auditor (فَاحِصُ الثَّغَرَاتِ والأَخْطَاءِ)',
      systemPrompt: 'You are a principal JavaScript systems auditor specialized in detecting undefined variables, memory leaks, unhandled async promise rejections, and audio resource leakage in real-time Web applications.',
      userPrompt: `Audit public/app.js for potential edge case failures:
1. Review our call setup, audio routing, and teardown logic:

${pcmAudioSlice}

2. Identify any unhandled promise rejections, unclosed audio contexts, or un-cleared intervals when calls start, disconnect, or reconnect.
3. Provide concrete code fixes to make public/app.js 100% resilient.`
    },
    {
      name: 'Agent-2: Mobile Browser WebAudio & Sample Rate Specialist (خَبِيرُ صَوْتِ الجَوَّالِ والمُتَصَفَّح)',
      systemPrompt: 'You are a mobile WebAudio DSP expert specializing in Android Chrome and iOS Safari microphone handling, sample rate conversion (44.1kHz vs 48kHz), and audio context unlocking.',
      userPrompt: `Audit our containerless PCM audio streaming mechanism (startNafaqPcmStream and handleIncomingNafaqPcm):
1. In Android/iOS browsers, audio input may capture at 48000Hz or 44100Hz. How does our playback code handle sample rate differences between caller and receiver?
2. How to ensure ScriptProcessorNode / AudioWorklet does not introduce garbage collection stutter on low-end mobile devices?
3. Provide an optimized, production-grade PCM buffer conversion & resampling routine.`
    },
    {
      name: 'Agent-3: Mobile CGNAT Traversal & ICE Connection Lead (مُهَنْدِسُ الشَّبَكَاتِ واخْتِرَاقِ الحَوَاجِز)',
      systemPrompt: 'You are a WebRTC and NAT traversal expert auditing connection setup over mobile cellular networks (4G/5G).',
      userPrompt: `Audit our WebRTC + NAFAQ Dual-Mode traversal architecture:
1. How does our app handle ICE candidate trickling and ICE restarts when switching from WiFi to mobile data?
2. How to optimize TURN server candidate gathering without delaying direct P2P connections?
3. Review our 1200ms watchdog timer and recommend any fine-tuning.`
    },
    {
      name: 'Agent-4: E2EE Cryptographic Integrity Guard (حَارِسُ التَّشْفِيرِ والأَمْنِ السِّيَادِيّ)',
      systemPrompt: 'You are a cryptographic security auditor verifying NIST P-256 ECDH, BIP-0062 Low-S ECDSA, and AES-256-GCM message encryption.',
      userPrompt: `Audit WyreSup's end-to-end cryptographic implementation in ZbatCrypto and client messaging:
1. Verify that all transmitted payloads are strictly encrypted with pairwise keys.
2. Verify that message tampering (bit-flip) is rejected immediately by the GCM auth tag.
3. Provide recommendations for zero-overhead per-packet authentication.`
    },
    {
      name: 'Agent-5: UI/UX & Responsive Stage Interaction Designer (مُهَنْدِسُ التَّجْرِبَةِ والوَاجِهَات)',
      systemPrompt: 'You are a senior UI/UX engineer and design systems lead auditing the mobile responsiveness, touch targets, and visual polish of the video call stage.',
      userPrompt: `Review our video call UI layout in index.html and style.css:
1. The floating green stream title banner on mobile screens.
2. The PIP tile swap gestures and aspect ratio preservation.
3. Mobile touch targets (call buttons, mute buttons, close icons) for 48px standard touch targets.
Provide 3 UI/UX enhancements to elevate the visual experience.`
    }
  ];

  console.log('[Swarm-v3] 🚀 Dispatching all 5 audit agents in parallel...');
  const promises = agents.map(agent => 
    callDeepSeek(agent.name, agent.systemPrompt, agent.userPrompt)
      .then(output => ({ name: agent.name, output }))
  );

  const results = await Promise.all(promises);

  console.log('\n[Swarm-v3] 👑 Launching Master Arbiter Synthesis (المُحَكِّمُ الأَعْلَى)...');
  const synthesisInput = results.map(r => '### ' + r.name + '\n' + r.output).join('\n\n');
  const masterSynthesis = await callDeepSeek(
    'Agent-Supreme: Master Arbiter Synthesis (المُحَكِّمُ الأَعْلَى)',
    'You are the Supreme Arbiter of the WyreSup sovereign protocol stack. Synthesize all agent audit findings into a unified, prioritized implementation blueprint. Provide concrete code enhancements ready for immediate integration.',
    'Here are the audit findings from all 5 specialized swarm agents:\n\n' + synthesisInput + '\n\nSynthesize this into a prioritized implementation roadmap with ready-to-deploy code upgrades for public/app.js, server.js, and style.css.'
  );

  const reportDir = '/home/absolut7/.gemini/antigravity-ide/brain/565c1210-a8e9-44ff-9ba8-0427cbea30e7';
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, 'lisan_deepseek_swarm_v3_audit_report.md');
  const fullReport = '# 🏛️ WyreSup Comprehensive Swarm Audit v3.0: Full Stack Resilience & Production Hardening\n\n' +
    '**Audit Date:** ' + new Date().toUTCString() + '\n' +
    '**Swarm Roster:** 6 Specialized Agents (DeepSeek V3)\n\n---\n\n' +
    '## 👑 Master Arbiter Synthesis & Implementation Blueprint\n\n' + masterSynthesis + '\n\n---\n\n' +
    '## 🔬 Specialized Swarm Agent Audits\n\n' +
    results.map(r => '### 🤖 ' + r.name + '\n\n' + r.output + '\n\n---\n').join('\n');

  fs.writeFileSync(reportPath, fullReport, 'utf8');
  console.log('\n🎉 SWARM AUDIT V3.0 COMPLETE! Full report saved to: ' + reportPath);
}

runDeepSwarmV3().catch(err => {
  console.error('Swarm audit execution failed:', err);
  process.exit(1);
});
