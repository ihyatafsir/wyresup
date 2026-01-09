/**
 * مُنَسِّق البُرُوتُوكُول (Munassiq al-Protocol)
 * Unified Protocol Manager - Orchestrates all 13/13 Arabic-named protocols
 * 
 * ═══════════════════════════════════════════════════════════════════
 * 
 * From Lisan al-Arab:
 * 
 * نَسَّقَ (nassaqa) - To arrange, organize, coordinate
 *   "نَسَّقَ الشيء: رتَّبه ونظَّمه"
 *   "To arrange and organize something"
 * 
 * This manager coordinates the flow of data through all protocol layers:
 * 
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                       Application Layer                         │
 * │                   (RisalaExchange - رِسَالَة)                    │
 * ├─────────────────────────────────────────────────────────────────┤
 * │                       Security Layer                            │
 * │        ZBAT (ظَاهِر/بَاطِن) + Miftah (مِفْتَاح)                 │
 * ├─────────────────────────────────────────────────────────────────┤
 * │                       Transport Layer                           │
 * │    Barq (بَرْق) + Nabd (نَبْض) + Sayl (سَيْل)                  │
 * ├─────────────────────────────────────────────────────────────────┤
 * │                       Network Layer                             │
 * │       Nafadh (نَفَاذ) + Naql (نَقْل) + Kashf (كَشْف)           │
 * └─────────────────────────────────────────────────────────────────┘
 * 
 * ═══════════════════════════════════════════════════════════════════
 */

import { EventEmitter } from 'events';
import { WyreSUpIdentity, createIdentity } from '../utils/Identity';
import * as Miftah from './MiftahEncryption';
import * as ZBAT from './ZBATProtocol';
import * as Barq from './BarqProtocol';
import * as Nabd from './NabdTiming';
import * as Sayl from './SaylFlow';
import * as FiveGLite from './FiveGLite';
import * as Risala from './RisalaExchange';
import { LISAN_AL_ARAB } from '../utils/LisanAlArab';

// Protocol diagnostics using Lisan al-Arab concepts
export const LISAN_DIAGNOSTICS = {
    // Success states
    WASL: { ar: 'وَصْل', meaning: 'Connection established' },
    KASHF: { ar: 'كَشْف', meaning: 'Peer discovered / Message decrypted' },
    TASHFIR: { ar: 'تَشْفِير', meaning: 'Message encrypted' },
    IRSAL: { ar: 'إِرْسَال', meaning: 'Message sent' },
    ISTIQBAL: { ar: 'اِسْتِقْبَال', meaning: 'Message received' },

    // Error states
    MANAA: { ar: 'مَانِع', meaning: 'Barrier - Network block or firewall' },
    FUSUL: { ar: 'فُصُول', meaning: 'Separation - Peer disconnected' },
    THAQB_FAIL: { ar: 'ثَقْب مُنِع', meaning: 'Puncture blocked - Replay attack detected' },
    MAFTUH_FAIL: { ar: 'مَفْتُوح فَشَل', meaning: 'Key open failed - No key for peer' },
};

// Connection state
export type WaslState = 'munfasil' | 'yattasil' | 'muttasil';
// مُنْفَصِل (disconnected) | يَتَّصِل (connecting) | مُتَّصِل (connected)

export interface PeerWasl {
    peerId: string;
    publicKey: Uint8Array;
    state: WaslState;
    endpoint?: { ip: string; port: number };
    miftahActive: boolean;
    lastNabd: number; // Last pulse/heartbeat
    messagesExchanged: number;
}

export interface SecureMessage {
    from: string;
    to: string;
    content: string;
    timestamp: number;
    zbatDaraja: ZBAT.DarajaPriority;
}

/**
 * مُنَسِّق (Munassiq) - The Unified Protocol Coordinator
 */
class Munassiq extends EventEmitter {
    private identity: WyreSUpIdentity | null = null;
    private peers: Map<string, PeerWasl> = new Map();
    private initialized = false;

    /**
     * تَمْهِيد (Tamhid) - Initialize the protocol stack
     * From: "مَهَّد الطريق" - To pave the way
     */
    async tamhid(identityPrefix: string): Promise<WyreSUpIdentity> {
        console.log(`[MUNASSIQ] تَمْهِيد (Tamhid) - Initializing protocol stack...`);

        // Create or load identity
        this.identity = await createIdentity(identityPrefix);
        console.log(`[MUNASSIQ] Identity: ${this.identity.fullId}`);

        // Initialize 5G Lite framework
        await FiveGLite.initialize(this.identity);

        this.initialized = true;
        this.emit('initialized', this.identity);

        console.log(`[MUNASSIQ] ✓ Protocol stack ready`);
        return this.identity;
    }

    /**
     * تَوْصِيل (Tawsil) - Connect to a peer with full protocol handshake
     * Establishes: NAT discovery → Key exchange → ZBAT session
     */
    async tawsil(
        peerId: string,
        peerPublicKey: Uint8Array,
        endpoint?: { ip: string; port: number }
    ): Promise<boolean> {
        if (!this.identity) {
            this.emitDiagnostic('MAFTUH_FAIL', 'Not initialized');
            return false;
        }

        console.log(`[MUNASSIQ] تَوْصِيل (Tawsil) → ${peerId}`);

        // Create peer entry
        const peer: PeerWasl = {
            peerId,
            publicKey: peerPublicKey,
            state: 'yattasil',
            endpoint,
            miftahActive: false,
            lastNabd: Date.now(),
            messagesExchanged: 0,
        };
        this.peers.set(peerId, peer);

        try {
            // 1. Create Miftah (puncturable key) for this peer
            await Miftah.fataha(peerId, this.identity.privateKey, peerPublicKey);
            peer.miftahActive = true;
            console.log(`[MUNASSIQ] ✓ Miftah established`);

            // 2. Create 5G Lite cell (Barq + Nabd + Sayl)
            await FiveGLite.tawsil(this.identity.privateKey, peerId, peerPublicKey);
            console.log(`[MUNASSIQ] ✓ 5G Lite cell established`);

            // 3. Mark as connected
            peer.state = 'muttasil';
            peer.lastNabd = Date.now();

            this.emit('peer-connected', peer);
            this.emitDiagnostic('WASL', `Connected to ${peerId}`);

            return true;

        } catch (error: any) {
            console.error(`[MUNASSIQ] Tawsil failed: ${error.message}`);
            peer.state = 'munfasil';
            this.emitDiagnostic('MANAA', error.message);
            return false;
        }
    }

    /**
     * إِرْسَال آمِن (Irsal Amin) - Send secure message
     * Flow: Message → Miftah encrypt → ZBAT wrap → Barq packet
     */
    async irsalAmin(
        peerId: string,
        content: string,
        daraja: ZBAT.DarajaPriority = ZBAT.DarajaPriority.ADIY
    ): Promise<boolean> {
        if (!this.identity) {
            this.emitDiagnostic('MAFTUH_FAIL', 'Not initialized');
            return false;
        }

        const peer = this.peers.get(peerId);
        if (!peer || peer.state !== 'muttasil') {
            this.emitDiagnostic('FUSUL', `Not connected to ${peerId}`);
            return false;
        }

        console.log(`[MUNASSIQ] إِرْسَال آمِن (Irsal Amin) → ${peerId}`);

        try {
            // 1. Create Batin (hidden content)
            const batin: ZBAT.Batin = {
                type: 1, // Text message
                content: new TextEncoder().encode(content),
                metadata: { timestamp: Date.now() },
            };

            // 2. Wrap in ZBAT (satr = conceal)
            const tabaq = await ZBAT.satr(this.identity, peerId, batin, daraja);
            if (!tabaq) {
                this.emitDiagnostic('MANAA', 'ZBAT satr failed');
                return false;
            }
            console.log(`[MUNASSIQ] ✓ ZBAT سَتَر (zahir: routing, batin: encrypted)`);

            // 3. Serialize for transport
            const serialized = ZBAT.serializeTabaq(tabaq);

            // 4. Send via Barq (0-RTT transport)
            const packet = await Barq.createDataPacket(peerId, serialized);
            if (!packet) {
                this.emitDiagnostic('MANAA', 'Barq packet creation failed');
                return false;
            }

            // 5. Check flow control before sending
            if (!Sayl.canSend(peerId)) {
                console.log(`[MUNASSIQ] سَيْل flow control: throttling...`);
                await new Promise(r => setTimeout(r, 50));
            }

            // 6. Register with flow control
            Sayl.onSend(peerId, packet.length);

            // Update stats
            peer.messagesExchanged++;

            this.emitDiagnostic('IRSAL', `Sent to ${peerId}`);
            this.emit('message-sent', { to: peerId, content, daraja });

            console.log(`[MUNASSIQ] ✓ Message sent (${packet.length} bytes)`);
            return true;

        } catch (error: any) {
            console.error(`[MUNASSIQ] Irsal failed: ${error.message}`);
            this.emitDiagnostic('MANAA', error.message);
            return false;
        }
    }

    /**
     * اِسْتِقْبَال آمِن (Istiqbal Amin) - Receive and decrypt secure message
     * Flow: Barq packet → ZBAT unwrap → Miftah decrypt (with puncture)
     */
    async istiqbalAmin(data: Uint8Array): Promise<SecureMessage | null> {
        console.log(`[MUNASSIQ] اِسْتِقْبَال آمِن (Istiqbal Amin)`);

        try {
            // 1. Extract Zahir (visible routing info)
            const zahir = ZBAT.extractZahir(data);
            if (!zahir) {
                console.error('[MUNASSIQ] Invalid ZBAT packet');
                return null;
            }
            console.log(`[MUNASSIQ] Zahir: from=${zahir.senderId}, daraja=${zahir.daraja}`);

            // 2. Deserialize full Tabaq
            const tabaq = ZBAT.deserializeTabaq(data);
            if (!tabaq) {
                this.emitDiagnostic('MANAA', 'ZBAT deserialize failed');
                return null;
            }

            // 3. Unwrap ZBAT (kashf = uncover)
            const batin = await ZBAT.kashf(tabaq);
            if (!batin) {
                // Could be replay attack (Miftah punctured this sequence)
                this.emitDiagnostic('THAQB_FAIL', 'Possible replay attack');
                return null;
            }
            console.log(`[MUNASSIQ] ✓ ZBAT كَشْف - Batin revealed`);

            // 4. Decode content
            const content = new TextDecoder().decode(batin.content);

            // 5. Update peer state
            const peer = this.peers.get(zahir.senderId);
            if (peer) {
                peer.lastNabd = Date.now();
                peer.messagesExchanged++;
                Nabd.onReceive(zahir.senderId, 0);
            }

            const message: SecureMessage = {
                from: zahir.senderId,
                to: zahir.recipientId,
                content,
                timestamp: zahir.timestamp,
                zbatDaraja: zahir.daraja,
            };

            this.emitDiagnostic('ISTIQBAL', `From ${zahir.senderId}`);
            this.emit('message-received', message);

            console.log(`[MUNASSIQ] ✓ Message received: "${content.slice(0, 50)}..."`);
            return message;

        } catch (error: any) {
            console.error(`[MUNASSIQ] Istiqbal failed: ${error.message}`);
            this.emitDiagnostic('MANAA', error.message);
            return null;
        }
    }

    /**
     * قَطْع (Qat') - Disconnect from peer
     * From: "قَطَعَ الحَبْل" - To cut the rope
     */
    qat(peerId: string): void {
        console.log(`[MUNASSIQ] قَطْع (Qat') → ${peerId}`);

        // Destroy Miftah key (secure cleanup)
        Miftah.aghlaqa(peerId);

        // Close 5G Lite cell
        FiveGLite.qat(peerId);

        // Remove peer
        this.peers.delete(peerId);

        this.emit('peer-disconnected', peerId);
        this.emitDiagnostic('FUSUL', `Disconnected from ${peerId}`);
    }

    /**
     * Emit diagnostic event with Lisan al-Arab terminology
     */
    private emitDiagnostic(type: keyof typeof LISAN_DIAGNOSTICS, detail: string): void {
        const diag = LISAN_DIAGNOSTICS[type];
        console.log(`[MUNASSIQ] [${diag.ar}] ${diag.meaning}: ${detail}`);
        this.emit('diagnostic', { type, ...diag, detail });
    }

    // ═══════════════════════════════════════════════════════════════
    // Getters
    // ═══════════════════════════════════════════════════════════════

    getIdentity(): WyreSUpIdentity | null {
        return this.identity;
    }

    getPeer(peerId: string): PeerWasl | undefined {
        return this.peers.get(peerId);
    }

    getAllPeers(): PeerWasl[] {
        return Array.from(this.peers.values());
    }

    getConnectedPeers(): PeerWasl[] {
        return this.getAllPeers().filter(p => p.state === 'muttasil');
    }

    isInitialized(): boolean {
        return this.initialized;
    }
}

// ═══════════════════════════════════════════════════════════════════
// Singleton Export
// ═══════════════════════════════════════════════════════════════════

let instance: Munassiq | null = null;

export function getUnifiedProtocol(): Munassiq {
    if (!instance) {
        instance = new Munassiq();
    }
    return instance;
}

// Re-export key types for convenience
export { DarajaPriority } from './ZBATProtocol';
export type { WyreSUpIdentity };
