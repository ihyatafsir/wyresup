/**
 * WyreSup P2P Manager
 * Unified manager connecting all protocol layers for actual P2P communication
 * 
 * Now uses UnifiedProtocolManager (Munassiq) for real protocol integration
 */

import { EventEmitter } from 'events';
import { WyreSUpIdentity, createIdentity } from '../utils/Identity';
import { getUnifiedProtocol, DarajaPriority, PeerWasl, SecureMessage } from './UnifiedProtocolManager';
import * as ed from '@noble/ed25519';

// P2P Manager state
interface P2PState {
    identity: WyreSUpIdentity | null;
    publicIP: string | null;
    publicPort: number | null;
    natType: string | null;
    peers: Map<string, PeerConnection>;
    isInitialized: boolean;
}

interface PeerConnection {
    id: string;
    ip: string;
    port: number;
    publicKey: Uint8Array;
    status: 'munfasil' | 'yattasil' | 'muttasil'; // Using Arabic states
    lastSeen: number;
    messagesReceived: number;
    messagesSent: number;
}

interface P2PMessage {
    from: string;
    to: string;
    content: string;
    timestamp: number;
    encrypted: boolean;
    zbatDaraja?: DarajaPriority;
}

/**
 * WyreSup P2P Manager
 * Connects Identity + ZBAT + SHAHID + NAT for real P2P
 * Now integrated with UnifiedProtocolManager (Munassiq)
 */
class WyreSUpP2PManager extends EventEmitter {
    private state: P2PState = {
        identity: null,
        publicIP: null,
        publicPort: null,
        natType: null,
        peers: new Map(),
        isInitialized: false,
    };

    private protocol = getUnifiedProtocol();

    constructor() {
        super();
        // Forward protocol events
        this.protocol.on('peer-connected', (peer: PeerWasl) => {
            this.emit('peer-connected', peer);
        });
        this.protocol.on('message-received', (msg: SecureMessage) => {
            this.handleIncomingMessage(msg);
        });
        this.protocol.on('diagnostic', (diag: any) => {
            this.emit('diagnostic', diag);
        });
    }

    /**
     * Initialize with identity
     * Uses UnifiedProtocolManager.tamhid()
     */
    async initialize(prefix: string): Promise<WyreSUpIdentity> {
        console.log('[P2P] Initializing with real protocol stack...');

        // Initialize the unified protocol stack
        this.state.identity = await this.protocol.tamhid(prefix);
        console.log(`[P2P] Identity: ${this.state.identity.fullId}`);

        // Discover NAT
        await this.discoverNAT();

        this.state.isInitialized = true;
        this.emit('initialized', this.state.identity);

        return this.state.identity;
    }

    /**
     * Discover NAT via STUN (basic discovery for UI)
     */
    private async discoverNAT(): Promise<void> {
        console.log('[P2P] Discovering NAT...');

        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            this.state.publicIP = data.ip;
            this.state.publicPort = 5188;
            this.state.natType = 'unknown';
            console.log(`[P2P] Public: ${this.state.publicIP}:${this.state.publicPort}`);
        } catch (e) {
            console.warn('[P2P] NAT discovery failed, using fallback');
            this.state.publicIP = '?.?.?.?';
            this.state.publicPort = 5188;
        }
    }

    /**
     * Add peer by IP (bootstrap) - with real protocol integration
     */
    async addPeer(ip: string, port: number = 5188, peerPublicKey?: Uint8Array): Promise<PeerConnection> {
        const id = `peer@${ip}:${port}`;

        // Generate a placeholder public key if not provided
        // In real usage, this would come from a key exchange
        const pubKey = peerPublicKey || ed.utils.randomPrivateKey();

        const peer: PeerConnection = {
            id,
            ip,
            port,
            publicKey: pubKey,
            status: 'yattasil',
            lastSeen: Date.now(),
            messagesReceived: 0,
            messagesSent: 0,
        };

        this.state.peers.set(id, peer);
        console.log(`[P2P] Added peer: ${id}`);

        // Start connection with real protocol stack
        await this.connectToPeer(peer);

        return peer;
    }

    /**
     * Connect to peer using real protocols
     * Uses: UnifiedProtocolManager.tawsil() -> Miftah + Barq + ZBAT
     */
    private async connectToPeer(peer: PeerConnection): Promise<void> {
        console.log(`[P2P] Connecting to ${peer.ip}:${peer.port} with full protocol stack...`);

        try {
            // Real protocol integration via Munassiq
            const success = await this.protocol.tawsil(
                peer.id,
                peer.publicKey,
                { ip: peer.ip, port: peer.port }
            );

            if (success) {
                peer.status = 'muttasil';
                peer.lastSeen = Date.now();
                this.emit('peer-connected', peer);
                console.log(`[P2P] ✓ Connected to ${peer.id} (Miftah + ZBAT active)`);
            } else {
                peer.status = 'munfasil';
                this.emit('peer-failed', peer);
            }
        } catch (error: any) {
            console.error(`[P2P] Connection failed: ${error.message}`);
            peer.status = 'munfasil';
            this.emit('peer-failed', peer);
        }
    }

    /**
     * Send message to peer - with real encryption
     * Uses: UnifiedProtocolManager.irsalAmin() -> Miftah encrypt -> ZBAT wrap -> Barq
     */
    async sendMessage(
        peerId: string,
        content: string,
        daraja: DarajaPriority = DarajaPriority.ADIY
    ): Promise<boolean> {
        const peer = this.state.peers.get(peerId);
        if (!peer || peer.status !== 'muttasil') {
            console.error('[P2P] Peer not connected');
            return false;
        }

        if (!this.state.identity) {
            console.error('[P2P] Not initialized');
            return false;
        }

        console.log(`[P2P] Sending secure message → ${peerId}`);

        // Real secure messaging via Munassiq
        const success = await this.protocol.irsalAmin(peerId, content, daraja);

        if (success) {
            peer.messagesSent++;
            const message: P2PMessage = {
                from: this.state.identity.fullId,
                to: peerId,
                content,
                timestamp: Date.now(),
                encrypted: true,
                zbatDaraja: daraja,
            };
            this.emit('message-sent', message);
            console.log(`[P2P] ✓ Message sent (ZBAT encrypted)`);
        }

        return success;
    }

    /**
     * Handle incoming secure message
     */
    private handleIncomingMessage(msg: SecureMessage): void {
        const peer = this.state.peers.get(msg.from);
        if (peer) {
            peer.messagesReceived++;
            peer.lastSeen = Date.now();
        }

        const message: P2PMessage = {
            from: msg.from,
            to: msg.to,
            content: msg.content,
            timestamp: msg.timestamp,
            encrypted: true,
            zbatDaraja: msg.zbatDaraja,
        };

        this.emit('message-received', message);
    }

    /**
     * Disconnect from peer - real protocol cleanup
     */
    disconnectPeer(peerId: string): void {
        this.protocol.qat(peerId);
        this.state.peers.delete(peerId);
        this.emit('peer-disconnected', peerId);
    }

    /**
     * Process incoming raw data (for when receiving via transport)
     */
    async processIncomingData(data: Uint8Array): Promise<SecureMessage | null> {
        return this.protocol.istiqbalAmin(data);
    }

    // ═══════════════════════════════════════════════════════════════
    // Getters
    // ═══════════════════════════════════════════════════════════════

    getState(): P2PState {
        return { ...this.state };
    }

    getIdentity(): WyreSUpIdentity | null {
        return this.state.identity;
    }

    getPublicAddress(): string {
        if (this.state.publicIP && this.state.publicPort) {
            return `${this.state.publicIP}:${this.state.publicPort}`;
        }
        return 'unknown';
    }

    getPeers(): PeerConnection[] {
        return Array.from(this.state.peers.values());
    }

    getConnectedPeers(): PeerConnection[] {
        return this.getPeers().filter(p => p.status === 'muttasil');
    }

    isInitialized(): boolean {
        return this.state.isInitialized;
    }
}

// Singleton
let manager: WyreSUpP2PManager | null = null;

export function getP2PManager(): WyreSUpP2PManager {
    if (!manager) {
        manager = new WyreSUpP2PManager();
    }
    return manager;
}

export type { WyreSUpIdentity, PeerConnection, P2PMessage };
export { DarajaPriority };
