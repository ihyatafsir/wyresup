const https = require('https');
const fs = require('fs');
const path = require('path');

// Load environment variables
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
  console.log(`[Swarm] 🤖 Launching ${agentName}...`);
  return new Promise((resolve) => {
    const data = JSON.stringify({
      model: 'deepseek-v4-pro',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.25,
      max_tokens: 3000
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
            console.log(`[Swarm] ✅ ${agentName} completed audit.`);
            resolve(parsed.choices[0].message.content);
          } else {
            console.error(`[Swarm] ⚠️ ${agentName} API error:`, body);
            resolve(`Error response from ${agentName}: ${body}`);
          }
        } catch (e) {
          resolve(`Exception in ${agentName}: ${e.message}`);
        }
      });
    });

    req.on('error', (err) => {
      console.error(`[Swarm] ❌ ${agentName} network error:`, err.message);
      resolve(`Network error in ${agentName}: ${err.message}`);
    });

    req.write(data);
    req.end();
  });
}

async function runLisanSwarmAudit() {
  console.log('========================================================================');
  console.log('  🏛️  WYRESUP LISAN AL-ARAB DEEPSEEK MULTI-AGENT SWARM AUDIT           ');
  console.log('========================================================================\n');

  const zbatCode = fs.readFileSync(path.join(__dirname, '../src/mesh/ZbatCrypto.js'), 'utf8');
  const lisanCode = fs.readFileSync(path.join(__dirname, '../src/mesh/LisanEngine.js'), 'utf8');
  const wakilCode = fs.readFileSync(path.join(__dirname, '../src/mesh/WakilOnion.js'), 'utf8');
  const appCode = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8').substring(0, 8000);

  const agents = [
    {
      name: 'Agent-1: Lisan Lexicographer (عَالِمُ اللِّسَان)',
      systemPrompt: 'You are an expert Arabic lexicographer specializing in Ibn Manzur\'s Lisan al-Arab. Evaluate WyreSup\'s 13-layer protocol taxonomy and propose etymological and morphological enhancements with the intent of continuous improvement.',
      userPrompt: 'Audit the Lisan al-Arab terminology and linguistic mappings in LisanEngine.js:\n\n' + lisanCode.substring(0, 4000) + '\n\nProvide 3 concrete linguistic and structural improvements grounded in classical Arabic lexicon.'
    },
    {
      name: 'Agent-2: Miftah Cryptographer (عَقْدُ المِفْتَاح)',
      systemPrompt: 'You are an advanced cryptographer specializing in Authenticated Key Exchange (AKE), RFC 5869 HKDF-SHA256, P-256 ECDH, and ECDSA digital signatures. Audit WyreSup with the intent of improvement.',
      userPrompt: 'Audit the key exchange, HKDF, ECDSA signatures, and TOFU key pinning implementation:\n\n' + zbatCode.substring(0, 5000) + '\n\nProvide 3 concrete cryptographic improvements.'
    },
    {
      name: 'Agent-3: Thaqb Ratchet Engineer (الثَّقْبُ والحَبْك)',
      systemPrompt: 'You are an expert in Double Ratchet protocols, forward secrecy, post-compromise break-in recovery, and out-of-order skipped key cache management.',
      userPrompt: 'Audit the Habk & Thaqb Double Ratchet logic in ZbatCrypto.js:\n\n' + zbatCode.substring(5000, 10000) + '\n\nProvide 3 actionable improvements for forward secrecy and ratchet state resilience.'
    },
    {
      name: 'Agent-4: Al-Sabk Zero-Copy Architect (الصَّبْكُ والقَالَب)',
      systemPrompt: 'You are a high-performance systems engineer specializing in zero-copy binary serialization, SIMD alignment, and wire-speed packet framing.',
      userPrompt: 'Audit the Al-Sabk packed binary framing and 48-byte Qālab header in ZbatCrypto.js:\n\n' + zbatCode.substring(10000, 15000) + '\n\nProvide 3 optimizations for memory layout, SIMD vectorization, and wire throughput.'
    },
    {
      name: 'Agent-5: Wakil Onion Relay Auditor (الوَكِيلُ والمِظَلَّة)',
      systemPrompt: 'You are an anonymity and onion routing specialist auditing layered relay systems for anti-tagging, anti-replay, and constant-length wire properties.',
      userPrompt: 'Audit the Wakil 3-hop layered relay implementation in WakilOnion.js:\n\n' + wakilCode + '\n\nProvide 3 actionable improvements for anonymity, payload integrity, and replay defenses.'
    },
    {
      name: 'Agent-6: Nagham Acoustic Physicist (النَّغَمُ والرَّمْز)',
      systemPrompt: 'You are a digital signal processing (DSP) and acoustic cryptography expert specializing in Goertzel dual-tone multi-frequency (DTMF) decoding and Short Authentication Strings (SAS).',
      userPrompt: 'Audit the Nagham DTMF SAS encoding in ZbatCrypto.js:\n\n' + zbatCode.substring(18000, 23000) + '\n\nProvide 3 recommendations for acoustic SAS verification, false-positive noise resilience, and visual/audio UX.'
    },
    {
      name: 'Agent-7: WebCrypto Browser Lead (تَطْبِيقُ المَتْصَفَّح)',
      systemPrompt: 'You are a principal Web frontend security engineer auditing public/app.js for fail-closed error handling, TOFU key management, and P2P WebRTC data channel performance.',
      userPrompt: 'Audit the browser crypto dispatch, fail-closed DM policy, and TOFU key pinning in public/app.js:\n\n' + appCode + '\n\nProvide 3 actionable frontend security and UX improvements.'
    }
  ];

  const results = [];
  for (const agent of agents) {
    const output = await callDeepSeek(agent.name, agent.systemPrompt, agent.userPrompt);
    results.push({ name: agent.name, output });
  }

  console.log('\n[Swarm] 👑 Launching Master Arbiter Synthesis...');
  const synthesisInput = results.map(r => '### ' + r.name + '\n' + r.output).join('\n\n');
  const masterSynthesis = await callDeepSeek(
    'Agent-Supreme: Master Arbiter Synthesis (المُحَكِّمُ الأَعْلَى)',
    'You are the Supreme Cryptographic & Linguistic Arbiter for the WyreSup sovereign decentralized mesh. Synthesize all agent audit findings into a prioritized, actionable improvement plan grounded in Ibn Manzur\'s Lisan al-Arab.',
    'Here are the findings from all specialized swarm agents:\n\n' + synthesisInput + '\n\nProduce a comprehensive, structured master audit synthesis report with a prioritized improvement roadmap.'
  );

  const reportDir = '/home/absolut7/.gemini/antigravity-ide/brain/565c1210-a8e9-44ff-9ba8-0427cbea30e7';
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, 'lisan_deepseek_swarm_audit_report.md');
  const fullReport = '# 🏛️ WyreSup Lisan al-Arab DeepSeek Swarm Audit & Improvement Report\n\n' +
    '**Audit Date:** ' + new Date().toUTCString() + '\n' +
    '**Methodology:** Multi-Agent Swarm guided by Ibn Manzur\'s *Lisān al-\'Arab* (لسان العرب)\n\n---\n\n' +
    '## 👑 Master Arbiter Synthesis & Priority Roadmap\n\n' + masterSynthesis + '\n\n---\n\n' +
    '## 🔬 Specialized Agent Findings\n\n' +
    results.map(r => '### 🤖 ' + r.name + '\n\n' + r.output + '\n\n---\n').join('\n');

  fs.writeFileSync(reportPath, fullReport, 'utf8');
  console.log('\n🎉 SWARM AUDIT COMPLETE! Full report saved to: ' + reportPath);
}

runLisanSwarmAudit().catch(err => {
  console.error('Swarm audit execution failed:', err);
  process.exit(1);
});
