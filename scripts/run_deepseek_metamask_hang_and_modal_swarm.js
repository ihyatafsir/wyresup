/**
 * 🦊 DeepSeek Swarm: MetaMask Mobile Hang ("Connecting to MetaMask...") & Modal UI Fix
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

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
  console.error('[Error] DEEPSEEK_API_KEY not found');
  process.exit(1);
}

const htmlCode = fs.readFileSync(path.join(__dirname, '..', 'public', 'wyrenet', 'index.html'), 'utf8');

const AGENTS = [
  {
    name: 'MetaMask-Mobile-Lifecycle-Specialist',
    role: 'MetaMask Mobile WebView & Deep Link Lifecycle Engineer',
    prompt: `Analyze the exact reason MetaMask mobile displays the bottom sheet "Connecting to MetaMask..." with an infinite loading spinner (as seen in user screenshot io.metamask).
Context: The user is opening the dApp or pairing via deep link.
Explain:
1. Why does MetaMask hang on "Connecting to MetaMask..." when receiving metamask://wc?uri= with an unestablished relay session vs metamask.app.link/dapp/wyresup.com/wyrenet?
2. What happens if multiple RPC requests (eth_requestAccounts -> wallet_switchEthereumChain -> personal_sign) fire in rapid succession in MetaMask mobile?
3. How to provide a bulletproof 1-tap connection inside MetaMask mobile browser and external Chrome.`
  },
  {
    name: 'UI-Modal-State-Machine-Architect',
    role: 'Frontend UI/UX & Modal Event Handling Specialist',
    prompt: `Analyze the user report: "also tabs wallet pick dont close again".
Review the modal overlay, sheet, tab navigation, close buttons, and backdrop click handlers in wyrenet/index.html.
Identify:
1. Why does clicking the close button '✕', backdrop overlay, or switching tabs fail to close or reset the wallet modal?
2. How to ensure backdrop clicks (clicking outside the modal sheet) and ESC key immediately close the modal?
3. How to reset the modal state (active-pairing-card hidden, wallet-options-list visible, dynamic title reset) whenever the modal is closed or opened?`
  },
  {
    name: 'Master-Web3-Code-Synthesizer',
    role: 'Chief Full-Stack Web3 Architect',
    prompt: `Synthesize the complete, production-ready, drop-in replacement JavaScript and HTML for the wallet connection modal and logic in public/wyrenet/index.html.
Requirements:
1. Modal must open and close flawlessly (via close button, backdrop click, ESC key, or after connection).
2. Inside MetaMask / In-App browser: auto-detect window.ethereum, show 1-click connect, handle eth_requestAccounts cleanly with NO chained rapid-fire modal freezes.
3. Outside on Mobile Chrome: Provide clean "Open in MetaMask App" (metamask.app.link/dapp/wyresup.com/wyrenet) AND fallback 0x direct entry, with no auto-firing broken fake URI redirects.
4. Provide the exact JavaScript code block and exact HTML markup.`
  }
];

async function queryDeepSeek(agent) {
  const payload = JSON.stringify({
    model: 'deepseek-chat',
    messages: [
      {
        role: 'system',
        content: `You are ${agent.name}, a world-class ${agent.role}. Provide deep, concrete, actionable technical insights and exact code.`
      },
      {
        role: 'user',
        content: `${agent.prompt}\n\nHere is the current HTML and JS code snippet from public/wyrenet/index.html:\n\`\`\`html\n${htmlCode.substring(htmlCode.indexOf('<div class=\"uni-modal-overlay\"'), htmlCode.indexOf('function renderEpubCards'))}\n\`\`\``
      }
    ],
    temperature: 0.2,
    max_tokens: 3000
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.deepseek.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: 60000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.choices?.[0]?.message?.content || data);
        } catch (e) {
          resolve(data);
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function runSwarm() {
  console.log('🚀 Running DeepSeek Swarm on MetaMask Hang & Modal Issues...');
  const results = {};
  for (const agent of AGENTS) {
    console.log(`\n⏳ Querying Agent: ${agent.name}...`);
    try {
      const resp = await queryDeepSeek(agent);
      results[agent.name] = resp;
      console.log(`✅ ${agent.name} completed assessment (${resp.length} chars)`);
    } catch (err) {
      console.error(`❌ ${agent.name} failed:`, err.message);
    }
  }

  const reportPath = path.join(__dirname, '..', 'deepseek_metamask_hang_modal_report.md');
  let fullReport = '# 🦊 DeepSeek Swarm Report: MetaMask Mobile Hang & Modal Fix\n\n';
  for (const [name, content] of Object.entries(results)) {
    fullReport += `## ${name}\n\n${content}\n\n---\n\n`;
  }
  fs.writeFileSync(reportPath, fullReport, 'utf8');
  console.log(`\n📄 Saved complete synthesis to ${reportPath}`);
}

runSwarm().catch(console.error);
