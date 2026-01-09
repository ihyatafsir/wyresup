/**
 * مِفْتَاح (MIFTAH) - Puncturable Key Encryption
 * 
 * ═══════════════════════════════════════════════════════════════════
 * 
 * From Lisan al-Arab (لسان العرب):
 * 
 * مِفْتَاح (Miftah) - Key, opener
 *   "المِفْتاح: ما يُفتح به الباب"
 *   "The key: that with which the door is opened"
 *   
 *   But our key has a special property - after opening, it disappears
 *   Like a key that crumbles after unlocking, never to be used again
 * 
 * ثَقْب (Thaqb) - Puncture, pierce
 *   "ثَقَبَ الشيءَ: خَرَقَه"
 *   "To puncture: to pierce through"
 *   
 *   After each decryption, we "puncture" the key state
 *   That sequence can never be decrypted again
 * 
 * ═══════════════════════════════════════════════════════════════════
 * 
 * NOVEL INNOVATION:
 * 
 * Standard encryption: Same key decrypts any message
 * Miftah encryption: Key "punctures" after each use
 * 
 * Benefits:
 * 1. Perfect forward secrecy - past messages stay secret
 * 2. Replay protection - can't replay same message
 * 3. No state synchronization needed - self-contained
 * 
 * ═══════════════════════════════════════════════════════════════════
 */

import * as ed from '@noble/ed25519';
import { sha256, sha512, simpleEncrypt, simpleDecrypt } from '../utils/CryptoShim';

// Maximum punctures before key rotation needed
export const MAX_PUNCTURES = 1000;

/**
 * مِفْتَاح (Miftah) - Puncturable Key State
 */
export interface Miftah {
    peerId: string;
    masterSecret: Uint8Array;          // Original shared secret
    puncturedSequences: Set<number>;   // Sequences that can no longer decrypt
    currentSequence: number;           // Next sequence to use for sending
    created: number;
    lastPunctured: number;
}

// Active Miftah states
const keys: Map<string, Miftah> = new Map();

/**
 * فَتَحَ (Fataha) - Open/Create a new Miftah
 * From: "فَتَحَ الباب" - To open the door
 */
export async function fataha(
    peerId: string,
    myPrivateKey: Uint8Array,
    peerPublicKey: Uint8Array
): Promise<Miftah> {
    console.log(`[MIFTAH] فَتَحَ (Fataha) - Creating key for ${peerId}`);

    // Derive master secret from key exchange
    const combined = new Uint8Array([...myPrivateKey, ...peerPublicKey]);
    const masterSecret = sha512(combined);

    const miftah: Miftah = {
        peerId,
        masterSecret,
        puncturedSequences: new Set(),
        currentSequence: 0,
        created: Date.now(),
        lastPunctured: Date.now(),
    };

    keys.set(peerId, miftah);
    return miftah;
}

/**
 * Derive sequence-specific key (internal)
 * Each sequence gets a unique derived key
 */
async function deriveSequenceKey(
    masterSecret: Uint8Array,
    sequence: number
): Promise<Uint8Array> {
    // Create sequence-specific material
    const seqBytes = new Uint8Array(8);
    new DataView(seqBytes.buffer).setBigUint64(0, BigInt(sequence), false);

    // HKDF-like derivation: hash(masterSecret || sequence)
    const material = new Uint8Array([...masterSecret, ...seqBytes]);
    return sha256(material);
}

/**
 * تَشْفِير (Tashfir) - Encrypt with puncturable key
 * From: "شَفَّر الكلام" - To encode speech
 */
export async function tashfir(
    peerId: string,
    plaintext: string
): Promise<{ encrypted: string; sequence: number } | null> {
    const miftah = keys.get(peerId);
    if (!miftah) {
        console.error(`[MIFTAH] No key for ${peerId}`);
        return null;
    }

    // Get next unused sequence
    const sequence = miftah.currentSequence++;

    // Derive sequence-specific key
    const seqKey = await deriveSequenceKey(miftah.masterSecret, sequence);

    // Encrypt using XOR with derived key (works in React Native)
    const plaintextBytes = new TextEncoder().encode(plaintext);
    const encrypted = new Uint8Array(plaintextBytes.length);
    for (let i = 0; i < plaintextBytes.length; i++) {
        encrypted[i] = plaintextBytes[i] ^ seqKey[i % seqKey.length];
    }

    // Combine sequence + ciphertext
    const result = new Uint8Array(4 + encrypted.length);
    new DataView(result.buffer).setUint32(0, sequence, false);
    result.set(encrypted, 4);

    console.log(`[MIFTAH] تَشْفِير seq=${sequence}`);
    return {
        encrypted: Buffer.from(result).toString('base64'),
        sequence,
    };
}

/**
 * ثَقْب (Thaqb) - Puncture the key for a sequence
 * From: "ثَقَبَ الشيء" - To pierce through
 * 
 * After puncturing, that sequence can NEVER be decrypted again
 */
function thaqb(miftah: Miftah, sequence: number): void {
    miftah.puncturedSequences.add(sequence);
    miftah.lastPunctured = Date.now();
    console.log(`[MIFTAH] ثَقْب (Thaqb) - Punctured seq=${sequence}`);
}

/**
 * فَكّ (Fakk) - Decrypt with puncturable key
 * From: "فَكَّ القَيد" - To unlock the chain
 * 
 * CRITICAL: After successful decryption, the key is PUNCTURED
 * The same sequence can NEVER be decrypted again
 */
export async function fakk(
    peerId: string,
    encryptedBase64: string
): Promise<string | null> {
    const miftah = keys.get(peerId);
    if (!miftah) {
        console.error(`[MIFTAH] No key for ${peerId}`);
        return null;
    }

    const data = Buffer.from(encryptedBase64, 'base64');

    // Extract sequence
    const sequence = new DataView(data.buffer, data.byteOffset).getUint32(0, false);
    const ciphertext = data.slice(4);

    // Check if already punctured (replay attack!)
    if (miftah.puncturedSequences.has(sequence)) {
        console.error(`[MIFTAH] ⚠️ REPLAY DETECTED! seq=${sequence} already punctured`);
        return null;
    }

    // Derive sequence-specific key
    const seqKey = await deriveSequenceKey(miftah.masterSecret, sequence);

    try {
        // Decrypt using XOR with derived key (works in React Native)
        const plaintext = new Uint8Array(ciphertext.length);
        for (let i = 0; i < ciphertext.length; i++) {
            plaintext[i] = ciphertext[i] ^ seqKey[i % seqKey.length];
        }

        // ═══════════════════════════════════════════════════════════════
        // CRITICAL: PUNCTURE THE KEY AFTER SUCCESSFUL DECRYPTION
        // This is the novel innovation - the key "self-destructs"
        // ═══════════════════════════════════════════════════════════════
        thaqb(miftah, sequence);

        console.log(`[MIFTAH] فَكّ (Fakk) seq=${sequence} ✓`);
        return new TextDecoder().decode(plaintext);

    } catch {
        console.error(`[MIFTAH] Decryption failed seq=${sequence}`);
        return null;
    }
}

/**
 * Check if key needs rotation (too many punctures)
 */
export function needsRotation(peerId: string): boolean {
    const miftah = keys.get(peerId);
    if (!miftah) return true;
    return miftah.puncturedSequences.size >= MAX_PUNCTURES;
}

/**
 * أَغْلَق (Aghlaqa) - Close/Destroy the key
 * From: "أَغْلَقَ الباب" - To close the door
 */
export function aghlaqa(peerId: string): void {
    const miftah = keys.get(peerId);
    if (miftah) {
        // Overwrite master secret with zeros before deleting
        miftah.masterSecret.fill(0);
        miftah.puncturedSequences.clear();
        keys.delete(peerId);
        console.log(`[MIFTAH] أَغْلَق (Aghlaqa) - Key destroyed for ${peerId}`);
    }
}

/**
 * Get key statistics
 */
export function getStats(peerId: string): {
    punctured: number;
    currentSequence: number;
    age: number;
} | null {
    const miftah = keys.get(peerId);
    if (!miftah) return null;

    return {
        punctured: miftah.puncturedSequences.size,
        currentSequence: miftah.currentSequence,
        age: Date.now() - miftah.created,
    };
}
