# WyreSup // Decentralized Cryptographic Mesh Messenger (v1.7.0)

> **WyreSup (واير سَب)** is a zero-trust, decentralized, multi-channel P2P cryptographic gossip mesh messenger built with a 13-layer protocol stack grounded in Classical Arabic algorithmic philosophy (*Lisan al-Arab*).

---

## ⚡ Core Capabilities (v1.7.0)

- **ZBAT (زَبَاط) Envelope Cryptography:** Authenticated 0-RTT ChaCha20-Poly1305 + Curve25519 ratchet forward-secrecy framing.
- **Spaces (المَجَالِس) & Multi-Channel Ghuraf (الغُرَف):** Discord-grade multi-channel spaces with text, voice lounge, and ephemeral private sessions.
- **Direct P2P Encrypted DMs (`#dm-*`):** End-to-end forward secrecy ratchet channels with 0-hop latency.
- **Nafaq P2P VPN Tunneling (نَفَق):** WireGuard-speed virtual point-to-point encrypted tunnels with SOCKS5 proxying (`127.0.0.1:1080`) and live telemetry HUD.
- **Sawt (صَوْت) & Nagham (نَغَم) Acoustic Transport:** 48kHz OPUS voice messaging with dynamic multi-bar waveform visualizers and dual-tone multi-frequency (DTMF) acoustic key exchange.
- **P2P File Transfer (نَقْل المَلَفَّات):** Base64 chunked binary transport for documents, media, and images with lightbox zoom.
- **Mobile-Responsive Aurora Cyber-Emerald Design:** 100dvh viewport resilience, slide-over navigation drawers, and dark mode aesthetics.

---

## 🛠️ Architecture Stack

| Layer | Protocol / Concept | Function |
| :--- | :--- | :--- |
| **L1** | `Barq (بَرْق)` | Raw UDP/WebSocket Packet Carrier |
| **L2** | `Naql (نَقْل)` | Unified Binary Transport Framing |
| **L3** | `ZBAT (زَبَاط)` | Envelope Security (`Zahir` + `Batin`) |
| **L4** | `Miftah (مِفْتَاح)` | Zero-RTT Forward Secrecy Ratchet |
| **L5** | `Khitam (خِتَام)` | Ed25519 Cryptographic Signatures |
| **L6** | `Nafaq (نَفَق)` | P2P Virtual IP Tunneling |
| **L7** | `Wakil (وَكِيل)` | Local SOCKS5 VPN Proxy |
| **L8** | `Hudur (حُضُور)` | Distributed Liveness & Presence |
| **L9** | `Tabur (طَابُور)` | Offline Store-and-Forward FIFO Queue |
| **L10** | `Sawt (صَوْت)` | 48kHz OPUS Voice Streaming |
| **L11** | `Nagham (نَغَم)` | Acoustic DTMF Key Exchange |
| **L12** | `Majlis (مَجْلِس)` | Decentralized Spaces & Channel Rooms |
| **L13** | `Lisan (لِسَان)` | Diagnostic Telemetry & State Lexicon |

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run automated gossip test suite
npm test

# Start the WyreSup Node
npm start
```

Default Hub runs on `http://localhost:5195`.

---

## 📄 License
MIT © 2026 WyreSup Network
