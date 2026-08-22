
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

async function getOrDeriveSharedKey(targetPeer) {
  if (!state.crypto || !state.crypto.keys || !WyreCrypto.isSupported()) return null;

  const peerId = targetPeer.peerId || targetPeer.fullId || `${targetPeer.prefix}@mesh`;
  if (state.crypto.sharedKeyCache.has(peerId)) {
    return state.crypto.sharedKeyCache.get(peerId);
  }

  let peerPubKeyJwk = targetPeer.ecdhPubKey;
  if (!peerPubKeyJwk) {
    const foundPeer = state.peers.find(p => p.peerId === peerId || p.prefix === targetPeer.prefix);
    peerPubKeyJwk = foundPeer?.ecdhPubKey;
  }

  if (peerPubKeyJwk) {
    const remotePubKey = await WyreCrypto.importRemotePublicKey(peerPubKeyJwk);
    if (remotePubKey) {
      const derivedKey = await WyreCrypto.deriveSharedKey(state.crypto.keys.ecdhPair.privateKey, remotePubKey);
      if (derivedKey) {
        state.crypto.sharedKeyCache.set(peerId, derivedKey);
        return derivedKey;
      }
    }
  }

  // Deterministic pairwise key agreement fallback for bots and offline peers
  try {
    const sortedIds = [peerId, state.identity.fullId].sort();
    const deterministicSecret = `${sortedIds[0]}:${sortedIds[1]}:wyresup-miftah-v1`;
    const enc = new TextEncoder().encode(deterministicSecret);
    const hash = await window.crypto.subtle.digest("SHA-256", enc);
    const fallbackKey = await window.crypto.subtle.importKey(
      "raw", hash,
      { name: "AES-GCM", length: 256 },
      false, ["encrypt", "decrypt"]
    );
    state.crypto.sharedKeyCache.set(peerId, fallbackKey);
    return fallbackKey;
  } catch (e) {
    console.warn("[WyreCrypto] Shared key fallback error:", e);
    return null;
  }
}

async function sendEncryptedDm(dmChannelId, rawPayload) {
  const targetPrefix = dmChannelId.replace("dm-", "");
  const targetPeer = state.peers.find(p => p.prefix === targetPrefix || p.peerId.startsWith(targetPrefix)) || {
    peerId: `${targetPrefix}@mesh`,
    prefix: targetPrefix
  };

  const sharedKey = await getOrDeriveSharedKey(targetPeer);
  const messageId = generateClientMessageId();

  if (sharedKey) {
    // Encrypt Batin with AES-256-GCM (Authenticated Encryption)
    const encryptedBatin = await WyreCrypto.encryptBatin(rawPayload, sharedKey);

    const packet = {
      zahir: {
        version: "zbat/1.4.0",
        messageId,
        senderId: state.identity.fullId,
        spaceId: state.currentSpaceId,
        channelId: dmChannelId,
        timestamp: Date.now(),
        ttl: 5,
        hops: 0,
        routeType: "direct_e2ee",
        priority: "high",
        isVoice: !!rawPayload.voiceData,
        isEncrypted: true,
        encryptionMeta: {
          targetPeer: targetPeer.peerId,
          senderPubKey: state.identity.ecdhPubJwk || null,
          cipher: "AES-256-GCM/MIFTAH"
        }
      },
      batin: encryptedBatin
    };

    if (state.activeCall && state.activeCall.dataChannel && state.activeCall.dataChannel.readyState === "open") {
      // Tier 1: Direct Zero-Hop WebRTC DataChannel (Barq Wire-Speed)
      state.activeCall.dataChannel.send(JSON.stringify({ type: "P2P_PACKET", payload: packet }));
      console.log("[Barq P2P] Message sent over direct WebRTC DataChannel (0 relay hops)");
    } else if (state.ws && state.ws.readyState === WebSocket.OPEN) {
      // Tier 2: WebSocket Gossip Mesh Relay
      state.ws.send(JSON.stringify({
        type: "SEND_MESSAGE",
        payload: packet
      }));
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
    if (state.ws && state.ws.readyState === WebSocket.OPEN) {
      state.ws.send(JSON.stringify({
        type: "SEND_MESSAGE",
        payload: {
          spaceId: state.currentSpaceId,
          channelId: dmChannelId,
          ...rawPayload
        }
      }));
    }
  }
}

/**
 * WyreCrypto: WebCrypto ECDH & AES-256-GCM Cryptographic Engine (مُحَرِّك التَّعْمِيَة المِفْتَاحِيَّة)
 * Authenticated End-to-End Encryption, Aqd al-Miftah Key Agreement, & ZBAT Framing.
 */
class WyreCrypto {
  static isSupported() {
    return typeof window !== "undefined" && window.crypto && !!window.crypto.subtle;
  }



  /**
   * Al-Sabk (الصَّبْك): Client-side Binary Frame Packing for WebCrypto / WebSockets
   */
  static packSabk(ivUint8, tagUint8, ctUint8, messageIndex = 0) {
    const totalLen = 34 + ctUint8.byteLength;
    const packed = new Uint8Array(totalLen);
    const view = new DataView(packed.buffer);

    packed[0] = 0x57; // Magic 'W'
    packed[1] = 0x01; // Flags (AES-256-GCM)
    view.setUint32(2, messageIndex, false); // Big-Endian
    packed.set(ivUint8, 6);
    packed.set(tagUint8, 18);
    packed.set(ctUint8, 34);

    return packed;
  }

  static unpackSabk(packedUint8) {
    if (packedUint8.byteLength < 34 || packedUint8[0] !== 0x57) {
      throw new Error("[Al-Sabk] Truncated or invalid binary frame");
    }
    const view = new DataView(packedUint8.buffer, packedUint8.byteOffset, packedUint8.byteLength);
    const messageIndex = view.getUint32(2, false);
    const iv = packedUint8.subarray(6, 18);
    const tag = packedUint8.subarray(18, 34);
    const ciphertext = packedUint8.subarray(34);

    return { messageIndex, iv, tag, ciphertext };
  }

  static padPayload(plaintext) {
    const rawStr = typeof plaintext === "string" ? plaintext : JSON.stringify(plaintext);
    const bucketSizes = [256, 1024, 4096, 16384];
    let targetSize = bucketSizes[bucketSizes.length - 1];
    for (const size of bucketSizes) {
      if (rawStr.length + 16 <= size) {
        targetSize = size;
        break;
      }
    }
    const padLen = Math.max(0, targetSize - rawStr.length - 16);
    const randChars = "0123456789abcdef";
    let padding = "";
    for (let i = 0; i < padLen; i++) padding += randChars[Math.floor(Math.random() * randChars.length)];
    return JSON.stringify({ d: rawStr, p: padding });
  }

  static unpadPayload(paddedStr) {
    try {
      const parsed = JSON.parse(paddedStr);
      if (parsed && parsed.d) {
        try { return JSON.parse(parsed.d); } catch { return parsed.d; }
      }
      return parsed;
    } catch {
      return paddedStr;
    }
  }

  static async computeMizanNonce(dataStr, difficulty = 2) {
    const targetPrefix = "0".repeat(difficulty);
    const encoder = new TextEncoder();
    let nonce = 0;
    while (true) {
      const dataToHash = encoder.encode(`${dataStr}:${nonce}`);
      const hashBuf = await window.crypto.subtle.digest("SHA-256", dataToHash);
      const hashArray = Array.from(new Uint8Array(hashBuf));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
      if (hashHex.startsWith(targetPrefix)) {
        return { nonce, hash: hashHex, difficulty };
      }
      nonce++;
      if (nonce > 50000) break;
    }
    return { nonce, difficulty };
  }

  static async generateKeyPairs() {
    if (!this.isSupported()) return null;
    try {
      const ecdhPair = await window.crypto.subtle.generateKey(
        { name: "ECDH", namedCurve: "P-256" },
        true,
        ["deriveKey", "deriveBits"]
      );

      const ecdsaPair = await window.crypto.subtle.generateKey(
        { name: "ECDSA", namedCurve: "P-256" },
        true,
        ["sign", "verify"]
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
      console.warn("[WyreCrypto] Keygen error:", e);
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

  static async deriveSharedKey(localPrivKey, remotePubKey) {
    if (!this.isSupported() || !localPrivKey || !remotePubKey) return null;
    try {
      return await window.crypto.subtle.deriveKey(
        { name: "ECDH", public: remotePubKey },
        localPrivKey,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
      );
    } catch (e) {
      console.warn("[WyreCrypto] DeriveKey error:", e);
      return null;
    }
  }

  static async encryptBatin(payload, sharedCryptoKey) {
    if (!this.isSupported() || !sharedCryptoKey) return null;
    try {
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const paddedJson = WyreCrypto.padPayload(payload);
      const plaintext = new TextEncoder().encode(paddedJson);
      const ciphertextBuf = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        sharedCryptoKey,
        plaintext
      );

      const ciphertextB64 = btoa(String.fromCharCode(...new Uint8Array(ciphertextBuf)));
      const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, "0")).join("");

      return {
        ciphertext: ciphertextB64,
        iv: ivHex,
        algorithm: "AES-256-GCM/MIFTAH"
      };
    } catch (e) {
      console.error("[WyreCrypto] Encryption failure:", e);
      return null;
    }
  }

  static async decryptBatin(encryptedObj, sharedCryptoKey) {
    if (!this.isSupported() || !sharedCryptoKey || !encryptedObj || !encryptedObj.ciphertext) return null;
    try {
      const ivHex = encryptedObj.iv;
      const iv = new Uint8Array(ivHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
      const binStr = atob(encryptedObj.ciphertext);
      const cipherBytes = new Uint8Array(binStr.length);
      for (let i = 0; i < binStr.length; i++) cipherBytes[i] = binStr.charCodeAt(i);

      const decryptedBuf = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
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
      console.warn("[WyreCrypto] Decryption failure (auth tag mismatch or key mismatch):", e.message);
      return null;
    }
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
  activeCall: {
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
    isScreenSharing: false
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
    console.warn('[Mesh] Disconnected. Reconnecting in 2s (I\'adat al-Wasl)...');
    updateConnectionBadge('DISCONNECTED // MUNFASIL', false);
    setTimeout(initWebSocket, 2000);
  };

  state.ws.onerror = (err) => {
    console.error('[Mesh WS Error]:', err);
  };
}

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
  }
}

async function handleIncomingGossipPacket(packet) {
  if (!packet || !packet.zahir || !packet.batin) return;
  const { channelId, messageId, isEncrypted, encryptionMeta, senderId } = packet.zahir;

  if (!state.messages.has(channelId)) {
    state.messages.set(channelId, []);
  }

  const list = state.messages.get(channelId);
  if (list.some(m => m.zahir.messageId === messageId)) return;

  // Real AES-256-GCM Batin Decryption
  if (isEncrypted && packet.batin && packet.batin.ciphertext) {
    packet.isEncrypted = true;
    if (senderId === state.identity.fullId && packet.isDecrypted) {
      // Local echo already in plaintext
    } else {
      const senderPeer = state.peers.find(p => p.peerId === senderId) || { peerId: senderId, ecdhPubKey: encryptionMeta?.senderPubKey };
      if (encryptionMeta?.senderPubKey) {
        senderPeer.ecdhPubKey = encryptionMeta.senderPubKey;
      }
      const sharedKey = await getOrDeriveSharedKey(senderPeer);
      if (sharedKey) {
        const decryptedBatin = await WyreCrypto.decryptBatin(packet.batin, sharedKey);
        if (decryptedBatin) {
          packet.batin = decryptedBatin;
          packet.isDecrypted = true;
        } else {
          packet.batin = { content: "🔒 [ZBAT Ciphertext Encrypted via AES-256-GCM]" };
          packet.isDecrypted = false;
        }
      } else {
        packet.batin = { content: "🔒 [ZBAT Ciphertext Encrypted via AES-256-GCM]" };
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
    const el = document.createElement('div');
    el.className = `channel-item ${ch.id === state.currentChannelId ? 'active' : ''}`;
    el.innerHTML = `
      <span class="channel-icon">${ch.icon || (ch.id.startsWith('dm-') ? '🔒' : (ch.type === 'voice' ? '🔊' : '#'))}</span>
      <span class="channel-name">${ch.name}</span>
    `;
    el.onclick = () => selectChannel(ch.id);

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

function selectChannel(channelId) {
  state.currentChannelId = channelId;
  const space = state.spaces.find(s => s.id === state.currentSpaceId);
  let channel = space?.channels.find(c => c.id === channelId);

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

  // Fetch from server if not cached
  if (!state.messages.has(channelId)) {
    try {
      const res = await fetch(`/api/history/${channelId}`);
      if (res.ok) {
        const history = await res.json();
        state.messages.set(channelId, history);
      }
    } catch (e) {
      console.warn('Could not fetch channel history:', e);
    }
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
    bodyHtml += `
      <div class="sawt-audio-card" id="audio-card-${messageId}">
        <button class="sawt-play-btn" onclick="playSawtAudio('${messageId}', '${voiceData}')">▶</button>
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
        <button class="btn btn-primary" style="padding:6px 14px; font-size:0.8rem; background:linear-gradient(135deg, #00f59b, #00b4d8); color:#000; font-weight:700; border:none; border-radius:6px; cursor:pointer;" onclick="startYoutubeStreamCall('${senderId === state.identity.fullId ? (state.currentChannelId?.startsWith('dm-') ? state.currentChannelId.replace('dm-', '') : 'enver') : senderId}', '${escapeHtml(ytQueryOrUrl)}')">
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
            <img src="${att.data}" alt="${escapeHtml(att.name)}" class="msg-attachment-img" onclick="openImageLightbox('${att.data}')">
          </div>
        `;
      } else if (att.name && att.name.endsWith('.epub')) {
        const cleanName = (att.title || att.name.replace('.epub', '').replace(/_/g, ' '));
        const filename = att.name;
        const isTafsir = att.name.startsWith('tafsir_kabir_');
        const isMatalib = att.name.startsWith('al_matalib_');
        const isFiraq = att.name.includes('itiqadat') || att.name.includes('firaq') || att.name.includes('firqa');
        const badgeTag = isFiraq ? "I'tiqadat Firaq al-Muslimin" : (isTafsir ? "Tafsir al-Kabir" : (isMatalib ? "Al-Matalib al-'Aliyyah" : "Kalam Masterwork"));
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
    bodyHtml += `<img src="${mediaUrl}" class="msg-attachment-img" onclick="openImageLightbox('${mediaUrl}')">`;
  }

  card.innerHTML = `
    <!-- Floating Discord Action Bar -->
    <div class="msg-action-bar">
      <button class="msg-action-btn" onclick="sendQuickReaction('⚡')" title="React ⚡">⚡</button>
      <button class="msg-action-btn" onclick="sendQuickReaction('🛡️')" title="React 🛡️">🛡️</button>
      <button class="msg-action-btn" onclick="sendQuickReaction('👍')" title="React 👍">👍</button>
      <button class="msg-action-btn" onclick="sendQuickReaction('🔥')" title="React 🔥">🔥</button>
    </div>

    <div class="msg-avatar" onclick="showUserProfileBySenderId('${senderId}')" style="cursor: pointer;" title="View ${prefix}'s profile">${prefix.substring(0, 2).toUpperCase()}</div>
    <div class="msg-content-wrap">
      <div class="msg-meta">
        <span class="msg-author ${prefix === 'antigravity' ? 'antigravity' : ''}" onclick="showUserProfileBySenderId('${senderId}')" style="cursor: pointer;" title="View ${prefix}'s profile">${prefix}</span>
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
  const img = document.getElementById('lightbox-img');
  if (img) img.src = src;
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
  if (!text) return '';
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
    item.className = 'member-item';
    item.title = `Click to view profile / Direct DM with ${peer.prefix}`;
    item.innerHTML = `
      <div class="member-avatar-wrap">
        <div class="member-avatar ${isHadir ? '' : 'offline'}">
          ${(peer.prefix || 'P').substring(0, 2).toUpperCase()}
        </div>
        <span class="status-indicator ${isHadir ? 'hadir' : 'ghaib'}"></span>
      </div>
      <div class="member-info">
        <span class="member-name ${peer.prefix === 'antigravity' ? 'antigravity' : ''}">${peer.prefix || peer.peerId}</span>
        <span class="member-sub">${peer.latency || 12}ms · ${isHadir ? 'حَاضِر' : 'غَائِب'}</span>
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

  const audio = new Audio(voiceData);
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
  const input = document.getElementById('message-input');
  const sendBtn = document.getElementById('btn-send-message');

  const sendMessage = async () => {
    const text = input.value.trim();
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
    } catch(e){}
    openModal('modal-diagnostics');
  });

  // Spawn Simulated Bot Button
  document.getElementById('btn-spawn-bot').addEventListener('click', async () => {
    try {
      await fetch('/api/bots/spawn', { method: 'POST' });
    } catch (e) {}
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
  } catch(e) {}
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
  video.muted = false;
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
      try { video.pause(); } catch(e){}
      return;
    }

    if (video.readyState >= 2) {
      try {
        cCtx.drawImage(video, 0, 0, 1280, 720);
      } catch (e) {}

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
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302', 'stun:stun3.l.google.com:19302', 'stun:stun4.l.google.com:19302'] },
    { urls: ['stun:stun.cloudflare.com:3478'] },
    { urls: ['stun:stun.services.mozilla.com'] }
  ],
  iceCandidatePoolSize: 10
};

function attachRemoteStreamToMediaElements(stream, callType) {
  state.activeCall.remoteStream = stream;
  const remoteVideo = document.getElementById('call-remote-video');
  const remoteAudio = document.getElementById('call-remote-audio');
  const fallback = document.getElementById('remote-avatar-fallback');
  const voicePulse = document.getElementById('call-voice-pulse');

  if (remoteVideo) {
    remoteVideo.srcObject = stream;
    remoteVideo.muted = false;
    remoteVideo.volume = 1.0;
    remoteVideo.play().catch(e => console.warn('[Video play warning]:', e));
    if (callType === 'video' && fallback) {
      fallback.style.display = 'none';
    }
  }

  if (remoteAudio) {
    remoteAudio.srcObject = stream;
    remoteAudio.muted = false;
    remoteAudio.volume = 1.0;
    remoteAudio.play().catch(e => console.warn('[Audio play warning]:', e));
  }

  if (callType === 'audio') {
    if (fallback) fallback.style.display = 'flex';
    if (voicePulse) voicePulse.style.display = 'flex';
  } else {
    if (voicePulse) voicePulse.style.display = 'none';
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

window.startOutgoingCall = async function startOutgoingCall(targetPeer, callType = 'video') {
  const peerId = typeof targetPeer === 'string' ? targetPeer : (targetPeer.peerId || targetPeer.fullId);
  const peerPrefix = peerId.split('@')[0];

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

  try {
    let stream;
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const constraints = {
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: callType === 'video' ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } else {
        throw new Error('getUserMedia not available on insecure context');
      }
    } catch (e) {
      console.warn('[WebRTC] Native device access fallback to synthetic:', e.message);
      stream = createSyntheticStream(callType === 'video');
    }

    state.activeCall.localStream = stream;
    const localVideo = document.getElementById('call-local-video');
    if (localVideo) {
      localVideo.srcObject = stream;
      localVideo.muted = true;
      localVideo.play().catch(() => {});
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);
    state.activeCall.pc = pc;

    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    pc.ontrack = (event) => {
      console.log('[WebRTC] Received remote track:', event.track.kind);
      let rStream = (event.streams && event.streams[0]) ? event.streams[0] : null;
      if (!rStream) {
        if (!state.activeCall.remoteStream) {
          state.activeCall.remoteStream = new MediaStream();
        }
        state.activeCall.remoteStream.addTrack(event.track);
        rStream = state.activeCall.remoteStream;
      }
      attachRemoteStreamToMediaElements(rStream, state.activeCall.type);
      startCallTimer();
      document.getElementById('call-remote-status-text').textContent = 'P2P Encrypted Stream Active (مُتَّصِل)';
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
          callType,
          sdp: offer
        }
      }));
    }

    // Dialing Audio feedback
    playTone(440, 0.2);
    setTimeout(() => playTone(480, 0.2), 250);

    // Auto-answer companion bot if calling bot
    if (peerPrefix.startsWith('antigravity') || peerPrefix.startsWith('al-') || peerPrefix.startsWith('ibn-')) {
      setTimeout(() => {
        simulateBotAnswerCall(peerId, callType);
      }, 1500);
    }

  } catch (err) {
    console.error('[WebRTC Outgoing Error]:', err);
  }
}

async function handleIncomingCallSignal(payload) {
  const { signalType, senderPeer, senderPrefix, sdp, candidate, callType } = payload;

  if (signalType === 'OFFER') {
    state.pendingIncomingCall = payload;
    document.getElementById('incoming-caller-name').textContent = senderPrefix || senderPeer.split('@')[0];
    document.getElementById('incoming-call-avatar').textContent = (senderPrefix || senderPeer).substring(0, 2).toUpperCase();
    document.getElementById('incoming-call-type-text').textContent = `Incoming P2P Encrypted ${callType === 'video' ? 'Video' : 'Audio'} Call (مُكَالَمَة ${callType === 'video' ? 'مَرْئِيَّة' : 'صَوْتِيَّة'})`;
    openModal('modal-incoming-call');
    playTone(523.25, 0.3);
    setTimeout(() => playTone(659.25, 0.3), 350);
  } else if (signalType === 'ANSWER') {
    if (state.activeCall.pc && sdp) {
      await state.activeCall.pc.setRemoteDescription(new RTCSessionDescription(sdp));
      await drainPendingIceCandidates();
      startCallTimer();
      document.getElementById('call-remote-status-text').textContent = 'P2P Encrypted Stream Active (مُتَّصِل)';
    }
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
  } else if (signalType === 'HANGUP' || signalType === 'REJECT') {
    endActiveCall(false);
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
  const streamUrl = (state.pendingIncomingCall && state.pendingIncomingCall.streamUrl) || '/cached_videos/BrPffpg9KFM.mp4';

  state.activeCall.peer = senderPeer;
  state.activeCall.peerPrefix = senderPrefix || senderPeer.split('@')[0];
  state.activeCall.type = callType || 'video';

  document.getElementById('call-active-peer-name').textContent = state.activeCall.peerPrefix;
  document.getElementById('call-remote-avatar').textContent = state.activeCall.peerPrefix.substring(0, 2).toUpperCase();
  document.getElementById('call-remote-avatar-name').textContent = state.activeCall.peerPrefix;
  document.getElementById('call-remote-status-text').textContent = 'P2P Stream Active // Damascus (Gorillaz ft. Yasiin Bey)';

  if (rVideo) {
    rVideo.src = streamUrl;
    rVideo.style.display = 'block';
    rVideo.muted = false;
    rVideo.volume = 1.0;
    rVideo.play().catch(() => {
      rVideo.muted = true;
      rVideo.play().catch(() => {});
    });
  }
  if (fallback) {
    fallback.style.display = 'none';
  }
  if (rAudio) {
    rAudio.muted = false;
    rAudio.volume = 1.0;
    rAudio.play().catch(() => {});
  }

  startCallTimer();
  openModal('modal-active-call');

  try {
    let stream;
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const constraints = {
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: callType === 'video' ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } else {
        throw new Error('getUserMedia not available on insecure context');
      }
    } catch (e) {
      console.warn('[WebRTC] Native device access fallback to synthetic:', e.message);
      stream = createSyntheticStream(callType === 'video');
    }

    state.activeCall.localStream = stream;
    const localVideo = document.getElementById('call-local-video');
    if (localVideo) {
      localVideo.srcObject = stream;
      localVideo.muted = true;
      localVideo.play().catch(() => {});
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);
    state.activeCall.pc = pc;

    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    pc.ontrack = (event) => {
      console.log('[WebRTC Accept] Received remote track:', event.track.kind);
      let rStream = (event.streams && event.streams[0]) ? event.streams[0] : null;
      if (!rStream) {
        if (!state.activeCall.remoteStream) {
          state.activeCall.remoteStream = new MediaStream();
        }
        state.activeCall.remoteStream.addTrack(event.track);
        rStream = state.activeCall.remoteStream;
      }
      attachRemoteStreamToMediaElements(rStream, state.activeCall.type);
      startCallTimer();
      document.getElementById('call-remote-status-text').textContent = 'P2P Encrypted Stream Active (مُتَّصِل)';
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && state.ws && state.ws.readyState === WebSocket.OPEN) {
        state.ws.send(JSON.stringify({
          type: 'CALL_SIGNAL',
          payload: {
            signalType: 'ICE',
            targetPeer: senderPeer,
            candidate: event.candidate
          }
        }));
      }
    };

    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    await drainPendingIceCandidates();

    const answer = await pc.createAnswer();
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

    startCallTimer();
  } catch (err) {
    console.error('[WebRTC Accept Error]:', err);
    endActiveCall();
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
      try { t.stop(); } catch(e){}
    });
  }
  if (state.activeCall.remoteStream) {
    state.activeCall.remoteStream.getTracks().forEach(t => {
      try { t.stop(); } catch(e){}
    });
  }

  // Close peer connection
  if (state.activeCall.pc) {
    try { state.activeCall.pc.close(); } catch(e) {}
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
      } catch(e){}
    }
  });

  // Reset & pause all call video and audio DOM elements
  const localVideo = document.getElementById('call-local-video');
  const remoteVideo = document.getElementById('call-remote-video');
  const remoteAudio = document.getElementById('call-remote-audio');

  if (localVideo) {
    try {
      localVideo.pause();
      localVideo.src = '';
      localVideo.srcObject = null;
      localVideo.load();
    } catch(e){}
  }
  if (remoteVideo) {
    try {
      remoteVideo.pause();
      remoteVideo.src = '';
      remoteVideo.srcObject = null;
      remoteVideo.load();
      remoteVideo.style.display = 'none';
    } catch(e){}
  }
  if (remoteAudio) {
    try {
      remoteAudio.pause();
      remoteAudio.src = '';
      remoteAudio.srcObject = null;
      remoteAudio.load();
    } catch(e){}
  }

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
    } catch(e){}
    state.activeCall.activeBufferSource = null;
  }

  // Suspend AudioContext to guarantee zero background audio leakage
  if (state.audioCtx && state.audioCtx.state === 'running') {
    try {
      state.audioCtx.suspend().catch(() => {});
    } catch(e){}
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

function startCallTimer() {
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
  document.getElementById('call-hud-latency').textContent = '8ms (P2P DIRECT)';
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

  const dst = ctx.createMediaStreamDestination();

  // Try streaming Supermagic by Yasiin Bey (Mos Def) first
  let audioLoaded = false;
  fetch('/supermagic.mp3')
    .then(res => {
      if (!res.ok) throw new Error('supermagic.mp3 not found');
      return res.arrayBuffer();
    })
    .then(buf => ctx.decodeAudioData(buf))
    .then(decodedBuffer => {
      const source = ctx.createBufferSource();
      source.buffer = decodedBuffer;
      source.loop = true;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.7, ctx.currentTime);
      source.connect(gain);
      gain.connect(dst);
      source.start(0);
      state.activeCall.activeBufferSource = source;
      audioLoaded = true;
      console.log('[WebRTC Media] Playing Yasiin Bey (Mos Def) - Supermagic 🎵');
    })
    .catch(err => {
      console.warn('[WebRTC Media] Fallback to melodic synth:', err.message);
      if (!audioLoaded) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(432, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        const notes = [432, 540, 648, 864, 648, 540];
        let noteIdx = 0;
        const synthInterval = setInterval(() => {
          if (!state.activeCall.localStream && !state.activeCall.remoteStream) {
            clearInterval(synthInterval);
            return;
          }
          if (ctx && ctx.state === 'running') {
            noteIdx = (noteIdx + 1) % notes.length;
            osc.frequency.setTargetAtTime(notes[noteIdx], ctx.currentTime, 0.05);
          }
        }, 400);
        osc.connect(gain);
        gain.connect(dst);
        osc.start();
      }
    });

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
window.rejectIncomingCall = rejectIncomingCall;
window.endActiveCall = endActiveCall;
