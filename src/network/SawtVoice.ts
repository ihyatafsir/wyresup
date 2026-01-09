/**
 * صَوْت (SAWT) - Voice Message Handler
 * 
 * From Lisan al-Arab (original Arabic):
 * الصَّوتُ: الجَرْسُ، معروف
 * "Al-sawt: the ringing/tone, well-known"
 * 
 * Key insight: صوت is connected to جَرْسُ (jars) - 
 * the distinctive ring/tone that makes something recognizable.
 * 
 * This shapes our voice design:
 * - Voice carries the person's unique "jars" (tone signature)
 * - It should be recognizable - you know who's speaking
 * - Quality matters less than authenticity of the signature
 * 
 * Implementation uses Opus codec for efficient voice:
 * - Low latency
 * - Good quality at low bitrates
 * - Handles speech well (unlike music codecs)
 */

import * as Miftah from './MiftahEncryption';
import { RisalaType } from './RisalaExchange';
import { WyreSUpIdentity } from '../utils/Identity';

// Voice message configuration
export const SAWT_CONFIG = {
    sampleRate: 16000,      // 16kHz for speech
    channels: 1,            // Mono
    bitrate: 24000,         // 24kbps for good quality
    frameSize: 20,          // 20ms frames
    maxDuration: 60,        // Max 60 seconds
};

// Voice message metadata
export interface SawtMessage {
    id: string;
    senderId: string;
    recipientId: string;
    timestamp: number;
    duration: number;       // In seconds
    audioData: Uint8Array;  // Encrypted audio
    waveform: number[];     // For visual display
}

// Recording state
export interface TasjilState {
    isRecording: boolean;
    startTime: number;
    duration: number;
    audioChunks: Uint8Array[];
    waveform: number[];
}

// Active recording
let currentRecording: TasjilState | null = null;

/**
 * بَدْء التَّسْجِيل (Bad' al-Tasjil) - Start recording
 * تسجيل from سجل - to record/register
 */
export function badTasjil(): boolean {
    if (currentRecording) {
        console.warn('[SAWT] Already recording');
        return false;
    }

    currentRecording = {
        isRecording: true,
        startTime: Date.now(),
        duration: 0,
        audioChunks: [],
        waveform: [],
    };

    console.log('[SAWT] بَدْء التَّسْجِيل - Recording started');

    // TODO: Start actual audio capture
    // In React Native, would use react-native-audio-api

    return true;
}

/**
 * إِيقَاف التَّسْجِيل (Iqaf al-Tasjil) - Stop recording
 */
export function iqafTasjil(): Uint8Array | null {
    if (!currentRecording) {
        console.warn('[SAWT] Not recording');
        return null;
    }

    currentRecording.isRecording = false;
    currentRecording.duration = (Date.now() - currentRecording.startTime) / 1000;

    console.log(`[SAWT] إِيقَاف - Stopped (${currentRecording.duration.toFixed(1)}s)`);

    // Combine all chunks
    const totalLength = currentRecording.audioChunks.reduce((sum, c) => sum + c.length, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of currentRecording.audioChunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
    }

    const result = combined;
    currentRecording = null;

    return result;
}

/**
 * إِرْسَال صَوْت (Irsal Sawt) - Send voice message
 * The صوت carries the جَرْسُ (unique tone) of the sender
 */
export async function irsalSawt(
    identity: WyreSUpIdentity,
    recipientId: string,
    audioData: Uint8Array
): Promise<SawtMessage | null> {
    console.log(`[SAWT] إِرْسَال صَوْت → ${recipientId}`);

    // Generate waveform for visual display
    const waveform = generateWaveform(audioData);

    // Encrypt with Miftah
    const audioB64 = Buffer.from(audioData).toString('base64');
    const encrypted = await Miftah.tashfir(recipientId, audioB64);
    if (!encrypted) {
        console.error('[SAWT] Encryption failed');
        return null;
    }

    const message: SawtMessage = {
        id: `sawt-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        senderId: identity.fullId,
        recipientId,
        timestamp: Date.now(),
        duration: audioData.length / (SAWT_CONFIG.sampleRate * 2), // 16-bit audio
        audioData: new TextEncoder().encode(encrypted.encrypted),
        waveform,
    };

    console.log(`[SAWT] ✓ Voice message ready (${message.duration.toFixed(1)}s)`);

    return message;
}

/**
 * اِسْتِمَاع (Istima') - Listen/Receive voice message
 * From سمع - to hear, distinguished from just receiving
 * Hearing implies understanding the جَرْس (tone) of the sender
 */
export async function istima(
    senderId: string,
    encryptedAudio: Uint8Array
): Promise<Uint8Array | null> {
    console.log(`[SAWT] اِسْتِمَاع ← ${senderId}`);

    // Decrypt with Miftah
    const encryptedStr = new TextDecoder().decode(encryptedAudio);
    const decryptedB64 = await Miftah.fakk(senderId, encryptedStr);

    if (!decryptedB64) {
        console.error('[SAWT] Decryption failed (replay?)');
        return null;
    }

    const audioData = Buffer.from(decryptedB64, 'base64');
    console.log(`[SAWT] ✓ Voice received (${audioData.length} bytes)`);

    return new Uint8Array(audioData);
}

/**
 * Generate waveform for visual display
 * Shows the جَرْس (rhythmic pattern) of the voice
 */
function generateWaveform(audioData: Uint8Array, bars: number = 50): number[] {
    const waveform: number[] = [];
    const samplesPerBar = Math.floor(audioData.length / bars);

    for (let i = 0; i < bars; i++) {
        let sum = 0;
        const start = i * samplesPerBar;
        const end = Math.min(start + samplesPerBar, audioData.length);

        for (let j = start; j < end; j++) {
            sum += Math.abs(audioData[j] - 128); // Assuming 8-bit unsigned
        }

        // Normalize to 0-1
        const avg = sum / (end - start);
        waveform.push(avg / 128);
    }

    return waveform;
}

/**
 * Get current recording state
 */
export function getRecordingState(): TasjilState | null {
    return currentRecording;
}

/**
 * Check if currently recording
 */
export function isRecording(): boolean {
    return currentRecording?.isRecording || false;
}
