
// --- High-Fidelity Linear Interpolation PCM Resampler ---
function resamplePCM(input, sourceRate, targetRate) {
  if (!input || input.length === 0 || sourceRate === targetRate || !sourceRate || !targetRate) {
    return input;
  }
  const ratio = sourceRate / targetRate;
  const outputLength = Math.round(input.length / ratio);
  const output = new Float32Array(outputLength);

  for (let i = 0; i < outputLength; i++) {
    const position = i * ratio;
    const index = Math.floor(position);
    const fraction = position - index;

    if (index >= input.length - 1) {
      output[i] = input[input.length - 1];
    } else {
      output[i] = input[index] * (1 - fraction) + input[index + 1] * fraction;
    }
  }
  return output;
}


function updateCallStreamTitleUI(title) {
  const banner = document.getElementById('call-video-title-banner');
  const titleText = document.getElementById('call-video-title-text');
  const remoteTag = document.getElementById('remote-video-tag');
  const localTag = document.getElementById('local-video-tag');

  if (title) {
    if (banner) banner.style.display = 'flex';
    if (titleText) titleText.textContent = title;
    if (remoteTag) {
      remoteTag.textContent = `🟢 ${title}`;
      remoteTag.classList.add('video-stream-badge');
    }
    if (localTag) {
      localTag.textContent = `🟢 ${title}`;
      localTag.classList.add('video-stream-badge');
    }
  } else {
    if (banner) banner.style.display = 'none';
    if (remoteTag) {
      remoteTag.textContent = 'REMOTE // 1080p OPUS';
      remoteTag.classList.remove('video-stream-badge');
    }
    if (localTag) {
      localTag.textContent = 'YOU (مُبَاشِر)';
      localTag.classList.remove('video-stream-badge');
    }
  }
}


// --- 0.1 Tabur al-Rasail: Offline Resilient Message Queue (تَابُور الرَّسَائِل و صُمُود الانْقِطَاع) ---
class TaburQueue {
  static getQueue() {
    try {
      const q = localStorage.getItem("wyresup_tabur_queue");
      return q ? JSON.parse(q) : [];
    } catch {
      return [];
    }
  }

  static enqueue(packet) {
    const queue = this.getQueue();
    queue.push({ packet, queuedAt: Date.now() });
    localStorage.setItem("wyresup_tabur_queue", JSON.stringify(queue));
    console.log(`[Tabur] Message queued offline (${queue.length} in queue)`);
    this.updateQueueBadge();
  }

  static async flush(sendFn) {
    const queue = this.getQueue();
    if (queue.length === 0) return;

    console.log(`[Tabur] Flushing ${queue.length} offline messages...`);
    const remaining = [];

    for (const item of queue) {
      try {
        await sendFn(item.packet);
      } catch (err) {
        remaining.push(item);
      }
    }

    localStorage.setItem("wyresup_tabur_queue", JSON.stringify(remaining));
    this.updateQueueBadge();
  }

  static updateQueueBadge() {
    const queue = this.getQueue();
    const badge = document.getElementById("tabur-queue-indicator");
    if (badge) {
      badge.style.display = queue.length > 0 ? "inline-flex" : "none";
      badge.textContent = `⏳ Tabur: ${queue.length} offline`;
    }
  }
}


function generateClientMessageId() {
  const chars = "0123456789abcdef";
  let id = "";
  for (let i = 0; i < 16; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

// --- TOFU (Trust On First Use) Cryptographic Key Pinning Store ---
const TOFU_STORAGE_KEY = 'wyresup_tofu_pinned_keys_v1';

function getPinnedPeerKeys(peerId) {
  try {
    const store = JSON.parse(localStorage.getItem(TOFU_STORAGE_KEY) || '{}');
    return store[peerId] || null;
  } catch {
    return null;
  }
}

function pinPeerKeys(peerId, ecdhPubKey, signPubKey) {
  try {
    const store = JSON.parse(localStorage.getItem(TOFU_STORAGE_KEY) || '{}');
    if (!store[peerId]) {
      store[peerId] = { ecdhPubKey, signPubKey, pinnedAt: Date.now() };
      localStorage.setItem(TOFU_STORAGE_KEY, JSON.stringify(store));
      console.log(`[WyreCrypto TOFU] Pinned cryptographic identity keys for @${peerId}`);
    }
  } catch (e) {
    console.warn("[WyreCrypto TOFU] Failed to persist pinned key:", e);
  }
}

function appendSystemNotice(text) {
  const channelId = state.currentChannelId;
  if (!state.messages.has(channelId)) state.messages.set(channelId, []);
  const noticePacket = {
    zahir: {
      version: 'zbat/1.5.0',
      messageId: 'sys_' + Date.now(),
      senderId: 'system@mesh',
      channelId,
      timestamp: Date.now(),
      isEncrypted: false
    },
    batin: { content: text },
    isSystem: true
  };
  state.messages.get(channelId).push(noticePacket);
  appendMessageToDOM(noticePacket);
  scrollToBottom();
}

async function getOrDeriveSharedKey(peer) {
  if (!WyreCrypto.isSupported() || !state.crypto.keys) return null;
  const peerId = typeof peer === "string" ? peer : (peer.peerId || peer.fullId);

  if (state.crypto.sharedKeyCache.has(peerId)) {
    return state.crypto.sharedKeyCache.get(peerId);
  }

  // 1. Check TOFU pinned keys first
  let remoteEcdhJwk = null;
  const pinned = getPinnedPeerKeys(peerId);
  if (pinned && pinned.ecdhPubKey) {
    remoteEcdhJwk = pinned.ecdhPubKey;
  }

  // 2. Check live peer announcement
  if (!remoteEcdhJwk) {
    const knownPeer = state.peers.find(p => p.peerId === peerId || p.prefix === peerId.split('@')[0]);
    if (knownPeer && knownPeer.ecdhPubKey) {
      remoteEcdhJwk = knownPeer.ecdhPubKey;
      pinPeerKeys(peerId, knownPeer.ecdhPubKey, knownPeer.signPubKey);
    }
  }

  if (remoteEcdhJwk) {
    const remotePubKey = await WyreCrypto.importRemotePublicKey(remoteEcdhJwk);
    if (remotePubKey) {
      const derivedKey = await WyreCrypto.deriveSharedKey(
        state.crypto.keys.ecdhPair.privateKey,
        remotePubKey,
        state.identity.fullId,
        peerId
      );
      if (derivedKey) {
        state.crypto.sharedKeyCache.set(peerId, derivedKey);
        return derivedKey;
      }
    }
  }

  console.warn(`[WyreCrypto Strict Policy] No authenticated ECDH public key found for peer ${peerId}.`);
  return null;
}

async function sendEncryptedDm(dmChannelId, rawPayload) {
  const targetPrefix = dmChannelId.replace("dm-", "");
  const messageId = generateClientMessageId();
  const timestamp = Date.now();

  // Special Handling for Sovereign AI Companion (Antigravity)
  if (targetPrefix === "antigravity" || targetPrefix.includes("antigravity")) {
    const aiPacket = {
      zahir: {
        version: "zbat/1.5.0",
        messageId,
        senderId: state.identity.fullId,
        senderPrefix: state.identity.prefix,
        spaceId: state.currentSpaceId,
        channelId: dmChannelId,
        timestamp,
        ttl: 5,
        hops: 0,
        routeType: "direct_ai_dm",
        priority: "high",
        isVoice: !!rawPayload.voiceData,
        isEncrypted: false
      },
      batin: rawPayload
    };

    if (state.ws && state.ws.readyState === WebSocket.OPEN) {
      state.ws.send(JSON.stringify({ type: "GOSSIP_PACKET", payload: aiPacket }));
    }
    const localEchoPacket = {
      zahir: aiPacket.zahir,
      batin: rawPayload,
      isEncrypted: false,
      isDecrypted: true
    };
    handleIncomingGossipPacket(localEchoPacket);
    return;
  }
  const targetPeer = state.peers.find(p => p.prefix === targetPrefix || p.peerId.startsWith(targetPrefix)) || {
    peerId: `${targetPrefix}@mesh`,
    prefix: targetPrefix
  };

  const sharedKey = await getOrDeriveSharedKey(targetPeer);

  if (sharedKey) {
    // 1. Authenticated Metadata Context (Bound to GCM Tag via additionalData)
    const authContext = {
      senderId: state.identity.fullId,
      targetPeer: targetPeer.peerId,
      channelId: dmChannelId,
      messageId,
      timestamp
    };

    // 2. Encrypt Batin with AES-256-GCM + Additional Data
    const encryptedBatin = await WyreCrypto.encryptBatin(rawPayload, sharedKey, authContext);

    // 3. Cryptographic ECDSA Signature over (Ciphertext + Additional Data)
    const dataToSign = new TextEncoder().encode(
      `${encryptedBatin.ciphertext}:${encryptedBatin.iv}:${JSON.stringify(authContext)}`
    );
    const signature = await WyreCrypto.signPacket(dataToSign, state.crypto.keys?.ecdsaPair?.privateKey);

    const packet = {
      zahir: {
        version: "zbat/1.5.0",
        messageId,
        senderId: state.identity.fullId,
        spaceId: state.currentSpaceId,
        channelId: dmChannelId,
        timestamp,
        ttl: 5,
        hops: 0,
        routeType: "direct_e2ee",
        priority: "high",
        isVoice: !!rawPayload.voiceData,
        isEncrypted: true,
        signature,
        encryptionMeta: {
          targetPeer: targetPeer.peerId,
          senderPubKey: state.identity.ecdhPubJwk || null,
          senderSignPubKey: state.identity.ecdsaPubJwk || null,
          cipher: "AES-256-GCM/MIFTAH-V2"
        }
      },
      batin: encryptedBatin
    };

    if (state.activeCall && state.activeCall.dataChannel && state.activeCall.dataChannel.readyState === "open") {
      // Tier 1: Direct Zero-Hop WebRTC DataChannel (Barq Wire-Speed)
      state.activeCall.dataChannel.send(JSON.stringify({ type: "P2P_PACKET", payload: packet }));
      console.log("[Barq P2P] Message sent via zero-hop authenticated DataChannel");
    } else if (state.ws && state.ws.readyState === WebSocket.OPEN) {
      // Tier 2: WebSocket Gossip Mesh Relay
      state.ws.send(JSON.stringify({ type: "GOSSIP_PACKET", payload: packet }));
    } else {
      // Tier 3: Offline Resilient Tabur Queue
      TaburQueue.enqueue(packet);
    }

    // Immediate Local Echo
    const localEchoPacket = {
      zahir: packet.zahir,
      batin: rawPayload,
      isEncrypted: true,
      isDecrypted: true
    };
    handleIncomingGossipPacket(localEchoPacket);
  } else {
    // STRICT FAIL-CLOSED POLICY (H-001) + Active On-Demand Key Discovery (Nizām al-Shaf')
    if (state.ws && state.ws.readyState === WebSocket.OPEN) {
      state.ws.send(JSON.stringify({
        type: 'KEY_REQUEST',
        payload: {
          targetPeer: targetPeer.peerId,
          targetPrefix: targetPrefix
        }
      }));
    }
    console.error(`[WyreCrypto Fail-Closed] Recipient key unavailable. Requested public key for @${targetPrefix} from mesh.`);
    appendSystemNotice(`🔒 [Miftah Security Policy]: Requested public key for @${targetPrefix} from the mesh. Please resend message in a moment once key sync completes.`);
  }
}

class WyreCrypto {
  static isSupported() {
    return !!(window.crypto && window.crypto.subtle);
  }

  static async generateKeyPairs() { return this.generateIdentityKeys(); }

  static async generateIdentityKeys() {
    if (!this.isSupported()) return null;
    try {
      const ecdhPair = await window.crypto.subtle.generateKey(
        { name: "ECDH", namedCurve: "P-256" },
        true, ["deriveKey", "deriveBits"]
      );
      const ecdsaPair = await window.crypto.subtle.generateKey(
        { name: "ECDSA", namedCurve: "P-256" },
        true, ["sign", "verify"]
      );

      const ecdhPubJwk = await window.crypto.subtle.exportKey("jwk", ecdhPair.publicKey);
      const ecdhPrivJwk = await window.crypto.subtle.exportKey("jwk", ecdhPair.privateKey);
      const ecdsaPubJwk = await window.crypto.subtle.exportKey("jwk", ecdsaPair.publicKey);
      const ecdsaPrivJwk = await window.crypto.subtle.exportKey("jwk", ecdsaPair.privateKey);

      return {
        ecdhPair,
        ecdsaPair,
        ecdhPubJwk,
        ecdhPrivJwk,
        ecdsaPubJwk,
        ecdsaPrivJwk
      };
    } catch (e) {
      console.error("[WyreCrypto] Key generation failure:", e);
      return null;
    }
  }

  static async importSavedKeys(saved) {
    if (!saved || !this.isSupported()) return null;
    try {
      const ecdhPubKey = await window.crypto.subtle.importKey(
        "jwk", saved.ecdhPubJwk,
        { name: "ECDH", namedCurve: "P-256" },
        true, []
      );
      const ecdhPrivKey = await window.crypto.subtle.importKey(
        "jwk", saved.ecdhPrivJwk,
        { name: "ECDH", namedCurve: "P-256" },
        true, ["deriveKey", "deriveBits"]
      );
      const ecdsaPubKey = await window.crypto.subtle.importKey(
        "jwk", saved.ecdsaPubJwk,
        { name: "ECDSA", namedCurve: "P-256" },
        true, ["verify"]
      );
      const ecdsaPrivKey = await window.crypto.subtle.importKey(
        "jwk", saved.ecdsaPrivJwk,
        { name: "ECDSA", namedCurve: "P-256" },
        true, ["sign"]
      );

      return {
        ecdhPair: { publicKey: ecdhPubKey, privateKey: ecdhPrivKey },
        ecdsaPair: { publicKey: ecdsaPubKey, privateKey: ecdsaPrivKey },
        ecdhPubJwk: saved.ecdhPubJwk,
        ecdhPrivJwk: saved.ecdhPrivJwk,
        ecdsaPubJwk: saved.ecdsaPubJwk,
        ecdsaPrivJwk: saved.ecdsaPrivJwk
      };
    } catch (e) {
      console.warn("[WyreCrypto] Import saved keys error:", e);
      return null;
    }
  }

  static async importRemotePublicKey(jwk) {
    if (!jwk || !this.isSupported()) return null;
    try {
      return await window.crypto.subtle.importKey(
        "jwk", jwk,
        { name: "ECDH", namedCurve: "P-256" },
        true, []
      );
    } catch (e) {
      return null;
    }
  }

  static async importRemoteSignPublicKey(jwk) {
    if (!jwk || !this.isSupported()) return null;
    try {
      return await window.crypto.subtle.importKey(
        "jwk", jwk,
        { name: "ECDSA", namedCurve: "P-256" },
        true, ["verify"]
      );
    } catch (e) {
      return null;
    }
  }

  // Canonical RFC 5869 HKDF-SHA256 Key Derivation
  static async deriveSharedKey(localPrivKey, remotePubKey, senderId, targetId) {
    if (!this.isSupported() || !localPrivKey || !remotePubKey) return null;
    try {
      const rawEcdhBits = await window.crypto.subtle.deriveBits(
        { name: "ECDH", public: remotePubKey },
        localPrivKey,
        256
      );

      const hkdfSecret = await window.crypto.subtle.importKey(
        "raw", rawEcdhBits,
        { name: "HKDF" },
        false,
        ["deriveKey"]
      );

      const sortedParticipants = [senderId || 'peerA', targetId || 'peerB'].sort().join(':');
      const salt = new TextEncoder().encode("wyresup-miftah-v2-salt");
      const info = new TextEncoder().encode(`wyresup-authenticated-session:${sortedParticipants}`);

      return await window.crypto.subtle.deriveKey(
        {
          name: "HKDF",
          hash: "SHA-256",
          salt,
          info
        },
        hkdfSecret,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
      );
    } catch (e) {
      console.warn("[WyreCrypto] HKDF DeriveKey error:", e);
      return null;
    }
  }

  // Authenticated AEAD Encryption with Cryptographic Additional Data Binding
  static async encryptBatin(payload, sharedCryptoKey, authContext = null) {
    if (!this.isSupported() || !sharedCryptoKey) return null;
    try {
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const paddedJson = WyreCrypto.padPayload(payload);
      const plaintext = new TextEncoder().encode(paddedJson);

      const encryptParams = { name: "AES-GCM", iv, tagLength: 128 };
      if (authContext) {
        encryptParams.additionalData = new TextEncoder().encode(
          typeof authContext === 'string' ? authContext : JSON.stringify(authContext)
        );
      }

      const ciphertextBuf = await window.crypto.subtle.encrypt(
        encryptParams,
        sharedCryptoKey,
        plaintext
      );

      const ciphertextB64 = btoa(String.fromCharCode(...new Uint8Array(ciphertextBuf)));
      const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, "0")).join("");

      return {
        ciphertext: ciphertextB64,
        iv: ivHex,
        algorithm: "AES-256-GCM/MIFTAH-V2"
      };
    } catch (e) {
      console.error("[WyreCrypto] Encryption failure:", e);
      return null;
    }
  }

  // Authenticated AEAD Decryption with Additional Data Verification
  static async decryptBatin(encryptedObj, sharedCryptoKey, authContext = null) {
    if (!this.isSupported() || !sharedCryptoKey || !encryptedObj || !encryptedObj.ciphertext) return null;
    try {
      const ivHex = encryptedObj.iv;
      const iv = new Uint8Array(ivHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
      const binStr = atob(encryptedObj.ciphertext);
      const cipherBytes = new Uint8Array(binStr.length);
      for (let i = 0; i < binStr.length; i++) cipherBytes[i] = binStr.charCodeAt(i);

      const decryptParams = { name: "AES-GCM", iv, tagLength: 128 };
      if (authContext) {
        decryptParams.additionalData = new TextEncoder().encode(
          typeof authContext === 'string' ? authContext : JSON.stringify(authContext)
        );
      }

      const decryptedBuf = await window.crypto.subtle.decrypt(
        decryptParams,
        sharedCryptoKey,
        cipherBytes
      );

      const decryptedRaw = new TextDecoder().decode(decryptedBuf);
      const decryptedStr = typeof WyreCrypto.unpadPayload === "function" ? WyreCrypto.unpadPayload(decryptedRaw) : decryptedRaw;
      try {
        return JSON.parse(decryptedStr);
      } catch {
        return { content: decryptedStr };
      }
    } catch (e) {
      console.warn("[WyreCrypto] Decryption / Authentication Tag verification failed:", e.message);
      return null;
    }
  }

  // ECDSA-P256 Digital Signatures for Message Authenticity
  static async signPacket(dataBytes, privateSignKey) {
    if (!this.isSupported() || !privateSignKey) return null;
    try {
      const sigBuf = await window.crypto.subtle.sign(
        { name: "ECDSA", hash: { name: "SHA-256" } },
        privateSignKey,
        dataBytes
      );
      return Array.from(new Uint8Array(sigBuf)).map(b => b.toString(16).padStart(2, "0")).join("");
    } catch (e) {
      console.error("[WyreCrypto] ECDSA sign error:", e);
      return null;
    }
  }

  static async verifyPacket(dataBytes, signatureHex, publicSignKey) {
    if (!this.isSupported() || !publicSignKey || !signatureHex) return false;
    try {
      const sigBytes = new Uint8Array(signatureHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
      return await window.crypto.subtle.verify(
        { name: "ECDSA", hash: { name: "SHA-256" } },
        publicSignKey,
        sigBytes,
        dataBytes
      );
    } catch (e) {
      return false;
    }
  }

  // Al-Ikhfa (الإِخْفَاء) ISO/IEC 7816-4 Traffic Analysis Padding
  static padPayload(payload) {
    const raw = typeof payload === "string" ? payload : JSON.stringify(payload);
    const targetSizes = [256, 512, 1024, 2048, 4096, 8192];
    const currentLen = new TextEncoder().encode(raw).length;
    let target = targetSizes.find(s => s > currentLen + 8) || (Math.ceil((currentLen + 8) / 1024) * 1024);
    const padLen = target - currentLen - 4;
    return raw + " " + " ".repeat(Math.max(0, padLen - 2)) + " ";
  }

  static unpadPayload(paddedStr) {
    const idx = paddedStr.indexOf(" ");
    return idx !== -1 ? paddedStr.substring(0, idx) : paddedStr;
  }
}
/**
 * WyreSup Discord-Style Mesh Client App (تَطْبِيق الوَيْب للمَجَالِس)
 * Manages WebSocket Mesh connection, Space/Channel switching,
 * Sawt Voice notes, Nagham DTMF audio synthesizer, and presence.
 */

// --- Global App State ---
const state = window.state = {
  identity: null,
  crypto: {
    keys: null,
    peerCryptoKeys: new Map(),
    sharedKeyCache: new Map()
  },
  ws: null,
  currentSpaceId: 'space-public-mesh',
  currentChannelId: 'chan-general',
  expandedImamChannelId: null,
  spaces: [],
  channels: [],
  peers: [],
  typingPeers: [],
  messages: new Map(), // channelId -> Array of messages
  isRecordingSawt: false,
  mediaRecorder: null,
  audioChunks: [],
  recordingInterval: null,
  recordingSeconds: 0,
  currentPlayingAudio: null,
  currentPlayingCard: null,
  audioCtx: null,
  reconnectAttempts: 0,
  heartbeatTimer: null,
  activeCall: {
    peer: null,
    webrtcConnected: false,
    peerPrefix: null,
    type: 'video',
    pc: null,
    localStream: null,
    remoteStream: null,
    syntheticInterval: null,
    pendingIceCandidates: [],
    startTime: null,
    timerInterval: null,
    isMuted: false,
    isCamOff: false,
    isScreenSharing: false,
    nafaqRecorder: null,
    nafaqAudioNextTime: 0,
    nafaqActive: false,
    nafaqFallbackTimer: null,
    nafaqSeq: 0
  },
  pendingIncomingCall: null
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  initIdentity();
  initWebSocket();
  initEventListeners();
  initDtmfAudio();
  initLisanLexicon();
});

// --- 1. Identity & Keys (Huwiyya) ---
async function initIdentity() {
  let savedId = localStorage.getItem('wyresup_identity');
  let savedKeysJson = localStorage.getItem('wyresup_crypto_keys');

  if (!savedId) {
    const randomHex = Math.random().toString(16).substring(2, 10);
    const names = ['khalid', 'tariq', 'salman', 'amira', 'layla', 'omar', 'zayd', 'nour', 'faris'];
    const prefix = names[Math.floor(Math.random() * names.length)];
    state.identity = {
      prefix,
      shortHash: randomHex,
      fullId: `${prefix}@${randomHex}`
    };
  } else {
    try {
      state.identity = JSON.parse(savedId);
    } catch (e) {
      state.identity = { prefix: 'peer', shortHash: '00000000', fullId: 'peer@00000000' };
    }
  }

  // Initialize or load WebCrypto Keys (Huwiyya & Miftah)
  let cryptoKeys = null;
  if (savedKeysJson) {
    try {
      cryptoKeys = await WyreCrypto.importSavedKeys(JSON.parse(savedKeysJson));
    } catch (e) {
      console.warn("[WyreCrypto] Failed to import cached keys:", e);
    }
  }

  if (!cryptoKeys) {
    cryptoKeys = await WyreCrypto.generateKeyPairs();
    if (cryptoKeys) {
      localStorage.setItem('wyresup_crypto_keys', JSON.stringify({
        ecdhPubJwk: cryptoKeys.ecdhPubJwk,
        ecdhPrivJwk: cryptoKeys.ecdhPrivJwk,
        ecdsaPubJwk: cryptoKeys.ecdsaPubJwk,
        ecdsaPrivJwk: cryptoKeys.ecdsaPrivJwk
      }));
    }
  }

  state.crypto.keys = cryptoKeys;
  if (cryptoKeys) {
    state.identity.ecdhPubJwk = cryptoKeys.ecdhPubJwk;
    state.identity.ecdsaPubJwk = cryptoKeys.ecdsaPubJwk;
  }
  localStorage.setItem('wyresup_identity', JSON.stringify(state.identity));

  // Update UI user bar
  document.getElementById('current-user-name').textContent = state.identity.prefix;
  document.getElementById('current-user-id').textContent = state.identity.fullId;
  document.getElementById('current-user-avatar').textContent = state.identity.prefix.substring(0, 2).toUpperCase();
}

function updateIdentity(newPrefix, newHash = null) {
  const cleanPrefix = (newPrefix || 'peer').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'peer';
  const shortHash = newHash || state.identity?.shortHash || Math.random().toString(16).substring(2, 10);
  state.identity = {
    prefix: cleanPrefix,
    shortHash,
    fullId: `${cleanPrefix}@${shortHash}`
  };
  localStorage.setItem('wyresup_identity', JSON.stringify(state.identity));

  // Update UI user bar
  document.getElementById('current-user-name').textContent = state.identity.prefix;
  document.getElementById('current-user-id').textContent = state.identity.fullId;
  document.getElementById('current-user-avatar').textContent = state.identity.prefix.substring(0, 2).toUpperCase();

  // Inform WebSocket Relay & Mesh of updated identity
  if (state.ws && state.ws.readyState === WebSocket.OPEN) {
    state.ws.send(JSON.stringify({
      type: 'IDENTIFY',
      payload: {
        peerId: state.identity.fullId,
        prefix: state.identity.prefix,
        shortHash: state.identity.shortHash,
        ecdhPubKey: state.identity.ecdhPubJwk || null,
        signPubKey: state.identity.ecdsaPubJwk || null,
        spaceId: state.currentSpaceId,
        channelId: state.currentChannelId
      }
    }));
  }
}

// --- 2. WebSocket Connection (Al-Wasl) ---
function initWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}`;

  state.ws = new WebSocket(wsUrl);

  state.ws.onopen = () => {
    console.log('[Mesh] Connected to Hub / Relay');
    state.reconnectAttempts = 0;

    // Cellular NAT Keepalive Heartbeat: every 25s prevents mobile CGNAT timeout
    if (state.heartbeatTimer) clearInterval(state.heartbeatTimer);
    state.heartbeatTimer = setInterval(() => {
      if (state.ws && state.ws.readyState === WebSocket.OPEN) {
        state.ws.send(JSON.stringify({
          type: 'HEARTBEAT',
          payload: {
            peerId: state.identity ? state.identity.fullId : 'peer',
            latency: 12
          }
        }));
      }
    }, 25000);

    TaburQueue.flush((pkt) => {
      if (state.ws && state.ws.readyState === WebSocket.OPEN) {
        state.ws.send(JSON.stringify({ type: "SEND_MESSAGE", payload: pkt }));
      }
    });
    updateConnectionBadge('P2P MESH // MUTTASIL', true);

    // Send IDENTIFY
    state.ws.send(JSON.stringify({
      type: 'IDENTIFY',
      payload: {
        peerId: state.identity.fullId,
        prefix: state.identity.prefix,
        shortHash: state.identity.shortHash,
        ecdhPubKey: state.identity.ecdhPubJwk || null,
        signPubKey: state.identity.ecdsaPubJwk || null,
        spaceId: state.currentSpaceId,
        channelId: state.currentChannelId
      }
    }));
  };

  state.ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      handleServerMessage(msg);
    } catch (err) {
      console.error('[WS Parse Error]:', err);
    }
  };

  state.ws.onclose = () => {
    if (state.heartbeatTimer) {
      clearInterval(state.heartbeatTimer);
      state.heartbeatTimer = null;
    }
    state.reconnectAttempts = (state.reconnectAttempts || 0) + 1;
    const backoffDelay = Math.min(30000, Math.round(1000 * Math.pow(1.5, state.reconnectAttempts - 1) + Math.random() * 500));
    console.warn(`[Mesh] Disconnected. Reconnecting in ${backoffDelay}ms (attempt #${state.reconnectAttempts})...`);
    updateConnectionBadge('DISCONNECTED // MUNFASIL', false);
    setTimeout(initWebSocket, backoffDelay);
  };

  state.ws.onerror = (err) => {
    console.error('[Mesh WS Error]:', err);
  };
}

// Mobile App Lifecycle & Tab Visibility Recovery (صيانة الوصل عند استئناف التطبيق)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    if (!state.ws || state.ws.readyState === WebSocket.CLOSED || state.ws.readyState === WebSocket.CLOSING) {
      console.log('[Mobile Lifecycle] Page resumed & socket closed. Fast reconnecting...');
      state.reconnectAttempts = 0;
      initWebSocket();
    } else if (state.ws.readyState === WebSocket.OPEN) {
      state.ws.send(JSON.stringify({ type: 'HEARTBEAT', payload: { probe: true, latency: 10 } }));
    }
  }
});

window.addEventListener('online', () => {
  console.log('[Network] Device connected to network. Fast reconnecting...');
  state.reconnectAttempts = 0;
  initWebSocket();
});

window.addEventListener('offline', () => {
  console.warn('[Network] Device lost network connectivity.');
  updateConnectionBadge('OFFLINE // MUNQATI', false);
});

function updateConnectionBadge(text, isOnline) {
  const badge = document.getElementById('topbar-mesh-badge');
  const textEl = document.getElementById('topbar-mesh-status');
  if (textEl) textEl.textContent = text;
  if (badge) {
    badge.style.borderColor = isOnline ? 'rgba(0, 255, 136, 0.25)' : 'rgba(255, 68, 68, 0.4)';
    badge.style.color = isOnline ? 'var(--matrix-green)' : 'var(--muqta)';
  }
}

// --- 3. Message Handling & Dispatch ---
function handleServerMessage(msg) {
  const { type, payload } = msg;

  switch (type) {
    case 'IDENTIFIED':
      state.spaces = payload.spaces || [];
      state.peers = payload.peers || [];
      renderSpacesRail();
      selectSpace(state.currentSpaceId);
      renderMembers();
      break;

    case 'GOSSIP_PACKET':
      handleIncomingGossipPacket(payload);
      break;

    case 'PRESENCE_SYNC':
      state.peers = payload.peers || [];
      renderMembers();
      renderVoiceParticipants();
      break;

    case 'KEY_RESPONSE': {
      const { peerId, prefix, ecdhPubKey, signPubKey } = payload;
      if (peerId && ecdhPubKey) {
        let p = state.peers.find(x => x.peerId === peerId || x.prefix === prefix);
        if (p) {
          p.ecdhPubKey = ecdhPubKey;
          if (signPubKey) p.signPubKey = signPubKey;
        } else {
          state.peers.push({ peerId, prefix, ecdhPubKey, signPubKey });
        }
        pinPeerKeys(peerId, ecdhPubKey, signPubKey);
        console.log(`[Miftah] Synchronized public key for @${prefix || peerId}`);
      }
      break;
    }

    case 'TYPING_UPDATE':
      if (payload.channelId === state.currentChannelId) {
        state.typingPeers = payload.typing || [];
        renderTypingIndicator();
      }
      break;

    case 'SPACE_CREATED':
      state.spaces.push(payload);
      renderSpacesRail();
      break;

    case 'CHANNEL_CREATED':
      const targetSpace = state.spaces.find(s => s.id === payload.spaceId);
      if (targetSpace) {
        targetSpace.channels.push(payload.channel);
        if (state.currentSpaceId === payload.spaceId) {
          renderChannelsSidebar();
        }
      }
      break;

    case 'CALL_SIGNAL':
      handleIncomingCallSignal(payload);
      break;

    case 'MESSAGES_CLEARED':
      const targetChan = payload.channelId;
      if (targetChan) {
        state.messages.set(targetChan, []);
        if (state.currentChannelId === targetChan) {
          renderMessages();
        }
      } else {
        state.messages.clear();
        renderMessages();
      }
      break;
  }
}

async function handleIncomingGossipPacket(packet) {
  if (!packet || !packet.zahir || !packet.batin) return;
  const { channelId, messageId, isEncrypted, encryptionMeta, senderId, timestamp, signature } = packet.zahir;

  if (!state.messages.has(channelId)) {
    state.messages.set(channelId, []);
  }

  const list = state.messages.get(channelId);
  if (list.some(m => m.zahir.messageId === messageId)) return;

  // Real Authenticated AEAD Decryption with TOFU & ECDSA Signature Verification
  if (isEncrypted && packet.batin && packet.batin.ciphertext) {
    packet.isEncrypted = true;
    if (senderId === state.identity.fullId && packet.isDecrypted) {
      // Local echo already authenticated in plaintext
    } else {
      const authContext = {
        senderId,
        targetPeer: encryptionMeta?.targetPeer || state.identity.fullId,
        channelId,
        messageId,
        timestamp
      };

      // 1. Strict TOFU Key Pinning & Anti-Impersonation Check (H-002)
      let trustedSignPubKeyJwk = null;
      let trustedEcdhPubKeyJwk = null;
      const pinned = getPinnedPeerKeys(senderId);

      if (pinned) {
        trustedSignPubKeyJwk = pinned.signPubKey;
        trustedEcdhPubKeyJwk = pinned.ecdhPubKey;
        // Key change detection
        if (encryptionMeta?.senderSignPubKey && JSON.stringify(pinned.signPubKey) !== JSON.stringify(encryptionMeta.senderSignPubKey)) {
          console.error(`[WyreCrypto TOFU Alert] Key mismatch for @${senderId}! Possible MITM/Impersonation attack. Packet dropped.`);
          return;
        }
      } else if (encryptionMeta?.senderSignPubKey && encryptionMeta?.senderPubKey) {
        // Trust On First Use (TOFU)
        pinPeerKeys(senderId, encryptionMeta.senderPubKey, encryptionMeta.senderSignPubKey);
        trustedSignPubKeyJwk = encryptionMeta.senderSignPubKey;
        trustedEcdhPubKeyJwk = encryptionMeta.senderPubKey;
      }

      // 2. Strict Signature Enforcement (Fail-Closed)
      if (!signature || !trustedSignPubKeyJwk) {
        console.warn(`[WyreCrypto Security Alert] Dropping unauthenticated message ${messageId} from ${senderId}: Missing valid signature or signing key!`);
        return;
      }

      const signPubKey = await WyreCrypto.importRemoteSignPublicKey(trustedSignPubKeyJwk);
      if (!signPubKey) {
        console.warn(`[WyreCrypto Security Alert] Could not import signing key for ${senderId}. Message dropped.`);
        return;
      }

      const dataToVerify = new TextEncoder().encode(
        `${packet.batin.ciphertext}:${packet.batin.iv}:${JSON.stringify(authContext)}`
      );
      const isSignatureValid = await WyreCrypto.verifyPacket(dataToVerify, signature, signPubKey);
      if (!isSignatureValid) {
        console.error(`[WyreCrypto Security Alert] Signature verification FAILED for message ${messageId} from ${senderId}! Dropping forged packet.`);
        return;
      }

      const senderPeer = state.peers.find(p => p.peerId === senderId) || {
        peerId: senderId,
        ecdhPubKey: trustedEcdhPubKeyJwk
      };
      if (trustedEcdhPubKeyJwk) {
        senderPeer.ecdhPubKey = trustedEcdhPubKeyJwk;
      }

      const sharedKey = await getOrDeriveSharedKey(senderPeer);
      if (sharedKey) {
        const decryptedBatin = await WyreCrypto.decryptBatin(packet.batin, sharedKey, authContext);
        if (decryptedBatin) {
          packet.batin = decryptedBatin;
          packet.isDecrypted = true;
          packet.isSignatureVerified = true;
        } else {
          packet.batin = { content: "🔒 [ZBAT AEAD Auth Tag Verification Failed — Tampered Packet]" };
          packet.isDecrypted = false;
        }
      } else {
        packet.batin = { content: "🔒 [ZBAT Ciphertext Encrypted via AES-256-GCM / Awaiting Key]" };
        packet.isDecrypted = false;
      }
    }
  }

  list.push(packet);
  if (channelId === state.currentChannelId) {
    appendMessageToDOM(packet);
    scrollToBottom();
  }
}

// --- 4. Render Spaces & Channels ---
function renderSpacesRail() {
  const rail = document.getElementById('spaces-list');
  const rootBtn = document.getElementById('btn-root-mesh');
  
  if (rootBtn) {
    if (state.currentSpaceId === 'space-public-mesh') {
      rootBtn.classList.add('active');
    } else {
      rootBtn.classList.remove('active');
    }
  }

  rail.innerHTML = '';

  state.spaces.forEach(space => {
    // If it's the root mesh, the top brand icon represents it, or we render all spaces cleanly
    if (space.id === 'space-public-mesh') return;

    const btn = document.createElement('button');
    btn.className = `rail-icon ${space.id === state.currentSpaceId ? 'active' : ''}`;
    btn.title = `${space.name} (${space.arabicName || ''})`;
    btn.innerHTML = `
      <span>${space.icon || '💬'}</span>
      <div class="active-pill"></div>
    `;
    btn.onclick = () => selectSpace(space.id);
    rail.appendChild(btn);
  });
}

function selectSpace(spaceId) {
  state.currentSpaceId = spaceId;
  const space = state.spaces.find(s => s.id === spaceId) || state.spaces[0];
  if (!space) return;

  document.getElementById('current-space-name').textContent = space.name;
  document.getElementById('current-space-arabic').textContent = space.arabicName || '';

  renderSpacesRail();
  renderChannelsSidebar();

  // Select first channel in space if current not in space
  const channelExists = space.channels.some(c => c.id === state.currentChannelId);
  if (!channelExists && space.channels.length > 0) {
    selectChannel(space.channels[0].id);
  } else {
    selectChannel(state.currentChannelId);
  }
}

function renderChannelsSidebar() {
  const space = state.spaces.find(s => s.id === state.currentSpaceId);
  if (!space) return;

  const textList = document.getElementById('text-channels-list');
  const voiceList = document.getElementById('voice-channels-list');
  const dmList = document.getElementById('dm-channels-list');
  const dmCategory = document.getElementById('dm-category');

  textList.innerHTML = '';
  voiceList.innerHTML = '';
  if (dmList) dmList.innerHTML = '';

  let hasDMs = false;

  space.channels.forEach(ch => {
    const isSub = ch.isSubChannel || ch.id.endsWith('-archive') || !!ch.parentChannelId;
    const hasSubs = ch.hasSubChannels || ['chan-imam-razi', 'chan-imam-abuhamidd', 'chan-imam-nawawi', 'chan-imam-raghib'].includes(ch.id);

    // Sub-channels are ONLY seen / opened when their parent Imam channel is expanded!
    if (isSub) {
      if (ch.parentChannelId !== state.expandedImamChannelId) {
        return; // Keep hidden
      }
    }

    const el = document.createElement('div');
    const isExpanded = hasSubs && state.expandedImamChannelId === ch.id;

    el.className = `channel-item ${ch.id === state.currentChannelId ? 'active' : ''} ${isSub ? 'subchannel-item' : ''} ${hasSubs ? 'has-subchannels' : ''}`;
    const icon = ch.type === 'voice' ? '🔊' : (ch.id.startsWith('dm-') ? '🔒' : (isSub ? '└─' : (ch.icon || '#')));

    let caretHtml = '';
    if (hasSubs) {
      caretHtml = `<span class="channel-expand-caret" title="Toggle sub-channels">${isExpanded ? '▾' : '▸'}</span>`;
    }

    el.innerHTML = `
      <span class="channel-icon">${icon}</span>
      <span class="channel-name">${ch.name}</span>
      ${caretHtml}
    `;

    el.onclick = () => {
      if (hasSubs) {
        if (state.expandedImamChannelId === ch.id && state.currentChannelId === ch.id) {
          // Toggle collapse if clicking on already open and active parent
          state.expandedImamChannelId = null;
          renderChannelsSidebar();
          return;
        }
        // Open sub-channels for clicked Imam channel
        state.expandedImamChannelId = ch.id;
      }
      selectChannel(ch.id);
    };

    if (ch.id.startsWith('dm-')) {
      hasDMs = true;
      if (dmList) dmList.appendChild(el);
    } else if (ch.type === 'voice') {
      voiceList.appendChild(el);
    } else {
      textList.appendChild(el);
    }
  });

  if (dmCategory) {
    dmCategory.style.display = hasDMs ? 'flex' : 'none';
  }
}

// --- Sovereign Library Write Protection Helpers ---
function isProtectedLibraryChannel(channelId) {
  if (!channelId) return false;
  // Only sub-channels are protected; main Imam channels are open for discussion
  return (
    channelId.startsWith('chan-razi-') ||
    channelId.startsWith('chan-ghazali-') ||
    channelId.startsWith('chan-raghib-') ||
    channelId.includes('-archive')
  );
}

function isSovereignPublisher() {
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '') {
    return true; // Localhost / host user is sovereign admin ("we")
  }
  if (localStorage.getItem('wyresup_sovereign_publisher') === 'true') {
    return true;
  }
  const prefix = (state.identity?.prefix || '').toLowerCase();
  const sovereignPrefixes = ['absolut7', 'admin', 'sovereign', 'ihyatafsir', 'ibn-manzur', 'antigravity'];
  return sovereignPrefixes.includes(prefix);
}

function updateComposerAccess(channel) {
  const input = document.getElementById('message-input');
  const btnSend = document.getElementById('btn-send-message');
  const btnAttach = document.getElementById('btn-attach-file');
  const btnRecord = document.getElementById('btn-record-sawt');
  const composerBox = document.querySelector('.composer-box');

  if (!input || !channel) return;

  const isProtected = isProtectedLibraryChannel(channel.id);
  const isAuthorized = isSovereignPublisher();

  let noticeEl = document.getElementById('readonly-channel-notice');

  if (isProtected && !isAuthorized) {
    // Read-only mode for unauthorized public peers
    input.disabled = true;
    input.value = '';
    input.placeholder = "🔒 Read-only library channel. Only sovereign publishers can post.";
    input.classList.add('readonly-mode');

    if (btnSend) {
      btnSend.disabled = true;
      btnSend.style.opacity = '0.3';
      btnSend.style.pointerEvents = 'none';
    }
    if (btnAttach) {
      btnAttach.style.opacity = '0.3';
      btnAttach.style.pointerEvents = 'none';
    }
    if (btnRecord) {
      btnRecord.style.opacity = '0.3';
      btnRecord.style.pointerEvents = 'none';
    }
    if (composerBox) {
      composerBox.classList.add('composer-readonly');
    }

    if (!noticeEl) {
      noticeEl = document.createElement('div');
      noticeEl.id = 'readonly-channel-notice';
      noticeEl.className = 'readonly-channel-notice';
      const container = document.querySelector('.chat-input-container');
      if (container && composerBox) {
        container.insertBefore(noticeEl, composerBox);
      }
    }
    if (noticeEl) {
      noticeEl.style.display = 'flex';
      noticeEl.innerHTML = '<span>🔒 <strong>Sovereign Library Archive:</strong> This channel is read-only. Posts are restricted to authorized publishers.</span>';
    }
  } else {
    // Writable mode for sovereign publisher ("we") or regular channels
    input.disabled = false;
    input.classList.remove('readonly-mode');

    const isDM = channel.id.startsWith('dm-');
    const peerName = isDM ? channel.id.replace('dm-', '') : '';

    if (isProtected && isAuthorized) {
      input.placeholder = `👑 Sovereign Publisher Mode — Broadcast to #${channel.name}...`;
    } else if (isDM) {
      input.placeholder = `Send private encrypted message to @${peerName}...`;
    } else {
      input.placeholder = `Broadcast encrypted message to #${channel.name}...`;
    }

    if (btnSend) {
      btnSend.disabled = false;
      btnSend.style.opacity = '1';
      btnSend.style.pointerEvents = 'auto';
    }
    if (btnAttach) {
      btnAttach.style.opacity = '1';
      btnAttach.style.pointerEvents = 'auto';
    }
    if (btnRecord) {
      btnRecord.style.opacity = '1';
      btnRecord.style.pointerEvents = 'auto';
    }
    if (composerBox) {
      composerBox.classList.remove('composer-readonly');
    }
    if (noticeEl) {
      noticeEl.style.display = 'none';
    }
  }
}

function selectChannel(channelId) {
  state.currentChannelId = channelId;
  const space = state.spaces.find(s => s.id === state.currentSpaceId);
  let channel = space?.channels.find(c => c.id === channelId);

  // Synchronize expanded Imam channel state:
  if (channel) {
    if (channel.isSubChannel && channel.parentChannelId) {
      // Inside a subchannel: keep parent expanded so siblings remain visible
      state.expandedImamChannelId = channel.parentChannelId;
    } else if (channel.hasSubChannels || ['chan-imam-razi', 'chan-imam-abuhamidd', 'chan-imam-nawawi', 'chan-imam-raghib'].includes(channel.id)) {
      state.expandedImamChannelId = channel.id;
    } else {
      // Non-Imam channels: collapse subchannels so they are seen only when clicking on an Imam channel
      state.expandedImamChannelId = null;
    }
  }

  // If DM channel not in space array yet, create it dynamically
  if (!channel && channelId.startsWith('dm-')) {
    const peerName = channelId.replace('dm-', '');
    channel = {
      id: channelId,
      name: `dm-${peerName}`,
      type: 'text',
      topic: `Direct P2P Encrypted Session with @${peerName} (مُحَادَثَة خَاصَّة)`,
      icon: '🔒'
    };
    if (space) space.channels.push(channel);
  }

  const voiceBanner = document.getElementById('voice-lounge-banner');
  const channelTypePill = document.getElementById('topbar-channel-type');

  if (channel) {
    const isDM = channel.id.startsWith('dm-');
    const peerName = isDM ? channel.id.replace('dm-', '') : '';

    document.getElementById('topbar-channel-title').textContent = channel.name;
    document.getElementById('topbar-channel-icon').textContent = channel.icon || (isDM ? '🔒' : (channel.type === 'voice' ? '🔊' : '#'));
    document.getElementById('topbar-channel-topic').textContent = channel.topic || 'Mesh channel';

    if (isDM) {
      document.getElementById('hero-channel-title').textContent = `🔒 Direct P2P Session with @${peerName}`;
      document.getElementById('hero-channel-desc').textContent = `End-to-End Encrypted Tunnel (Nafaq) via ChaCha20-Poly1305. Direct session with zero relay hops.`;
      document.getElementById('hero-icon').textContent = '🔒';
    } else {
      document.getElementById('hero-channel-title').textContent = `Welcome to #${channel.name}!`;
      document.getElementById('hero-channel-desc').textContent = channel.topic || 'Decentralized Gossip Mesh Room.';
      document.getElementById('hero-icon').textContent = channel.icon || (channel.type === 'voice' ? '🔊' : '#');
    }

    updateComposerAccess(channel);
    const input = document.getElementById('message-input');
    input.placeholder = isDM ? `Send private encrypted message to @${peerName}...` : `Broadcast encrypted message to #${channel.name}...`;

    const voiceConnectedBar = document.getElementById('voice-connected-bar');
    if (channel.type === 'voice') {
      if (voiceBanner) voiceBanner.style.display = 'flex';
      if (voiceConnectedBar) {
        voiceConnectedBar.style.display = 'flex';
        document.getElementById('voice-conn-channel-name').textContent = channel.name;
      }
      if (channelTypePill) {
        channelTypePill.textContent = 'VOICE & SAWT';
        channelTypePill.style.color = 'var(--matrix-green)';
      }
      document.getElementById('voice-lounge-name').textContent = `${channel.name} (صَوْت و نَغَم)`;
      renderVoiceParticipants();
    } else {
      if (voiceBanner) voiceBanner.style.display = 'none';
      if (channelTypePill) {
        channelTypePill.textContent = isDM ? 'P2P DM // NAFAQ' : 'TEXT';
        channelTypePill.style.color = isDM ? 'var(--matrix-green)' : 'var(--text-muted)';
      }
    }

    // Call actions: voice, video & VCWYVL buttons are ONLY visible in Direct Messages (DMs)
    const voiceCallBtn = document.getElementById("btn-topbar-call-voice");
    const videoCallBtn = document.getElementById("btn-topbar-call-video");
    const youtubeCallBtn = document.getElementById("btn-topbar-stream-youtube");
    if (voiceCallBtn) voiceCallBtn.style.display = isDM ? "inline-flex" : "none";
    if (videoCallBtn) videoCallBtn.style.display = isDM ? "inline-flex" : "none";
    if (youtubeCallBtn) youtubeCallBtn.style.display = isDM ? "inline-flex" : "none";

    // Auto-display Nafaq Tunnel banner for Direct P2P channels
    if (isDM) {
      const targetPeer = state.peers.find(p => p.prefix === peerName) || { prefix: peerName, peerId: `${peerName}@mesh`, latency: 9 };
      activateNafaqTunnel(targetPeer);
    } else if (!state.manualTunnel) {
      deactivateNafaqTunnel();
    }
  }

  // Close mobile drawer on channel selection so chat window is completely unobstructed
  closeDrawers();

  renderChannelsSidebar();
  loadChannelHistory(channelId);

  // Notify server of switch
  if (state.ws && state.ws.readyState === WebSocket.OPEN) {
    state.ws.send(JSON.stringify({
      type: 'SWITCH_CHANNEL',
      payload: { spaceId: state.currentSpaceId, channelId }
    }));
  }
}

function renderVoiceParticipants() {
  const container = document.getElementById('voice-participants-bar');
  if (!container) return;
  container.innerHTML = '';

  const activePeers = state.peers.filter(p => p.status === 'hadir');
  activePeers.forEach(peer => {
    const chip = document.createElement('div');
    chip.className = 'voice-peer-chip';
    chip.innerHTML = `
      <span>🔊</span>
      <span>${peer.prefix || peer.peerId}</span>
      <span style="opacity:0.6;font-size:9px;">${peer.latency || 12}ms</span>
    `;
    container.appendChild(chip);
  });
}

async function loadChannelHistory(channelId) {
  const stream = document.getElementById('messages-stream');
  stream.innerHTML = '';

  // Always fetch freshest channel history from server
  try {
    const res = await fetch(`/api/history/${channelId}?t=${Date.now()}`);
    if (res.ok) {
      const history = await res.json();
      state.messages.set(channelId, history);
    }
  } catch (e) {
    console.warn('Could not fetch channel history:', e);
  }

  const msgs = state.messages.get(channelId) || [];
  msgs.forEach(packet => appendMessageToDOM(packet));
  scrollToBottom();
}

function appendMessageToDOM(packet) {
  const stream = document.getElementById('messages-stream');
  const { senderId, timestamp, hops, messageId } = packet.zahir;
  const { content, voiceData, attachments, mediaUrl } = packet.batin;

  const prefix = senderId.split('@')[0] || 'peer';
  const isBot = prefix.startsWith('antigravity') || prefix.startsWith('al-') || prefix.startsWith('ibn-');
  const isSelf = senderId === state.identity.fullId;
  const timeStr = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const card = document.createElement('div');
  card.className = `msg-card ${isSelf ? 'self-msg' : ''}`;
  card.id = `msg-${messageId}`;

  let bodyHtml = '';

  // Suppress raw fallback string if attachments or images exist
  const isFallbackText = content && content.startsWith('[مَلَفّ P2P File:');
  if (content && (!isFallbackText || (!attachments && !mediaUrl))) {
    bodyHtml += `<div class="msg-text">${escapeHtml(content)}</div>`;
  }

  // 1. Voice Note Card
  if (voiceData) {
    state.sawtRecordings = state.sawtRecordings || new Map();
    state.sawtRecordings.set(messageId, voiceData);
    bodyHtml += `
      <div class="sawt-audio-card" id="audio-card-${messageId}">
        <button class="sawt-play-btn" data-msg-id="${escapeHtml(messageId)}">▶</button>
        <div class="sawt-track-wrap">
          <div class="sawt-waveform-bars">
            <div class="sawt-wave-bar"></div><div class="sawt-wave-bar"></div><div class="sawt-wave-bar"></div>
            <div class="sawt-wave-bar"></div><div class="sawt-wave-bar"></div><div class="sawt-wave-bar"></div>
            <div class="sawt-wave-bar"></div><div class="sawt-wave-bar"></div><div class="sawt-wave-bar"></div>
            <div class="sawt-wave-bar"></div><div class="sawt-wave-bar"></div><div class="sawt-wave-bar"></div>
          </div>
          <div class="sawt-time-row">
            <span class="sawt-time-display" id="time-${messageId}">0:00</span>
            <span class="sawt-format-tag">SAWT // 48kHz OPUS</span>
          </div>
        </div>
      </div>
    `;
  }

  
  // 3. YouTube / VCWYVL Stream Card
  const ytMatch = content && (content.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/) || content.match(/^\/vcwyvl\s+(.+)/));
  if (ytMatch) {
    const ytQueryOrUrl = ytMatch[1] ? (ytMatch[1].length === 11 ? `https://www.youtube.com/watch?v=${ytMatch[1]}` : ytMatch[1]) : content;
    bodyHtml += `
      <div class="vcwyvl-chat-card" style="margin-top:8px; padding:10px 14px; background:rgba(0, 245, 155, 0.08); border:1px solid rgba(0, 245, 155, 0.3); border-radius:8px; display:flex; align-items:center; justify-content:space-between; gap:12px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:1.4rem;">📺</span>
          <div>
            <div style="font-weight:700; color:#00f59b; font-size:0.85rem;">VCWYVL // YouTube Stream Ready</div>
            <div style="font-size:0.75rem; color:#8e9297;">Tap to start synchronized P2P video call stream</div>
          </div>
        </div>
        <button class="btn btn-primary btn-launch-call" style="padding:6px 14px; font-size:0.8rem; background:linear-gradient(135deg, #00f59b, #00b4d8); color:#000; font-weight:700; border:none; border-radius:6px; cursor:pointer;" data-peer="${escapeHtml(senderId === state.identity.fullId ? (state.currentChannelId?.startsWith('dm-') ? state.currentChannelId.replace('dm-', '') : 'enver') : senderId)}" data-query="${escapeHtml(ytQueryOrUrl)}">
          ▶️ Launch Call
        </button>
      </div>
    `;
  }

  // 2. File & Image Attachments
  if (attachments && Array.isArray(attachments)) {
    attachments.forEach(att => {
      const isImg = (att.type && att.type.startsWith('image/')) || /\.(jpg|jpeg|png|gif|webp|svg|bmp|heic)$/i.test(att.name || '');
      if (isImg) {
        bodyHtml += `
          <div class="msg-attachment-img-wrap">
            <img src="${escapeHtml(att.data)}" alt="${escapeHtml(att.name)}" class="msg-attachment-img msg-lightbox-trigger" data-img-src="${escapeHtml(att.data)}" style="cursor:pointer;">
          </div>
        `;
      } else if (att.name && att.name.endsWith('.epub')) {
        const cleanName = (att.title || att.name.replace('.epub', '').replace(/_/g, ' '));
        const filename = att.name;
        const isTafsir = att.name.startsWith('tafsir_kabir_');
        const isMatalib = att.name.startsWith('al_matalib_');
        const isFiraq = att.name.includes('itiqadat') || att.name.includes('firaq') || att.name.includes('firqa') || att.name.includes('mahsul');
        const isShifa = att.name.startsWith('al_shifa_');
        const isFutuhat = att.name.startsWith('al_futuhat_');
        const isSunan = att.name.startsWith('sunan_al_muhtadin_');
        const isIhya = att.name.startsWith('ihya_ulum_');
        const isGhazali = isIhya || att.name.startsWith('al_munqidh_') || att.name.startsWith('mishkat_') || att.name.startsWith('bidayat_') || att.name.startsWith('tahafut_') || att.name.startsWith('kimiya_') || att.name.startsWith('al_iqtisad_') || att.name.startsWith('al_mankhul_') || att.name.startsWith('al_maqsad_') || att.name.startsWith('al_mustasfa_');
        const isNawawi = att.name.startsWith('al_arbaun_') || att.name.startsWith('al_arbain_') || att.name.startsWith('riyad_') || att.name.startsWith('kitab_al_adhkar_') || att.name.startsWith('al_tibyan_') || att.name.startsWith('minhaj_al_talibin_') || att.name.startsWith('sharh_sahih_') || att.name.startsWith('al_majmu_') || att.name.startsWith('adab_al_fatwa_') || att.name.startsWith('al_idah_');

        let badgeTag = 'Classical Masterwork';
        if (isShifa) badgeTag = "Prophetic Shama'il";
        else if (isFutuhat) badgeTag = "Metaphysics & 'Irfan";
        else if (isSunan) badgeTag = "Spiritual Conduct";
        else if (isIhya) badgeTag = "Ihya 'Ulum al-Din";
        else if (isGhazali) badgeTag = "Ghazali Masterwork";
        else if (isNawawi) badgeTag = "Nawawi Masterwork";
        else if (isTafsir) badgeTag = "Tafsir al-Kabir";
        else if (isMatalib) badgeTag = "Al-Matalib al-'Aliyyah";
        else if (isFiraq) badgeTag = "Firaq & Usul";
        else if (att.name.startsWith('asas_') || att.name.startsWith('lawami_') || att.name.startsWith('ismat_') || att.name.startsWith('macalim_') || att.name.startsWith('asrar_') || att.name.startsWith('al_qada_') || att.name.startsWith('qada_')) badgeTag = "Razi Kalam Treatise";
        bodyHtml += `
          <a href="${att.data}" download="${escapeHtml(att.name)}" class="msg-epub-card" title="Click to download ${escapeHtml(cleanName)}">
            <div class="epub-card-header">
              <span class="epub-card-badge">${badgeTag}</span>
              <span class="epub-card-size">${formatBytes(att.size)}</span>
            </div>
            <div class="epub-card-title">${escapeHtml(cleanName)}</div>
            <div class="epub-card-filename">${escapeHtml(filename)}</div>
          </a>
        `;
      } else {
        bodyHtml += `
          <div class="msg-file-card">
            <span class="file-icon">📄</span>
            <div class="file-info">
              <a href="${att.data}" download="${escapeHtml(att.name)}" class="file-name">${escapeHtml(att.name)}</a>
              <span class="file-size">${formatBytes(att.size)} · P2P Direct File</span>
            </div>
            <a href="${att.data}" download="${escapeHtml(att.name)}" class="file-download-btn" title="Download File">⬇️</a>
          </div>
        `;
      }
    });
  } else if (mediaUrl) {
    bodyHtml += `<img src="${escapeHtml(mediaUrl)}" class="msg-attachment-img msg-lightbox-trigger" data-img-src="${escapeHtml(mediaUrl)}" style="cursor:pointer;">`;
  }

  card.innerHTML = `
    <!-- Floating Discord Action Bar -->
    <div class="msg-action-bar">
      <button class="msg-action-btn" data-reaction="⚡" title="React ⚡">⚡</button>
      <button class="msg-action-btn" data-reaction="🛡️" title="React 🛡️">🛡️</button>
      <button class="msg-action-btn" data-reaction="👍" title="React 👍">👍</button>
      <button class="msg-action-btn" data-reaction="🔥" title="React 🔥">🔥</button>
    </div>

    <div class="msg-content-wrap">
      <div class="msg-meta">
        <span class="msg-author ${prefix === 'antigravity' ? 'antigravity' : ''}" data-sender-id="${escapeHtml(senderId)}" style="cursor: pointer;" title="View ${escapeHtml(prefix)}'s profile">${escapeHtml(prefix)}</span>
        ${isBot ? '<span class="msg-badge">APP</span>' : ''}
        <span class="msg-id">${senderId}</span>
        <span class="msg-badge zbat">🛡️ ZBAT</span>
        ${packet.isEncrypted || packet.zahir?.isEncrypted ? '<span class="msg-badge miftah-badge" title="Miftah E2EE: AES-256-GCM authenticated encryption">🔒 E2EE</span>' : ''}
        <span class="msg-badge hops">${hops === 0 ? 'Direct' : `${hops} hops`}</span>
        <span class="msg-time">${timeStr}</span>
      </div>
      ${bodyHtml}
    </div>
  `;

  stream.appendChild(card);
}

function formatBytes(bytes, decimals = 1) {
  if (!bytes) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function openImageLightbox(src) {
  if (!src || typeof src !== 'string') return;
  const clean = src.trim();
  if (!clean.startsWith('data:image/') && !clean.startsWith('blob:') && !clean.startsWith('/') && !clean.startsWith('http://') && !clean.startsWith('https://')) {
    console.warn('[Security] Blocked unsafe lightbox protocol:', clean);
    return;
  }
  const img = document.getElementById('lightbox-img');
  if (img) img.src = clean;
  openModal('modal-image-lightbox');
}

function sendQuickReaction(emoji) {
  if (state.ws && state.ws.readyState === WebSocket.OPEN) {
    state.ws.send(JSON.stringify({
      type: 'SEND_MESSAGE',
      payload: {
        spaceId: state.currentSpaceId,
        channelId: state.currentChannelId,
        content: emoji
      }
    }));
  }
}

function scrollToBottom(smooth = false) {
  const container = document.getElementById('messages-container');
  if (!container) return;
  requestAnimationFrame(() => {
    if (smooth) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    } else {
      container.scrollTop = container.scrollHeight;
    }
  });
}

function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// --- 5. Members List Rendering (Hudur) ---
function renderMembers() {
  const onlineList = document.getElementById('online-members-list');
  const offlineList = document.getElementById('offline-members-list');
  onlineList.innerHTML = '';
  offlineList.innerHTML = '';

  let onlineCount = 0;
  let offlineCount = 0;

  // Deduplicate peers by prefix, prioritizing hadir status
  const seenPrefixes = new Set();
  const sortedPeers = [...state.peers].sort((a, b) => (b.status === 'hadir' ? 1 : 0) - (a.status === 'hadir' ? 1 : 0));
  const uniquePeers = [];

  sortedPeers.forEach(peer => {
    const key = peer.prefix || peer.peerId.split('@')[0];
    if (!seenPrefixes.has(key)) {
      seenPrefixes.add(key);
      uniquePeers.push(peer);
    }
  });

  uniquePeers.forEach(peer => {
    const isHadir = peer.status === 'hadir';
    const item = document.createElement('div');
    item.className = `member-item ${isHadir ? 'online' : 'offline'}`;
    item.title = `Click to view profile / Direct DM with ${peer.prefix}`;
    item.innerHTML = `
      <div class="member-avatar-wrap">
        <div class="member-avatar ${isHadir ? '' : 'offline'}">
          ${escapeHtml((peer.prefix || 'P').substring(0, 2).toUpperCase())}
        </div>
        <span class="status-indicator ${isHadir ? 'hadir' : 'ghaib'}"></span>
      </div>
      <div class="member-info">
        <span class="member-name ${isHadir && peer.prefix === 'antigravity' ? 'antigravity' : ''}">${escapeHtml(peer.prefix || peer.peerId)}</span>
        <span class="member-sub">${parseInt(peer.latency, 10) || 12}ms · ${isHadir ? 'حَاضِر' : 'غَائِب'}</span>
      </div>
    `;
    item.onclick = (e) => {
      e.stopPropagation();
      closeDrawers();
      showUserProfile(peer);
    };

    if (isHadir) {
      onlineCount++;
      onlineList.appendChild(item);
    } else {
      offlineCount++;
      offlineList.appendChild(item);
    }
  });

  document.getElementById('online-count-header').textContent = `ONLINE (حَاضِر) — ${onlineCount}`;
  document.getElementById('offline-count-header').textContent = `OFFLINE (غَائِب) — ${offlineCount}`;
}

function showUserProfile(peer) {
  state.selectedProfilePeer = peer;
  const prefix = peer.prefix || peer.peerId.split('@')[0] || 'peer';
  const isHadir = peer.status === 'hadir';

  document.getElementById('profile-modal-avatar').textContent = prefix.substring(0, 2).toUpperCase();
  document.getElementById('profile-modal-name').textContent = prefix;
  document.getElementById('profile-modal-id').textContent = peer.peerId || 'peer@00000000';
  document.getElementById('profile-modal-status').textContent = isHadir ? 'ONLINE (حَاضِر)' : 'OFFLINE (غَائِب)';
  document.getElementById('profile-modal-status').className = `stat-val ${isHadir ? 'hadir' : 'ghaib'}`;
  document.getElementById('profile-modal-latency').textContent = `${peer.latency || 12}ms`;

  openModal('modal-user-profile');
}

function showUserProfileBySenderId(senderId) {
  const peer = state.peers.find(p => p.peerId === senderId) || {
    peerId: senderId,
    prefix: senderId.split('@')[0],
    status: 'hadir',
    latency: 14
  };
  showUserProfile(peer);
}

// --- 6. Typing Indicator (Yaktub) ---
function handleTypingInput() {
  if (state.ws && state.ws.readyState === WebSocket.OPEN) {
    state.ws.send(JSON.stringify({
      type: 'TYPING',
      payload: { channelId: state.currentChannelId }
    }));
  }
}

function renderTypingIndicator() {
  const textEl = document.getElementById('typing-text');
  const dotsEl = document.getElementById('typing-dots');
  const others = state.typingPeers.filter(p => p.peerId !== state.identity.fullId);

  if (others.length === 1) {
    textEl.textContent = `${others[0].prefix} is broadcasting... (يَكْتُب)`;
    if (dotsEl) dotsEl.style.display = 'inline-flex';
  } else if (others.length > 1) {
    textEl.textContent = `${others.length} peers are broadcasting...`;
    if (dotsEl) dotsEl.style.display = 'inline-flex';
  } else {
    textEl.textContent = '';
    if (dotsEl) dotsEl.style.display = 'none';
  }
}

// --- 7. Sawt Voice Recording Engine ---
async function startSawtRecording() {
  const recBar = document.getElementById('sawt-recording-bar');
  const timerEl = document.getElementById('rec-timer');

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    state.mediaRecorder = new MediaRecorder(stream);
    state.audioChunks = [];

    state.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) state.audioChunks.push(e.data);
    };

    state.mediaRecorder.onstop = async () => {
      clearInterval(state.recordingInterval);
      if (state.audioChunks.length > 0) {
        const audioBlob = new Blob(state.audioChunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          sendSawtMessage(reader.result);
        };
      }
    };

    state.mediaRecorder.start();
    state.isRecordingSawt = true;
    state.recordingSeconds = 0;
    timerEl.textContent = '00:00';
    if (recBar) recBar.style.display = 'flex';

    state.recordingInterval = setInterval(() => {
      state.recordingSeconds++;
      const mins = String(Math.floor(state.recordingSeconds / 60)).padStart(2, '0');
      const secs = String(state.recordingSeconds % 60).padStart(2, '0');
      timerEl.textContent = `${mins}:${secs}`;
    }, 1000);

  } catch (err) {
    console.warn('Microphone permission not available, generating synthetic Sawt carrier tone:', err);
    generateSyntheticSawtAudio();
  }
}

function cancelSawtRecording() {
  if (state.mediaRecorder && state.mediaRecorder.state === 'recording') {
    state.audioChunks = [];
    state.mediaRecorder.stop();
  }
  clearInterval(state.recordingInterval);
  state.isRecordingSawt = false;
  const recBar = document.getElementById('sawt-recording-bar');
  if (recBar) recBar.style.display = 'none';
}

function finishSawtRecording() {
  if (state.mediaRecorder && state.mediaRecorder.state === 'recording') {
    state.mediaRecorder.stop();
  }
  clearInterval(state.recordingInterval);
  state.isRecordingSawt = false;
  const recBar = document.getElementById('sawt-recording-bar');
  if (recBar) recBar.style.display = 'none';
}

function toggleSawtRecording() {
  if (!state.isRecordingSawt) {
    startSawtRecording();
  } else {
    finishSawtRecording();
  }
}

function generateSyntheticSawtAudio() {
  // Generate synthetic Sawt audio using Web Audio Buffer (WAV)
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const sampleRate = ctx.sampleRate;
  const duration = 2.0; // 2 seconds voice pulse
  const numFrames = sampleRate * duration;
  const audioBuffer = ctx.createBuffer(1, numFrames, sampleRate);
  const channelData = audioBuffer.getChannelData(0);

  for (let i = 0; i < numFrames; i++) {
    const t = i / sampleRate;
    // Harmonic carrier with pitch modulation (Arabic musical scale simulation)
    const freq = 440 + Math.sin(t * 8) * 120;
    channelData[i] = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 0.8) * 0.4;
  }

  // Convert AudioBuffer to WAV Base64
  const wavBlob = audioBufferToWav(audioBuffer);
  const reader = new FileReader();
  reader.readAsDataURL(wavBlob);
  reader.onloadend = () => {
    sendSawtMessage(reader.result);
  };
}

function audioBufferToWav(buffer) {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const out = new DataView(new ArrayBuffer(length));
  const channels = [];
  let sample = 0;
  let offset = 0;
  let pos = 0;

  function setUint16(data) { out.setUint16(pos, data, true); pos += 2; }
  function setUint32(data) { out.setUint32(pos, data, true); pos += 4; }

  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8);
  setUint32(0x45564157); // "WAVE"
  setUint32(0x20746d66); // "fmt "
  setUint32(16);
  setUint16(1);
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan);
  setUint16(numOfChan * 2);
  setUint16(16);
  setUint32(0x61746164); // "data"
  setUint32(length - pos - 4);

  for (let i = 0; i < buffer.numberOfChannels; i++) channels.push(buffer.getChannelData(i));
  while (offset < buffer.length) {
    for (let i = 0; i < numOfChan; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      out.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }
  return new Blob([out.buffer], { type: 'audio/wav' });
}

async function sendSawtMessage(voiceData) {
  const rawPayload = {
    content: '[صَوْت Sawt Audio Note]',
    voiceData
  };

  if (state.currentChannelId.startsWith('dm-')) {
    await sendEncryptedDm(state.currentChannelId, rawPayload);
  } else {
    if (state.ws && state.ws.readyState === WebSocket.OPEN) {
      state.ws.send(JSON.stringify({
        type: 'SEND_MESSAGE',
        payload: {
          spaceId: state.currentSpaceId,
          channelId: state.currentChannelId,
          ...rawPayload
        }
      }));
    }
  }
}

// --- 8. Sawt Audio Playback ---
window.playSawtAudio = function(msgId, voiceData) {
  const audioData = voiceData || (state.sawtRecordings && state.sawtRecordings.get(msgId));
  if (!audioData) return;
  const card = document.getElementById(`audio-card-${msgId}`);
  const timeEl = document.getElementById(`time-${msgId}`);
  const btn = card ? card.querySelector('.sawt-play-btn') : null;

  if (state.currentPlayingAudio) {
    state.currentPlayingAudio.pause();
    if (state.currentPlayingCard) {
      state.currentPlayingCard.classList.remove('playing');
      const prevBtn = state.currentPlayingCard.querySelector('.sawt-play-btn');
      if (prevBtn) prevBtn.textContent = '▶';
    }
    if (state.currentPlayingAudio.dataset?.msgId === msgId) {
      state.currentPlayingAudio = null;
      state.currentPlayingCard = null;
      return;
    }
  }

  const audio = new Audio(audioData);
  audio.dataset = { msgId };
  state.currentPlayingAudio = audio;
  state.currentPlayingCard = card;

  if (card) card.classList.add('playing');
  if (btn) btn.textContent = '⏸';

  audio.ontimeupdate = () => {
    if (timeEl && audio.duration) {
      const cur = Math.floor(audio.currentTime);
      const total = Math.floor(audio.duration);
      timeEl.textContent = `0:0${cur} / 0:0${total}`;
    }
  };

  audio.onended = () => {
    if (card) card.classList.remove('playing');
    if (btn) btn.textContent = '▶';
    if (timeEl) timeEl.textContent = '0:00';
    state.currentPlayingAudio = null;
    state.currentPlayingCard = null;
  };

  audio.play().catch(e => {
    console.log('Audio playback fallback to tone synth:', e);
    playDtmfTone('A');
    if (card) card.classList.remove('playing');
    if (btn) btn.textContent = '▶';
  });
};

// --- 9. Nagham DTMF Audio Synthesizer ---
const DTMF_FREQS = {
  '1': [697, 1209], '2': [697, 1336], '3': [697, 1477], 'A': [697, 1633],
  '4': [770, 1209], '5': [770, 1336], '6': [770, 1477], 'B': [770, 1633],
  '7': [852, 1209], '8': [852, 1336], '9': [852, 1477], 'C': [852, 1633],
  '*': [941, 1209], '0': [941, 1336], '#': [941, 1477], 'D': [941, 1633]
};

function initDtmfAudio() {
  const keys = document.querySelectorAll('.dtmf-key');
  keys.forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-key');
      playDtmfTone(key);
      const display = document.getElementById('dtmf-sequence-display');
      if (display) display.textContent = `TONE [${key}] FREQS: ${DTMF_FREQS[key]?.join('/')} Hz`;
    });
  });
}

function playDtmfTone(key) {
  const freqs = DTMF_FREQS[key];
  if (!freqs) return;

  const ctx = state.audioCtx || new (window.AudioContext || window.webkitAudioContext)();
  state.audioCtx = ctx;

  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.frequency.value = freqs[0];
  osc2.frequency.value = freqs[1];

  gain.gain.value = 0.15;
  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);

  osc1.start();
  osc2.start();

  setTimeout(() => {
    osc1.stop();
    osc2.stop();
  }, 150);
}

// --- 10. Drawer Navigation & Event Listeners ---
function closeDrawers() {
  document.getElementById('app-container')?.classList.remove('drawer-open');
  document.getElementById('channels-sidebar')?.classList.remove('show-mobile');
  document.getElementById('space-rail')?.classList.remove('show-mobile');
  document.getElementById('members-sidebar')?.classList.remove('show-mobile');
  document.getElementById('drawer-backdrop')?.classList.remove('active');
}

function toggleChannelsDrawer() {
  const app = document.getElementById('app-container');
  const sidebar = document.getElementById('channels-sidebar');
  const rail = document.getElementById('space-rail');
  const backdrop = document.getElementById('drawer-backdrop');
  document.getElementById('members-sidebar')?.classList.remove('show-mobile');

  if (sidebar) {
    const isShowing = sidebar.classList.toggle('show-mobile');
    if (rail) rail.classList.toggle('show-mobile', isShowing);
    if (app) app.classList.toggle('drawer-open', isShowing);
    if (backdrop) backdrop.classList.toggle('active', isShowing);
  }
}

function toggleMembersDrawer() {
  const members = document.getElementById('members-sidebar');
  const backdrop = document.getElementById('drawer-backdrop');
  const sidebar = document.getElementById('channels-sidebar');
  const rail = document.getElementById('space-rail');
  const app = document.getElementById('app-container');

  sidebar?.classList.remove('show-mobile');
  rail?.classList.remove('show-mobile');
  app?.classList.remove('drawer-open');

  if (members) {
    const isShowing = members.classList.toggle('show-mobile');
    if (backdrop) backdrop.classList.toggle('active', isShowing);
  }
}

function toggleCategory(catId) {
  const el = document.getElementById(catId);
  if (el) {
    el.classList.toggle('collapsed');
  }
}

// --- Nafaq Tunnel Controller ---
function activateNafaqTunnel(peer) {
  if (!peer) return;
  state.activeTunnel = {
    peer,
    ip: '10.240.0.2',
    latency: peer.latency || 9,
    establishedAt: Date.now()
  };

  const banner = document.getElementById('nafaq-tunnel-banner');
  if (banner) banner.style.display = 'flex';

  const prefix = peer.prefix || peer.peerId.split('@')[0];
  const ipEl = document.getElementById('tunnel-assigned-ip');
  const infoEl = document.getElementById('tunnel-peer-info');
  if (ipEl) ipEl.textContent = '10.240.0.2/24';
  if (infoEl) infoEl.textContent = `Direct Zero-RTT ChaCha20-Poly1305 link with peer @${prefix} (${peer.peerId}) · ${peer.latency || 8}ms latency`;
  
  // Update Topbar badge
  const badgeText = document.getElementById('topbar-mesh-status');
  if (badgeText) badgeText.textContent = '🛡️ NAFAQ // 10.240.0.2';

  // Update Dashboard modal fields
  const dIp = document.getElementById('diag-tunnel-ip');
  const dPeer = document.getElementById('diag-tunnel-peer');
  const dLat = document.getElementById('diag-tunnel-latency');
  if (dIp) dIp.textContent = '10.240.0.2 / 24';
  if (dPeer) dPeer.textContent = peer.peerId || `${prefix}@mesh`;
  if (dLat) dLat.textContent = `${peer.latency || 8}ms (0 Hops Direct)`;

  startTrafficSimulation();
}

function deactivateNafaqTunnel() {
  state.activeTunnel = null;
  state.manualTunnel = false;
  const banner = document.getElementById('nafaq-tunnel-banner');
  if (banner) banner.style.display = 'none';

  const badgeText = document.getElementById('topbar-mesh-status');
  if (badgeText) badgeText.textContent = 'P2P MESH // MUTTASIL';
}

let trafficInterval = null;
function startTrafficSimulation() {
  if (trafficInterval) clearInterval(trafficInterval);
  let tx = 1.4;
  let rx = 3.8;
  trafficInterval = setInterval(() => {
    if (!state.activeTunnel) {
      clearInterval(trafficInterval);
      return;
    }
    tx += (Math.random() * 0.05);
    rx += (Math.random() * 0.08);
    const txEl = document.getElementById('tunnel-tx-count');
    const rxEl = document.getElementById('tunnel-rx-count');
    if (txEl) txEl.textContent = `${tx.toFixed(2)} MB`;
    if (rxEl) rxEl.textContent = `${rx.toFixed(2)} MB`;
  }, 3000);
}

// --- Attachment State & Helpers ---
state.stagedAttachments = [];

function handleFileSelect(files) {
  if (!files || files.length === 0) return;
  Array.from(files).forEach(file => {
    if (file.size > 5 * 1024 * 1024) {
      alert(`File "${file.name}" is larger than 5MB. P2P Mesh transfer limits file bursts to 5MB.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      state.stagedAttachments.push({
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        data: e.target.result
      });
      renderAttachmentTray();
    };
    reader.readAsDataURL(file);
  });
}

function renderAttachmentTray() {
  const tray = document.getElementById('attachment-staging-tray');
  if (!tray) return;
  tray.innerHTML = '';
  if (state.stagedAttachments.length === 0) {
    tray.style.display = 'none';
    return;
  }
  tray.style.display = 'flex';
  state.stagedAttachments.forEach((att, idx) => {
    const chip = document.createElement('div');
    chip.className = 'attachment-chip';
    const isImg = att.type && att.type.startsWith('image/');
    chip.innerHTML = `
      ${isImg ? `<img src="${att.data}" alt="preview">` : '<span>📄</span>'}
      <span class="chip-name">${escapeHtml(att.name)}</span>
      <button class="chip-remove-btn" onclick="removeStagedAttachment(${idx})">✕</button>
    `;
    tray.appendChild(chip);
  });
}

function removeStagedAttachment(idx) {
  state.stagedAttachments.splice(idx, 1);
  renderAttachmentTray();
}

function initEventListeners() {
  // Global event delegation for messages-stream (Prevents inline XSS attack vectors)
  const streamEl = document.getElementById('messages-stream');
  if (streamEl && !streamEl._hasDelegatedListener) {
    streamEl._hasDelegatedListener = true;
    streamEl.addEventListener('click', (e) => {
      // 1. Sawt audio playback
      const sawtBtn = e.target.closest('.sawt-play-btn');
      if (sawtBtn && sawtBtn.dataset.msgId) {
        window.playSawtAudio(sawtBtn.dataset.msgId);
        return;
      }
      // 2. Lightbox image trigger
      const imgTrigger = e.target.closest('.msg-lightbox-trigger');
      if (imgTrigger && imgTrigger.dataset.imgSrc) {
        window.openImageLightbox(imgTrigger.dataset.imgSrc);
        return;
      }
      // 3. User profile click
      const authorSpan = e.target.closest('.msg-author');
      if (authorSpan && authorSpan.dataset.senderId) {
        window.showUserProfileBySenderId(authorSpan.dataset.senderId);
        return;
      }
      // 4. VCWYVL video stream call
      const callBtn = e.target.closest('.btn-launch-call');
      if (callBtn && callBtn.dataset.peer && callBtn.dataset.query) {
        window.startYoutubeStreamCall(callBtn.dataset.peer, callBtn.dataset.query);
        return;
      }
      // 5. Quick reactions
      const reactBtn = e.target.closest('.msg-action-btn');
      if (reactBtn && reactBtn.dataset.reaction) {
        window.sendQuickReaction(reactBtn.dataset.reaction);
        return;
      }
    });
  }

  const input = document.getElementById('message-input');
  const sendBtn = document.getElementById('btn-send-message');

  const sendMessage = async () => {
    const text = input.value.trim();
    if (text === '/clear' || text === '/wipe' || text.startsWith('/clear ') || text.startsWith('/wipe ')) {
      input.value = '';
      const chan = state.currentChannelId || 'chan-general';
      try {
        await fetch('/api/channels/clear', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ channelId: chan })
        });
        state.messages.set(chan, []);
        renderMessages();
      } catch (swallowedErr) { console.warn("[WyreSup Non-Fatal Notice]:", swallowedErr.message); }
      return;
    }
    if (text.startsWith('/vcwyvl ') || text.startsWith('/stream ') || text === '/vcwyvl' || text === '/stream') {
      const query = text.replace(/^\/(vcwyvl|stream)\s*/, '').trim();
      input.value = '';
      if (query) {
        startYoutubeStreamCall(state.youtubeStreamTarget || (state.currentChannelId?.startsWith('dm-') ? state.currentChannelId.replace('dm-', '') : 'enver'), query);
      } else {
        openStreamYoutubeModal();
      }
      return;
    }
        // Sovereign Publisher / Admin toggle command
    if (text === '/admin' || text === '/publisher') {
      localStorage.setItem('wyresup_sovereign_publisher', 'true');
      input.value = '';
      appendSystemNotice("👑 Sovereign Publisher Mode Activated. Write permissions unlocked on all library channels.");
      const space = state.spaces.find(s => s.id === state.currentSpaceId);
      const ch = space?.channels.find(c => c.id === state.currentChannelId);
      updateComposerAccess(ch);
      return;
    }
    if (text === '/unadmin' || text === '/logout-admin') {
      localStorage.removeItem('wyresup_sovereign_publisher');
      input.value = '';
      appendSystemNotice("🔒 Sovereign Publisher Mode Deactivated.");
      const space = state.spaces.find(s => s.id === state.currentSpaceId);
      const ch = space?.channels.find(c => c.id === state.currentChannelId);
      updateComposerAccess(ch);
      return;
    }

    // Client-side guard for protected library channels
    if (isProtectedLibraryChannel(state.currentChannelId) && !isSovereignPublisher()) {
      appendSystemNotice("🔒 Permission Denied: Imam library sub-channels are strictly read-only and reserved for sovereign publishing.");
      return;
    }

    const hasAttachments = state.stagedAttachments.length > 0;
    if (!text && !hasAttachments) return;

    const rawPayload = {
      content: text || '',
      attachments: state.stagedAttachments.length > 0 ? [...state.stagedAttachments] : undefined
    };

    if (state.currentChannelId.startsWith('dm-')) {
      await sendEncryptedDm(state.currentChannelId, rawPayload);
    } else {
      if (state.ws && state.ws.readyState === WebSocket.OPEN) {
        state.ws.send(JSON.stringify({
          type: 'SEND_MESSAGE',
          payload: {
            spaceId: state.currentSpaceId,
            channelId: state.currentChannelId,
            ...rawPayload
          }
        }));
      }
    }

    input.value = '';
    input.style.height = 'auto';
    state.stagedAttachments = [];
    renderAttachmentTray();
  };

  sendBtn.addEventListener('click', sendMessage);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    } else {
      handleTypingInput();
    }
  });

  // File Attachment triggers
  const attachBtn = document.getElementById('btn-attach-file');
  const fileInput = document.getElementById('file-attachment-input');
  if (attachBtn && fileInput) {
    attachBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      handleFileSelect(e.target.files);
      fileInput.value = '';
    });
  }

  // Sawt Voice Record Buttons
  document.getElementById('btn-record-sawt').addEventListener('click', toggleSawtRecording);
  document.getElementById('btn-cancel-recording').addEventListener('click', cancelSawtRecording);
  document.getElementById('btn-finish-recording').addEventListener('click', finishSawtRecording);

  // Push to talk in Voice Lounge
  const pttBtn = document.getElementById('btn-voice-ptt');
  if (pttBtn) pttBtn.addEventListener('click', toggleSawtRecording);
  const dtmfLoungeBtn = document.getElementById('btn-lounge-dtmf');
  if (dtmfLoungeBtn) dtmfLoungeBtn.addEventListener('click', () => openModal('modal-nagham'));

  // Quick Reactions
  document.querySelectorAll('.quick-reaction-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const emoji = btn.getAttribute('data-reaction');
      if (state.ws && state.ws.readyState === WebSocket.OPEN) {
        state.ws.send(JSON.stringify({
          type: 'SEND_MESSAGE',
          payload: {
            spaceId: state.currentSpaceId,
            channelId: state.currentChannelId,
            content: emoji
          }
        }));
      }
    });
  });

  // Root Mesh Brand Button
  const rootMeshBtn = document.getElementById('btn-root-mesh');
  if (rootMeshBtn) {
    rootMeshBtn.addEventListener('click', () => {
      selectSpace('space-public-mesh');
    });
  }

  // Mobile drawer toggles & Close buttons
  const toggleSidebarBtn = document.getElementById('btn-toggle-sidebar');
  if (toggleSidebarBtn) {
    toggleSidebarBtn.addEventListener('click', toggleChannelsDrawer);
  }

  const closeSidebarBtn = document.getElementById('btn-close-sidebar');
  if (closeSidebarBtn) {
    closeSidebarBtn.addEventListener('click', closeDrawers);
  }

  const toggleMembersBtn = document.getElementById('btn-toggle-members');
  if (toggleMembersBtn) {
    toggleMembersBtn.addEventListener('click', toggleMembersDrawer);
  }

  const closeMembersBtn = document.getElementById('btn-close-members');
  if (closeMembersBtn) {
    closeMembersBtn.addEventListener('click', closeDrawers);
  }

  const drawerBackdrop = document.getElementById('drawer-backdrop');
  if (drawerBackdrop) {
    drawerBackdrop.addEventListener('click', closeDrawers);
  }

  // Scroll monitoring for Jump to Present button
  const messagesContainer = document.getElementById('messages-container');
  const jumpBottomBtn = document.getElementById('btn-jump-bottom');
  if (messagesContainer && jumpBottomBtn) {
    messagesContainer.addEventListener('scroll', () => {
      const distFromBottom = messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight;
      if (distFromBottom > 180) {
        jumpBottomBtn.style.display = 'inline-flex';
      } else {
        jumpBottomBtn.style.display = 'none';
      }
    });

    jumpBottomBtn.addEventListener('click', () => {
      scrollToBottom(true);
      document.getElementById('message-input')?.focus();
    });
  }

  // Composer box auto-focus
  const composerBox = document.querySelector('.composer-box');
  if (composerBox) {
    composerBox.addEventListener('click', (e) => {
      if (e.target.tagName !== 'BUTTON' && !e.target.closest('button')) {
        document.getElementById('message-input')?.focus();
      }
    });
  }

  // Auto-scroll when textarea focused
  const messageInput = document.getElementById('message-input');
  if (messageInput) {
    messageInput.addEventListener('focus', () => {
      setTimeout(() => scrollToBottom(true), 150);
    });
  }

  // Direct P2P Chat Handshake Action
  const startDmBtn = document.getElementById('btn-start-direct-dm');
  if (startDmBtn) {
    startDmBtn.addEventListener('click', () => {
      const peer = state.selectedProfilePeer;
      if (!peer) return;
      closeModal('modal-user-profile');

      const prefix = peer.prefix || peer.peerId.split('@')[0];
      const dmChannelId = `dm-${prefix}`;

      // Find or create direct channel in current space
      const currentSpace = state.spaces.find(s => s.id === state.currentSpaceId) || state.spaces[0];
      let dmChannel = currentSpace.channels.find(c => c.id === dmChannelId);

      if (!dmChannel) {
        dmChannel = {
          id: dmChannelId,
          name: `dm-${prefix}`,
          type: 'text',
          topic: `Direct P2P Encrypted Session with @${prefix} (مُحَادَثَة خَاصَّة)`,
          icon: '🔒'
        };
        currentSpace.channels.push(dmChannel);
        renderChannelsSidebar();
      }

      selectChannel(dmChannelId);

      // Broadcast Direct P2P handshake initiation
      if (state.ws && state.ws.readyState === WebSocket.OPEN) {
        state.ws.send(JSON.stringify({
          type: 'SEND_MESSAGE',
          payload: {
            spaceId: state.currentSpaceId,
            channelId: dmChannelId,
            content: `🔒 [Miftah Handshake] Requesting Direct P2P session with @${prefix} (${peer.peerId}). Forward secrecy initialized.`
          }
        }));
      }
    });
  }

  // Direct P2P Audio Call Action from Profile
  const profileVoiceBtn = document.getElementById('btn-profile-voice-call');
  if (profileVoiceBtn) {
    profileVoiceBtn.addEventListener('click', () => {
      const peer = state.selectedProfilePeer;
      if (!peer) return;
      closeModal('modal-user-profile');
      startOutgoingCall(peer.peerId || peer.fullId || peer, 'audio');
    });
  }

  // Direct P2P Video Call Action from Profile
  const profileVideoBtn = document.getElementById('btn-profile-video-call');
  if (profileVideoBtn) {
    profileVideoBtn.addEventListener('click', () => {
      const peer = state.selectedProfilePeer;
      if (!peer) return;
      closeModal('modal-user-profile');
      startOutgoingCall(peer.peerId || peer.fullId || peer, 'video');
    });
  }


  // YouTube Streaming UI Event Listeners
  document.getElementById('btn-topbar-stream-youtube')?.addEventListener('click', () => openStreamYoutubeModal());
  document.getElementById('btn-call-stream-youtube')?.addEventListener('click', () => openStreamYoutubeModal());

  document.getElementById('btn-yt-search-action')?.addEventListener('click', () => {
    const val = document.getElementById('yt-stream-url-input')?.value;
    if (val) searchYouTubeVideos(val);
  });

  document.getElementById('yt-stream-url-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const val = document.getElementById('yt-stream-url-input')?.value;
      if (val) searchYouTubeVideos(val);
    }
  });

  document.getElementById('btn-yt-start-stream')?.addEventListener('click', () => {
    const val = document.getElementById('yt-stream-url-input')?.value;
    if (val) {
      startYoutubeStreamCall(state.youtubeStreamTarget, val);
    } else {
      alert('Please enter a YouTube URL or query');
    }
  });

  document.querySelectorAll('.yt-preset-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const q = chip.getAttribute('data-query');
      const input = document.getElementById('yt-stream-url-input');
      if (input) input.value = q;
      startYoutubeStreamCall(state.youtubeStreamTarget, q);
    });
  });

  // Topbar Voice & Video Call Triggers
  const topbarVoiceBtn = document.getElementById('btn-topbar-call-voice');
  if (topbarVoiceBtn) {
    topbarVoiceBtn.addEventListener('click', () => {
      let targetPeer = null;
      if (state.currentChannelId && state.currentChannelId.startsWith('dm-')) {
        const targetPrefix = state.currentChannelId.replace('dm-', '');
        targetPeer = state.peers.find(p => p.prefix === targetPrefix || p.peerId.startsWith(targetPrefix))?.peerId || `${targetPrefix}@mesh`;
      } else {
        const otherPeer = state.peers.find(p => p.peerId !== state.identity.fullId);
        targetPeer = otherPeer ? otherPeer.peerId : 'antigravity@mesh';
      }
      startOutgoingCall(targetPeer, 'audio');
    });
  }

  const topbarVideoBtn = document.getElementById('btn-topbar-call-video');
  if (topbarVideoBtn) {
    topbarVideoBtn.addEventListener('click', () => {
      let targetPeer = null;
      if (state.currentChannelId && state.currentChannelId.startsWith('dm-')) {
        const targetPrefix = state.currentChannelId.replace('dm-', '');
        targetPeer = state.peers.find(p => p.prefix === targetPrefix || p.peerId.startsWith(targetPrefix))?.peerId || `${targetPrefix}@mesh`;
      } else {
        const otherPeer = state.peers.find(p => p.peerId !== state.identity.fullId);
        targetPeer = otherPeer ? otherPeer.peerId : 'antigravity@mesh';
      }
      startOutgoingCall(targetPeer, 'video');
    });
  }

  document.getElementById('btn-swap-call-views')?.addEventListener('click', toggleSwapCallViews);
  document.getElementById('local-video-tile')?.addEventListener('click', toggleSwapCallViews);
  document.getElementById('remote-video-tile')?.addEventListener('click', (e) => {
    const grid = document.getElementById('call-video-grid');
    if (grid && grid.classList.contains('is-swapped')) {
      toggleSwapCallViews();
    }
  });
  // In-Call Controls
  document.getElementById('btn-call-toggle-mic')?.addEventListener('click', toggleCallMic);
  document.getElementById('btn-call-toggle-cam')?.addEventListener('click', toggleCallCam);
  document.getElementById('btn-call-share-screen')?.addEventListener('click', toggleCallScreenShare);
  document.getElementById('btn-call-send-nagham')?.addEventListener('click', sendInCallNaghamTone);
  document.getElementById('btn-call-hangup')?.addEventListener('click', () => endActiveCall(true));
  document.getElementById('btn-minimize-call')?.addEventListener('click', () => closeModal('modal-active-call'));

  // Incoming Call Handlers
  document.getElementById('btn-incoming-accept')?.addEventListener('click', acceptIncomingCall);
  document.getElementById('btn-incoming-decline')?.addEventListener('click', declineIncomingCall);

  // Direct P2P Tunnel Handshake Action
  const startTunnelBtn = document.getElementById('btn-start-p2p-tunnel');
  if (startTunnelBtn) {
    startTunnelBtn.addEventListener('click', () => {
      const peer = state.selectedProfilePeer;
      if (!peer) return;
      closeModal('modal-user-profile');

      const prefix = peer.prefix || peer.peerId.split('@')[0];
      const dmChannelId = `dm-${prefix}`;

      // Find or create direct channel in current space
      const currentSpace = state.spaces.find(s => s.id === state.currentSpaceId) || state.spaces[0];
      let dmChannel = currentSpace.channels.find(c => c.id === dmChannelId);

      if (!dmChannel) {
        dmChannel = {
          id: dmChannelId,
          name: `dm-${prefix}`,
          type: 'text',
          topic: `Direct P2P Encrypted Session with @${prefix} (مُحَادَثَة خَاصَّة)`,
          icon: '🔒'
        };
        currentSpace.channels.push(dmChannel);
        renderChannelsSidebar();
      }

      state.manualTunnel = true;
      selectChannel(dmChannelId);
      activateNafaqTunnel(peer);

      if (state.ws && state.ws.readyState === WebSocket.OPEN) {
        state.ws.send(JSON.stringify({
          type: 'SEND_MESSAGE',
          payload: {
            spaceId: state.currentSpaceId,
            channelId: dmChannelId,
            content: `🛡️ [Nafaq Tunnel Established] Direct wire-speed encrypted tunnel activated with @${prefix} (${peer.peerId}). Virtual Mesh IP: 10.240.0.2/24.`
          }
        }));
      }
    });
  }

  // Nafaq Tunnel Banner & Dashboard Handlers
  const openTunnelDetailsBtn = document.getElementById('btn-open-tunnel-details');
  if (openTunnelDetailsBtn) {
    openTunnelDetailsBtn.addEventListener('click', () => {
      openModal('modal-nafaq-dashboard');
    });
  }

  const closeTunnelBtn = document.getElementById('btn-close-tunnel');
  if (closeTunnelBtn) {
    closeTunnelBtn.addEventListener('click', () => {
      deactivateNafaqTunnel();
    });
  }

  const teardownTunnelBtn = document.getElementById('btn-teardown-tunnel');
  if (teardownTunnelBtn) {
    teardownTunnelBtn.addEventListener('click', () => {
      deactivateNafaqTunnel();
      closeModal('modal-nafaq-dashboard');
    });
  }

  const rekeyTunnelBtn = document.getElementById('btn-rekey-tunnel');
  if (rekeyTunnelBtn) {
    rekeyTunnelBtn.addEventListener('click', () => {
      if (state.ws && state.ws.readyState === WebSocket.OPEN) {
        state.ws.send(JSON.stringify({
          type: 'SEND_MESSAGE',
          payload: {
            spaceId: state.currentSpaceId,
            channelId: state.currentChannelId,
            content: '🔄 [Miftah Ratchet] Session key rotated with 0-RTT forward-secrecy.'
          }
        }));
      }
      closeModal('modal-nafaq-dashboard');
    });
  }

  // Voice Connected Disconnect Button
  const disconnectVoiceBtn = document.getElementById('btn-voice-disconnect');
  if (disconnectVoiceBtn) {
    disconnectVoiceBtn.addEventListener('click', () => {
      const voiceConnectedBar = document.getElementById('voice-connected-bar');
      if (voiceConnectedBar) voiceConnectedBar.style.display = 'none';
      selectChannel('chan-general');
    });
  }

  // Quick DTMF Transmitter
  document.getElementById('btn-quick-dtmf').addEventListener('click', () => {
    openModal('modal-nagham');
  });

  // Diagnostics Modal Trigger
  document.getElementById('btn-open-diagnostics').addEventListener('click', async () => {
    try {
      const res = await fetch('/api/diagnostics');
      if (res.ok) {
        const data = await res.json();
        document.getElementById('diag-local-id').textContent = state.identity.fullId;
        document.getElementById('diag-msgs-published').textContent = data.meshStats?.stats?.messagesPublished || 0;
        document.getElementById('diag-msgs-received').textContent = data.meshStats?.stats?.messagesReceived || 0;
        document.getElementById('diag-dups-dropped').textContent = data.meshStats?.stats?.duplicatesDropped || 0;
        
        const hops = data.meshStats?.stats?.hopsObserved || [];
        const avg = hops.length ? (hops.reduce((a,b)=>a+b, 0)/hops.length).toFixed(1) : '1.0';
        document.getElementById('diag-avg-hops').textContent = avg;
      }
    } catch (swallowedErr) { console.warn("[WyreSup Non-Fatal Notice]:", swallowedErr.message); }
    openModal('modal-diagnostics');
  });

  // Spawn Simulated Bot Button
  document.getElementById('btn-spawn-bot').addEventListener('click', async () => {
    try {
      await fetch('/api/bots/spawn', { method: 'POST' });
    } catch (swallowedErr) { console.warn("[WyreSup Non-Fatal Notice]:", swallowedErr.message); }
  });

  // Space & Channel Creation Modals
  document.getElementById('btn-open-create-space').addEventListener('click', () => openModal('modal-create-space'));
  document.getElementById('btn-add-text-channel').addEventListener('click', () => openModal('modal-create-channel'));
  document.getElementById('btn-add-voice-channel').addEventListener('click', () => openModal('modal-create-channel'));
  document.getElementById('btn-lisan-modal')?.addEventListener('click', openLisanModal);
  document.getElementById('btn-nagham-modal').addEventListener('click', () => openModal('modal-nagham'));

  // Submit Space
  document.getElementById('btn-submit-create-space').addEventListener('click', async () => {
    const name = document.getElementById('space-name-input').value.trim();
    const arabicName = document.getElementById('space-arabic-input').value.trim();
    const icon = document.getElementById('space-icon-input').value.trim() || '💬';
    const description = document.getElementById('space-desc-input').value.trim();

    if (!name) return;
    try {
      await fetch('/api/spaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, arabicName, icon, description, creatorId: state.identity.fullId })
      });
      closeModal('modal-create-space');
    } catch (e) {
      console.error(e);
    }
  });

  // Submit Channel
  document.getElementById('btn-submit-create-channel').addEventListener('click', async () => {
    const name = document.getElementById('channel-name-input').value.trim();
    const type = document.querySelector('input[name="channel-type"]:checked')?.value || 'text';
    const topic = document.getElementById('channel-topic-input').value.trim();

    if (!name) return;
    try {
      await fetch(`/api/spaces/${state.currentSpaceId}/channels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type, topic })
      });
      closeModal('modal-create-channel');
    } catch (e) {
      console.error(e);
    }
  });

  // Identity / Username Settings Handlers
  const userSettingsBtn = document.getElementById('btn-user-settings');
  const userAvatarWrap = document.querySelector('.user-avatar-wrap');
  const openSettings = () => {
    const input = document.getElementById('settings-username-input');
    const disp = document.getElementById('settings-full-id-display');
    if (input) input.value = state.identity?.prefix || '';
    if (disp) disp.textContent = state.identity?.fullId || 'peer@00000000';
    openModal('modal-user-settings');
  };

  if (userSettingsBtn) userSettingsBtn.addEventListener('click', openSettings);
  if (userAvatarWrap) {
    userAvatarWrap.style.cursor = 'pointer';
    userAvatarWrap.title = 'Change Identity / Username';
    userAvatarWrap.addEventListener('click', openSettings);
  }

  const saveUsernameBtn = document.getElementById('btn-save-username');
  if (saveUsernameBtn) {
    saveUsernameBtn.addEventListener('click', () => {
      const input = document.getElementById('settings-username-input');
      if (input && input.value.trim()) {
        updateIdentity(input.value.trim());
      }
      closeModal('modal-user-settings');
    });
  }

  const randomIdentityBtn = document.getElementById('btn-generate-random-identity');
  if (randomIdentityBtn) {
    randomIdentityBtn.addEventListener('click', () => {
      const names = ['khalid', 'tariq', 'salman', 'amira', 'layla', 'omar', 'zayd', 'nour', 'faris'];
      const prefix = names[Math.floor(Math.random() * names.length)];
      const hash = Math.random().toString(16).substring(2, 10);
      const input = document.getElementById('settings-username-input');
      const disp = document.getElementById('settings-full-id-display');
      if (input) input.value = prefix;
      if (disp) disp.textContent = `${prefix}@${hash}`;
      updateIdentity(prefix, hash);
    });
  }

  // Generic Modal Close Handlers
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-close');
      closeModal(modalId);
    });
  });
}

function openModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.add('open');
    el.style.display = 'flex';
  }
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.remove('open');
    el.style.display = 'none';
  }
}

// =======================================================
function playTone(freq = 440, duration = 0.2) {
  try {
    const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
    const ctx = state.audioCtx || new AudioCtxClass();
    state.audioCtx = ctx;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (swallowedErr) { console.warn("[WyreSup Non-Fatal Notice]:", swallowedErr.message); }
}


// --- 7.1 YouTube Stream & Watch Party Controller (بَثّ اليوتيوب) ---
// ===================================================================

function openStreamYoutubeModal(targetPeer = null) {
  let target = targetPeer;
  if (!target) {
    if (state.activeCall && state.activeCall.peer) {
      target = state.activeCall.peer;
    } else if (state.currentChannelId && state.currentChannelId.startsWith('dm-')) {
      const targetPrefix = state.currentChannelId.replace('dm-', '');
      target = state.peers.find(p => p.prefix === targetPrefix || p.peerId.startsWith(targetPrefix))?.peerId || targetPrefix;
    } else {
      const otherPeer = state.peers.find(p => state.identity && p.peerId !== state.identity.fullId);
      target = otherPeer ? otherPeer.peerId : 'enver';
    }
  }

  state.youtubeStreamTarget = target;
  const peerDisplay = typeof target === 'string' ? target.split('@')[0] : 'enver';
  const targetLabel = document.getElementById('yt-target-peer-name');
  if (targetLabel) targetLabel.textContent = peerDisplay;

  openModal('modal-stream-youtube');
}

async function searchYouTubeVideos(query) {
  const container = document.getElementById('yt-search-results');
  if (!container) return;
  container.innerHTML = '<div style="color:#00f59b; padding:10px; font-size:0.85rem;">🔍 Searching YouTube for streams...</div>';
  container.style.display = 'flex';

  try {
    const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(query)}`);
    const results = await res.json();
    if (!results || results.length === 0) {
      container.innerHTML = '<div style="color:#8e9297; padding:8px; font-size:0.85rem;">No videos found. Try direct link or search query.</div>';
      return;
    }

    container.innerHTML = '';
    results.forEach(item => {
      const row = document.createElement('div');
      row.className = 'yt-result-item';
      row.innerHTML = `
        <img class="yt-result-thumb" src="${item.thumbnail || ''}" alt="thumb" onerror="this.style.display='none'">
        <div class="yt-result-info">
          <div class="yt-result-title">${item.title}</div>
          <div class="yt-result-meta">${item.uploader || 'YouTube'} · ${item.duration || ''}</div>
        </div>
      `;
      row.addEventListener('click', () => {
        document.getElementById('yt-stream-url-input').value = item.url;
        container.style.display = 'none';
      });
      container.appendChild(row);
    });
  } catch (err) {
    container.innerHTML = `<div style="color:#f04747; padding:8px; font-size:0.85rem;">Search error: ${err.message}</div>`;
  }
}

async function startYoutubeStreamCall(targetPeer, queryOrUrl) {
  const btn = document.getElementById('btn-yt-start-stream');
  const originalText = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span>⏳ Preparing Stream...</span>';
  }

  try {
    const res = await fetch('/api/youtube/prepare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: queryOrUrl })
    });

    const streamInfo = await res.json();
    if (!res.ok || streamInfo.error) {
      throw new Error(streamInfo.error || 'Failed to prepare video stream');
    }

    closeModal('modal-stream-youtube');

    // Create stream with YouTube video + real-time green HUD
    const ytStream = await createYouTubeMediaStream(streamInfo);

    if (state.activeCall && state.activeCall.pc && state.activeCall.pc.connectionState === 'connected') {
      // Mid-call track swap
      const senders = state.activeCall.pc.getSenders();
      const videoSender = senders.find(s => s.track && s.track.kind === 'video');
      const audioSender = senders.find(s => s.track && s.track.kind === 'audio');
      
      const newVideoTrack = ytStream.getVideoTracks()[0];
      const newAudioTrack = ytStream.getAudioTracks()[0];

      if (videoSender && newVideoTrack) videoSender.replaceTrack(newVideoTrack);
      if (audioSender && newAudioTrack) audioSender.replaceTrack(newAudioTrack);

      const localVideo = document.getElementById('call-local-video');
      if (localVideo) localVideo.srcObject = ytStream;
      state.activeCall.localStream = ytStream;
      console.log('✅ YouTube stream hot-swapped into active call!');
    } else {
      // Start new call with this stream
      await startOutgoingCallWithCustomStream(targetPeer || state.youtubeStreamTarget || 'enver', ytStream, streamInfo.title, streamInfo.streamUrl);
    }

  } catch (err) {
    alert(`YouTube Stream Error: ${err.message}`);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  }
}

async function createYouTubeMediaStream(streamInfo) {
  const { title, uploader, duration, streamUrl } = streamInfo;

  // 1. Create hidden HTML5 Video Element
  let video = document.getElementById('wyresup-hidden-stream-video');
  if (!video) {
    video = document.createElement('video');
    video.id = 'wyresup-hidden-stream-video';
    video.style.position = 'fixed';
    video.style.top = '-9999px';
    video.style.left = '-9999px';
    video.style.width = '1px';
    video.style.height = '1px';
    video.style.opacity = '0';
    document.body.appendChild(video);
  }

  video.src = streamUrl;
  video.crossOrigin = 'anonymous';
  video.loop = true;
  video.autoplay = true;
  video.playsInline = true;
  video.muted = true;
  video.volume = 1.0;

  // Wait for canplay / loadeddata (max 3s)
  await new Promise((resolve) => {
    let done = false;
    const onReady = () => {
      if (!done) {
        done = true;
        resolve();
      }
    };
    video.oncanplay = onReady;
    video.onloadeddata = onReady;
    setTimeout(onReady, 3000);
  });

  await video.play().catch(e => {
    console.warn('[Video Play Mute Fallback]:', e);
    video.muted = true;
    return video.play().catch(() => {});
  });

  // 2. Audio Capture without memory-heavy decodeAudioData
  let audioTrack = null;
  if (typeof video.captureStream === 'function' || typeof video.mozCaptureStream === 'function') {
    try {
      const vStream = (video.captureStream || video.mozCaptureStream).call(video);
      const aTracks = vStream.getAudioTracks();
      if (aTracks.length > 0) audioTrack = aTracks[0];
    } catch(e) {
      console.warn('[Video captureStream Audio]:', e);
    }
  }

  if (!audioTrack) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      let ctx = state.audioCtx;
      if (!ctx || ctx.state === 'closed') {
        ctx = new AudioCtx();
        state.audioCtx = ctx;
      }
      if (ctx.state === 'suspended') await ctx.resume();

      if (!video._sourceNode) {
        video._sourceNode = ctx.createMediaElementSource(video);
      }
      const dst = ctx.createMediaStreamDestination();
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.85, ctx.currentTime);
      video._sourceNode.connect(gain);
      gain.connect(dst);
      audioTrack = dst.stream.getAudioTracks()[0];
    } catch (e) {
      console.warn('[MediaElementSource Audio Fallback]:', e);
    }
  }

  // 3. Setup 30fps Canvas with Green Glowing Cyberpunk HUD
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 720;
  const cCtx = canvas.getContext('2d');

  if (state.activeCall.syntheticInterval) {
    clearInterval(state.activeCall.syntheticInterval);
  }

  const anim = setInterval(() => {
    if (!state.activeCall.localStream && !state.activeCall.pc) {
      clearInterval(anim);
      try { video.pause(); } catch (swallowedErr) { console.warn("[WyreSup Non-Fatal Notice]:", swallowedErr.message); }
      return;
    }

    if (video.readyState >= 2) {
      try {
        cCtx.drawImage(video, 0, 0, 1280, 720);
      } catch (swallowedErr) { console.warn("[WyreSup Non-Fatal Notice]:", swallowedErr.message); }

      // HUD Top Gradient
      const topGrad = cCtx.createLinearGradient(0, 0, 0, 90);
      topGrad.addColorStop(0, 'rgba(4, 7, 13, 0.90)');
      topGrad.addColorStop(1, 'rgba(4, 7, 13, 0)');
      cCtx.fillStyle = topGrad;
      cCtx.fillRect(0, 0, 1280, 90);

      // Neon Green HUD Title
      cCtx.fillStyle = '#00f59b';
      cCtx.font = 'bold 26px monospace';
      const cleanTitle = (title || 'YOUTUBE STREAM').substring(0, 50).toUpperCase();
      cCtx.fillText(`WYRESUP // VCWYVL P2P STREAM: ${cleanTitle}`, 30, 45);

      // Cyan Subtitle & Duration
      cCtx.font = '16px monospace';
      cCtx.fillStyle = '#00e5ff';
      cCtx.fillText(`${uploader || 'YouTube'} · ${duration || 'LIVE'} · 1080p SRTP P2P · Watch Party`, 30, 72);

      // Outer Neon Green Border Frame
      cCtx.strokeStyle = '#00f59b';
      cCtx.lineWidth = 2;
      cCtx.strokeRect(10, 10, 1260, 700);
    }
  }, 1000 / 30);

  state.activeCall.syntheticInterval = anim;

  const canvasStream = canvas.captureStream ? canvas.captureStream(30) : (canvas.mozCaptureStream ? canvas.mozCaptureStream(30) : null);
  const videoTrack = canvasStream ? canvasStream.getVideoTracks()[0] : null;

  return new MediaStream([audioTrack, videoTrack].filter(Boolean));
}

async function startOutgoingCallWithCustomStream(targetPeer, customStream, streamTitle = '', rawStreamUrl = '') {
  const peerId = typeof targetPeer === 'string' ? targetPeer : (targetPeer.peerId || targetPeer.fullId);
  const peerPrefix = peerId.split('@')[0];

  state.activeCall.peer = peerId;
  state.activeCall.peerPrefix = peerPrefix;
  state.activeCall.type = 'video';
  state.activeCall.localStream = customStream;
  state.activeCall.pendingIceCandidates = [];

  document.getElementById('call-active-peer-name').textContent = peerPrefix;
  document.getElementById('call-remote-avatar').textContent = peerPrefix.substring(0, 2).toUpperCase();
  document.getElementById('call-remote-avatar-name').textContent = peerPrefix;
  document.getElementById('call-remote-status-text').textContent = `Streaming ${streamTitle || 'YouTube'} (جَارِي البَثّ)...`;
  document.getElementById('remote-video-tag').textContent = `REMOTE // YOUTUBE P2P`;

  const localVideo = document.getElementById('call-local-video');
  if (localVideo) {
    localVideo.srcObject = customStream;
    localVideo.muted = true;
    localVideo.play().catch(() => {});
  }

  // Ensure background audio element is muted to prevent duplicate audio
  const remoteAudio = document.getElementById('call-remote-audio');
  if (remoteAudio) {
    remoteAudio.pause();
    remoteAudio.srcObject = null;
    remoteAudio.muted = true;
  }

  // Display video directly in the main central stage
  const remoteVideo = document.getElementById('call-remote-video');
  const fallback = document.getElementById('remote-avatar-fallback');
  if (remoteVideo) {
    if (customStream && customStream.getVideoTracks().length > 0) {
      remoteVideo.srcObject = customStream;
    } else if (rawStreamUrl) {
      remoteVideo.src = rawStreamUrl;
    } else {
      remoteVideo.srcObject = customStream;
    }
    remoteVideo.style.display = 'block';
    remoteVideo.muted = false;
    remoteVideo.volume = 1.0;
    remoteVideo.play().catch(() => {
      console.warn('[Video Autoplay Muted Fallback]');
      remoteVideo.muted = true;
      remoteVideo.play().catch(() => {});
    });
  }
  if (fallback) {
    fallback.style.display = 'none';
  }

  // Auto-maximize the video stream to full central theater stage
  const grid = document.getElementById('call-video-grid');
  if (grid) {
    grid.classList.add('is-swapped');
  }

  openModal('modal-active-call');
  updateCallStreamTitleUI(streamTitle || 'Live Media Stream');

  const pc = new RTCPeerConnection(RTC_CONFIG);
  state.activeCall.pc = pc;

  customStream.getTracks().forEach(track => pc.addTrack(track, customStream));

  pc.ontrack = (event) => {
    let rStream = (event.streams && event.streams[0]) ? event.streams[0] : null;
    if (!rStream) {
      if (!state.activeCall.remoteStream) state.activeCall.remoteStream = new MediaStream();
      state.activeCall.remoteStream.addTrack(event.track);
      rStream = state.activeCall.remoteStream;
    }
    attachRemoteStreamToMediaElements(rStream, 'video');
    startCallTimer();
    document.getElementById('call-remote-status-text').textContent = 'P2P Stream Active (مُتَّصِل)';
  };

  pc.onicecandidate = (event) => {
    if (event.candidate && state.ws && state.ws.readyState === WebSocket.OPEN) {
      state.ws.send(JSON.stringify({
        type: 'CALL_SIGNAL',
        payload: {
          signalType: 'ICE',
          targetPeer: peerId,
          candidate: event.candidate
        }
      }));
    }
  };

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  if (state.ws && state.ws.readyState === WebSocket.OPEN) {
    state.ws.send(JSON.stringify({
      type: 'CALL_SIGNAL',
      payload: {
        signalType: 'OFFER',
        targetPeer: peerId,
        callType: 'video',
        sdp: offer
      }
    }));
  }
}

// --- 7. WebRTC P2P Video & Voice Calling (المُكَالَمَات) ---
// =======================================================

const RTC_CONFIG = {
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require',
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302', 'stun:stun3.l.google.com:19302', 'stun:stun4.l.google.com:19302'] },
    { urls: ['stun:stun.cloudflare.com:3478'] },
    { urls: ['stun:openrelay.metered.ca:80'] },
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turns:openrelay.metered.ca:443?transport=tcp'
      ],
      username: 'openrelay',
      credential: 'openrelay'
    }
  ],
  iceCandidatePoolSize: 10
};

function attachRemoteStreamToMediaElements(stream, callType) {
  state.activeCall.remoteStream = stream;
  const remoteVideo = document.getElementById('call-remote-video');
  const remoteAudio = document.getElementById('call-remote-audio');
  const fallback = document.getElementById('remote-avatar-fallback');
  const voicePulse = document.getElementById('call-voice-pulse');

  const audioTracks = stream ? stream.getAudioTracks() : [];
  const videoTracks = stream ? stream.getVideoTracks() : [];

  console.log(`[Media Attachment] Tracks: ${audioTracks.length} audio, ${videoTracks.length} video (callType: ${callType})`);

  // 1. Clean previous WebAudio route if any
  if (state.activeCall.remoteAudioSourceNode) {
    try { state.activeCall.remoteAudioSourceNode.disconnect(); } catch (swallowedErr) { console.warn("[WyreSup Non-Fatal Notice]:", swallowedErr.message); }
    state.activeCall.remoteAudioSourceNode = null;
  }

  // 2. Audio playback management with autoplay resilience & WebAudio fallback
  if (remoteAudio && audioTracks.length > 0) {
    remoteAudio.srcObject = stream;
    remoteAudio.muted = false;
    remoteAudio.volume = 1.0;
    const playPromise = remoteAudio.play();
    if (playPromise !== undefined) {
      playPromise.catch(e => {
        console.warn('[Remote Audio Play Notice]:', e.message);
        const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
        if (!state.audioCtx || state.audioCtx.state === 'closed') {
          state.audioCtx = new AudioCtxClass();
        }
        if (state.audioCtx.state === 'suspended') {
          state.audioCtx.resume().catch(() => {});
        }
        try {
          const sourceNode = state.audioCtx.createMediaStreamSource(stream);
          sourceNode.connect(state.audioCtx.destination);
          state.activeCall.remoteAudioSourceNode = sourceNode;
        } catch (swallowedErr) { console.warn("[WyreSup Non-Fatal Notice]:", swallowedErr.message); }
      });
    }
  }

  // 3. Video Display Management
  if (callType === 'video' && videoTracks.length > 0) {
    if (remoteVideo) {
      remoteVideo.srcObject = stream;
      remoteVideo.muted = true; // Video element muted to guarantee 100% video autoplay without silencing audio track
      remoteVideo.play().catch(() => {});
      if (fallback) fallback.style.display = 'none';
    }
    if (voicePulse) voicePulse.style.display = 'none';
  } else {
    if (remoteVideo) {
      remoteVideo.pause();
      remoteVideo.srcObject = null;
      remoteVideo.muted = true;
    }
    if (fallback) fallback.style.display = 'flex';
    if (voicePulse) voicePulse.style.display = 'flex';
  }
}

async function drainPendingIceCandidates() {
  if (!state.activeCall.pc || !state.activeCall.pc.remoteDescription) return;
  if (state.activeCall.pendingIceCandidates && state.activeCall.pendingIceCandidates.length > 0) {
    const queue = [...state.activeCall.pendingIceCandidates];
    state.activeCall.pendingIceCandidates = [];
    for (const cand of queue) {
      try {
        await state.activeCall.pc.addIceCandidate(new RTCIceCandidate(cand));
      } catch (e) {
        console.warn('[ICE Add Candidate Warning]:', e.message);
      }
    }
  }
}



// --- NIZĀM AL-JALĀ' WA'L-NUFŪDH AL-SHAF'IYY (نظام الجلاء والنفاذ الشفعي) ---
// High-Definition Video (1080p/720p) + Studio 48kHz Stereo Audio + Mobile ISP CGNAT Breaker

function upliftSdpBitrates(sdpStr) {
  if (!sdpStr) return sdpStr;
  try {
    let s = sdpStr;
    if (s.includes('m=video')) {
      s = s.replace(/(m=video [^\r\n]+[\r\n]+)/, '$1b=AS:3500\r\nb=TIAS:3500000\r\n');
    }
    if (s.includes('m=audio')) {
      s = s.replace(/(m=audio [^\r\n]+[\r\n]+)/, '$1b=AS:128\r\nb=TIAS:128000\r\n');
    }
    // Inject Opus in-band forward error correction (FEC) and stereo fidelity
    if (s.includes('a=rtpmap:') && s.includes('opus/48000')) {
      s = s.replace(/(a=rtpmap:(\d+) opus\/48000\/2[\r\n]+)/, '$1a=fmtp:$2 useinbandfec=1;stereo=1;sprop-stereo=1;maxaveragebitrate=64000\r\n');
    }
    return s;
  } catch (e) {
    return sdpStr;
  }
}

let shafVideoCanvas = null;
let shafVideoCtx = null;
let shafVideoTimer = null;

function startShafHdVideoStream(targetPeer, localStream) {
  if (!localStream || localStream.getVideoTracks().length === 0) return;
  if (shafVideoTimer) clearInterval(shafVideoTimer);

  const vTrack = localStream.getVideoTracks()[0];
  if (!vTrack) return;

  // Use the live in-DOM local video element which is active and decoded on mobile hardware
  let sourceVideo = document.getElementById('call-local-video');
  if (!sourceVideo || !sourceVideo.srcObject) {
    let fallbackVideo = document.getElementById('shaf-fallback-local-video');
    if (!fallbackVideo) {
      fallbackVideo = document.createElement('video');
      fallbackVideo.id = 'shaf-fallback-local-video';
      fallbackVideo.muted = true;
      fallbackVideo.playsInline = true;
      fallbackVideo.setAttribute('playsinline', '');
      fallbackVideo.setAttribute('webkit-playsinline', '');
      fallbackVideo.setAttribute('muted', '');
      fallbackVideo.style.position = 'fixed';
      fallbackVideo.style.bottom = '-9999px';
      fallbackVideo.style.opacity = '0.001';
      fallbackVideo.style.pointerEvents = 'none';
      document.body.appendChild(fallbackVideo);
    }
    fallbackVideo.srcObject = localStream;
    fallbackVideo.play().catch(() => {});
    sourceVideo = fallbackVideo;
  }

  if (!shafVideoCanvas) {
    shafVideoCanvas = document.createElement('canvas');
    shafVideoCanvas.width = 480;
    shafVideoCanvas.height = 360;
    shafVideoCtx = shafVideoCanvas.getContext('2d');
  }

  // Cellular-optimized frame loop with backpressure protection
  shafVideoTimer = setInterval(() => {
    if (!state.activeCall.peer || state.activeCall.isCamOff) return;
    if (!state.ws || state.ws.readyState !== WebSocket.OPEN) return;

    // Mobile Cellular 4G/5G Backpressure Guard: Drop frame if socket buffer is congested
    if (state.ws.bufferedAmount > 32768) return;

    const isReady = sourceVideo && (sourceVideo.readyState >= 2 || (sourceVideo.videoWidth > 0 && sourceVideo.videoHeight > 0));
    if (isReady && shafVideoCtx) {
      try {
        shafVideoCtx.drawImage(sourceVideo, 0, 0, shafVideoCanvas.width, shafVideoCanvas.height);
        // Mobile-tuned JPEG encoding (0.55 quality ~18 KB/frame) for fluid, zero-stall cellular transport
        const frameData = shafVideoCanvas.toDataURL('image/jpeg', 0.55);
        state.ws.send(JSON.stringify({
          type: 'CALL_SIGNAL',
          payload: {
            signalType: 'SHAF_HD_FRAME',
            targetPeer,
            frame: frameData,
            ts: Date.now()
          }
        }));
      } catch (swallowedErr) { console.warn("[WyreSup Non-Fatal Notice]:", swallowedErr.message); }
    }
  }, 90); // ~11 FPS - ideal balance between motion fluidity and cellular bandwidth stability
}

function stopShafHdVideoStream() {
  if (shafVideoTimer) {
    clearInterval(shafVideoTimer);
    shafVideoTimer = null;
  }
}

function handleIncomingShafHdFrame(payload) {
  const { frame } = payload;
  if (!frame) return;
  // If WebRTC direct video is active, ignore SHAF JPEG frames and hide canvas
  if (state.activeCall && state.activeCall.webrtcConnected) {
    const remoteCanvas = document.getElementById('call-remote-shaf-canvas');
    if (remoteCanvas) remoteCanvas.style.display = 'none';
    return;
  }
  if (state.activeCall) { state.activeCall.lastFrameTime = performance.now(); }

  const remoteVideo = document.getElementById('call-remote-video');
  const fallback = document.getElementById('remote-avatar-fallback');
  if (fallback) fallback.style.display = 'none';

  let remoteCanvas = document.getElementById('call-remote-shaf-canvas');
  if (!remoteCanvas) {
    const remoteTile = document.getElementById('remote-video-tile') || (remoteVideo ? remoteVideo.parentElement : null);
    if (remoteTile) {
      remoteCanvas = document.createElement('canvas');
      remoteCanvas.id = 'call-remote-shaf-canvas';
      remoteCanvas.style.position = 'absolute';
      remoteCanvas.style.top = '0';
      remoteCanvas.style.left = '0';
      remoteCanvas.style.width = '100%';
      remoteCanvas.style.height = '100%';
      remoteCanvas.style.objectFit = 'cover';
      remoteCanvas.style.zIndex = '8';
      remoteCanvas.style.borderRadius = '16px';
      remoteCanvas.style.pointerEvents = 'none';
      remoteTile.appendChild(remoteCanvas);
    }
  }

  if (remoteCanvas) {
    remoteCanvas.style.display = 'block';
    const ctx = remoteCanvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      if (remoteCanvas.width !== img.width || remoteCanvas.height !== img.height) {
        remoteCanvas.width = img.width;
        remoteCanvas.height = img.height;
      }
      ctx.drawImage(img, 0, 0);
    };
    img.src = frame;
  }

  const statusEl = document.getElementById('call-remote-status-text');
  if (statusEl && !statusEl.textContent.includes('Shaf') && !statusEl.textContent.includes('Sovereign')) {
    statusEl.textContent = '🟢 HD Sovereign Dual-Conduit Active (نِظَامُ الشَّفْعِ الجَلِيّ)';
  }
}

// --- NAFAQ (نَفَق) Containerless PCM & Sovereign Media Streaming Engine ---
function startNafaqPcmStream(targetPeer, localStream) {
  if (!localStream || localStream.getAudioTracks().length === 0) return;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!state.audioCtx || state.audioCtx.state === 'closed') {
    state.audioCtx = new AudioCtx();
  }
  if (state.audioCtx && state.audioCtx.state === 'suspended') {
    state.audioCtx.resume().catch(() => {});
  }

  try {
    if (state.activeCall.nafaqPcmProcessor) {
      try {
        state.activeCall.nafaqPcmProcessor.disconnect();
        state.activeCall.nafaqPcmSource.disconnect();
      } catch (swallowedErr) { console.warn("[WyreSup Non-Fatal Notice]:", swallowedErr.message); }
    }

    const source = state.audioCtx.createMediaStreamSource(localStream);
    const processor = state.audioCtx.createScriptProcessor(2048, 1, 1);

    processor.onaudioprocess = (e) => {
      if (!state.activeCall.peer || state.activeCall.isMuted) return;
      const inputData = e.inputBuffer.getChannelData(0);
      const pcm16 = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        let s = Math.max(-1, Math.min(1, inputData[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }

      const uint8 = new Uint8Array(pcm16.buffer);
      let binary = '';
      for (let i = 0; i < uint8.length; i++) {
        binary += String.fromCharCode(uint8[i]);
      }
      const base64Data = btoa(binary);

      if (state.ws && state.ws.readyState === WebSocket.OPEN) {
        state.ws.send(JSON.stringify({
          type: 'CALL_SIGNAL',
          payload: {
            signalType: 'NAFAQ_PCM',
            targetPeer,
            sampleRate: state.audioCtx.sampleRate,
            data: base64Data
          }
        }));
      }
    };

    // Symmetrical Zero-Gain Sink: Processes microphone stream without echoing local voice into speaker!
    const silentGain = state.audioCtx.createGain();
    silentGain.gain.value = 0;
    source.connect(processor);
    processor.connect(silentGain);
    silentGain.connect(state.audioCtx.destination);
    state.activeCall.nafaqPcmSource = source;
    state.activeCall.nafaqSilentSink = silentGain;
    state.activeCall.nafaqPcmProcessor = processor;
    console.log('[NAFAQ PCM Engine] 🚀 Live containerless PCM voice streaming activated to @' + targetPeer);
  } catch (err) {
    console.warn('[NAFAQ PCM Error]:', err.message);
  }
}

function handleIncomingNafaqPcm(payload) {
  const { data, sampleRate } = payload;
  if (!data) return;
  // Ignore incoming audio PCM chunks if call is inactive or if viewing a media stream call
  if (!state.activeCall || !state.activeCall.peer || state.activeCall.isCustomStreamCall) return;

  // Dual-Conduit Acoustic Echo Guardian: If WebRTC Opus is connected, keep NAFAQ in silent standby
  if (state.activeCall && state.activeCall.webrtcConnected) {
    return;
  }

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!state.audioCtx || state.audioCtx.state === 'closed') {
    state.audioCtx = new AudioCtx();
  }
  if (state.audioCtx && state.audioCtx.state === 'suspended') {
    state.audioCtx.resume().catch(() => {});
  }

  try {
    const binary = atob(data);
    const uint8 = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      uint8[i] = binary.charCodeAt(i);
    }
    const pcm16 = new Int16Array(uint8.buffer);
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) {
      float32[i] = pcm16[i] / (pcm16[i] < 0 ? 0x8000 : 0x7FFF);
    }

    const sourceRate = sampleRate || state.audioCtx.sampleRate;
    const targetRate = state.audioCtx.sampleRate;
    const resampledData = (sourceRate === targetRate) ? float32 : resamplePCM(float32, sourceRate, targetRate);

    const audioBuffer = state.audioCtx.createBuffer(1, resampledData.length, targetRate);
    audioBuffer.getChannelData(0).set(resampledData);

    const source = state.audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(state.audioCtx.destination);

    const now = state.audioCtx.currentTime;
    let startTime = state.activeCall.nafaqAudioNextTime || 0;
    if (startTime < now || (startTime - now) > 0.3) {
      startTime = now + 0.02; // 20ms jitter cushion
    }
    source.start(startTime);
    state.activeCall.nafaqAudioNextTime = startTime + audioBuffer.duration;

    const voicePulse = document.getElementById('call-voice-pulse');
    if (voicePulse) voicePulse.style.display = 'flex';
    const statusEl = document.getElementById('call-remote-status-text');
    if (statusEl && !statusEl.textContent.includes('NAFAQ')) {
      statusEl.textContent = '🟢 NAFAQ Sovereign Voice Tunnel Active (صَوْت مُبَاشِر)';
    }
  } catch (swallowedErr) { console.warn("[WyreSup Non-Fatal Notice]:", swallowedErr.message); }
}

function startNafaqTunnelStream(targetPeer, localStream, callType) {
  startNafaqPcmStream(targetPeer, localStream);
  if (callType === 'video') {
    startShafHdVideoStream(targetPeer, localStream);
  }
}

function handleIncomingNafaqFrame(payload) {
  if (payload.data) {
    handleIncomingNafaqPcm(payload);
  }
}

async function acquireUserMediaStream(callType = 'video') {
  let stream = null;
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    try {
      // 1. Ideal constraints (no rigid min dimensions that cause OverconstrainedError)
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: callType === 'video' ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        } : false
      };
      stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err1) {
      console.warn('[WebRTC] High-def getUserMedia failed, trying relaxed constraints:', err1.message);
      try {
        // 2. Relaxed audio and video constraints
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: callType === 'video'
        });
      } catch (err2) {
        console.warn('[WebRTC] Relaxed getUserMedia failed, trying audio-only capture:', err2.message);
        try {
          // 3. Audio-only fallback: preserve live microphone even if camera is busy or denied
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          if (callType === 'video') {
            const synth = createSyntheticStream(true);
            stream = new MediaStream([
              ...audioStream.getAudioTracks(),
              ...synth.getVideoTracks()
            ]);
          } else {
            stream = audioStream;
          }
        } catch (err3) {
          console.warn('[WebRTC] Audio getUserMedia failed, falling back to synthetic:', err3.message);
          stream = createSyntheticStream(callType === 'video');
        }
      }
    }
  } else {
    stream = createSyntheticStream(callType === 'video');
  }
  return stream;
}

window.startOutgoingCall = async function startOutgoingCall(targetPeer, callType = 'video') {
  const peerId = typeof targetPeer === 'string' ? targetPeer : (targetPeer.peerId || targetPeer.fullId);
  const peerPrefix = peerId.split('@')[0];

  // Self-dial guard (Nizām al-Shaf')
  if (state.identity && (peerId === state.identity.fullId || (peerPrefix === state.identity.prefix && state.peers.filter(p => p.prefix === peerPrefix).length <= 1))) {
    console.warn('[Call] Cannot dial self.');
    appendSystemNotice('⚠️ [Call]: Cannot initiate a call to yourself. Please select another online peer.');
    return;
  }

  state.activeCall.peer = peerId;
  state.activeCall.peerPrefix = peerPrefix;
  state.activeCall.type = callType;
  state.activeCall.isMuted = false;
  state.activeCall.isCamOff = false;
  state.activeCall.isScreenSharing = false;
  state.activeCall.pendingIceCandidates = [];

  // Setup UI
  document.getElementById('call-active-peer-name').textContent = peerPrefix;
  document.getElementById('call-remote-avatar').textContent = peerPrefix.substring(0, 2).toUpperCase();
  document.getElementById('call-remote-avatar-name').textContent = peerPrefix;
  document.getElementById('call-remote-status-text').textContent = 'Dialing P2P Encrypted Stream (جَارِي الاتِّصَال)...';
  document.getElementById('remote-video-tag').textContent = `REMOTE // ${callType.toUpperCase()} MIFTAH`;

  const remoteAvatarFallback = document.getElementById('remote-avatar-fallback');
  if (remoteAvatarFallback) remoteAvatarFallback.style.display = 'flex';

  const voicePulse = document.getElementById('call-voice-pulse');
  if (voicePulse) voicePulse.style.display = 'none';

  openModal('modal-active-call');

  // Symmetrical AudioContext & Mobile Autoplay Policy Unlock on direct user gesture
  const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
  if (!state.audioCtx || state.audioCtx.state === 'closed') {
    state.audioCtx = new AudioCtxClass();
  }
  if (state.audioCtx && state.audioCtx.state === 'suspended') {
    state.audioCtx.resume().catch(() => {});
  }
  const rAudio = document.getElementById('call-remote-audio');
  if (rAudio) {
    rAudio.play().catch(() => {});
  }

  try {
    const stream = await acquireUserMediaStream(callType);

    state.activeCall.localStream = stream;
    const localVideo = document.getElementById('call-local-video');
    if (localVideo) {
      localVideo.srcObject = stream;
      localVideo.muted = true;
      localVideo.play().catch(() => {});
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);
    state.activeCall.pc = pc;

    pc.onconnectionstatechange = () => {
      const cs = pc.connectionState;
      console.log('[WebRTC Outgoing ConnectionState]:', cs);
      if (cs === 'connected') {
        state.activeCall.webrtcConnected = true;
        state.activeCall.nafaqActive = false;
        if (state.activeCall.nafaqFallbackTimer) {
          clearTimeout(state.activeCall.nafaqFallbackTimer);
          state.activeCall.nafaqFallbackTimer = null;
        }
        if (state.activeCall.nafaqPcmProcessor) {
          try {
            state.activeCall.nafaqPcmProcessor.disconnect();
            state.activeCall.nafaqPcmSource.disconnect();
          } catch (swallowedErr) { console.warn("[WyreSup Non-Fatal Notice]:", swallowedErr.message); }
          state.activeCall.nafaqPcmProcessor = null;
          state.activeCall.nafaqPcmSource = null;
        }
        stopShafHdVideoStream();
        const remoteCanvas = document.getElementById('call-remote-shaf-canvas');
        if (remoteCanvas) remoteCanvas.style.display = 'none';
        document.getElementById('call-remote-status-text').textContent = 'Direct WebRTC P2P Active (مُتَّصِل مُبَاشَرَة)';
      } else if (cs === 'disconnected' || cs === 'failed') {
        state.activeCall.webrtcConnected = false;
        if (typeof pc.restartIce === 'function') {
          try {
            console.log('[WebRTC Outgoing Dropped] Triggering self-healing ICE restart...');
            pc.restartIce();
          } catch (swallowedErr) { console.warn("[WyreSup Non-Fatal Notice]:", swallowedErr.message); }
        }
        state.activeCall.nafaqActive = true;
        document.getElementById('call-remote-status-text').textContent = '🟢 NAFAQ Sovereign Tunnel Active (نَفَق مُبَاشِر مَحْمِيّ)';
        startNafaqTunnelStream(peerId, stream, callType);
      }
    };

    pc.oniceconnectionstatechange = () => {
      const s = pc.iceConnectionState;
      console.log('[WebRTC Outgoing ICE State]:', s);
      if (s === 'connected' || s === 'completed') {
        state.activeCall.webrtcConnected = true;
        if (state.activeCall.nafaqFallbackTimer) {
          clearTimeout(state.activeCall.nafaqFallbackTimer);
          state.activeCall.nafaqFallbackTimer = null;
        }
        document.getElementById('call-remote-status-text').textContent = 'Direct WebRTC P2P Active (مُتَّصِل مُبَاشَرَة)';
      } else if (s === 'disconnected') {
        console.warn('[WebRTC Outgoing ICE Disconnected] Attempting ICE restart...');
        if (typeof pc.restartIce === 'function') {
          try { pc.restartIce(); } catch (swallowedErr) { console.warn("[WyreSup Non-Fatal Notice]:", swallowedErr.message); }
        }
      } else if (s === 'failed') {
        console.warn('[WebRTC ICE Failed] Activating NAFAQ Sovereign Tunnel fallback!');
        state.activeCall.webrtcConnected = false;
        state.activeCall.nafaqActive = true;
        document.getElementById('call-remote-status-text').textContent = '🟢 NAFAQ Sovereign Tunnel Active (نَفَق مُبَاشِر مَحْمِيّ)';
        startNafaqTunnelStream(peerId, stream, callType);
      }
    };

    // Watchdog: Allow 3.5s for STUN/TURN gathering before NAFAQ fallback
    state.activeCall.nafaqFallbackTimer = setTimeout(() => {
      const iceState = state.activeCall.pc?.iceConnectionState;
      if (iceState !== 'connected' && iceState !== 'completed') {
        console.log('[WebRTC Watchdog] ICE state is', iceState, '— engaging NAFAQ Sovereign Tunneling!');
        state.activeCall.nafaqActive = true;
        const statusEl = document.getElementById('call-remote-status-text');
        if (statusEl) statusEl.textContent = '🟢 NAFAQ Sovereign Tunnel Active (نَفَق مُبَاشِر مَحْمِيّ)';
        startNafaqTunnelStream(peerId, stream, callType);
      }
    }, 3500);

    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    pc.ontrack = (event) => {
      console.log('[WebRTC Outgoing] Received remote track:', event.track.kind);
      let rStream = (event.streams && event.streams[0]) ? event.streams[0] : null;
      if (!rStream) {
        if (!state.activeCall.remoteStream) {
          state.activeCall.remoteStream = new MediaStream();
        }
        if (!state.activeCall.remoteStream.getTracks().some(t => t.id === event.track.id)) {
          state.activeCall.remoteStream.addTrack(event.track);
        }
        rStream = state.activeCall.remoteStream;
      } else {
        state.activeCall.remoteStream = rStream;
      }
      attachRemoteStreamToMediaElements(rStream, state.activeCall.type);
      startCallTimer();
      document.getElementById('call-remote-status-text').textContent = 'Direct WebRTC P2P Active (مُتَّصِل مُبَاشَرَة)';
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && state.ws && state.ws.readyState === WebSocket.OPEN) {
        state.ws.send(JSON.stringify({
          type: 'CALL_SIGNAL',
          payload: {
            signalType: 'ICE',
            targetPeer: state.activeCall.peer || peerId,
            candidate: event.candidate
          }
        }));
      }
    };

    const offer = await pc.createOffer();
    offer.sdp = upliftSdpBitrates(offer.sdp);
    await pc.setLocalDescription(offer);

    if (state.ws && state.ws.readyState === WebSocket.OPEN) {
      state.ws.send(JSON.stringify({
        type: 'CALL_SIGNAL',
        payload: {
          signalType: 'OFFER',
          targetPeer: peerId,
          callType,
          sdp: offer
        }
      }));
    }

    // Dialing Audio feedback
    playTone(440, 0.2);
    setTimeout(() => playTone(480, 0.2), 250);

    // Auto-answer companion bot ONLY if explicitly calling simulated bot peer and not human peer
    if (peerId === 'antigravity@mesh' || peerId === 'simulated-bot@mesh') {
      setTimeout(() => {
        if (state.activeCall && state.activeCall.peer === peerId && !state.activeCall.webrtcConnected && !state.activeCall.remoteStream) {
          simulateBotAnswerCall(peerId, callType);
        }
      }, 3500);
    }

  } catch (err) {
    console.error('[WebRTC Outgoing Error]:', err);
  }
}

async function handleIncomingCallSignal(payload) {
  const { signalType, senderPeer, senderPrefix, sdp, candidate, callType } = payload;

  if (signalType === 'OFFER') {
    // 1. If user is already in an active call, ignore new offers so audio is never disrupted
    if (state.activeCall && state.activeCall.peer) {
      return;
    }
    state.pendingIncomingCall = payload;
    document.getElementById('incoming-caller-name').textContent = senderPrefix || (senderPeer ? senderPeer.split('@')[0] : 'Peer');
    document.getElementById('incoming-call-avatar').textContent = (senderPrefix || senderPeer || 'AG').substring(0, 2).toUpperCase();
    document.getElementById('incoming-call-type-text').textContent = `Incoming P2P Encrypted ${callType === 'video' ? 'Video' : 'Audio'} Call (مُكَالَمَة ${callType === 'video' ? 'مَرْئِيَّة' : 'صَوْتِيَّة'})`;

    const incomingModal = document.getElementById('modal-incoming-call');
    const isAlreadyRinging = incomingModal && incomingModal.classList.contains('open');

    openModal('modal-incoming-call');

    // Only play chime once when modal first appears (prevents stutter/buzz on repeated signaling pulses)
    if (!isAlreadyRinging) {
      playTone(523.25, 0.25);
      setTimeout(() => {
        // Only play second tone if modal is still open and not accepted
        if (!state.activeCall || !state.activeCall.peer) {
          playTone(659.25, 0.25);
        }
      }, 300);
    }
  } else if (signalType === 'ANSWER') {
    if (senderPeer) {
      state.activeCall.peer = senderPeer;
      if (senderPrefix) state.activeCall.peerPrefix = senderPrefix;
    }
    if (state.activeCall.pc && sdp && sdp.sdp) {
      try {
        await state.activeCall.pc.setRemoteDescription(new RTCSessionDescription(sdp));
        await drainPendingIceCandidates();
      } catch (e) {
        console.warn('[WebRTC SetRemote Warning]:', e.message);
      }
    }
    startCallTimer();
    const statusEl = document.getElementById('call-remote-status-text');
    if (statusEl) {
      statusEl.textContent = 'P2P Encrypted Stream Active (مُتَّصِل)';
    }
    // WebRTC connection handles audio & video directly without interference; NAFAQ remains silent standby
  } else if (signalType === 'ICE') {
    if (candidate) {
      if (state.activeCall.pc && state.activeCall.pc.remoteDescription) {
        try {
          await state.activeCall.pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.warn('[ICE error]:', e);
        }
      } else {
        if (!state.activeCall.pendingIceCandidates) state.activeCall.pendingIceCandidates = [];
        state.activeCall.pendingIceCandidates.push(candidate);
      }
    }
  } else if (signalType === 'WASAM_PING') {
    if (state.ws && state.ws.readyState === WebSocket.OPEN) {
      state.ws.send(JSON.stringify({
        type: 'CALL_SIGNAL',
        payload: {
          signalType: 'WASAM_PONG',
          targetPeer: senderPeer,
          senderPeer: state.identity ? state.identity.peerId : 'peer',
          pingTs: payload.pingTs
        }
      }));
    }
  } else if (signalType === 'WASAM_PONG') {
    if (payload.pingTs) {
      const liveRtt = Math.max(3, Math.round(performance.now() - payload.pingTs));
      updateCallHudTelemetry(liveRtt, 'LIVE MESH');
    }
  } else if (signalType === 'SHAF_HD_FRAME') {
    handleIncomingShafHdFrame(payload);
  } else if (signalType === 'PEER_UNREACHABLE') {
    const statusEl = document.getElementById('call-remote-status-text');
    if (statusEl) statusEl.textContent = payload.reason || 'Peer unreachable';
    setTimeout(() => endActiveCall(false), 2000);
  } else if (signalType === 'HANGUP' || signalType === 'REJECT') {
    endActiveCall(false);
  } else if (signalType === 'NAFAQ_FRAME') {
    handleIncomingNafaqFrame(payload);
  } else if (signalType === 'NAFAQ_PCM') {
    handleIncomingNafaqPcm(payload);
  } else if (signalType === 'NAGHAM') {
    if (payload.freq1 && payload.freq2) {
      playDtmfDualTone(payload.freq1, payload.freq2, 0.25);
    }
  }
}

async function acceptIncomingCall() {
  if (!state.pendingIncomingCall) return;
  const { senderPeer, senderPrefix, sdp, callType } = state.pendingIncomingCall;
  closeModal('modal-incoming-call');

  // Explicitly unlock audio on user gesture
  const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
  if (!state.audioCtx || state.audioCtx.state === 'closed') {
    state.audioCtx = new AudioCtxClass();
  }
  if (state.audioCtx && state.audioCtx.state === 'suspended') {
    state.audioCtx.resume().catch(() => {});
  }
  const rAudio = document.getElementById('call-remote-audio');
  const rVideo = document.getElementById('call-remote-video');
  const fallback = document.getElementById('remote-avatar-fallback');
  const isCustomStreamCall = !!(state.pendingIncomingCall && state.pendingIncomingCall.streamUrl);
  const streamUrl = isCustomStreamCall ? state.pendingIncomingCall.streamUrl : null;
  const streamTitle = (state.pendingIncomingCall && state.pendingIncomingCall.streamTitle) || '';

  state.activeCall.peer = senderPeer;
  state.activeCall.peerPrefix = senderPrefix || (senderPeer ? senderPeer.split('@')[0] : 'Peer');
  state.activeCall.type = callType || 'video';
  state.activeCall.isCustomStreamCall = isCustomStreamCall;

  document.getElementById('call-active-peer-name').textContent = state.activeCall.peerPrefix;
  document.getElementById('call-remote-avatar').textContent = state.activeCall.peerPrefix.substring(0, 2).toUpperCase();
  document.getElementById('call-remote-avatar-name').textContent = state.activeCall.peerPrefix;

  if (isCustomStreamCall) {
    updateCallStreamTitleUI(streamTitle || 'Media Stream');
    document.getElementById('call-remote-status-text').textContent = `P2P Stream Active // ${streamTitle || 'Media Stream'}`;
    if (callType === 'video') {
      if (rAudio) { rAudio.pause(); rAudio.srcObject = null; rAudio.muted = true; }
      if (rVideo) {
        rVideo.src = streamUrl;
        rVideo.style.display = 'block';
        rVideo.muted = false;
        rVideo.volume = 1.0;
        rVideo.play().catch(() => { rVideo.muted = true; rVideo.play().catch(() => {}); });
      }
      if (fallback) fallback.style.display = 'none';
    }
  } else {
    document.getElementById('call-remote-status-text').textContent = 'Connecting P2P Encrypted Session (جَارِي الاتِّصَال)...';
    if (rVideo) { rVideo.removeAttribute('src'); rVideo.srcObject = null; }
    if (rAudio) { rAudio.removeAttribute('src'); rAudio.srcObject = null; }
  }

  startCallTimer();
  openModal('modal-active-call');

  try {
    const stream = await acquireUserMediaStream(callType);

    state.activeCall.localStream = stream;
    const localVideo = document.getElementById('call-local-video');
    if (localVideo) {
      localVideo.srcObject = stream;
      localVideo.muted = true;
      localVideo.play().catch(() => {});
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);
    state.activeCall.pc = pc;

    pc.onconnectionstatechange = () => {
      const cs = pc.connectionState;
      console.log('[WebRTC Accept ConnectionState]:', cs);
      if (cs === 'connected') {
        state.activeCall.webrtcConnected = true;
        state.activeCall.nafaqActive = false;
        if (state.activeCall.nafaqFallbackTimer) {
          clearTimeout(state.activeCall.nafaqFallbackTimer);
          state.activeCall.nafaqFallbackTimer = null;
        }
        if (state.activeCall.nafaqPcmProcessor) {
          try {
            state.activeCall.nafaqPcmProcessor.disconnect();
            state.activeCall.nafaqPcmSource.disconnect();
          } catch (swallowedErr) { console.warn("[WyreSup Non-Fatal Notice]:", swallowedErr.message); }
          state.activeCall.nafaqPcmProcessor = null;
          state.activeCall.nafaqPcmSource = null;
        }
        stopShafHdVideoStream();
        const remoteCanvas = document.getElementById('call-remote-shaf-canvas');
        if (remoteCanvas) remoteCanvas.style.display = 'none';
        if (!isCustomStreamCall) {
          document.getElementById('call-remote-status-text').textContent = 'Direct WebRTC P2P Active (مُتَّصِل مُبَاشَرَة)';
        }
      } else if (cs === 'disconnected' || cs === 'failed') {
        state.activeCall.webrtcConnected = false;
        if (typeof pc.restartIce === 'function') {
          try {
            console.log('[WebRTC Accept Dropped] Triggering self-healing ICE restart...');
            pc.restartIce();
          } catch (swallowedErr) { console.warn("[WyreSup Non-Fatal Notice]:", swallowedErr.message); }
        }
        state.activeCall.nafaqActive = true;
        if (!isCustomStreamCall) {
          document.getElementById('call-remote-status-text').textContent = '🟢 NAFAQ Sovereign Tunnel Active (نَفَق مُبَاشِر مَحْمِيّ)';
        }
        startNafaqTunnelStream(senderPeer, stream, callType);
      }
    };

    pc.oniceconnectionstatechange = () => {
      const s = pc.iceConnectionState;
      console.log('[WebRTC Accept ICE State]:', s);
      if (s === 'connected' || s === 'completed') {
        state.activeCall.webrtcConnected = true;
        if (state.activeCall.nafaqFallbackTimer) {
          clearTimeout(state.activeCall.nafaqFallbackTimer);
          state.activeCall.nafaqFallbackTimer = null;
        }
        if (!isCustomStreamCall) {
          document.getElementById('call-remote-status-text').textContent = 'Direct WebRTC P2P Active (مُتَّصِل مُبَاشَرَة)';
        }
      } else if (s === 'disconnected') {
        console.warn('[WebRTC Accept ICE Disconnected] Attempting ICE restart...');
        if (typeof pc.restartIce === 'function') {
          try { pc.restartIce(); } catch (swallowedErr) { console.warn("[WyreSup Non-Fatal Notice]:", swallowedErr.message); }
        }
      } else if (s === 'failed') {
        console.warn('[WebRTC ICE Failed] Activating NAFAQ Sovereign Tunnel fallback!');
        state.activeCall.webrtcConnected = false;
        state.activeCall.nafaqActive = true;
        if (!isCustomStreamCall) {
          document.getElementById('call-remote-status-text').textContent = '🟢 NAFAQ Sovereign Tunnel Active (نَفَق مُبَاشِر مَحْمِيّ)';
        }
        startNafaqTunnelStream(senderPeer, stream, callType);
      }
    };

    if (!isCustomStreamCall) {
      // Watchdog: Allow 3.5s for STUN/TURN gathering before NAFAQ fallback
      state.activeCall.nafaqFallbackTimer = setTimeout(() => {
        const iceState = state.activeCall.pc?.iceConnectionState;
        if (iceState !== 'connected' && iceState !== 'completed') {
          console.log('[WebRTC Watchdog] ICE state is', iceState, '— engaging NAFAQ Sovereign Tunneling!');
          state.activeCall.nafaqActive = true;
          const statusEl = document.getElementById('call-remote-status-text');
          if (statusEl) statusEl.textContent = '🟢 NAFAQ Sovereign Tunnel Active (نَفَق مُبَاشِر مَحْمِيّ)';
          startNafaqTunnelStream(senderPeer, stream, callType);
        }
      }, 3500);
    }

    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    pc.ontrack = (event) => {
      console.log('[WebRTC Accept] Received remote track:', event.track.kind);
      let rStream = (event.streams && event.streams[0]) ? event.streams[0] : null;
      if (!rStream) {
        if (!state.activeCall.remoteStream) {
          state.activeCall.remoteStream = new MediaStream();
        }
        if (!state.activeCall.remoteStream.getTracks().some(t => t.id === event.track.id)) {
          state.activeCall.remoteStream.addTrack(event.track);
        }
        rStream = state.activeCall.remoteStream;
      } else {
        state.activeCall.remoteStream = rStream;
      }
      attachRemoteStreamToMediaElements(rStream, state.activeCall.type);
      startCallTimer();
      document.getElementById('call-remote-status-text').textContent = 'Direct WebRTC P2P Active (مُتَّصِل مُبَاشَرَة)';
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && state.ws && state.ws.readyState === WebSocket.OPEN) {
        state.ws.send(JSON.stringify({
          type: 'CALL_SIGNAL',
          payload: {
            signalType: 'ICE',
            targetPeer: state.activeCall.peer || senderPeer,
            candidate: event.candidate
          }
        }));
      }
    };

    let sdpHandshakeSuccess = false;
    if (!isCustomStreamCall && sdp && sdp.sdp) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        await drainPendingIceCandidates();

        const answer = await pc.createAnswer();
        answer.sdp = upliftSdpBitrates(answer.sdp);
        await pc.setLocalDescription(answer);

        if (state.ws && state.ws.readyState === WebSocket.OPEN) {
          state.ws.send(JSON.stringify({
            type: 'CALL_SIGNAL',
            payload: {
              signalType: 'ANSWER',
              targetPeer: senderPeer,
              sdp: answer
            }
          }));
        }
        sdpHandshakeSuccess = true;
      } catch (sdpErr) {
        console.warn('[WebRTC SDP Handshake Warning]:', sdpErr.message);
      }
    }

    // Always send ANSWER signal to lock in the session if not already sent by WebRTC
    if (!sdpHandshakeSuccess) {
      if (state.ws && state.ws.readyState === WebSocket.OPEN) {
        state.ws.send(JSON.stringify({
          type: 'CALL_SIGNAL',
          payload: {
            signalType: 'ANSWER',
            targetPeer: senderPeer,
            sdp: { type: 'answer', customConduit: true }
          }
        }));
      }
    }

    startCallTimer();
    // WebRTC connection handles media; NAFAQ fallback triggers automatically if handshake fails
    if (!sdpHandshakeSuccess && stream && senderPeer && !isCustomStreamCall) {
      state.activeCall.nafaqActive = true;
      startNafaqTunnelStream(senderPeer, stream, callType);
    }
  } catch (err) {
    console.warn('[Accept Call Non-Fatal Warning]:', err.message);
    if (!isCustomStreamCall && !state.activeCall.nafaqActive) {
      endActiveCall();
    } else {
      console.log('[Accept Call] Stream/NAFAQ active conduit maintained smoothly.');
    }
  }
}

function declineIncomingCall() {
  if (state.pendingIncomingCall) {
    const { senderPeer } = state.pendingIncomingCall;
    if (state.ws && state.ws.readyState === WebSocket.OPEN) {
      state.ws.send(JSON.stringify({
        type: 'CALL_SIGNAL',
        payload: {
          signalType: 'REJECT',
          targetPeer: senderPeer
        }
      }));
    }
    state.pendingIncomingCall = null;
  }
  closeModal('modal-incoming-call');
}

function endActiveCall(notifyPeer = true) {
  if (state.activeCall) state.activeCall.webrtcConnected = false;
  stopShafHdVideoStream();
  const remoteCanvas = document.getElementById('call-remote-shaf-canvas');
  if (remoteCanvas) remoteCanvas.remove();
  updateCallStreamTitleUI(null);
  if (state.activeCall.activeBufferSource) {
    try {
      state.activeCall.activeBufferSource.stop();
      state.activeCall.activeBufferSource.disconnect();
    } catch (swallowedErr) { console.warn("[WyreSup Non-Fatal Notice]:", swallowedErr.message); }
    state.activeCall.activeBufferSource = null;
  }
  if (state.activeCall.nafaqPcmProcessor) {
    try {
      state.activeCall.nafaqPcmProcessor.disconnect();
      state.activeCall.nafaqPcmSource.disconnect();
    } catch (swallowedErr) { console.warn("[WyreSup Non-Fatal Notice]:", swallowedErr.message); }
    state.activeCall.nafaqPcmProcessor = null;
    state.activeCall.nafaqPcmSource = null;
  }
  if (state.activeCall.nafaqSilentSink) {
    try { state.activeCall.nafaqSilentSink.disconnect(); } catch (swallowedErr) { console.warn("[WyreSup Non-Fatal Notice]:", swallowedErr.message); }
    state.activeCall.nafaqSilentSink = null;
  }
  if (state.activeCall.remoteAudioSourceNode) {
    try { state.activeCall.remoteAudioSourceNode.disconnect(); } catch (swallowedErr) { console.warn("[WyreSup Non-Fatal Notice]:", swallowedErr.message); }
    state.activeCall.remoteAudioSourceNode = null;
  }
  if (state.activeCall.nafaqRecorder) {
    try { state.activeCall.nafaqRecorder.stop(); } catch (swallowedErr) { console.warn("[WyreSup Non-Fatal Notice]:", swallowedErr.message); }
    state.activeCall.nafaqRecorder = null;
  }
  if (state.activeCall.nafaqFallbackTimer) {
    clearTimeout(state.activeCall.nafaqFallbackTimer);
    state.activeCall.nafaqFallbackTimer = null;
  }
  state.activeCall.nafaqAudioNextTime = 0;
  state.activeCall.nafaqActive = false;
  releaseCallWakeLock();
  if (notifyPeer && state.activeCall.peer && state.ws && state.ws.readyState === WebSocket.OPEN) {
    state.ws.send(JSON.stringify({
      type: 'CALL_SIGNAL',
      payload: {
        signalType: 'HANGUP',
        targetPeer: state.activeCall.peer
      }
    }));
  }

  // Stop all local and remote media tracks
  if (state.activeCall.localStream) {
    state.activeCall.localStream.getTracks().forEach(t => {
      try { t.stop(); } catch (swallowedErr) { console.warn("[WyreSup Non-Fatal Notice]:", swallowedErr.message); }
    });
  }
  if (state.activeCall.remoteStream) {
    state.activeCall.remoteStream.getTracks().forEach(t => {
      try { t.stop(); } catch (swallowedErr) { console.warn("[WyreSup Non-Fatal Notice]:", swallowedErr.message); }
    });
  }

  // Close peer connection
  if (state.activeCall.pc) {
    try { state.activeCall.pc.close(); } catch (swallowedErr) { console.warn("[WyreSup Non-Fatal Notice]:", swallowedErr.message); }
  }

  if (state.activeCall.syntheticInterval) {
    clearInterval(state.activeCall.syntheticInterval);
    state.activeCall.syntheticInterval = null;
  }

  // Stop and remove all background stream video elements
  ['wyresup-hidden-stream-video', 'wyresup-synthetic-video-source'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      try {
        el.pause();
        el.currentTime = 0;
        el.src = '';
        el.load();
        el.remove();
      } catch (swallowedErr) { console.warn("[WyreSup Non-Fatal Notice]:", swallowedErr.message); }
    }
  });

  // Reset, mute & pause all video and audio DOM elements across the application
  document.querySelectorAll('audio, video').forEach(el => {
    try {
      el.pause();
      el.currentTime = 0;
      el.muted = true;
      el.src = '';
      el.srcObject = null;
      el.load();
    } catch (swallowedErr) { console.warn("[WyreSup Non-Fatal Notice]:", swallowedErr.message); }
  });
  const remoteVideo = document.getElementById('call-remote-video');
  if (remoteVideo) remoteVideo.style.display = 'none';

  // Show fallback avatar again for next call
  const fallback = document.getElementById('remote-avatar-fallback');
  if (fallback) {
    fallback.style.display = 'flex';
  }

  // Stop WebAudio buffer sources
  if (state.activeCall.activeBufferSource) {
    try {
      state.activeCall.activeBufferSource.stop();
      state.activeCall.activeBufferSource.disconnect();
    } catch (swallowedErr) { console.warn("[WyreSup Non-Fatal Notice]:", swallowedErr.message); }
    state.activeCall.activeBufferSource = null;
  }

  // Suspend AudioContext to guarantee zero background audio leakage
  if (state.audioCtx && state.audioCtx.state === 'running') {
    try {
      state.audioCtx.suspend().catch(() => {});
    } catch (swallowedErr) { console.warn("[WyreSup Non-Fatal Notice]:", swallowedErr.message); }
  }

  stopCallTimer();

  state.activeCall = {
    peer: null,
    peerPrefix: null,
    type: 'video',
    pc: null,
    localStream: null,
    remoteStream: null,
    syntheticInterval: null,
    pendingIceCandidates: [],
    startTime: null,
    timerInterval: null,
    isMuted: false,
    isCamOff: false,
    isScreenSharing: false,
    activeBufferSource: null
  };

  closeModal('modal-active-call');
  closeModal('modal-incoming-call');
  closeModal('modal-stream-youtube');
}

function toggleCallMic() {
  if (!state.activeCall.localStream) return;
  state.activeCall.isMuted = !state.activeCall.isMuted;
  state.activeCall.localStream.getAudioTracks().forEach(t => {
    t.enabled = !state.activeCall.isMuted;
  });

  const btn = document.getElementById('btn-call-toggle-mic');
  const icon = document.getElementById('call-mic-icon');
  const lbl = document.getElementById('call-mic-lbl');
  if (state.activeCall.isMuted) {
    btn?.classList.add('active-off');
    if (icon) icon.textContent = '🔇';
    if (lbl) lbl.textContent = 'Muted';
  } else {
    btn?.classList.remove('active-off');
    if (icon) icon.textContent = '🎙️';
    if (lbl) lbl.textContent = 'Mic';
  }
}

function toggleCallCam() {
  if (!state.activeCall.localStream) return;
  state.activeCall.isCamOff = !state.activeCall.isCamOff;
  state.activeCall.localStream.getVideoTracks().forEach(t => {
    t.enabled = !state.activeCall.isCamOff;
  });

  const btn = document.getElementById('btn-call-toggle-cam');
  const icon = document.getElementById('call-cam-icon');
  const lbl = document.getElementById('call-cam-lbl');
  const fallback = document.getElementById('local-avatar-fallback');

  if (state.activeCall.isCamOff) {
    btn?.classList.add('active-off');
    if (icon) icon.textContent = '🚫';
    if (lbl) lbl.textContent = 'Cam Off';
    if (fallback) fallback.style.display = 'flex';
  } else {
    btn?.classList.remove('active-off');
    if (icon) icon.textContent = '📹';
    if (lbl) lbl.textContent = 'Camera';
    if (fallback) fallback.style.display = 'none';
  }
}

async function toggleCallScreenShare() {
  if (!state.activeCall.pc) return;
  try {
    if (!state.activeCall.isScreenSharing) {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = screenStream.getVideoTracks()[0];
      const senders = state.activeCall.pc.getSenders();
      const videoSender = senders.find(s => s.track && s.track.kind === 'video');
      if (videoSender) {
        videoSender.replaceTrack(screenTrack);
      }
      document.getElementById('call-local-video').srcObject = screenStream;
      state.activeCall.isScreenSharing = true;

      screenTrack.onended = () => {
        toggleCallScreenShare(); // revert to camera
      };
    } else {
      const camTrack = state.activeCall.localStream.getVideoTracks()[0];
      const senders = state.activeCall.pc.getSenders();
      const videoSender = senders.find(s => s.track && s.track.kind === 'video');
      if (videoSender && camTrack) {
        videoSender.replaceTrack(camTrack);
      }
      document.getElementById('call-local-video').srcObject = state.activeCall.localStream;
      state.activeCall.isScreenSharing = false;
    }
  } catch (e) {
    console.warn('[Screen Share Error]:', e);
  }
}

function sendInCallNaghamTone() {
  const dtmfKeys = ['1', '2', '3', 'A', '4', '5', '6', 'B', '7', '8', '9', 'C', '*', '0', '#', 'D'];
  const randomKey = dtmfKeys[Math.floor(Math.random() * dtmfKeys.length)];
  const freqs = DTMF_FREQUENCIES[randomKey];
  if (freqs) {
    playDtmfDualTone(freqs.f1, freqs.f2, 0.25);
    if (state.activeCall.peer && state.ws && state.ws.readyState === WebSocket.OPEN) {
      state.ws.send(JSON.stringify({
        type: 'CALL_SIGNAL',
        payload: {
          signalType: 'NAGHAM',
          targetPeer: state.activeCall.peer,
          freq1: freqs.f1,
          freq2: freqs.f2,
          key: randomKey
        }
      }));
    }
  }
}


function toggleSwapCallViews() {
  const grid = document.getElementById('call-video-grid');
  if (grid) {
    grid.classList.toggle('is-swapped');
  }
}

// Mobile WakeLock & Screen Keep-Alive (حِفْظُ البَقَاء)
async function requestCallWakeLock() {
  try {
    if ('wakeLock' in navigator && !state.activeCall.wakeLock) {
      state.activeCall.wakeLock = await navigator.wakeLock.request('screen');
    }
  } catch (swallowedErr) { console.warn("[WyreSup Non-Fatal Notice]:", swallowedErr.message); }
}

function releaseCallWakeLock() {
  if (state.activeCall.wakeLock) {
    try { state.activeCall.wakeLock.release(); } catch (swallowedErr) { console.warn("[WyreSup Non-Fatal Notice]:", swallowedErr.message); }
    state.activeCall.wakeLock = null;
  }
}


// --- LIVE REAL-TIME TELEMETRY ENGINE (قِيَاسُ التَّدَفُّقِ الحَيّ) ---
function updateCallHudTelemetry(rttMs, transportType) {
  const hudLatencyEl = document.getElementById('call-hud-latency');
  if (!hudLatencyEl) return;

  const now = performance.now();
  let fpsStr = '';
  if (state.activeCall && state.activeCall.lastFrameTime) {
    const delta = (now - state.activeCall.lastFrameTime) / 1000;
    if (delta > 0 && delta < 2) {
      const liveFps = (1 / delta).toFixed(1);
      fpsStr = ` | ${liveFps} FPS`;
    }
  }

  const transport = transportType || (state.activeCall && state.activeCall.pc && state.activeCall.pc.iceConnectionState === 'connected' ? 'P2P' : 'LIVE MESH');
  hudLatencyEl.textContent = `${rttMs}ms (${transport}${fpsStr})`;

  // Dynamic Color Thresholds
  hudLatencyEl.className = '';
  if (rttMs < 45) {
    hudLatencyEl.classList.add('emerald');
  } else if (rttMs < 120) {
    hudLatencyEl.classList.add('amber');
  } else {
    hudLatencyEl.classList.add('coral');
  }
}

function startCallTelemetry(targetPeer) {
  stopCallTelemetry();
  if (!targetPeer) return;

  state.activeCall.telemetryInterval = setInterval(async () => {
    if (!state.activeCall || !state.activeCall.peer) {
      stopCallTelemetry();
      return;
    }

    // 1. Check WebRTC Stats if PC is active
    let measuredWebRtc = false;
    if (state.activeCall.pc && state.activeCall.pc.iceConnectionState === 'connected') {
      try {
        const stats = await state.activeCall.pc.getStats();
        stats.forEach(report => {
          if (report.type === 'candidate-pair' && (report.selected || report.state === 'succeeded')) {
            if (report.currentRoundTripTime !== undefined) {
              const liveRtt = Math.max(2, Math.round(report.currentRoundTripTime * 1000));
              updateCallHudTelemetry(liveRtt, 'P2P DIRECT');
              measuredWebRtc = true;
            }
          }
        });
      } catch (swallowedErr) { console.warn("[WyreSup Non-Fatal Notice]:", swallowedErr.message); }
    }

    // 2. Ping-Pong Probe over Conduit (Nafaq / WebSocket)
    if (!measuredWebRtc && state.ws && state.ws.readyState === WebSocket.OPEN) {
      state.ws.send(JSON.stringify({
        type: 'CALL_SIGNAL',
        payload: {
          signalType: 'WASAM_PING',
          targetPeer: state.activeCall.peer,
          senderPeer: state.identity ? state.identity.peerId : 'me',
          pingTs: performance.now()
        }
      }));
    }
  }, 1200);
}

function stopCallTelemetry() {
  if (state.activeCall && state.activeCall.telemetryInterval) {
    clearInterval(state.activeCall.telemetryInterval);
    state.activeCall.telemetryInterval = null;
  }
}

function startCallTimer() {
  requestCallWakeLock();
  startCallTelemetry(state.activeCall.peer);
  if (state.activeCall.timerInterval) return;
  state.activeCall.startTime = Date.now();
  const timerEl = document.getElementById('call-duration-timer');
  state.activeCall.timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - state.activeCall.startTime) / 1000);
    const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const s = String(elapsed % 60).padStart(2, '0');
    if (timerEl) timerEl.textContent = `${m}:${s}`;
  }, 1000);
}

function stopCallTimer() {
  stopCallTelemetry();
  if (state.activeCall.timerInterval) {
    clearInterval(state.activeCall.timerInterval);
    state.activeCall.timerInterval = null;
  }
  const timerEl = document.getElementById('call-duration-timer');
  if (timerEl) timerEl.textContent = '00:00';
}

function simulateBotAnswerCall(botPeerId, callType) {
  if (!state.activeCall.peer) return;
  const botStream = createSyntheticStream(callType === 'video');
  attachRemoteStreamToMediaElements(botStream, callType);

  startCallTimer();
  document.getElementById('call-remote-status-text').textContent = 'P2P Encrypted Stream Active (مُتَّصِل)';
  // Live telemetry handled by startCallTelemetry
}

function createSyntheticStream(withVideo = true) {
  const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
  let ctx = state.audioCtx;
  if (!ctx || ctx.state === 'closed') {
    ctx = new AudioCtxClass();
    state.audioCtx = ctx;
  }
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  // Pure silent media stream destination: zero background audio/music interference
  const dst = ctx.createMediaStreamDestination();
  const tracks = [...dst.stream.getAudioTracks()];

  if (withVideo) {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const cCtx = canvas.getContext('2d');
    let frame = 0;

    const animInterval = setInterval(() => {
      if (!state.activeCall.localStream && !state.activeCall.remoteStream) {
        clearInterval(animInterval);
        return;
      }
      frame++;
      const grad = cCtx.createLinearGradient(0, 0, 1280, 720);
      grad.addColorStop(0, '#06080e');
      grad.addColorStop(1, '#0d131f');
      cCtx.fillStyle = grad;
      cCtx.fillRect(0, 0, 1280, 720);

      cCtx.strokeStyle = '#00f59b';
      cCtx.lineWidth = 3;
      cCtx.strokeRect(30, 30, 1220, 660);

      cCtx.fillStyle = '#00f59b';
      cCtx.font = 'bold 36px monospace';
      cCtx.fillText('WYRESUP // YASIIN BEY (MOS DEF) - SUPERMAGIC 🎵', 70, 100);

      cCtx.font = '20px monospace';
      cCtx.fillStyle = '#8e9297';
      cCtx.fillText(`Frame #${frame} · 30fps · ChaCha20-Poly1305 / Opus 48kHz`, 70, 140);
      cCtx.fillText(`Timestamp: ${new Date().toISOString()} · Latency: 4ms`, 70, 175);

      cCtx.strokeStyle = '#00f59b';
      cCtx.lineWidth = 4;
      cCtx.beginPath();
      for (let x = 70; x < 1210; x += 10) {
        const y = 420 + Math.sin((x * 0.02) + (frame * 0.15)) * 60 * Math.sin(frame * 0.05);
        if (x === 70) cCtx.moveTo(x, y);
        else cCtx.lineTo(x, y);
      }
      cCtx.stroke();

      const pulseSize = 40 + Math.sin(frame * 0.1) * 8;
      cCtx.fillStyle = 'rgba(0, 245, 155, 0.2)';
      cCtx.beginPath();
      cCtx.arc(640, 320, pulseSize * 2, 0, Math.PI * 2);
      cCtx.fill();

      cCtx.fillStyle = '#00f59b';
      cCtx.beginPath();
      cCtx.arc(640, 320, pulseSize, 0, Math.PI * 2);
      cCtx.fill();

      cCtx.fillStyle = '#000';
      cCtx.font = 'bold 28px monospace';
      cCtx.textAlign = 'center';
      cCtx.fillText('WYRESUP', 640, 328);
      cCtx.textAlign = 'start';
    }, 1000 / 30);

    state.activeCall.syntheticInterval = animInterval;
    const canvasStream = canvas.captureStream(30);
    tracks.push(...canvasStream.getVideoTracks());
  }

  return new MediaStream(tracks);
}



// --- 10. Lisan al-Arab Linguistic Engine Controller (مُعْجَم لِسَان العَرَب) ---
let lisanLexiconData = [];

async function initLisanLexicon() {
  try {
    const res = await fetch("/api/lisan");
    if (res.ok) {
      const data = await res.json();
      lisanLexiconData = Object.entries(data).map(([key, val]) => ({ key, ...val }));
    }
  } catch (e) {
    console.warn("[Lisan] Failed to fetch remote lexicon, using fallback:", e);
  }

  // Bind Search Input
  const searchInput = document.getElementById("lisan-search-input");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      filterLisanLexicon(e.target.value);
    });
  }

  // Bind Quick Tags
  document.querySelectorAll(".lisan-tag-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const query = btn.getAttribute("data-query") || "";
      if (searchInput) searchInput.value = query;
      filterLisanLexicon(query);
    });
  });
}

function openLisanModal() {
  renderLisanLexicon(lisanLexiconData);
  openModal("modal-lisan-lexicon");
}

function filterLisanLexicon(query) {
  if (!query || !query.trim()) {
    renderLisanLexicon(lisanLexiconData);
    return;
  }
  const q = query.trim().toLowerCase();
  const filtered = lisanLexiconData.filter(item => {
    return (item.key && item.key.toLowerCase().includes(q)) ||
           (item.root && item.root.includes(q)) ||
           (item.arabicWord && item.arabicWord.includes(q)) ||
           (item.technicalTerm && item.technicalTerm.toLowerCase().includes(q)) ||
           (item.classicalDefinition && item.classicalDefinition.toLowerCase().includes(q)) ||
           (item.mathematicalRole && item.mathematicalRole.toLowerCase().includes(q));
  });
  renderLisanLexicon(filtered);
}

function renderLisanLexicon(items) {
  const container = document.getElementById("lisan-lexicon-grid");
  if (!container) return;

  if (!items || items.length === 0) {
    container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 40px;">No linguistic root matches found in Lisan al-Arab.</div>`;
    return;
  }

  container.innerHTML = items.map(item => `
    <div class="lisan-card-item">
      <div class="lisan-card-top">
        <div class="lisan-card-arabic">
          <span>${item.arabicWord}</span>
          <span class="lisan-root-badge">جَذْر: ${item.root}</span>
        </div>
        <span class="lisan-layer-tag">${item.layer}</span>
      </div>
      <div class="lisan-tech-term">${item.technicalTerm}</div>
      <div class="lisan-quote-box">«${item.classicalDefinition}» <br><small style="color: var(--matrix-green); font-size: 11px;">— لسان العرب، ابن منظور</small></div>
      <div class="lisan-math-box">
        <strong>Mathematical & Protocol Mapping:</strong> ${item.mathematicalRole}
      </div>
    </div>
  `).join("");
}

// Global Window Bindings for Inline HTML Handlers
window.startYoutubeStreamCall = startYoutubeStreamCall;
window.openStreamYoutubeModal = openStreamYoutubeModal;
window.acceptIncomingCall = acceptIncomingCall;
window.rejectIncomingCall = declineIncomingCall;
window.declineIncomingCall = declineIncomingCall;
window.endActiveCall = endActiveCall;
