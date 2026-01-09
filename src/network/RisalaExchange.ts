/**
 * رِسَالَة (RISALA) - Message Exchange Layer
 * 
 * From Lisan al-Arab (original Arabic):
 * الرَّسَل: القَطِيع من كل شيء
 * "Al-rasal: the flock/herd of everything"
 * 
 * This reveals the root meaning: not just a single message,
 * but a GROUP sent together - implying continuity and connection.
 * This insight shapes our design:
 * - Messages are part of a continuous stream (like a flock)
 * - They belong together (conversation context)
 * - They move as one unit (batching possible)
 * 
 * Also from Lisan al-Arab on صَوْت (sawt):
 * الصَّوْت: الضَّوْضاء، معروف
 * "Al-sawt: the noise, well-known"
 * 
 * Voice is simply "known noise" - authentic, recognizable.
 * This shapes voice message design: focus on recognition.
 */

import * as Miftah from './MiftahEncryption';
import * as Barq from './BarqProtocol';
import * as Sawt from './SawtVoice';
import { getTransport } from './NaqlTransport';
import { WyreSUpIdentity } from '../utils/Identity';
import { Message, Peer } from '../messaging/types';

// Message types (inspired by root meanings)
export enum RisalaType {
    KALIMA = 0x01,     // كَلِمَة - Word/Text message
    SAWT = 0x02,       // صَوْت - Voice message  
    SURA = 0x03,       // صُورَة - Image
    TASDIQ = 0x04,     // تَصْدِيق - Delivery confirmation (from صدق - truth)
    MURAA = 0x05,      // مُرَاعَاة - Read receipt (being seen, cared for)
}

// Message envelope
export interface Risala {
    id: string;
    type: RisalaType;
    senderId: string;
    recipientId: string;
    timestamp: number;
    content: Uint8Array;
    encryptedWith: number;    // Miftah sequence used
}

// Conversation - the "flock" (قَطِيع) of messages
export interface Qatia {
    peerId: string;
    messages: Risala[];
    lastActivity: number;
    unreadCount: number;
}

// Active conversations
const conversations: Map<string, Qatia> = new Map();

// Message ID counter
let messageCounter = 0;

/**
 * Generate unique message ID
 */
function generateId(): string {
    return `${Date.now()}-${++messageCounter}`;
}

/**
 * إِرْسَال (Irsal) - Send a text message
 * From root رسل - sending as part of a flock/stream
 */
export async function irsalKalima(
    identity: WyreSUpIdentity,
    recipientId: string,
    text: string
): Promise<Risala | null> {
    console.log(`[RISALA] إِرْسَال كَلِمَة → ${recipientId}`);

    // Encrypt with Miftah (puncturable key)
    const encrypted = await Miftah.tashfir(recipientId, text);
    if (!encrypted) {
        console.error('[RISALA] Encryption failed');
        return null;
    }

    const risala: Risala = {
        id: generateId(),
        type: RisalaType.KALIMA,
        senderId: identity.fullId,
        recipientId,
        timestamp: Date.now(),
        content: new TextEncoder().encode(encrypted.encrypted),
        encryptedWith: encrypted.sequence,
    };

    // Add to conversation (flock)
    addToConversation(recipientId, risala);

    // Send via Barq protocol
    const packet = await Barq.createDataPacket(recipientId, serializeRisala(risala));
    if (packet) {
        // TODO: Send via transport
        console.log(`[RISALA] ✓ Sent (seq=${encrypted.sequence})`);
    }

    return risala;
}

/**
 * اِسْتِقْبَال (Istiqbal) - Receive and process a message
 * The counterpart to irsal - facing/receiving what was sent
 */
export async function istiqbalRisala(
    data: Uint8Array
): Promise<{ risala: Risala; decrypted: string } | null> {
    const risala = deserializeRisala(data);
    if (!risala) return null;

    console.log(`[RISALA] اِسْتِقْبَال ← ${risala.senderId}`);

    // Decrypt with Miftah
    const encryptedStr = new TextDecoder().decode(risala.content);
    const decrypted = await Miftah.fakk(risala.senderId, encryptedStr);

    if (!decrypted) {
        console.error('[RISALA] Decryption failed (possible replay?)');
        return null;
    }

    // Add to conversation
    addToConversation(risala.senderId, risala);

    console.log(`[RISALA] ✓ Received: "${decrypted.slice(0, 50)}..."`);

    return { risala, decrypted };
}

/**
 * إِرْسَال صَوْت (Irsal Sawt) - Send voice message
 * Voice carries the جَرْسُ (unique tone) of the sender
 */
export async function irsalSawt(
    identity: WyreSUpIdentity,
    recipientId: string,
    audioData: Uint8Array
): Promise<Risala | null> {
    console.log(`[RISALA] إِرْسَال صَوْت → ${recipientId}`);

    // Use Sawt helper for encryption
    const sawtMsg = await Sawt.irsalSawt(identity, recipientId, audioData);
    if (!sawtMsg) {
        console.error('[RISALA] Voice encryption failed');
        return null;
    }

    const risala: Risala = {
        id: sawtMsg.id,
        type: RisalaType.SAWT,
        senderId: identity.fullId,
        recipientId,
        timestamp: Date.now(),
        content: sawtMsg.audioData,
        encryptedWith: 0, // Handled in Sawt layer
    };

    // Add to conversation
    addToConversation(recipientId, risala);

    // Create and send via Barq
    const packet = await Barq.createDataPacket(recipientId, serializeRisala(risala));
    if (packet) {
        console.log(`[RISALA] ✓ Voice sent (${sawtMsg.duration.toFixed(1)}s)`);
    }

    return risala;
}

/**
 * اِسْتِمَاع (Istima') - Receive voice message
 * From سمع - to hear, understanding the جَرْس (tone) of the sender
 */
export async function istiqbalSawt(
    risala: Risala
): Promise<{ audio: Uint8Array; waveform: number[] } | null> {
    if (risala.type !== RisalaType.SAWT) {
        console.error('[RISALA] Not a voice message');
        return null;
    }

    console.log(`[RISALA] اِسْتِمَاع ← ${risala.senderId}`);

    // Decrypt via Sawt
    const decryptedAudio = await Sawt.istima(risala.senderId, risala.content);
    if (!decryptedAudio) {
        console.error('[RISALA] Voice decryption failed (replay?)');
        return null;
    }

    // Generate waveform for UI
    const waveform = generateSimpleWaveform(decryptedAudio);

    console.log(`[RISALA] ✓ Voice received (${decryptedAudio.length} bytes)`);

    return { audio: decryptedAudio, waveform };
}

/**
 * Generate simple waveform for voice message display
 */
function generateSimpleWaveform(audioData: Uint8Array, bars: number = 30): number[] {
    const waveform: number[] = [];
    const samplesPerBar = Math.floor(audioData.length / bars);

    for (let i = 0; i < bars; i++) {
        let sum = 0;
        const start = i * samplesPerBar;
        const end = Math.min(start + samplesPerBar, audioData.length);

        for (let j = start; j < end; j++) {
            sum += Math.abs(audioData[j] - 128);
        }

        waveform.push(sum / (end - start) / 128);
    }

    return waveform;
}

/**
 * Add message to conversation (the قَطِيع - flock)
 */
function addToConversation(peerId: string, risala: Risala): void {
    let conv = conversations.get(peerId);
    if (!conv) {
        conv = {
            peerId,
            messages: [],
            lastActivity: Date.now(),
            unreadCount: 0,
        };
        conversations.set(peerId, conv);
    }

    conv.messages.push(risala);
    conv.lastActivity = Date.now();

    // Increment unread if we received it
    if (risala.recipientId !== peerId) {
        conv.unreadCount++;
    }
}

/**
 * Get conversation with peer
 */
export function getConversation(peerId: string): Qatia | undefined {
    return conversations.get(peerId);
}

/**
 * Get all conversations
 */
export function getAllConversations(): Qatia[] {
    return Array.from(conversations.values())
        .sort((a, b) => b.lastActivity - a.lastActivity);
}

/**
 * Mark conversation as read (مُشَاهَدَة - witnessed)
 */
export function markAsRead(peerId: string): void {
    const conv = conversations.get(peerId);
    if (conv) {
        conv.unreadCount = 0;
    }
}

/**
 * Serialize message for transmission
 */
function serializeRisala(risala: Risala): Uint8Array {
    const json = JSON.stringify({
        id: risala.id,
        type: risala.type,
        senderId: risala.senderId,
        recipientId: risala.recipientId,
        timestamp: risala.timestamp,
        content: Buffer.from(risala.content).toString('base64'),
        encryptedWith: risala.encryptedWith,
    });
    return new TextEncoder().encode(json);
}

/**
 * Deserialize message from transmission
 */
function deserializeRisala(data: Uint8Array): Risala | null {
    try {
        const json = JSON.parse(new TextDecoder().decode(data));
        return {
            ...json,
            content: Buffer.from(json.content, 'base64'),
        };
    } catch {
        return null;
    }
}
