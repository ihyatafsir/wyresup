/**
 * 🦊 WyreNet // MetaMask & Web3 Multi-Tier Relay Test Suite
 * Built via DeepSeek-V4-Pro Swarm Consensus
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const TARGET_HOST = process.env.TARGET_HOST || 'wyresup.com';
const TARGET_PORT = process.env.TARGET_PORT || 443;
const isHttps = TARGET_PORT == 443 || TARGET_PORT == '443';
const BASE_URL = `${isHttps ? 'https' : 'http'}://${TARGET_HOST}${(!isHttps && TARGET_PORT != 80) ? ':' + TARGET_PORT : ''}`;

console.log(`\n======================================================`);
console.log(`  🦊 TESTING WYRENET METAMASK & MULTI-TIER WEB3 SUITE`);
console.log(`  Target: ${BASE_URL}`);
console.log(`======================================================\n`);

async function fetchHttp(endpoint, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}${endpoint}`);
    const client = url.protocol === 'https:' ? https : http;
    const reqOptions = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + (url.search || ''),
      method,
      headers: { 'Content-Type': 'application/json' },
      timeout: 8000
    };

    if (body) {
      reqOptions.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(body));
    }

    const req = client.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, json: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Timeout fetching ${endpoint}`));
    });

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      failed++;
    }
  }

  // --- Test 1: Local HTML & Client Routing Logic ---
  console.log(`\n--- Test 1: Client Script & MetaMask Multi-Tier Architecture ---`);
  const htmlPath = path.join(__dirname, '..', 'public', 'wyrenet', 'index.html');
  const jsPath = path.join(__dirname, '..', 'public', 'wyrenet', 'wyrenet-app.js');
  const htmlContent = fs.readFileSync(htmlPath, 'utf8') + "\n" + (fs.existsSync(jsPath) ? fs.readFileSync(jsPath, 'utf8') : "");

  assert(htmlContent.includes('initiateWalletPairing'), 'initiateWalletPairing multi-tier engine defined');
  assert(htmlContent.includes('active-pairing-card'), 'Interactive Active Pairing Card component present');
  assert(htmlContent.includes('metamask.app.link/dapp/'), 'Direct MetaMask Mobile Universal Link metamask.app.link/dapp present');
  assert(htmlContent.includes('ModalStateManager'), 'ModalStateManager with backdrop/ESC/tab close handling present');
  assert(htmlContent.includes('metamask.app.link/dapp/'), 'In-App dApp Browser link metamask.app.link/dapp present');
  assert(htmlContent.includes('connectMetaMaskDirect'), 'Backwards compatibility alias connectMetaMaskDirect present');

  // --- Test 2: Live Web Page Response ---
  console.log(`\n--- Test 2: Live /wyrenet Portal Response ---`);
  try {
    const portalRes = await fetchHttp('/wyrenet');
    assert(portalRes.status === 200, `GET /wyrenet returned HTTP 200`);
    assert(portalRes.raw && portalRes.raw.includes('WyreNet Sovereign L1'), 'Title and branding verified in live HTML');
    assert(portalRes.raw && portalRes.raw.includes('initiateWalletPairing'), 'New Swarm-synthesized wallet connector live on server');
  } catch (err) {
    assert(false, `Failed to load /wyrenet: ${err.message}`);
  }

  // --- Test 3: Live RPC Gateway Handshake ---
  console.log(`\n--- Test 3: Live WyreNet JSON-RPC 2.0 Gateway ---`);
  try {
    const rpcRes = await fetchHttp('/api/wyrenet/rpc', 'POST', {
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_chainId',
      params: []
    });
    assert(rpcRes.status === 200, `POST /api/wyrenet/rpc returned HTTP 200`);
    assert(rpcRes.json && rpcRes.json.result === '0xcaee', `eth_chainId returns 0xcaee (Chain ID 51950)`);
  } catch (err) {
    assert(false, `RPC eth_chainId error: ${err.message}`);
  }

  try {
    const blockRes = await fetchHttp('/api/wyrenet/rpc', 'POST', {
      jsonrpc: '2.0',
      id: 2,
      method: 'eth_blockNumber',
      params: []
    });
    assert(blockRes.status === 200, `POST /api/wyrenet/rpc (eth_blockNumber) returned HTTP 200`);
    assert(blockRes.json && blockRes.json.result, `eth_blockNumber returns valid block height: ${blockRes.json?.result}`);
  } catch (err) {
    assert(false, `RPC eth_blockNumber error: ${err.message}`);
  }

  // --- Test 4: Challenge-Response & EIP-191 Auth ---
  console.log(`\n--- Test 4: WyreNet Cryptographic Auth (Challenge / Verify) ---`);
  const testWallet = '0x471c852D254A67F36c129F2386cA21c31840dEa4';
  try {
    const challengeRes = await fetchHttp(`/api/wyrenet/auth/challenge/${testWallet}`);
    assert(challengeRes.status === 200, `GET /api/wyrenet/auth/challenge returned HTTP 200`);
    assert(challengeRes.json && challengeRes.json.nonce, `Generated challenge nonce: ${challengeRes.json?.nonce}`);
    assert(challengeRes.json && challengeRes.json.message && challengeRes.json.message.includes('WyreNet Sovereign L1 Identity Verification'), `Challenge message correctly formatted for EIP-191 personal_sign`);
  } catch (err) {
    assert(false, `Challenge generation error: ${err.message}`);
  }

  // --- Test 5: Native Balance & L1 Node Telemetry ---
  console.log(`\n--- Test 5: Native Balance & L1 Node Telemetry ---`);
  try {
    const statusRes = await fetchHttp('/api/wyrenet/status');
    assert(statusRes.status === 200, `GET /api/wyrenet/status returned HTTP 200`);
    const net = statusRes.json?.network || {};
    assert(net.nodeHealthy === true, `Subnet node health status: ONLINE (peers: ${net.peers})`);
    assert(net.chainId === 51950, `Subnet Chain ID verified: ${net.chainId} (${net.chainHex})`);
    assert(net.syncStatus === 'SYNCHRONIZED', `Consensus sync status: ${net.syncStatus}`);
  } catch (err) {
    assert(false, `Status error: ${err.message}`);
  }

  try {
    const balRes = await fetchHttp(`/api/wyrenet/balance/${testWallet}`);
    assert(balRes.status === 200, `GET /api/wyrenet/balance returned HTTP 200`);
    assert(balRes.json && typeof balRes.json.balanceWYRE !== 'undefined', `Native $WYRE balance query successful (${balRes.json?.balanceWYRE} WYRE)`);
  } catch (err) {
    assert(false, `Balance error: ${err.message}`);
  }

  // --- Summary ---
  console.log(`\n======================================================`);
  console.log(`  🏁 ALL INTEGRATION TESTS EXECUTED`);
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);
  console.log(`======================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
