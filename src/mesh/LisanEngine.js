/**
 * WyreSup Lisan al-Arab Linguistic Engine (مُحَرِّك لِسَان العَرَب اللُّغَوِيّ و التَّشْخِيصِيّ)
 * Implements a semantic derivation engine grounded in Ibn Manzur's Lisan al-Arab (لسان العرب لابن منظور).
 * Maps classical Arabic morphological roots (جذور) to cryptographic and decentralized networking primitives.
 */

const LISAN_LEXICON = {
  // Hardened Cryptographic Roots (Lisān al-'Arab)
  tams: {
    root: "طمس",
    arabicWord: "طَمْس",
    technicalTerm: "3-Pass Active Anti-Forensics Memory Sanitization",
    layer: "Layer 3 - Anti-Forensic Memory Wipe",
    classicalDefinition: "الطَّمْسُ: اسْتِئْصالُ أَثَرِ الشيءِ ومَحْوُه حتّى لا يُرَى له رَسْمٌ ولا مَعْلَم، وفي التنزيل: {فَإِذَا النُّجُومُ طُمِسَتْ} أَي مُحِيَ نُورُها وذَهَبَ أَثَرُها.",
    mathematicalRole: "Multi-pass physical memory scrub (0xFF -> 0xAA -> CSPRNG -> 0x00) immediately eradicating ephemeral message keys from RAM.",
    status: "ACTIVE_SCRUBBED"
  },
  habk: {
    root: "حبك",
    arabicWord: "حَبْك",
    technicalTerm: "Double-Ratchet Asymmetric DH Weave (Break-In Recovery)",
    layer: "Layer 3 - Double Ratchet",
    classicalDefinition: "الحَبْكُ: إِحْكامُ الشَّدِّ وإِتْقانُ الصَّنْعَةِ وحُسْنُ تَرَدُّدِ الخُيُوطِ في النَّسِيج. وفي التنزيل: {وَالسَّمَاءِ ذَاتِ الْحُبُكِ}.",
    mathematicalRole: "Asymmetric Diffie-Hellman ratchets interleaved with symmetric KDF message chains, guaranteeing post-compromise break-in recovery.",
    status: "RATCHET_WEAVED"
  },
  sadd: {
    root: "سدد",
    arabicWord: "سَدّ",
    technicalTerm: "Strict Constant-Time Side-Channel Immunity",
    layer: "Layer 4 - Side-Channel Defense",
    classicalDefinition: "السَّدُّ: رَدْمُ الخَلَلِ وإِغْلاقُ الثَّغْرَةِ حتّى لا يَنْفُذَ منها شَيْء، وقَوْلٌ سَدِيدٌ: قاصِدٌ مُحْكَمٌ لا عَيْبَ فيه ولا مَدْخَلَ لِلشُّبْهَة.",
    mathematicalRole: "Constant-time bitwise verification (crypto.timingSafeEqual) eliminating nanosecond execution timing side-channel leaks.",
    status: "TIMING_IMMUNE"
  },
  rasd: {
    root: "رصد",
    arabicWord: "رَصْد",
    technicalTerm: "Autonomous Ingress Sentinel & Drift Monitor",
    layer: "Layer 5 - Protocol Sentinel",
    classicalDefinition: "الرَّصْدُ: التَّرَقُّبُ والانتظارُ لِلحِفْظِ والمُراقَبَةِ في مَرْصَدٍ مَنِيع. وفي التنزيل: {إِنَّ رَبَّكَ لَبِالْمِرْصَادِ}.",
    mathematicalRole: "Zero-cost clock skew bounds, hop TTL decay, and replay detection rejecting malicious packets at wire ingress.",
    status: "SENTINEL_ACTIVE"
  },
  katm: {
    root: "كتم",
    arabicWord: "كَتْم",
    technicalTerm: "Metadata Onion Masking & Mesh Sender Anonymity",
    layer: "Layer 9 - Onion Routing",
    classicalDefinition: "الكَتْمُ والكِتْمانُ: سَتْرُ الحَدِيثِ والخَبَرِ وإِخْفاؤُه في الصَّدْرِ فلا يَبْدُو منه لَفْظٌ ولا لَحْظ.",
    mathematicalRole: "Multi-layered encrypted Zahir routing headers preserving peer sender anonymity across intermediate gossip hops.",
    status: "ANONYMOUS_ROUTED"
  },

  // 14. VCWYVL & Watch Party (بَثّ المَرْئِيَّات عَبْر الرَّابِط)
  vcwyvl: {
    root: "نقل",
    arabicWord: "بَثّ مَرْئِيّ (VCWYVL)",
    technicalTerm: "Video Call With YouTube Video Link (VCWYVL)",
    layer: "Layer 13 - P2P Media Streaming",
    classicalDefinition: "النَّقْلُ والبَثُّ: إِشاعةُ الخَبَر وإِظهارُه على المَلأ. وفي اللسان: بَثَّ الشيءَ يَبُثُّه بَثّاً: أَذاعَه ونَشَرَه ليَصِل إِلى الأسْماع والأَبْصار.",
    mathematicalRole: "Synchronized P2P WebRTC SRTP video streaming pipeline rendering high-fidelity video canvas with Cyberpunk green HUD and 48kHz Web Audio destination mixing.",
    status: "ACTIVE_STREAMING"
  },

  // 1. ZBAT & Framing (الظَّهْر و البَطْن)
  zahir: {
    root: "ظهر",
    arabicWord: "ظَاهِر",
    technicalTerm: "Public Routing Envelope (Manifest Header)",
    layer: "Layer 4 - ZBAT Framing",
    classicalDefinition: "الظَّاهِرُ: خِلافُ الباطِن، وهو ما بَدا للعيان وارتفع. وفي الحديث: لكلّ آيةٍ ظَهْرٌ وبَطْنٌ، فظَهْرُها ما ظَهَرَ وتَبيَّن.",
    mathematicalRole: "Unencrypted routing header containing messageId, senderId, TTL, hops, and IV visible to mesh routers without revealing message contents.",
    status: "ACTIVE_ROUTED"
  },
  batin: {
    root: "بطن",
    arabicWord: "بَاطِن",
    technicalTerm: "Encrypted Core Payload (Concealed State)",
    layer: "Layer 4 - ZBAT Framing",
    classicalDefinition: "الباطِنُ: خِلافُ الظَّاهِرِ، وبَطَنَ الشيءُ يَبْطُنُ بُطُوناً إِذا خَفِيَ وتَسَتَّرَ وغَمُضَ عن الحواسِّ.",
    mathematicalRole: "Authenticated AES-256-GCM ciphertext container protecting confidential text, media, voice notes, and cryptographic signatures.",
    status: "ENCRYPTED_GCM"
  },

  // 2. Miftah & Aqd (المِفْتَاح و العَقْد)
  miftah: {
    root: "فتح",
    arabicWord: "مِفْتَاح",
    technicalTerm: "Key Agreement Protocol (Aqd al-Miftah)",
    layer: "Layer 3 - Miftah Security",
    classicalDefinition: "المِفْتَاحُ: ما يُفْتَحُ به البابُ والمُغْلَق، وفَتَحَ الشيءَ: أَزالَ عنه انْغِلاقَه وأَبْداه.",
    mathematicalRole: "Elliptic Curve Diffie-Hellman (ECDH P-256/Curve25519) pairwise session key derivation with SHA-256 key stretching.",
    status: "ECDH_DERIVED"
  },
  aqd: {
    root: "عقد",
    arabicWord: "عَقْد",
    technicalTerm: "Cryptographic Binding Handshake",
    layer: "Layer 10 - Aqd Handshake",
    classicalDefinition: "العَقْدُ: نَقِيضُ الحَلِّ، وعَقَدَ الحَبْلَ والبيعَ والعَهْدَ شَدَّه وأَوْثَقَه حتّى لا يَنْحَلَّ.",
    mathematicalRole: "Mutual mutual-authentication handshake establishing pairwise symmetric ratchet sessions between peer nodes.",
    status: "BOUND"
  },
  thaqb: {
    root: "ثقب",
    arabicWord: "ثَقْب",
    technicalTerm: "Forward Secrecy & Puncturable Key Erasure",
    layer: "Layer 3 - Forward Secrecy",
    classicalDefinition: "الثَّقْبُ: الخَرْقُ النافِذُ في الشيء. وثَقَبَ الشيءَ: خَرَقَه حتى نَفَذَ، فلا يعود إلى الْتِئامِه الأَوَّل.",
    mathematicalRole: "Deterministic ephemeral ratchet key erasure after message consumption, rendering past sessions immune to subsequent key compromise.",
    status: "ZEROIZED"
  },

  // 3. Nafaq & Nafadh (النَّفَق و النَّفَاذ)
  nafaq: {
    root: "نفق",
    arabicWord: "نَفَق",
    technicalTerm: "P2P Encrypted Tunneling & Port Bypass",
    layer: "Layer 11 - Nafaq Tunneling",
    classicalDefinition: "النَّفَقُ: سَرَبٌ في الأَرض مَشْتَقٌّ إِلى موضعٍ آخَرَ نافِذ، وسُمِّيَ نَفَقاً لأَنّهُ يُنْفِقُ فيه السالِكُ أَي يَمْضِي ويَخْرُجُ منه خِفْيَةً.",
    mathematicalRole: "Direct peer-to-peer authenticated tunnel routing bypassing restrictive NATs, CGNATs, and middlebox inspection.",
    status: "TUNNEL_READY"
  },
  nafadh: {
    root: "نفذ",
    arabicWord: "نَفَاذ",
    technicalTerm: "NAT Hole Punching & Traversal",
    layer: "Layer 11 - NAT Traversal",
    classicalDefinition: "نَفَذَ السَّهْمُ في الرَّمِيَّةِ نَفَاذاً: خَرَقَها وخَرَجَ من الجانِبِ الآخَرِ، وأَمْرٌ نافِذٌ: ماضٍ لا يَرُدُّهُ مانِع.",
    mathematicalRole: "ICE candidate gathering, STUN hole punching, and UDP pinhole maintenance across stateful firewalls.",
    status: "HOLE_PUNCHED"
  },

  // 4. Nagham & Sawt (النَّغَم و الصَّوْت)
  nagham: {
    root: "نغم",
    arabicWord: "نَغَم",
    technicalTerm: "DTMF Acoustic Tonal Carrier Signaling",
    layer: "Layer 13 - Acoustic Carrier",
    classicalDefinition: "النَّغَمُ والنَّغْمَةُ: حُسْنُ الصَّوْتِ في القِراءَةِ والكَلامِ والغِناءِ، وتَنَغَّمَ بِالحديث: رَتَّلَه في صَوْتٍ ذي جَرْسٍ مَوْزُون.",
    mathematicalRole: "Dual-Tone Multi-Frequency (DTMF) acoustic frequency synthesis mapping binary entropy into discrete audio frequencies (697–1633 Hz).",
    status: "SYNTHESIZED"
  },
  sawt: {
    root: "صوت",
    arabicWord: "صَوْت",
    technicalTerm: "High-Fidelity Opus Voice Stream",
    layer: "Layer 13 - Voice Transport",
    classicalDefinition: "الصَّوْتُ: جَرْسُ الكَلامِ واللَّفْظ، وهو هَواءٌ مُمْتَدٌّ يَصْدُرُ من الجَوْفِ ويَمُرُّ بالحَنِينِ والمَخارِجِ فيَتَمَيَّزُ بالحُرُوف.",
    mathematicalRole: "Opus 48kHz audio encoding with authenticated Jars identity headers and real-time WebRTC media pipeline.",
    status: "STREAMING"
  },

  // 5. Mesh & Gossip (البَثّ و السِّلْسِلَة)
  bathth: {
    root: "بثث",
    arabicWord: "بَثّ",
    technicalTerm: "Epidemic Gossip Broadcast Protocol",
    layer: "Layer 9 - Bathth Protocol",
    classicalDefinition: "بَثَّ الشيءَ يَبُثُّهُ بَثّاً: نَشَرَهُ وفَرَّقَه، وفي التنزيل العزيز: {وبَثَّ فيها من كل دابة} أَي نَشَرَ وفَرَّقَ في أَقطارِها.",
    mathematicalRole: "Decentralized epidemic gossip algorithm propagating packets across interconnected peers with O(log N) dispersion.",
    status: "EPIDEMIC_ACTIVE"
  },
  silsila: {
    root: "سلسل",
    arabicWord: "سِلْسِلَة",
    technicalTerm: "Multi-Hop Chain Relay Routing",
    layer: "Layer 9 - Relay Mesh",
    classicalDefinition: "السِّلْسِلَةُ: حَلَقٌ من حَدِيدٍ وغيره مَوْصُولٌ بعضُها ببعض، وتَسَلْسَلَ الشيءُ: اتَّصَلَ بعضُه ببعضٍ في تَتَابُعٍ مُنْتَظِم.",
    mathematicalRole: "Multi-hop deterministic forwarding with TTL decrement, loop detection via seen-caches, and hop count verification.",
    status: "HOP_CHAIN"
  },

  // 6. Presence & Identity (الحُضُور و الهُوِيَّة)
  hudur: {
    root: "حضر",
    arabicWord: "حُضُور",
    technicalTerm: "Cryptographic Mesh Presence (Hadir / Ghaib)",
    layer: "Layer 8 - Hudur Protocol",
    classicalDefinition: "الحُضُورُ: نَقِيضُ الغَيْبَةِ، وحَضَرَ يَحْضُرُ حُضُوراً إِذا شَهِدَ المكانَ وبَدَا، ورَجُلٌ حَاضِرٌ: مُقِيمٌ في الحَيِّ غيرُ غائِب.",
    mathematicalRole: "Signed heartbeat gossip announcements broadcasting online availability, public keys, and transport latency metrics.",
    status: "HADIR"
  },
  huwiyya: {
    root: "هوي",
    arabicWord: "هُوِيَّة",
    technicalTerm: "Cryptographic Persona & Key Identity",
    layer: "Layer 1 - Huwiyya Identity",
    classicalDefinition: "الهُوِيَّةُ: حَقِيقَةُ الشيءِ ومُشَخَّصُه الخاصُّ الذي لا يُشارِكُه فيه غَيْرُه، ومَصْدَرُ هُوَ كأَنّهُ الإِشارَةُ إِلى عَيْنِ الذات.",
    mathematicalRole: "Self-sovereign cryptographic identity pair (ECDH + ECDSA) binding prefix names to 8-byte public key hashes without centralized registry.",
    status: "SOVEREIGN"
  },
  wasam: {
    root: "وسم",
    arabicWord: "وَسْم",
    technicalTerm: "Zero-Leak Carrier Fingerprint & Clustering",
    layer: "Layer 6 - Wasam Discovery",
    classicalDefinition: "الوَسْمُ: الأَثَرُ والكَيُّ، ووَسَمَ الشيءَ يَسِمُهُ وَسْماً: جَعَلَ له عَلامَةً يُعْرَفُ بها دُونَ أَنْ يَكْشِفَ سِرَّه.",
    mathematicalRole: "Deterministic IP prefix and carrier clustering facilitating serverless rendezvous without exposing user IP addresses.",
    status: "CLUSTER_MAPPED"
  },

  // 7. Spaces & Governance (المَجَالِس و الغُرَف)
  majlis: {
    root: "جلس",
    arabicWord: "مَجْلِس",
    technicalTerm: "Decentralized Space / Community Rail",
    layer: "Layer 7 - Majlis Space",
    classicalDefinition: "المَجْلِسُ: موضِعُ الجُلُوسِ ومُجْتَمَعُ القَوْمِ لِلتَّحاوُرِ والمُشاوَرَة، ويُطْلَقُ على القَوْمِ الجالِسِينَ أَيْضاً.",
    mathematicalRole: "Independent cryptographic room root containing multiple channel topologies, access policies, and peer rosters.",
    status: "GOVERNED"
  },
  ghurfa: {
    root: "غرف",
    arabicWord: "غُرْفَة",
    technicalTerm: "Channel Stream (Text, Voice, Nashr)",
    layer: "Layer 7 - Ghurfa Channel",
    classicalDefinition: "الغُرْفَةُ: البِناءُ العالِي المُفْرَدُ، وفي الحديث: 'أَهلُ الجَنَّةِ يَتَراءَوْنَ أَهلَ الغُرَفِ كَما تَتَراءَوْنَ الكَوْكَبَ الدُّرِّيَّ'.",
    mathematicalRole: "Topic-scoped message stream partitioned by channel ID with independent backlog buffering and subscriber filters.",
    status: "ISOLATED"
  },

  // 8. Diagnostics & Failures (تَشْخِيص و مَوَانِع)
  mani: {
    root: "منع",
    arabicWord: "مَانِع",
    technicalTerm: "Network Firewall / Ingress Obstruction",
    layer: "Diagnostic Layer",
    classicalDefinition: "المَانِعُ: الحائِلُ الذي يَحُولُ بينَ الشيءِ وبُلوغِ غايَتِه، ومَنَعَ فُلاناً: حَجَزَهُ وحالَ بينَه وبينَ ما يُرِيد.",
    mathematicalRole: "Ingress firewall block, symmetric NAT barrier, or TCP connection timeout detection.",
    status: "DIAGNOSTIC_BARRIER"
  },
  munfasil: {
    root: "فصل",
    arabicWord: "مُنْفَصِل",
    technicalTerm: "Mesh Partition & Socket Disconnection",
    layer: "Diagnostic Layer",
    classicalDefinition: "الانْفِصالُ: انْقِطاعُ الوَصْلِ وتَفَرُّقُ المَوْصُولَيْن، ورَجُلٌ مُنْفَصِلٌ: انْقَطَعَ حَبْلُ وصْلِه عن الجَماعَة.",
    mathematicalRole: "Loss of WebSocket heartbeat or WebRTC peer connectivity triggering automatic I'adat al-Wasl retry loops.",
    status: "DIAGNOSTIC_DISCONNECTED"
  },
  takhaluq: {
    root: "خلق",
    arabicWord: "تَخَلُّق",
    technicalTerm: "Cryptographic Tamper / Signature Forgery",
    layer: "Diagnostic Layer",
    classicalDefinition: "التَّخَلُّقُ: ادِّعاءُ ما ليسَ في خُلُقِه كَذِباً وزُوراً، وتَخَلَّقَ الشيءُ: صُنِعَ زُوراً وتَلْفِيقاً لِلتَّدْلِيس.",
    mathematicalRole: "ECDSA digital signature mismatch or AES-GCM authentication tag verification failure indicating active tampering.",
    status: "DIAGNOSTIC_FORGERY_DETECTED"
  }
};

class LisanEngine {
  /**
   * Return full lexicon mapping
   */
  static getLexicon() {
    return LISAN_LEXICON;
  }

  /**
   * Search lexicon by root, Arabic word, technical term, or concept
   */
  static lookup(query) {
    if (!query || typeof query !== "string") return Object.values(LISAN_LEXICON);
    const q = query.trim().toLowerCase();
    
    return Object.entries(LISAN_LEXICON).filter(([key, item]) => {
      return key.toLowerCase().includes(q) ||
             item.root.includes(q) ||
             item.arabicWord.includes(q) ||
             item.technicalTerm.toLowerCase().includes(q) ||
             item.classicalDefinition.toLowerCase().includes(q) ||
             item.mathematicalRole.toLowerCase().includes(q);
    }).map(([key, item]) => ({ key, ...item }));
  }

  /**
   * Generate an authoritative semantic diagnostic report for telemetry
   */
  static diagnose(key, detail = "") {
    const entry = LISAN_LEXICON[key.toLowerCase()];
    if (!entry) return `[تَشْخِيص مَجْهُول] Unknown Diagnostic Code: ${key}`;

    const base = `[${entry.arabicWord} // ${entry.root}] ${entry.technicalTerm}`;
    return detail ? `${base} -> ${detail}` : base;
  }

  /**
   * Compute morphological similarity between two Arabic roots
   */
  static getRootFamily(root) {
    const cleanRoot = root.replace(/[^\u0600-\u06FF]/g, "");
    return Object.entries(LISAN_LEXICON)
      .filter(([, item]) => item.root === cleanRoot)
      .map(([key, item]) => ({ key, ...item }));
  }
}

module.exports = LisanEngine;
