# WyreSup // Decentralized Cryptographic Mesh Messenger (v1.81)

> **WyreSup (واير سَب)** is an open-source, decentralized web messenger and P2P gossip mesh prototype exploring a Classical Arabic linguistic ontology (*Lisan al-Arab*) to structure cryptographic and networking primitives.

---

### 🚀 Version 1.81 Highlights (Al-Mani' wa'l-Safā' & Sovereign Signaling)
- **Bot Isolation & Strict Signaling Filtering**: Hardened bot and agent listeners to prevent unsolicited automated calls or interception of human-to-human mesh sessions.
- **In-App Channel Purge (`/clear` & `/wipe`)**: Real-time synchronized channel clearing endpoints and chat slash commands across all connected mesh sockets.
- **Offline Member State Polish**: Desaturated avatar styling and muted indicator rings for offline peers in sidebar lists.
- **Sovereign Cellular Duplex Hardening**: Validated zero-drop SHAF conduit fallback across dual-mobile symmetric CGNAT carriers.
- **Sovereign Single-Route Audio Pipeline**: Complete phase echo elimination and zero-leakage WebAudio teardown (Katm & Ikhmad).

---

## 🛡️ Real Cryptographic & Protocol Architecture

| Subsystem | Linguistic Root | Technical Reality & Implementation |
| :--- | :--- | :--- |
| **Miftah (مِفْتَاح)** | `فتح` (Key Agreement) | **ECDH (NIST P-256 / `prime256v1`)** key agreement deriving 256-bit symmetric session keys via WebCrypto & Node.js `crypto`. |
| **ZBAT (زَبَاط)** | `ظهر / بطن` (Manifest/Core) | **Zero-Knowledge Envelope**: Public unencrypted `zahir` routing headers + Authenticated **AES-256-GCM** `batin` ciphertext (96-bit random IV, 128-bit Auth Tag). |
| **Thaqb (ثَقْب)** | `ثقب` (Puncture / Erasure) | **Symmetric KDF Message Ratchet** (`HMAC-SHA256`) with explicit in-place memory zeroization (`fill(0)`) for forward secrecy. |
| **Al-Sabk (الصَّبْك)** | `سبك` (Binary Casting) | **Zero-Copy Packed Binary Framing**: 34-byte compact binary struct layout bypassing JSON/Hex string serialization overhead. |
| **Nagham (نَغَم)** | `نغم` (Harmonic Pitch) | **Acoustic Out-of-Band SAS Verification**: Maps public key fingerprints to DTMF tone sequences synthesized via Web Audio and decoded via the **Goertzel Algorithm**. |
| **Al-Ikhfa (الإِخْفَاء)** | `خفي` (Concealment) | **Geometric Bucket Padding**: Normalizes payloads to discrete power-of-2 boundaries (256B, 1KB, 4KB) to resist packet-size traffic analysis. |
| **Al-Mizan (المِيزَان)** | `وزن` (Equilibrium) | **Micro-Proof-of-Work**: In-band hash puzzle nonce attached to packets for spam deterrence in permissionless mesh channels. |
| **Tabur (تَابُور)** | `طبر / تبر` (Queue Storage) | **Offline Resilient Queue**: Stages staged messages during network dropouts and flushes chronologically upon reconnection. |
| **Sawt (صَوْت)** | `صوت` (Voice Transport) | **Opus 48kHz Audio Notes & WebRTC DTLS-SRTP Calls**: Direct peer-to-peer encrypted audio and video calling. |
| **Majlis (مَجْلِس)** | `جلس` (Space & Council) | **Decentralized Spaces & Channels**: Topic-scoped message streams with public mesh gossip and private E2EE DMs. |
| **Lisan (لِسَان)** | `لسن` (Digital Lexicon) | **Embedded Protocol Lexicon**: Real-time interactive in-app dictionary and diagnostic telemetry mapped from *Ibn Manzur\x27s Lisan al-Arab*. |

---

## ⚡ What is Implemented vs. What is Roadmap

### ✅ Fully Implemented & Tested in Code:
- Browser-native **WebCrypto (`window.crypto.subtle`)** client-side encryption.
- **End-to-End Encrypted Direct Messages (DMs)**: Zero-knowledge relaying where the server sees only ciphertext.
- **Thaqb Symmetric Ratchet**: Sequential per-message key derivation with memory wiping.
- **Nagham Goertzel Decoder**: Acoustic dual-tone synthesis and discrete spectral decoding for out-of-band key cross-checks.
- **Al-Sabk Binary Framing**: Zero-copy 34-byte packed binary framing for maximum throughput.
- **WebRTC Encrypted Calls**: Direct P2P video/audio calling with mandatory browser-level DTLS-SRTP encryption.
- **PWA Support**: Installable mobile web app with custom standalone app manifest and icons.

### 📋 Roadmap / Ongoing Research:
- **Asymmetric DH Ratchet Step**: Periodic in-band DH key exchange for full bidirectional self-healing post-compromise security (Signal-style Double Ratchet).
- **Native OS TUN Interface**: Real operating system kernel TUN/TAP device driver for system-wide VPN routing.
- **Native Android/iOS Rust Bindings**: Compiling core mesh primitives into shared C/Rust libraries for mobile background services.

---

## 🧪 Automated Test Suites

The codebase includes **8 automated test suites (31/31 assertions)** covering cryptography, networking, and mathematical performance:

```bash
# Run all automated tests
npm test
```

### Included Test Suites:
1. `test/full_app_e2e_verification.js` — End-to-end WebSocket handshake, space creation, and zero-knowledge packet relay.
2. `test/e2ee_miftah_crypto_test.js` — ECDH key agreement, AES-256-GCM authenticated encryption, third-party rejection, bit-flip tamper detection, and ECDSA signature checks.
3. `test/thaqb_ratchet_test.js` — KDF message ratcheting, forward secrecy, 100-message stress test, and buffer zeroization proofs.
4. `test/nagham_goertzel_test.js` — Goertzel algorithm single-bin DFT calculation, 16/16 DTMF key accuracy, and noise rejection.
5. `test/resilience_and_speed_test.js` — Al-Ikhfa bucket padding, Al-Mizan micro-PoW rate limiting, and Tabur offline queue drainage.
6. `test/hd_video_bandwidth_math_test.js` — Mathematical verification of 60 FPS real-time frame budgets and binary bandwidth savings.
7. `test/sabk_zero_copy_test.js` — Al-Sabk packed binary frame integrity, zero byte bloat, and comparative throughput benchmarks.
8. `test/mesh_gossip_test.js` — Epidemic gossip multi-hop routing, duplicate dropping, TTL decrement, and presence heartbeat expiry.

---

## 🚀 Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Run automated test suites
npm test

# 3. Start the node
npm start
```

Access the interface in your browser at `http://localhost:5195` or your local LAN IP (e.g. `http://10.20.102.177:5195`).

---

## 📄 License
MIT © 2026 WyreSup Network
