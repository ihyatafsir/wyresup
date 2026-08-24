# 🦊 DeepSeek Swarm Report: MetaMask Mobile Hang & Modal Fix

## MetaMask-Mobile-Lifecycle-Specialist

# MetaMask Mobile "Connecting to MetaMask..." Infinite Spinner — Root Cause Analysis

## 1. Why MetaMask Hangs on `metamask://wc?uri=` vs `metamask.app.link/dapp/`

### The Critical Difference: **Session Establishment vs. Direct dApp Launch**

| Deep Link Type | What Happens | Failure Mode |
|---|---|---|
| `metamask://wc?uri=wc:...@2?relay-protocol=irn&symKey=...` | **Requires a live WalletConnect relay session** — the URI must be registered with the WalletConnect relay server BEFORE MetaMask opens | **Infinite spinner** because the relay session doesn't exist yet. MetaMask tries to connect to `relay.walletconnect.com` with a `symKey` that was never registered |
| `metamask.app.link/dapp/wyresup.com/wyrenet` | **Direct dApp launch** — MetaMask opens its built-in browser and loads the dApp URL | **Works instantly** because no relay session is needed; the dApp's JS runs inside MetaMask's WebView with `window.ethereum` injected |

### The Exact Technical Failure Sequence:

```javascript
// YOUR CURRENT CODE (BROKEN):
const uri = generateWcUri();  // ← Generates a FAKE URI with random topic/symKey
const encodedUri = encodeURIComponent(uri);
const nativeScheme = 'metamask://wc?uri=' + encodedUri;  // ← Opens MetaMask with unregistered URI

// What happens:
// 1. MetaMask receives metamask://wc?uri=wc:random_topic@2?relay-protocol=irn&symKey=random_key
// 2. MetaMask tries to connect to relay.walletconnect.com with this topic
// 3. Relay server says "topic not found" → MetaMask waits forever
// 4. The "Connecting to MetaMask..." bottom sheet appears with infinite spinner
```

**The `generateWcUri()` function is fundamentally broken** — it creates a random topic and symKey that were NEVER registered with the WalletConnect relay server. This is not how WalletConnect works.

### The Correct WalletConnect Flow:

```javascript
// CORRECT: Must use @walletconnect/universal-provider or @walletconnect/web3wallet
import { UniversalProvider } from '@walletconnect/universal-provider';

const provider = await UniversalProvider.init({
  projectId: 'YOUR_PROJECT_ID',  // Get from https://cloud.walletconnect.com
  relayUrl: 'wss://relay.walletconnect.com',
  metadata: {
    name: 'WyreNet',
    description: 'WyreNet Sovereign L1 dApp',
    url: 'https://wyresup.com',
    icons: ['https://wyresup.com/icon.png']
  }
});

// This creates a REAL session that's registered with the relay
const { uri, approval } = await provider.client.connect({
  pairingTopic: undefined,
  requiredNamespaces: {
    eip155: {
      methods: ['eth_sendTransaction', 'personal_sign', 'eth_requestAccounts'],
      chains: ['eip155:51950'],
      events: ['accountsChanged', 'chainChanged']
    }
  }
});

// NOW you can use this uri in metamask://wc?uri=...
const nativeScheme = 'metamask://wc?uri=' + encodeURIComponent(uri);
```

## 2. Multiple RPC Requests in Rapid Succession — The Race Condition

Your `connectInjectedNow()` function fires **3 RPC requests back-to-back**:

```javascript
// PROBLEMATIC SEQUENCE:
await provider.request({ method: 'eth_requestAccounts' });  // 1st
await provider.request({ method: 'wallet_switchEthereumChain' });  // 2nd
await provider.request({ method: 'personal_sign' });  // 3rd
```

### What Actually Happens in MetaMask Mobile:

1. **`eth_requestAccounts`** → Shows account selection modal
2. **`wallet_switchEthereumChain`** → Shows network switch modal (if chain not active)
3. **`personal_sign`** → Shows signature request modal

**The problem:** MetaMask Mobile processes these as **sequential modals**, but if the user hasn't finished approving the first request, the second one **queues up**. If the user rejects or the modal times out, the entire promise chain breaks.

### The Race Condition Failure:

```
Time 0ms:    eth_requestAccounts → MetaMask shows "Select Account" modal
Time 500ms:  wallet_switchEthereumChain → QUEUED (waiting for first approval)
Time 1000ms: personal_sign → QUEUED (waiting for second approval)

User approves account → MetaMask processes switch chain → 
User approves network → MetaMask processes personal_sign → 
User approves signature → ALL GOOD
```

**BUT if any modal is dismissed or times out:**

```
User rejects account selection → 
  eth_requestAccounts throws → 
  wallet_switchEthereumChain NEVER fires → 
  personal_sign NEVER fires → 
  Connection fails silently
```

### The Bulletproof Solution — Sequential with User Feedback:

```javascript
window.connectInjectedNow = async function(customProvider) {
  const provider = customProvider || window.avalanche || window.ethereum;
  if (!provider) {
    showToast('Web3 wallet extension not detected.', '⚠️');
    return;
  }

  try {
    // STEP 1: Request Accounts (with clear user feedback)
    showToast('Step 1/3: Requesting account access...', '👛');
    const accounts = await provider.request({ method: 'eth_requestAccounts' });
    if (!accounts || accounts.length === 0) {
      showToast('No accounts returned by wallet.', '⚠️');
      return;
    }
    userWallet = accounts[0];
    activeProvider = provider;
    localStorage.setItem('wyresup_user_wallet', userWallet);

    // STEP 2: Network Switch (with 4902 fallback)
    showToast('Step 2/3: Configuring WyreNet L1...', '⛓️');
    try {
      await provider.request({ 
        method: 'wallet_switchEthereumChain', 
        params: [{ chainId: WYRENET_CHAIN_ID_HEX }] 
      });
    } catch (switchErr) {
      if (switchErr.code === 4902 || switchErr.message?.includes('Unrecognized chain')) {
        showToast('Adding WyreNet L1 to your wallet...', '➕');
        await provider.request({ 
          method: 'wallet_addEthereumChain', 
          params: [WYRENET_CONFIG] 
        });
      }
    }

    // STEP 3: Signature (with proper error handling)
    showToast('Step 3/3: Verifying identity...', '✍️');
    try {
      const chalRes = await fetch('/api/wyrenet/auth/challenge/' + userWallet);
      if (chalRes.ok) {
        const chalData = await chalRes.json();
        const signature = await provider.request({ 
          method: 'personal_sign', 
          params: [chalData.message, userWallet] 
        });
        if (signature) {
          await fetch('/api/wyrenet/auth/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address: userWallet, signature })
          });
        }
      }
    } catch (signErr) {
      console.log('Signature notice:', signErr);
      // Don't fail the whole connection if signature fails
    }

    // FINALIZE
    window.closeUniswapModal();
    updateTelemetry();
    showToast('✅ Connected to WyreNet L1: ' + userWallet.substring(0, 6) + '...', '🛡️');

  } catch (err) {
    console.error('Connection error:', err);
    if (!err.message?.includes('User rejected')) {
      showToast('Connection: ' + (err.message || err), '⚠️');
    }
  }
};
```

## 3. Bulletproof 1-Tap Connection — The Complete Solution

### For MetaMask Mobile In-App Browser (Best UX):

```javascript
// DETECT if running inside MetaMask's in-app browser
const isMetaMaskInApp = window.ethereum?.isMetaMask && 
  /MetaMask/i.test(navigator.userAgent) && 
  window.ethereum?.isConnected?.();

// If in MetaMask browser, use injected provider directly (NO deep links needed)
if (isMetaMaskInApp) {
  // window.ethereum is ALREADY injected — just use it!
  await window.connectInjectedNow(window.ethereum);
  return;
}
```

### For External Chrome on Mobile (Deep Link with Fallback):

```javascript
window.initiateWalletPairing = async function(walletType = 'metamask') {
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  const isMetaMaskInApp = window.ethereum?.isMetaMask && /MetaMask/i.test(navigator.userAgent);
  
  // TIER 0: Already in MetaMask browser → use injected provider
  if (isMetaMaskInApp && walletType === 'metamask') {
    await window.connectInjectedNow(window.ethereum);
    return;
  }

  // TIER 1: Browser extension detected
  if ((walletType === 'metamask' || walletType === 'core') && 
      (typeof window.ethereum !== 'undefined' || typeof window.avalanche !== 'undefined')) {
    const targetProvider = (walletType === 'core' && window.avalanche) 
      ? window.avalanche 
      : (window.ethereum || window.avalanche);
    await window.connectInjectedNow(targetProvider);
    return;
  }

  // TIER 2: Mobile deep link with proper WalletConnect session
  if (isMobile) {
    // Use the UNIVERSAL LINK (not native scheme) for better reliability
    const universalLink = `https://metamask.app.link/dapp/${window.location.host}/wyrenet`;
    
    // Try universal link first (more reliable on iOS)
    window.location.href = universalLink;
    
    // Fallback to native scheme after 2 seconds if universal link fails
    setTimeout(() => {
      // Check if we're still on the page (universal link failed)
      if (document.visibilityState === 'visible') {
        const nativeScheme = `metamask://dapp/${window.location.host}/wyrenet`;
        window.location.href = nativeScheme;
      }
    }, 2000);
    
    return;
  }

  // TIER 3: Desktop → show QR code with REAL WalletConnect session
  // (Requires @walletconnect/universal-provider)
  const provider = await UniversalProvider.init({
    projectId: 'YOUR_PROJECT_ID',
    relayUrl: 'wss://relay.walletconnect.com'
  });
  
  const { uri } = await provider.client.connect({
    requiredNamespaces: {
      eip155: {
        methods: ['eth_sendTransaction', 'personal_sign', 'eth_requestAccounts'],
        chains: ['eip155:51950'],
        events: ['accountsChanged', 'chainChanged']
      }
    }
  });
  
  currentWcUri = uri;
  renderQrCode('active-pairing-qrcode', uri);
  
  // Listen for approval
  provider.on('session_delete', () => { /* handle */ });
  provider.on('display_uri', (uri) => { /* update QR */ });
};
```

### The Ultimate 1-Tap Solution — MetaMask SDK:

```javascript
// Install: npm install @metamask/sdk
import MetaMaskSDK from '@metamask/sdk';

const MMSDK = new MetaMaskSDK({
  dappMetadata: {
    name: 'WyreNet',
    url: 'https://wyresup.com',
  },
  infuraAPIKey: 'YOUR_INFURA_KEY', // Optional
  // For mobile: use the universal link
  communicationLayerPreference: 'socket',
  // This handles ALL the deep link complexity for you
  checkInstallationImmediately: false,
  storage: {
    enabled: true,
    // Use localStorage for persistence
  }
});

// 1-TAP CONNECTION:
const ethereum = MMSDK.getProvider();
const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
// MetaMask SDK handles:
// - Deep link generation
// - Universal link fallback
// - QR code display
// - Session persistence
// - All the "Connecting to MetaMask..." issues
```

## Summary of Fixes Needed:

1. **Replace `generateWcUri()`** with real WalletConnect session creation using `@walletconnect/universal-provider` or MetaMask SDK
2. **Use `metamask.app.link/dapp/`** instead of `metamask://wc?uri=` for direct dApp launches
3. **Add sequential RPC handling** with user feedback between each step
4. **Detect in-app browser** and use injected provider directly
5. **Implement proper fallback chain**: In-app browser → Extension → Universal Link → Native Scheme → QR Code

The infinite spinner happens because you're generating fake WalletConnect URIs that were never registered with the relay server. Fix this by either:
- Using the MetaMask SDK (simplest, most reliable)
- Using `@walletconnect/universal-provider` properly
- Or simply using `metamask.app.link/dapp/` for direct dApp access

---

## UI-Modal-State-Machine-Architect

# Modal State Machine Analysis & Fix

## Root Cause Analysis

The user report "also tabs wallet pick dont close again" reveals **three critical bugs** in the modal system:

### Bug 1: Missing Backdrop Click Handler
The `.uni-modal-overlay` has **no click event listener** to close when clicking outside the modal sheet. The overlay is a full-screen flex container, but clicks on the backdrop do nothing.

### Bug 2: No ESC Key Handler
There's no global `keydown` listener for the `Escape` key to close modals.

### Bug 3: No State Reset on Close
When `closeUniswapModal()` is called, it only hides the modal but **doesn't reset**:
- `active-pairing-card` remains visible
- `wallet-options-list` remains hidden
- Dynamic title stays as "Pairing METAMASK" instead of "Connect a wallet"

### Bug 4: Tab Navigation Doesn't Close Modals
The `.nav-tab` click handler switches tabs but **doesn't close any open modals**, leaving them floating over the new tab content.

---

## Complete Fix Implementation

Add this comprehensive modal state management system to your JavaScript:

```javascript
// ============================================================
// MODAL STATE MACHINE & EVENT HANDLING SYSTEM
// ============================================================

// Modal State Manager
const ModalStateManager = {
  // Track which modal is currently open
  activeModal: null,
  
  // Track if we're in pairing mode
  isPairingMode: false,
  
  // Reset wallet modal to default state
  resetWalletModalState() {
    const pairingCard = document.getElementById('active-pairing-card');
    const optionsList = document.getElementById('wallet-options-list');
    const discoveredList = document.getElementById('discovered-wallets-list');
    const injectedBanner = document.getElementById('uni-injected-banner');
    const dynamicTitle = document.getElementById('modal-dynamic-title');
    
    // Reset pairing card
    if (pairingCard) {
      pairingCard.style.display = 'none';
    }
    
    // Show wallet options list
    if (optionsList) {
      optionsList.style.display = 'flex';
    }
    
    // Reset dynamic title
    if (dynamicTitle) {
      dynamicTitle.textContent = 'Connect a wallet';
    }
    
    // Reset pairing mode flag
    this.isPairingMode = false;
    
    // Clear any pending QR codes
    const qrEl = document.getElementById('active-pairing-qrcode');
    if (qrEl) qrEl.innerHTML = '';
    
    // Reset current WC URI
    currentWcUri = null;
  },
  
  // Close all modals
  closeAllModals() {
    const walletModal = document.getElementById('uniswap-wallet-modal');
    const accountModal = document.getElementById('uniswap-account-modal');
    
    if (walletModal) walletModal.style.display = 'none';
    if (accountModal) accountModal.style.display = 'none';
    
    // Reset wallet modal state
    this.resetWalletModalState();
    
    // Clear active modal reference
    this.activeModal = null;
  },
  
  // Open a specific modal
  openModal(modalId) {
    // Close any open modals first
    this.closeAllModals();
    
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'flex';
      this.activeModal = modalId;
      
      // Add body scroll lock
      document.body.style.overflow = 'hidden';
    }
  },
  
  // Close specific modal
  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'none';
      
      // If closing wallet modal, reset its state
      if (modalId === 'uniswap-wallet-modal') {
        this.resetWalletModalState();
      }
      
      // Clear active modal if it matches
      if (this.activeModal === modalId) {
        this.activeModal = null;
        document.body.style.overflow = '';
      }
    }
  }
};

// ============================================================
// OVERRIDE EXISTING MODAL FUNCTIONS WITH STATE-AWARE VERSIONS
// ============================================================

// Override openUniswapModal
window.openUniswapModal = function() {
  if (userWallet) {
    window.openAccountModal();
    return;
  }
  
  // Reset state before opening
  ModalStateManager.resetWalletModalState();
  
  // Open the modal
  ModalStateManager.openModal('uniswap-wallet-modal');
  
  // Initialize wallet detection
  checkInjectedProvider();
  generateWcUri();
};

// Override closeUniswapModal
window.closeUniswapModal = function() {
  ModalStateManager.closeModal('uniswap-wallet-modal');
};

// Override openAccountModal
window.openAccountModal = function() {
  if (!userWallet) return;
  
  const addrEl = document.getElementById('drawer-account-addr');
  if (addrEl) {
    addrEl.textContent = userWallet.substring(0, 6) + '...' + userWallet.substring(userWallet.length - 4);
  }
  
  ModalStateManager.openModal('uniswap-account-modal');
};

// Override closeAccountModal
window.closeAccountModal = function() {
  ModalStateManager.closeModal('uniswap-account-modal');
};

// Override closePairingCard to use state manager
window.closePairingCard = function() {
  const card = document.getElementById('active-pairing-card');
  const optionsList = document.getElementById('wallet-options-list');
  const title = document.getElementById('modal-dynamic-title');
  
  if (card) card.style.display = 'none';
  if (optionsList) optionsList.style.display = 'flex';
  if (title) title.textContent = 'Connect a wallet';
  
  // Update state manager
  ModalStateManager.isPairingMode = false;
};

// Override initiateWalletPairing to track pairing mode
const originalInitiateWalletPairing = window.initiateWalletPairing;
window.initiateWalletPairing = async function(walletType = 'metamask') {
  // Set pairing mode flag
  ModalStateManager.isPairingMode = true;
  
  // Call original function
  return originalInitiateWalletPairing(walletType);
};

// ============================================================
// BACKDROP CLICK HANDLERS
// ============================================================

// Add click handlers to all modal overlays
document.querySelectorAll('.uni-modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (event) => {
    // Only close if clicking the backdrop itself, not the modal sheet
    if (event.target === overlay) {
      const modalId = overlay.id;
      ModalStateManager.closeModal(modalId);
    }
  });
});

// ============================================================
// ESC KEY HANDLER
// ============================================================

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    // Close any open modal
    ModalStateManager.closeAllModals();
    
    // Also close pairing card if open
    const pairingCard = document.getElementById('active-pairing-card');
    if (pairingCard && pairingCard.style.display === 'flex') {
      window.closePairingCard();
    }
    
    // Show toast for user feedback
    showToast('Modal closed', '🔒');
  }
});

// ============================================================
// TAB NAVIGATION - CLOSE MODALS ON TAB SWITCH
// ============================================================

// Override tab navigation to close modals
document.querySelectorAll('.nav-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    // Close all modals when switching tabs
    ModalStateManager.closeAllModals();
    
    // Existing tab switching logic
    document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.target).classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});

// ============================================================
// ADDITIONAL SAFETY: CLOSE MODALS ON WINDOW BLUR
// ============================================================

window.addEventListener('blur', () => {
  // Optional: Close modals when window loses focus
  // Uncomment if you want this behavior
  // ModalStateManager.closeAllModals();
});

// ============================================================
// INITIALIZE MODAL SYSTEM
// ============================================================

// Ensure all modals start hidden
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.uni-modal-overlay').forEach(modal => {
    modal.style.display = 'none';
  });
  
  // Reset wallet modal state
  ModalStateManager.resetWalletModalState();
});

// ============================================================
// ENHANCED PAIRING CARD CLOSE BUTTON
// ============================================================

// Add a dedicated close button to the pairing card
const pairingCard = document.getElementById('active-pairing-card');
if (pairingCard) {
  // Add a close button at the top of the pairing card
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '✕';
  closeBtn.style.cssText = `
    position: absolute;
    top: 10px;
    right: 10px;
    background: rgba(255,255,255,0.1);
    border: 1px solid var(--border-color);
    color: #fff;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    cursor: pointer;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    z-index: 10;
  `;
  closeBtn.onmouseover = () => {
    closeBtn.style.background = 'rgba(255,255,255,0.2)';
  };
  closeBtn.onmouseout = () => {
    closeBtn.style.background = 'rgba(255,255,255,0.1)';
  };
  closeBtn.onclick = () => {
    window.closePairingCard();
  };
  
  // Make pairing card position relative if not already
  pairingCard.style.position = 'relative';
  pairingCard.appendChild(closeBtn);
}

// ============================================================
// FOCUS TRAP FOR ACCESSIBILITY (OPTIONAL)
// ============================================================

// Keep focus within modal for keyboard navigation
document.addEventListener('keydown', (event) => {
  if (event.key === 'Tab' && ModalStateManager.activeModal) {
    const modal = document.getElementById(ModalStateManager.activeModal);
    if (modal) {
      const focusable = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }
});
```

---

## CSS Additions for Better Modal UX

Add these styles to your CSS for improved modal behavior:

```css
/* Modal overlay improvements */
.uni-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  z-index: 1000;
  display: none;
  align-items: center;
  justify-content: center;
  animation: modalFadeIn 0.2s ease;
}

/* Modal sheet animation */
.uni-modal-sheet {
  animation: modalSlideUp 0.3s ease;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
}

/* Close button hover state */
.uni-close-btn {
  transition: all 0.2s ease;
  cursor: pointer;
}

.uni-close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: scale(1.1);
}

/* Animations */
@keyframes modalFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes modalSlideUp {
  from {
    transform: translateY(30px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* Body scroll lock */
body.modal-open {
  overflow: hidden;
}
```

---

## Summary of Fixes

| Issue | Root Cause | Fix |
|-------|------------|-----|
| **Backdrop click doesn't close** | No click handler on `.uni-modal-overlay` | Added click listener that closes when clicking outside `.uni-modal-sheet` |
| **ESC key doesn't close** | No global keydown listener | Added `keydown` listener for `Escape` key |
| **State not reset on close** | `closeUniswapModal()` only hides modal | Created `ModalStateManager.resetWalletModalState()` that resets all UI elements |
| **Tab switch doesn't close modals** | Tab handler doesn't close modals | Added `ModalStateManager.closeAllModals()` to tab click handler |
| **Pairing card stuck** | No close button on pairing card | Added dedicated close button to pairing card |
| **Multiple modals overlap** | No modal state tracking | Added `ModalStateManager` to track and manage single active modal |

The modal system now follows a proper **state machine pattern** where:


---

## Master-Web3-Code-Synthesizer

Here's the complete, production-ready drop-in replacement for the wallet connection modal and logic:

```html
<!-- Wallet Connection Modal -->
<div class="uni-modal-overlay" id="uniswap-wallet-modal" role="dialog" aria-modal="true" aria-labelledby="modal-dynamic-title">
    <div class="uni-modal-sheet">
      
      <!-- Header -->
      <div class="uni-modal-header">
        <div class="uni-modal-title" id="modal-dynamic-title">Connect a wallet</div>
        <button class="uni-close-btn" onclick="closeUniswapModal()" aria-label="Close modal">✕</button>
      </div>

      <!-- Injected Provider Quick Connect (MetaMask / Core / Brave / In-App Browser) -->
      <div id="uni-injected-banner" style="display: none; background: rgba(0, 245, 155, 0.12); border: 1px solid var(--border-green); border-radius: 14px; padding: 12px; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="font-size: 24px;" id="injected-banner-icon">🦊</div>
          <div>
            <div style="font-weight: 800; color: #fff; font-size: 0.88rem;" id="injected-banner-title">Web3 Extension Detected</div>
            <div style="font-size: 0.72rem; color: var(--accent-green);">Ready in current browser session</div>
          </div>
        </div>
        <button onclick="connectInjectedNow()" class="btn-pill btn-pill-green" style="padding: 8px 14px; font-weight: 800;">⚡ Connect</button>
      </div>

      <!-- Discovered EIP-6963 Wallets Container -->
      <div id="discovered-wallets-list" style="display: none; flex-direction: column; gap: 8px;"></div>

      <!-- Primary Wallet Options List -->
      <div id="wallet-options-list" style="display: flex; flex-direction: column; gap: 8px;">

        <!-- 1. MetaMask -->
        <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 16px; padding: 12px 14px; display: flex; flex-direction: column; gap: 10px;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div class="wallet-icon-box">🦊</div>
              <div>
                <div class="wallet-title">MetaMask</div>
                <div class="wallet-desc">Mobile App & Browser Extension</div>
              </div>
            </div>
            <span class="uni-card-badge">POPULAR</span>
          </div>
          <div style="display: flex; gap: 8px;">
            <a href="https://metamask.app.link/dapp/wyresup.com/wyrenet" id="mm-open-app-btn" class="btn-pill btn-pill-blue" style="flex: 1; justify-content: center; text-decoration: none; padding: 8px 12px; font-size: 0.78rem;">
              📱 Open in MetaMask App
            </a>
            <button onclick="initiateWalletPairing('metamask')" class="btn-pill btn-pill-green" style="padding: 8px 12px; font-size: 0.78rem;">
              ⚡ Pair via QR
            </button>
          </div>
        </div>

        <!-- 2. Core Wallet (Ava Labs Avalanche Native) -->
        <div style="background: rgba(229, 62, 62, 0.06); border: 1px solid var(--border-active); border-radius: 16px; padding: 12px 14px; display: flex; flex-direction: column; gap: 10px;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div class="wallet-icon-box" style="background: rgba(229,62,62,0.2);">🔺</div>
              <div>
                <div class="wallet-title">Core Wallet</div>
                <div class="wallet-desc">Ava Labs Avalanche Native</div>
              </div>
            </div>
            <span class="uni-card-badge" style="background: rgba(229,62,62,0.25); color: #fc8181; border-color: rgba(229,62,62,0.4);">AVALANCHE</span>
          </div>
          <div style="display: flex; gap: 8px;">
            <a href="https://core.app/dapp/wyresup.com/wyrenet" class="btn-pill btn-pill-red" style="flex: 1; justify-content: center; text-decoration: none; padding: 8px 12px; font-size: 0.78rem;">
              📱 Open in Core App
            </a>
            <button onclick="initiateWalletPairing('core')" class="btn-pill btn-pill-green" style="padding: 8px 12px; font-size: 0.78rem;">
              ⚡ Pair
            </button>
          </div>
        </div>

        <!-- 3. WalletConnect (Universal Relay) -->
        <button class="wallet-btn-card" onclick="initiateWalletPairing('walletconnect')" style="background: linear-gradient(135deg, rgba(59, 153, 252, 0.14), rgba(27, 100, 218, 0.14)); border-color: rgba(59, 153, 252, 0.4);">
          <div style="display: flex; align-items: center; gap: 14px;">
            <div class="wallet-icon-box" style="background: rgba(59, 153, 252, 0.25); color: #60a5fa; font-size: 22px;">⚡</div>
            <div>
              <div class="wallet-title">WalletConnect</div>
              <div class="wallet-desc">Trust, Rainbow, 400+ Mobile Wallets</div>
            </div>
          </div>
          <span class="uni-card-badge" style="background: rgba(59, 153, 252, 0.25); color: #60a5fa; border-color: rgba(59, 153, 252, 0.4);">UNIVERSAL</span>
        </button>

        <!-- 4. Trust Wallet & Coinbase -->
        <div style="display: flex; gap: 8px;">
          <button class="wallet-btn-card" onclick="initiateWalletPairing('trust')" style="flex: 1; padding: 10px 12px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div class="wallet-icon-box" style="width: 32px; height: 32px; font-size: 16px;">🛡️</div>
              <div>
                <div class="wallet-title" style="font-size: 0.82rem;">Trust Wallet</div>
              </div>
            </div>
          </button>
          <button class="wallet-btn-card" onclick="initiateWalletPairing('coinbase')" style="flex: 1; padding: 10px 12px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div class="wallet-icon-box" style="width: 32px; height: 32px; font-size: 16px;">🔵</div>
              <div>
                <div class="wallet-title" style="font-size: 0.82rem;">Coinbase</div>
              </div>
            </div>
          </button>
        </div>

      </div>

      <!-- Active Pairing Sheet (Shown when user clicks Pair) -->
      <div id="active-pairing-card" style="display: none; flex-direction: column; align-items: center; gap: 14px; padding: 8px 0;">
        <div style="display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center;">
          <div id="pairing-wallet-icon" style="font-size: 36px;">🦊</div>
          <div id="pairing-wallet-name" style="font-size: 1.1rem; font-weight: 800; color: #fff;">MetaMask Pairing</div>
          <p style="color: #a0aec0; font-size: 0.78rem; max-width: 280px; margin: 0;">Scan QR with your wallet scanner or tap the direct launch button below.</p>
        </div>

        <div style="background: #fff; padding: 10px; border-radius: 14px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
          <div id="active-pairing-qrcode" style="width: 140px; height: 140px;"></div>
        </div>

        <div style="display: flex; flex-direction: column; width: 100%; gap: 8px;">
          <!-- Primary Direct Link -->
          <a id="pairing-launch-btn" href="#" target="_blank" class="btn-pill btn-pill-blue" style="width: 100%; justify-content: center; text-decoration: none; padding: 10px; font-size: 0.9rem; font-weight: 800;">
            <span id="pairing-btn-icon">🦊</span> <span id="pairing-btn-text">Open in MetaMask App</span>
          </a>

          <!-- Copy URI Button -->
          <button onclick="copyWcUri()" class="btn-pill btn-pill-green" style="width: 100%; justify-content: center; padding: 9px; font-size: 0.82rem;">
            📋 Copy Pairing URI to Clipboard
          </button>

          <!-- Universal Fallback Link -->
          <a id="pairing-universal-btn" href="#" target="_blank" style="text-align: center; color: #94a3b8; font-size: 0.75rem; text-decoration: underline; padding: 4px;">
            Open via Universal Web Link
          </a>

          <div id="pairing-inapp-box" style="width: 100%; text-align: center; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 8px; margin-top: 4px;">
            <a id="pairing-inapp-link" href="#" style="color: #a0aec0; font-size: 0.75rem; text-decoration: underline;">
              🌐 Open website inside In-App Browser instead
            </a>
          </div>
        </div>

        <button onclick="closePairingCard()" style="background: none; border: none; color: #fc8181; font-size: 0.82rem; font-weight: 700; cursor: pointer; padding: 4px 8px;">
          ← Back to All Wallets
        </button>
      </div>

      <!-- Network 1-Click Auto Add & RPC Copy -->
      <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: 14px; padding: 10px 12px; font-family: var(--font-mono); font-size: 0.72rem; display: flex; justify-content: space-between; align-items: center;">
        <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-right: 8px;">
          <strong style="color: #fff;">WyreNet L1:</strong> <span style="color: #60a5fa;">Chain ID 51950 (0xCAEE)</span>
        </div>
        <button onclick="addWyreNetChain()" class="btn-pill btn-pill-green" style="padding: 4px 8px; font-size: 0.68rem; flex-shrink: 0;">➕ Add Chain</button>
      </div>

      <!-- Direct Public Address Entry & Demo Accounts -->
      <div style="border-top: 1px solid var(--border-color); padding-top: 10px; display: flex; flex-direction: column; gap: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.72rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase;">
            🔑 Direct 0x Address Entry
          </span>
          <div style="display: flex; gap: 4px;">
            <button onclick="quickSetWallet('0x471c852D254A67F36c129F2386cA21c31840dEa4')" style="background: rgba(255,255,255,0.06); border: 1px

---

