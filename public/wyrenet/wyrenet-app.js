
function extractAccountFromSession(session) {
  if (!session) return null;
  if (session.namespaces?.eip155?.accounts?.length) {
    const raw = session.namespaces.eip155.accounts[0];
    const parts = raw.split(":");
    return parts[parts.length - 1];
  }
  if (session.session?.namespaces?.eip155?.accounts?.length) {
    const raw = session.session.namespaces.eip155.accounts[0];
    const parts = raw.split(":");
    return parts[parts.length - 1];
  }
  if (Array.isArray(session.accounts) && session.accounts.length) {
    return session.accounts[0];
  }
  return null;
}

// ============================================================
// 🔺 WYRENET SOVEREIGN L1 // UNISWAP-STYLE WEB3 RELAY ENGINE
// ============================================================

const WYRENET_CHAIN_ID_DEC = 51950;
const WYRENET_CHAIN_ID_HEX = '0xCAEE';
const WC_PROJECT_ID = '3a8170812b534d0ff9d794f19a901d64';

function getWyreNetConfig() {
  const origin = (typeof window !== 'undefined' && window.location.origin) ? window.location.origin : 'http://10.10.10.10:5195';
  let primaryRpc = origin + '/api/wyrenet/rpc';
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    primaryRpc = 'http://10.10.10.10:5195/api/wyrenet/rpc';
  }
  return {
    chainId: WYRENET_CHAIN_ID_HEX,
    chainName: 'WyreNet Sovereign L1',
    nativeCurrency: { name: 'WyreNet Token', symbol: 'WYRE', decimals: 18 },
    rpcUrls: [
      primaryRpc,
      'http://10.10.10.10:5195/api/wyrenet/rpc',
      'http://localhost:5195/api/wyrenet/rpc',
      'https://wyresup.com/api/wyrenet/rpc'
    ],
    blockExplorerUrls: [origin + '/api/wyrenet/status']
  };
}
const WYRENET_CONFIG = getWyreNetConfig();

let userWallet = (typeof localStorage !== 'undefined' && localStorage.getItem('wyresup_user_wallet')) || null;
let activeProvider = null;
let wcProvider = null;
let currentWcUri = null;
let currentSelectedWalletType = 'metamask';
let manifestData = null;

// Lisan Diagnostic Engine State
window.getLisanDiagnosticStatus = function() {
  return {
    connected: !!userWallet,
    userWallet: userWallet || 'NOT_CONNECTED',
    chain: 'WyreNet Sovereign L1 (Chain ID 51950 / 0xCAEE)',
    protocol: 'Barq+ZBAT P2P Lisan Gateway',
    version: 'v1.3.0',
    timestamp: new Date().toISOString()
  };
};

// Toast Notification System
function showToast(msg, icon = '🔔') {
  const toast = document.getElementById('wyre-toast');
  const msgEl = document.getElementById('wyre-toast-msg');
  const iconEl = document.getElementById('wyre-toast-icon');
  if (!toast || !msgEl) return;
  msgEl.textContent = msg;
  if (iconEl) iconEl.textContent = icon;
  toast.classList.add('show');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 4000);
}

// Modal State Manager
const ModalStateManager = {
  activeModal: null,
  openModal(modalId) {
    this.closeAllModals();
    let modal = document.getElementById(modalId);
    if (!modal && modalId === "uniswap-connect-modal") modal = document.getElementById("uniswap-wallet-modal");
    if (!modal && modalId === "uniswap-wallet-modal") modal = document.getElementById("uniswap-connect-modal");
    if (modal) {
      modal.style.display = 'flex';
      modal.classList.add("active");
      document.body.style.overflow = "hidden";
      this.activeModal = modal.id;
    }
  },
  closeModal(modalId) {
    const targetId = modalId || this.activeModal;
    if (targetId) {
      let modal = document.getElementById(targetId);
      if (!modal && targetId === "uniswap-connect-modal") modal = document.getElementById("uniswap-wallet-modal");
      if (!modal && targetId === "uniswap-wallet-modal") modal = document.getElementById("uniswap-connect-modal");
      if (modal) {
        modal.classList.remove("active");
        modal.style.display = 'none';
      }
      if (this.activeModal === targetId || (modal && this.activeModal === modal.id)) this.activeModal = null;
      if (!document.querySelector(".uni-modal-overlay.active")) {
        document.body.style.overflow = "";
      }
    }
    this.resetPairingCard();
  },
  closeAllModals() {
    document.querySelectorAll(".uni-modal-overlay").forEach(m => {
      m.classList.remove("active");
      m.style.display = 'none';
    });
    document.body.style.overflow = "";
    this.activeModal = null;
    this.resetPairingCard();
  },
  resetPairingCard() {
    const card = document.getElementById("active-pairing-card");
    const optionsList = document.getElementById("wallet-options-list");
    const title = document.getElementById("modal-dynamic-title");
    if (card) card.style.display = "none";
    if (optionsList) optionsList.style.display = "flex";
    if (title) title.textContent = "Connect a wallet";
  }
};

window.openUniswapModal = function() {
  if (userWallet) {
    window.openAccountModal();
    return;
  }
  ModalStateManager.openModal("uniswap-wallet-modal");
  checkInjectedProvider();
};

window.closeUniswapModal = function() {
  ModalStateManager.closeModal("uniswap-wallet-modal");
};

window.openAccountModal = function() {
  const addrEl = document.getElementById('drawer-account-addr');
  if (addrEl && userWallet) {
    addrEl.textContent = userWallet.substring(0, 6) + '...' + userWallet.substring(userWallet.length - 4);
  }
  ModalStateManager.openModal('uniswap-account-modal');
};

window.closeAccountModal = function() {
  ModalStateManager.closeModal('uniswap-account-modal');
};

window.closePairingCard = function() {
  ModalStateManager.resetPairingCard();
};

window.copyCurrentAddress = function() {
  if (!userWallet) return;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(userWallet).then(() => {
      showToast('Address copied to clipboard!', '📋');
    }).catch(() => {
      prompt('Copy address:', userWallet);
    });
  } else {
    prompt('Copy address:', userWallet);
  }
};

window.disconnectWallet = async function() {
  userWallet = null;
  window.userWallet = null;
  activeProvider = null;
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('wyresup_user_wallet');
  }
  if (wcProvider && wcProvider.disconnect) {
    try { await wcProvider.disconnect(); } catch (e) {}
  }
  ModalStateManager.closeAllModals();
  updateTelemetry();
  showToast('Wallet disconnected', '🔌');
};

// Check Injected Web3 Provider (EIP-6963 / window.ethereum / window.avalanche)
function checkInjectedProvider() {
  const provider = window.avalanche || window.ethereum;
  const banner = document.getElementById('uni-injected-banner');
  const bannerTitle = document.getElementById('injected-banner-title');
  const bannerIcon = document.getElementById('injected-banner-icon');
  if (provider && banner) {
    banner.style.display = 'flex';
    if (window.avalanche && bannerTitle) {
      bannerTitle.textContent = 'Detected Core Wallet';
      if (bannerIcon) bannerIcon.textContent = '🔺';
    } else if (provider.isMetaMask && bannerTitle) {
      bannerTitle.textContent = 'Detected MetaMask Extension';
      if (bannerIcon) bannerIcon.textContent = '🦊';
    } else if (bannerTitle) {
      bannerTitle.textContent = 'Detected Browser Wallet';
      if (bannerIcon) bannerIcon.textContent = '⚡';
    }
  } else if (banner) {
    banner.style.display = 'none';
  }
}

// EIP-6963 Multi-Injected Provider Discovery
const discoveredEip6963Providers = new Map();

async function syncActiveWalletState() {
  if (userWallet) {
    updateTelemetry();
    return;
  }

  // 1. Check local storage
  const saved = (typeof localStorage !== "undefined") && localStorage.getItem("wyresup_user_wallet");
  if (saved && saved.startsWith("0x")) {
    handleConnectedAccount(saved, activeProvider);
    return;
  }

  // 2. Check WalletConnect provider instance
  if (wcProvider) {
    const sessionAcc = extractAccountFromSession(wcProvider.session) || (wcProvider.accounts && wcProvider.accounts[0]);
    if (sessionAcc && sessionAcc.startsWith("0x")) {
      handleConnectedAccount(sessionAcc, wcProvider);
      return;
    }
    try {
      const accs = await wcProvider.request({ method: "eth_accounts" });
      if (accs && accs.length > 0 && accs[0].startsWith("0x")) {
        handleConnectedAccount(accs[0], wcProvider);
        return;
      }
    } catch (e) {}
  }

  // 3. Check Injected Provider
  const injected = window.ethereum || window.avalanche;
  if (injected && injected.request) {
    try {
      const accs = await injected.request({ method: "eth_accounts" });
      if (accs && accs.length > 0 && accs[0].startsWith("0x")) {
        handleConnectedAccount(accs[0], injected);
        return;
      }
    } catch (e) {}
  }
}
window.syncActiveWalletState = syncActiveWalletState;

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      console.log("📱 Chrome returned to foreground — syncing active wallet state...");
      syncActiveWalletState();
    }
  });
}
if (typeof window !== "undefined") {
  window.addEventListener("focus", () => syncActiveWalletState());
  window.addEventListener("pageshow", () => syncActiveWalletState());
}

if (typeof window !== 'undefined') {
  syncActiveWalletState();
  window.addEventListener('eip6963:announceProvider', (event) => {
    const { info, provider } = event.detail || {};
    if (info && provider && !discoveredEip6963Providers.has(info.uuid)) {
      discoveredEip6963Providers.set(info.uuid, { info, provider });
      renderDiscoveredWallets();
    }
  });
  window.dispatchEvent(new Event('eip6963:requestProvider'));
}

function renderDiscoveredWallets() {
  const container = document.getElementById('discovered-wallets-list');
  if (!container || discoveredEip6963Providers.size === 0) return;
  container.innerHTML = '';
  container.style.display = 'flex';
  discoveredEip6963Providers.forEach((entry) => {
    const btn = document.createElement('button');
    btn.className = 'wallet-btn-card';
    btn.innerHTML = `
      <div style="display: flex; align-items: center; gap: 14px;">
        <img src="${entry.info.icon}" alt="${entry.info.name}" style="width: 32px; height: 32px; border-radius: 8px; object-fit: contain;">
        <div>
          <div class="wallet-title">${entry.info.name}</div>
          <div class="wallet-desc">Browser Extension (EIP-6963)</div>
        </div>
      </div>
      <span class="uni-card-badge">READY</span>
    `;
    btn.onclick = () => window.connectInjectedNow(entry.provider);
    container.appendChild(btn);
  });
}

// QR Code Renderer
function renderQrCode(containerId, text) {
  const qrEl = document.getElementById(containerId);
  if (!qrEl) return;
  qrEl.innerHTML = '';
  if (typeof QRCode !== 'undefined') {
    try {
      new QRCode(qrEl, {
        text: text,
        width: 140,
        height: 140,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: (typeof QRCode !== 'undefined' && QRCode.CorrectLevel) ? QRCode.CorrectLevel.M : undefined
      });
    } catch (e) {
      console.warn('QRCode render error:', e);
    }
  }
}

// Handle Connected Account (Universal)
function handleConnectedAccount(address, provider) {
  if (!address) return;
  userWallet = address;
  window.userWallet = address;
  activeProvider = provider || window.ethereum || window.avalanche;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('wyresup_user_wallet', userWallet);
  }
  ModalStateManager.closeAllModals();
  updateTelemetry();
  showToast('Connected: ' + userWallet.substring(0, 6) + '...' + userWallet.substring(userWallet.length - 4), '✅');

  // Auto-prompt WyreNet L1 Network switch/addition in background
  setTimeout(async () => {
    try {
      if (activeProvider && activeProvider.request) {
        await activeProvider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: WYRENET_CHAIN_ID_HEX }]
        });
      }
    } catch (switchErr) {
      try {
        if (activeProvider && activeProvider.request) {
          await activeProvider.request({
            method: 'wallet_addEthereumChain',
            params: [WYRENET_CONFIG]
          });
        }
      } catch (addErr) {
        console.log('Chain add note:', addErr);
      }
    }
  }, 600);
}

// Direct Injected Provider Connect (Desktop / In-App Browser)
window.connectInjectedNow = async function(customProvider) {
  const provider = customProvider || window.avalanche || window.ethereum;
  if (!provider) {
    showToast('No Web3 wallet extension detected.', '⚠️');
    return;
  }

  try {
    showToast('Requesting wallet authorization...', '⚡');
    const accounts = await provider.request({ method: 'eth_requestAccounts' });
    if (!accounts || accounts.length === 0) {
      showToast('No accounts returned by wallet.', '⚠️');
      return;
    }
    handleConnectedAccount(accounts[0], provider);
  } catch (err) {
    console.error('Wallet connection error:', err);
    if (!err.message?.includes('User rejected')) {
      showToast('Notice: ' + (err.message || err), '⚠️');
    }
  }
};

// ============================================================
// EXACT UNISWAP MOBILE ↔ METAMASK WALLETCONNECT V2 RELAY ENGINE
// ============================================================

async function initWcRelayProvider() {
  if (typeof window.WalletConnectEthereumProvider === 'undefined') {
    console.warn('WalletConnect EthereumProvider bundle not found');
    return null;
  }

  if (!wcProvider) {
    try {
      wcProvider = await window.WalletConnectEthereumProvider.init({
        projectId: WC_PROJECT_ID,
        chains: [1],
        optionalChains: [WYRENET_CHAIN_ID_DEC, 43114],
        showQrModal: false,
        rpcMap: {
          51950: window.location.origin + '/api/wyrenet/rpc',
          43114: 'https://api.avax.network/ext/bc/C/rpc',
          1: 'https://cloudflare-eth.com'
        },
        metadata: {
          name: 'WyreNet Sovereign L1',
          description: 'WyreNet Sovereign L1 Portal',
          url: 'https://wyresup.com',
          icons: ['https://wyresup.com/favicon.ico']
        }
      });

      // EXACT UNISWAP EVENT: Live wc:... pairing URI from relay
      wcProvider.on('display_uri', (uri) => {
        console.log('⚡ [WalletConnect Relay] Live WC Pairing URI:', uri);
        currentWcUri = uri;
        
        // Render Live QR Code
        renderQrCode('active-pairing-qrcode', uri);

        const encoded = encodeURIComponent(uri);
        const type = currentSelectedWalletType || 'metamask';

        let scheme = 'metamask://wc?uri=' + encoded;
        let universal = 'https://metamask.app.link/wc?uri=' + encoded;

        if (type === 'core') {
          scheme = 'core://wc?uri=' + encoded;
          universal = 'https://core.app/wc?uri=' + encoded;
        } else if (type === 'trust') {
          scheme = 'trust://wc?uri=' + encoded;
          universal = 'https://link.trustwallet.com/wc?uri=' + encoded;
        } else if (type === 'rainbow') {
          scheme = 'rainbow://wc?uri=' + encoded;
          universal = 'https://rnbwapp.com/wc?uri=' + encoded;
        } else if (type === 'walletconnect') {
          scheme = uri;
          universal = uri;
        }

        const launchBtn = document.getElementById('pairing-launch-btn');
        const universalBtn = document.getElementById('pairing-universal-btn');
        if (launchBtn) launchBtn.href = scheme;
        if (universalBtn) universalBtn.href = universal;

        // On mobile browsers, auto-navigate to native universal link
        const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
        if (isMobile) {
          showToast('Opening ' + (type === 'core' ? 'Core' : 'MetaMask') + '...', '📱');
          setTimeout(() => {
            window.location.href = universal;
          }, 100);
        }
      });

      wcProvider.on('connect', (session) => {
        console.log('⚡ [WalletConnect Relay] Session Approved:', session);
        const addr = extractAccountFromSession(session) || (wcProvider.accounts && wcProvider.accounts[0]);
        if (addr && addr.startsWith("0x")) {
          handleConnectedAccount(addr, wcProvider);
        } else {
          setTimeout(() => syncActiveWalletState(), 100);
          setTimeout(() => syncActiveWalletState(), 400);
          setTimeout(() => syncActiveWalletState(), 1000);
        }
      });

      wcProvider.on('session_update', (session) => {
        console.log('⚡ [WalletConnect Relay] Session Updated:', session);
        const addr = extractAccountFromSession(session) || (wcProvider.accounts && wcProvider.accounts[0]);
        if (addr && addr.startsWith("0x")) handleConnectedAccount(addr, wcProvider);
      });

      wcProvider.on('accountsChanged', (accs) => {
        if (accs && accs.length > 0) {
          handleConnectedAccount(accs[0], wcProvider);
        } else {
          window.disconnectWallet();
        }
      });

      wcProvider.on('disconnect', () => {
        console.log('⚡ [WalletConnect Relay] Session Disconnected');
        window.disconnectWallet();
      });

    } catch (err) {
      console.warn('WalletConnect Provider init error:', err);
    }
  }
  return wcProvider;
}

// Unified Pairing Initiator for all Wallet cards
window.initiateWalletPairing = async function(walletType = 'metamask') {
  currentSelectedWalletType = walletType;
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  const host = window.location.host || '10.10.10.10:5195';
  const currentUrl = window.location.origin + '/wyrenet';

  // 1. If Desktop Extension is present and user isn't on mobile, connect instantly
  const injected = (walletType === 'core' && window.avalanche) ? window.avalanche : (window.ethereum || window.avalanche);
  if (injected && !isMobile) {
    showToast('Connecting via detected browser wallet...', '⚡');
    window.connectInjectedNow(injected);
    return;
  }

  // 2. Setup Pairing Sheet UI
  const card = document.getElementById('active-pairing-card');
  const optionsList = document.getElementById('wallet-options-list');
  const title = document.getElementById('modal-dynamic-title');
  const launchBtn = document.getElementById('pairing-launch-btn');
  const universalBtn = document.getElementById('pairing-universal-btn');
  const inappLink = document.getElementById('pairing-inapp-link');
  const nameEl = document.getElementById('pairing-wallet-name');
  const iconEl = document.getElementById('pairing-wallet-icon');
  const btnIconEl = document.getElementById('pairing-btn-icon');
  const btnTextEl = document.getElementById('pairing-btn-text');

  let walletName = 'MetaMask';
  let walletIcon = '🦊';
  let inappDeepLink = 'https://metamask.app.link/dapp/' + host + '/wyrenet';

  if (walletType === 'core') {
    walletName = 'Core Wallet';
    walletIcon = '🔺';
    inappDeepLink = 'https://core.app/dapp/' + host + '/wyrenet';
  } else if (walletType === 'trust') {
    walletName = 'Trust Wallet';
    walletIcon = '🛡️';
    inappDeepLink = 'https://link.trustwallet.com/open_url?coin_id=60&url=' + encodeURIComponent(currentUrl);
  } else if (walletType === 'coinbase') {
    walletName = 'Coinbase Wallet';
    walletIcon = '🔵';
    inappDeepLink = 'https://go.cb-w.com/dapp?cb_url=' + encodeURIComponent(currentUrl);
  } else if (walletType === 'walletconnect') {
    walletName = 'WalletConnect';
    walletIcon = '⚡';
  }

  if (title) title.textContent = 'Pairing ' + walletName;
  if (nameEl) nameEl.textContent = walletName + ' Pairing';
  if (iconEl) iconEl.textContent = walletIcon;
  if (btnIconEl) btnIconEl.textContent = walletIcon;
  if (btnTextEl) btnTextEl.textContent = 'Open in ' + walletName + ' App';
  if (inappLink) inappLink.href = inappDeepLink;

  if (optionsList) optionsList.style.display = 'none';
  if (card) {
    card.style.display = 'flex';
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Temporary placeholder QR code while relay prepares pairing URI
  renderQrCode('active-pairing-qrcode', currentUrl);

  // 3. Request Live WalletConnect Relay Pairing URI
  try {
    showToast('Contacting WalletConnect Relay...', '⚡');
    const provider = await initWcRelayProvider();
    if (provider) {
      provider.connect().then((accs) => {
        console.log('⚡ [WalletConnect Relay] connect() resolved accounts:', accs);
        const addr = (Array.isArray(accs) && accs[0]) || (provider.accounts && provider.accounts[0]) || extractAccountFromSession(provider.session);
        if (addr && addr.startsWith("0x")) {
          handleConnectedAccount(addr, provider);
        }
      }).catch(e => {
        console.log('Relay connect note:', e.message);
      });
    }
  } catch (e) {
    console.warn('Pairing trigger note:', e);
  }
};

// Individual Wallet Shortcuts
window.connectMetaMaskDirect = () => window.initiateWalletPairing('metamask');
window.connectCoreDirect = () => window.initiateWalletPairing('core');
window.connectTrustDirect = () => window.initiateWalletPairing('trust');
window.connectWalletFlow = (type) => window.initiateWalletPairing(type);
window.connectWalletConnectProduction = () => window.initiateWalletPairing('walletconnect');

// Copy Pairing URI Button Helper
window.copyWcUri = function() {
  if (!currentWcUri) {
    showToast('Waiting for pairing URI from relay...', '⏳');
    return;
  }
  if (navigator.clipboard) {
    navigator.clipboard.writeText(currentWcUri).then(() => {
      showToast('Copied WalletConnect URI! Paste in your wallet.', '📋');
    }).catch(() => {
      prompt('Copy WalletConnect URI:', currentWcUri);
    });
  } else {
    prompt('Copy WalletConnect URI:', currentWcUri);
  }
};

// Quick Account Selection for Testing / Genesis
window.quickSetWallet = function(addr) {
  userWallet = addr;
  window.userWallet = addr;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('wyresup_user_wallet', addr);
  }
  ModalStateManager.closeAllModals();
  updateTelemetry();
  showToast('Loaded account: ' + addr.substring(0, 6) + '...' + addr.substring(addr.length - 4), '🔑');
};

window.saveManualWallet = function() {
  const input = document.getElementById('manual-wallet-input');
  if (!input) return;
  const addr = input.value.trim();
  if (addr && addr.startsWith('0x') && addr.length >= 40) {
    window.quickSetWallet(addr);
  } else {
    showToast('Please enter a valid 0x... EVM address', '⚠️');
  }
};

// Network Switcher / Helper (EIP-3085 & EIP-3326)
window.addWyreNetChain = async function() {
  const provider = activeProvider || window.avalanche || window.ethereum;
  if (!provider || !provider.request) {
    showToast('Connect a wallet or copy RPC settings below', 'ℹ️');
    window.copyRpcDetails();
    return;
  }

  try {
    showToast('Adding WyreNet Sovereign L1 to wallet...', '🔺');
    await provider.request({
      method: 'wallet_addEthereumChain',
      params: [WYRENET_CONFIG]
    });
    showToast('WyreNet Sovereign L1 added successfully!', '✅');
  } catch (err) {
    console.warn('Add chain error:', err);
    if (err.code === 4902 || err.message?.includes('Unrecognized chain')) {
      try {
        await provider.request({
          method: 'wallet_addEthereumChain',
          params: [WYRENET_CONFIG]
        });
      } catch (e2) {
        showToast('Failed to add chain: ' + (e2.message || e2), '⚠️');
      }
    } else {
      window.copyRpcDetails();
    }
  }
};

window.copyRpcDetails = function() {
  const currentOrigin = (typeof window !== "undefined" && window.location.origin) ? window.location.origin : "http://10.10.10.10:5195";
  const details = `Network Name: WyreNet Sovereign L1\nRPC URL: ${currentOrigin}/api/wyrenet/rpc\nChain ID: 51950 (0xCAEE)\nCurrency: WYRE\nExplorer: ${currentOrigin}/api/wyrenet/status`;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(details).then(() => {
      showToast("Copied WyreNet RPC configuration!", "📋");
    }).catch(() => {
      prompt("WyreNet RPC Config:", details);
    });
  } else {
    prompt("WyreNet RPC Config:", details);
  }
};

// ============================================================
// EVENT LISTENERS: BACKDROP CLICKS, ESC KEY, TABS
// ============================================================

if (typeof document !== 'undefined') {
  document.querySelectorAll('.uni-modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        ModalStateManager.closeModal(overlay.id);
      }
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      ModalStateManager.closeAllModals();
    }
  });

  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      ModalStateManager.closeAllModals();
      document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      const targetSec = document.getElementById(btn.dataset.target);
      if (targetSec) targetSec.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  document.getElementById('btn-uniswap-connect')?.addEventListener('click', () => {
    window.openUniswapModal();
  });
}

// Telemetry & State Polling
async function updateTelemetry() {
  try {
    const res = await fetch('/api/wyrenet/status');
    const data = await res.json();
    if (data.network) {
      const hEl = document.getElementById('val-block-height');
      const pEl = document.getElementById('val-peers');
      const waslEl = document.getElementById('val-lisan-wasl');
      if (hEl) hEl.textContent = '#' + (data.network.blockHeight || 289);
      if (pEl) pEl.textContent = (data.network.peers || 54) + ' Nodes';
      if (waslEl) waslEl.textContent = userWallet ? 'مَوْصُولٌ سَيِّدِيّ 🛡️' : 'بِانْتِظَارِ الرَّبْط ⏳';
    }
  } catch (e) {}

  const btnConnect = document.getElementById('btn-uniswap-connect');
  if (userWallet) {
    if (btnConnect) {
      btnConnect.classList.add('connected');
      btnConnect.innerHTML = `<span class="live-dot" style="background: var(--accent-green);"></span> 🛡️ ${userWallet.substring(0, 6)}...${userWallet.substring(userWallet.length - 4)}`;
    }
    try {
      const balRes = await fetch('/api/wyrenet/balance/' + userWallet);
      const bal = await balRes.json();
      const balText = (bal.balanceWYRE || '1,000,000.0000') + ' WYRE';
      const uBalEl = document.getElementById('val-user-bal');
      const dBalEl = document.getElementById('drawer-account-bal');
      if (uBalEl) uBalEl.textContent = balText;
      if (dBalEl) dBalEl.textContent = balText;
    } catch (e) {}
  } else {
    if (btnConnect) {
      btnConnect.classList.remove('connected');
      btnConnect.innerHTML = '⚡ Connect Wallet';
    }
    const uBalEl = document.getElementById('val-user-bal');
    if (uBalEl) uBalEl.textContent = '0.0000 WYRE';
  }
}

// Channels List & Minting
const defaultChannels = [
  { id: 'general', name: '#general', arabic: 'العامّة', topic: 'Mesh-wide broadcasts', block: 289 },
  { id: 'imam-razi', name: '#imam-razi', arabic: 'مكتبة الإمام الرازي', topic: 'Quranic Lexicon & Tafsir Ledger', block: 289 },
  { id: 'p2p-ops', name: '#p2p-ops', arabic: 'عمليات النظير', topic: 'ZBAT & Nafaq route metrics', block: 289 }
];

window.renderChannelsList = function() {
  const container = document.getElementById('channels-list-container');
  if (!container) return;
  container.innerHTML = '';
  defaultChannels.forEach(c => {
    const el = document.createElement('div');
    el.className = 'channel-card';
    el.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
        <div style="font-weight: 800; font-size: 0.95rem; color: #fff;">${c.name} <span class="arabic-subtext" style="color: var(--accent-gold); font-size: 0.9rem; margin-left: 6px;">${c.arabic}</span></div>
        <span class="uni-card-badge" style="font-size: 0.65rem;">BLOCK #${c.block}</span>
      </div>
      <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 8px;">${c.topic}</div>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 0.72rem; color: var(--accent-green); font-family: var(--font-mono);">● Live Sovereign State</span>
        <button class="btn-pill btn-pill-green" style="padding: 4px 10px; font-size: 0.72rem;" onclick="showToast('Subscribed to ${c.name}', '📡')">Join Channel</button>
      </div>
    `;
    container.appendChild(el);
  });
};

if (typeof document !== 'undefined') {
  (document.getElementById("btn-submit-channel") || document.getElementById("btn-mint-channel"))?.addEventListener('click', async () => {
    const cid = document.getElementById('input-chan-id').value.trim();
    const name = document.getElementById('input-chan-name').value.trim();
    const topic = document.getElementById('input-chan-topic').value.trim();
    if (!cid || !name) { showToast('Please enter Channel Identifier and Name', '⚠️'); return; }

    const res = await fetch('/api/wyrenet/notarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'CHANNEL_CREATION',
        channelId: cid,
        channelName: name,
        topic: topic,
        creator: userWallet || '0x471c852D254A67F36c129F2386cA21c31840dEa4'
      })
    });
    const data = await res.json();
    const rec = document.getElementById('receipt-channel');
    if (rec) {
      rec.style.display = 'block';
      rec.innerHTML = `✅ <strong>Anchored on WyreNet L1!</strong><br>Tx: ${data.txHash}<br>Block: #${data.blockNumber || 289}`;
    }

    defaultChannels.unshift({ id: cid, name: '#' + cid, arabic: name, topic: topic || name, block: data.blockNumber || 289 });
    window.renderChannelsList();
    showToast('Channel successfully minted on WyreNet L1!', '✅');
  });
}

// EPUB Library Loader
async function loadEpubs() {
  try {
    const res = await fetch('/epubs/wyrenet_imam_razi_l1_manifest.json');
    if (res.ok) {
      manifestData = await res.json();
      renderEpubCards(manifestData.books);
    }
  } catch (e) { console.error('EPUB manifest error:', e); }
}

function renderEpubCards(books) {
  const container = document.getElementById('epubs-list-container');
  if (!container || !books) return;
  container.innerHTML = '';
  books.forEach(b => {
    const el = document.createElement('div');
    el.className = 'epub-card';
    el.innerHTML = `
      <div class="epub-title">${b.title}</div>
      <div class="epub-arabic">${b.arabicTitle}</div>
      <div class="epub-meta">
        <span>📚 ${b.category}</span>
        <span>⚖️ ${(b.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB</span>
        <span>⛓️ Block #${b.blockNumber || 289}</span>
      </div>
      <div style="font-family: var(--font-mono); font-size: 0.65rem; color: #718096; word-break: break-all; margin-bottom: 12px; background: rgba(0,0,0,0.3); padding: 4px 6px; border-radius: 6px;">
        SHA: ${b.sha256.substring(0, 24)}...
      </div>
      <div class="epub-actions">
        <a href="/epubs/${b.filename}" class="btn-pill btn-pill-green" style="flex: 1; justify-content: center; text-decoration: none;">⬇️ Download</a>
        <button class="btn-pill btn-pill-red" onclick="verifyHashDirect('${b.sha256}')">🛡️ Verify</button>
      </div>
    `;
    container.appendChild(el);
  });
}

function filterEpubs() {
  if (!manifestData || !manifestData.books) return;
  const q = (document.getElementById('search-epubs')?.value || '').toLowerCase();
  const activeCat = document.querySelector('.chip.active')?.dataset.cat || 'all';

  const filtered = manifestData.books.filter(b => {
    const matchesQ = b.filename.toLowerCase().includes(q) || b.category.toLowerCase().includes(q) || b.title.toLowerCase().includes(q);
    const matchesCat = (activeCat === 'all') || (activeCat === 'Tafsir' && b.filename.includes('tafsir_kabir')) ||
                       (activeCat === 'Matalib' && b.filename.includes('matalib')) ||
                       (activeCat === 'Mahsul' && b.filename.includes('mahsul')) ||
                       (activeCat === 'Futuhat' && b.filename.includes('futuhat')) ||
                       (activeCat === 'Lisan' && b.filename.includes('lisan'));
    return matchesQ && matchesCat;
  });
  renderEpubCards(filtered);
}

if (typeof document !== 'undefined') {
  document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      filterEpubs();
    });
  });
  document.getElementById('search-epubs')?.addEventListener('input', filterEpubs);

  // Notary & Proof Verifier
  document.getElementById('btn-anchor-custom')?.addEventListener('click', async () => {
    const text = document.getElementById('notary-content-input').value.trim();
    if (!text) { showToast('Please enter text or manuscript proof to anchor', '⚠️'); return; }
    const res = await fetch('/api/wyrenet/notarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: text,
        signer: userWallet || '0x471c852D254A67F36c129F2386cA21c31840dEa4',
        type: 'CUSTOM_NOTARIZATION'
      })
    });
    const data = await res.json();
    const rec = document.getElementById('receipt-notary');
    if (rec) {
      rec.style.display = 'block';
      rec.innerHTML = `✅ <strong>Notarized on WyreNet L1!</strong><br>Tx: ${data.txHash}<br>Block: #${data.blockNumber || 289}`;
    }
    showToast('Notarization permanently recorded on WyreNet!', '⚓');
  });

  document.getElementById('btn-run-verify')?.addEventListener('click', () => {
    const h = document.getElementById('verify-hash-input').value.trim();
    if (h) verifyHashDirect(h);
  });
}

async function verifyHashDirect(hash) {
  const el = document.getElementById("result-verify") || document.getElementById("verify-result");
  if (!el) return;
  el.style.display = 'block';
  el.innerHTML = '⏳ Verifying hash on WyreNet Sovereign L1 Ledger...';
  try {
    const res = await fetch('/api/wyrenet/verify/' + hash);
    const data = await res.json();
    if (data.verified) {
      el.style.color = '#68d391';
      el.innerHTML = `✅ <strong>LEDGER VERIFIED IMMUTABLE</strong><br>Record: ${data.record.title || data.record.filename}<br>Anchor Block: #${data.record.blockNumber}<br>Tx: ${data.record.txHash}`;
    } else {
      el.style.color = '#fc8181';
      el.innerHTML = `❌ <strong>TAMPERED OR NOT FOUND ON LEDGER</strong>`;
    }
  } catch (e) {
    el.style.color = '#fc8181';
    el.innerHTML = 'Error: ' + e.message;
  }
}

async function testRpc(method) {
  const out = document.getElementById('rpc-output');
  if (!out) return;
  out.textContent = 'Executing ' + method + '...';
  try {
    const res = await fetch('/api/wyrenet/rpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params: [] })
    });
    const data = await res.json();
    out.textContent = JSON.stringify(data, null, 2);
  } catch (e) { out.textContent = 'Error: ' + e.message; }
}

// Auto-run on load
if (typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)) {
  const mib = document.getElementById('mobile-info-banner');
  if (mib) mib.style.display = 'block';
}

if (typeof window !== 'undefined') {
  updateTelemetry();
  window.renderChannelsList();
  loadEpubs();
  checkInjectedProvider();
  setInterval(updateTelemetry, 5000);

  // Auto-connect inside in-app wallet browsers (MetaMask, Core, Trust)
  if (window.ethereum || window.avalanche) {
    const provider = window.ethereum || window.avalanche;
    if (provider && provider.request) {
      provider.request({ method: 'eth_accounts' }).then(accs => {
        if (accs && accs.length > 0) {
          handleConnectedAccount(accs[0], provider);
          console.log('⚡ Auto-restored Web3 session:', userWallet);
        }
      }).catch(e => {});
    }
  }
}
