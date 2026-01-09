/**
 * Lisan al-Arab Terminology Reference
 * From Hugging Face dataset: enver/lisan_al_arab_en
 * 
 * These authentic definitions guide our protocol naming
 */

export const LISAN_AL_ARAB = {
    // Protocol name
    shamsa: {
        word: 'شَمْسَة',
        root: 'شمس',
        meaning: 'The sun is well-known',
        protocol: 'Overall protocol - like sun radiating to peers',
    },

    // Lightning packets
    barq: {
        word: 'بَرْق',
        root: 'برق',
        meaning: 'Lightning of clouds',
        protocol: 'Instant packet delivery, zero wait time',
    },

    // Pulse timing
    nabd: {
        word: 'نَبْض',
        root: 'نبض',
        meaning: 'Movement of the vein (pulse)',
        protocol: 'Timing system, heartbeat keeping rhythm',
    },

    // Flow control
    sayl: {
        word: 'سَيْل',
        root: 'سيل',
        meaning: 'The water flowed, it ran',
        protocol: 'Flow control, managing stream of data',
    },

    // Puncturable key
    miftah: {
        word: 'مِفْتَاح',
        root: 'فتح',
        meaning: 'That with which the door is opened',
        protocol: 'Encryption keys that expire after use',
    },

    // Puncture
    thaqb: {
        word: 'ثَقْب',
        root: 'ثقب',
        meaning: 'Source of piercing the thing',
        protocol: 'Key puncturing - marking as used',
    },

    // Discovery
    kashf: {
        word: 'كَشْف',
        root: 'كشف',
        meaning: 'Lifting something that conceals or covers it',
        protocol: 'Peer discovery - revealing hidden peers',
    },

    // Transport
    naql: {
        word: 'نَقْل',
        root: 'نقل',
        meaning: 'To transfer from one place to another',
        protocol: 'Network transport layer',
    },

    // Connection cell
    khaliyya: {
        word: 'خَلِيَّة',
        root: 'خلي',
        meaning: 'The beehive',
        protocol: 'Peer connection - cells in a hive',
    },

    // Open/Create
    fataha: {
        word: 'فَتَحَ',
        root: 'فتح',
        meaning: 'To open the door',
        protocol: 'Creating new connection/key',
    },

    // Close/Destroy
    aghlaqa: {
        word: 'أَغْلَقَ',
        root: 'غلق',
        meaning: 'To close the door',
        protocol: 'Closing connection, destroying key',
    },

    // Send
    irsal: {
        word: 'إِرْسَال',
        root: 'رسل',
        meaning: 'To send speech/message',
        protocol: 'Sending data to peer',
    },

    // Receive
    istiqbal: {
        word: 'اِسْتِقْبَال',
        root: 'قبل',
        meaning: 'To receive/face something',
        protocol: 'Receiving data from peer',
    },

    // Encrypt
    tashfir: {
        word: 'تَشْفِير',
        root: 'شفر',
        meaning: 'To encode speech',
        protocol: 'Encrypting data',
    },

    // Decrypt
    fakk: {
        word: 'فَكّ',
        root: 'فكك',
        meaning: 'To unlock the chain',
        protocol: 'Decrypting data',
    },
};

// Export for use in code
export const TERMINOLOGY = Object.entries(LISAN_AL_ARAB).map(([key, value]) => ({
    key,
    ...value,
}));

/**
 * Error Diagnostic Terminology (تَشْخِيص الأَخْطَاء)
 * Using Lisan al-Arab roots for debugging
 */
export const LISAN_DIAGNOSTICS = {
    // Connection Issues
    manaa: {
        word: 'مَانِع',
        root: 'منع',
        meaning: 'That which prevents or obstructs',
        diagnosis: 'Network barrier, firewall, blocked port',
    },
    fusul: {
        word: 'فُصُول',
        root: 'فصل',
        meaning: 'Separation, disconnection',
        diagnosis: 'Peer dropped, connection lost',
    },
    inqitaa: {
        word: 'اِنْقِطَاع',
        root: 'قطع',
        meaning: 'Cutting off, interruption',
        diagnosis: 'Stream interrupted, timeout',
    },

    // Security Issues
    thaqbFail: {
        word: 'ثَقْب مُنِع',
        root: 'ثقب',
        meaning: 'Puncture blocked/denied',
        diagnosis: 'Replay attack detected - key already used',
    },
    takhaluq: {
        word: 'تَخَلُّق',
        root: 'خلق',
        meaning: 'Fabrication, forgery',
        diagnosis: 'Signature verification failed, forged message',
    },

    // Protocol Issues
    khataaWisal: {
        word: 'خَطَأ وِصَال',
        root: 'وصل',
        meaning: 'Connection error',
        diagnosis: 'Handshake failed, protocol mismatch',
    },
    tadakhul: {
        word: 'تَدَاخُل',
        root: 'دخل',
        meaning: 'Interference, collision',
        diagnosis: 'Packet collision, sequence conflict',
    },

    // Data Issues
    fasad: {
        word: 'فَسَاد',
        root: 'فسد',
        meaning: 'Corruption, decay',
        diagnosis: 'Data corruption, checksum mismatch',
    },
    nuqsan: {
        word: 'نُقْصَان',
        root: 'نقص',
        meaning: 'Deficiency, missing part',
        diagnosis: 'Incomplete packet, missing data',
    },
};

/**
 * Get human-readable diagnosis from Lisan terminology
 */
export function diagnose(type: keyof typeof LISAN_DIAGNOSTICS, detail?: string): string {
    const diag = LISAN_DIAGNOSTICS[type];
    const base = `[${diag.word}] ${diag.diagnosis}`;
    return detail ? `${base}: ${detail}` : base;
}

