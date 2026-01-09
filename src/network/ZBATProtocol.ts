/**
 * ZBAT - ظَاهِر و بَاطِن (Zahir wa Batin)
 * Manifest & Hidden Dual-Layer Protocol
 * 
 * ═══════════════════════════════════════════════════════════════════
 * 
 * From Lisan al-Arab:
 * 
 * ظَهَر (zahara): خِلافُ البَطْن - "Opposite of the hidden"
 *   The manifest, exoteric, visible aspect
 * 
 * بَاطِن (batin): The hidden, esoteric, inner meaning
 *   What is concealed from view
 * 
 * غِلاف (ghilaf): الصِّوان وما اشتمل على الشيء كقَمِيص القَلْب
 *   "The sheath that envelops something, like the pericardium of the heart"
 *   Bio-inspired: protective membrane around sensitive content
 * 
 * طَبَق (tabaq): غطاء كل شيء - "Cover of everything"
 *   Universal layering concept
 * 
 * سَتَر (satr): أَخفاه - "To conceal"
 *   The action of encryption
 * 
 * ═══════════════════════════════════════════════════════════════════
 * 
 * NOVEL INNOVATION:
 * 
 * Traditional protocols: Either all encrypted (blind routing) 
 *                       or headers exposed (privacy leak)
 * 
 * ZBAT: Explicit semantic separation with philosophical grounding
 * - Zahir (ظَاهِر): What routers SHOULD see for efficient routing
 * - Batin (بَاطِن): What ONLY the recipient should access
 * - Ghilaf (غِلاف): The protective membrane between layers
 * 
 * ═══════════════════════════════════════════════════════════════════
 */

import * as Miftah from './MiftahEncryption';
import { WyreSUpIdentity } from '../utils/Identity';

// ZBAT version
export const ZBAT_VERSION = 1;

// Priority classes for Zahir layer (routing hints)
export enum DarajaPriority {
    ISTI_JAL = 0x01,    // استعجال - Urgent (voice, calls)
    ADIY = 0x02,        // عادي - Normal (text messages)
    TAKHIR = 0x03,      // تأخير - Deferred (files, media)
    KHALFIYA = 0x04,    // خلفية - Background (sync, status)
}

/**
 * ظَاهِر (Zahir) - Manifest Layer
 * What's visible for routing - NOT encrypted
 */
export interface Zahir {
    version: number;
    senderId: string;       // Who sent it
    recipientId: string;    // Who should receive it
    daraja: DarajaPriority; // Priority class
    timestamp: number;      // When sent
    ghilafSize: number;     // Size of encrypted envelope
}

/**
 * غِلاف (Ghilaf) - Envelope Layer
 * The protective membrane - encrypted wrapper
 */
export interface Ghilaf {
    miftahSequence: number; // Which Miftah key was used
    nonce: Uint8Array;      // Encryption nonce
    batin: Uint8Array;      // Encrypted Batin
    mac: Uint8Array;        // Message authentication code
}

/**
 * بَاطِن (Batin) - Hidden Layer
 * The actual content - only visible after decryption
 */
export interface Batin {
    type: number;           // Message type
    content: Uint8Array;    // Actual message content
    metadata: Record<string, any>; // Additional metadata
}

/**
 * طَبَق (Tabaq) - Complete ZBAT Packet
 * All layers combined
 */
export interface Tabaq {
    zahir: Zahir;
    ghilaf: Ghilaf;
}

// Header size constants
export const ZAHIR_SIZE = 64; // Fixed zahir header size

/**
 * سَتَر (Satr) - Conceal/Encrypt
 * Wraps batin in ghilaf
 */
export async function satr(
    identity: WyreSUpIdentity,
    recipientId: string,
    batin: Batin,
    daraja: DarajaPriority = DarajaPriority.ADIY
): Promise<Tabaq | null> {
    console.log(`[ZBAT] سَتَر (Satr) - Concealing for ${recipientId}`);

    // Serialize Batin
    const batinJson = JSON.stringify({
        type: batin.type,
        content: Buffer.from(batin.content).toString('base64'),
        metadata: batin.metadata,
    });

    // Encrypt with Miftah (puncturable key)
    const encrypted = await Miftah.tashfir(recipientId, batinJson);
    if (!encrypted) {
        console.error('[ZBAT] Miftah encryption failed');
        return null;
    }

    // Create Ghilaf (envelope)
    const encryptedBytes = new TextEncoder().encode(encrypted.encrypted);
    const ghilaf: Ghilaf = {
        miftahSequence: encrypted.sequence,
        nonce: new Uint8Array(12), // TODO: Real nonce
        batin: encryptedBytes,
        mac: new Uint8Array(16),   // TODO: Real MAC
    };

    // Create Zahir (manifest)
    const zahir: Zahir = {
        version: ZBAT_VERSION,
        senderId: identity.fullId,
        recipientId,
        daraja,
        timestamp: Date.now(),
        ghilafSize: encryptedBytes.length,
    };

    console.log(`[ZBAT] ✓ Tabaq created (zahir: ${ZAHIR_SIZE}b, ghilaf: ${encryptedBytes.length}b)`);

    return { zahir, ghilaf };
}

/**
 * كَشَف (Kashf) - Uncover/Decrypt
 * Unwraps ghilaf to reveal batin
 * 
 * From Lisan al-Arab: "رفعُك الشيء عما يُواريه ويغطّيه"
 * "Lifting something that conceals or covers it"
 */
export async function kashf(
    tabaq: Tabaq
): Promise<Batin | null> {
    console.log(`[ZBAT] كَشَف (Kashf) - Uncovering from ${tabaq.zahir.senderId}`);

    // Decrypt with Miftah
    const encryptedStr = new TextDecoder().decode(tabaq.ghilaf.batin);
    const decrypted = await Miftah.fakk(tabaq.zahir.senderId, encryptedStr);

    if (!decrypted) {
        console.error('[ZBAT] كَشَف failed (replay attack or wrong key?)');
        return null;
    }

    try {
        const parsed = JSON.parse(decrypted);
        const batin: Batin = {
            type: parsed.type,
            content: Buffer.from(parsed.content, 'base64'),
            metadata: parsed.metadata || {},
        };

        console.log(`[ZBAT] ✓ بَاطِن revealed (${batin.content.length} bytes)`);
        return batin;

    } catch (e) {
        console.error('[ZBAT] Failed to parse batin');
        return null;
    }
}

/**
 * Serialize Tabaq for transmission
 */
export function serializeTabaq(tabaq: Tabaq): Uint8Array {
    const zahirJson = JSON.stringify(tabaq.zahir);
    const zahirBytes = new TextEncoder().encode(zahirJson);

    // Format: [zahirLen:4][zahir:n][ghilaf:m]
    const ghilafJson = JSON.stringify({
        miftahSequence: tabaq.ghilaf.miftahSequence,
        nonce: Buffer.from(tabaq.ghilaf.nonce).toString('base64'),
        batin: Buffer.from(tabaq.ghilaf.batin).toString('base64'),
        mac: Buffer.from(tabaq.ghilaf.mac).toString('base64'),
    });
    const ghilafBytes = new TextEncoder().encode(ghilafJson);

    const result = new Uint8Array(4 + zahirBytes.length + ghilafBytes.length);
    new DataView(result.buffer).setUint32(0, zahirBytes.length, false);
    result.set(zahirBytes, 4);
    result.set(ghilafBytes, 4 + zahirBytes.length);

    return result;
}

/**
 * Deserialize Tabaq from transmission
 */
export function deserializeTabaq(data: Uint8Array): Tabaq | null {
    try {
        const zahirLen = new DataView(data.buffer, data.byteOffset).getUint32(0, false);
        const zahirJson = new TextDecoder().decode(data.slice(4, 4 + zahirLen));
        const ghilafJson = new TextDecoder().decode(data.slice(4 + zahirLen));

        const zahir = JSON.parse(zahirJson) as Zahir;
        const ghilafParsed = JSON.parse(ghilafJson);

        const ghilaf: Ghilaf = {
            miftahSequence: ghilafParsed.miftahSequence,
            nonce: Buffer.from(ghilafParsed.nonce, 'base64'),
            batin: Buffer.from(ghilafParsed.batin, 'base64'),
            mac: Buffer.from(ghilafParsed.mac, 'base64'),
        };

        return { zahir, ghilaf };
    } catch {
        return null;
    }
}

/**
 * Extract only Zahir without decrypting (for routing)
 * This is the key feature: routers can read zahir without seeing batin
 */
export function extractZahir(data: Uint8Array): Zahir | null {
    try {
        const zahirLen = new DataView(data.buffer, data.byteOffset).getUint32(0, false);
        const zahirJson = new TextDecoder().decode(data.slice(4, 4 + zahirLen));
        return JSON.parse(zahirJson) as Zahir;
    } catch {
        return null;
    }
}
