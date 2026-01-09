/**
 * كَشْف (KASHF) - Peer Discovery
 * 
 * From Lisan al-Arab:
 * كَشَفَ: أَظْهَرَ وأَبَانَ
 * "To reveal, to make apparent"
 * 
 * Discovers other WyreSup peers on the network
 * Uses UDP broadcast for local discovery
 */

import dgram from 'dgram';
import { EventEmitter } from 'events';
import { WyreSUpIdentity } from '../utils/Identity';

// Discovery message types
export const KASHF_ANNOUNCE = 0x01;  // "I am here"
export const KASHF_QUERY = 0x02;     // "Who is there?"
export const KASHF_RESPONSE = 0x03;  // "I am here, my info"

// Discovery port
export const DISCOVERY_PORT = 5189;
export const DISCOVERY_INTERVAL = 5000;  // 5 seconds

export interface DiscoveredPeer {
    id: string;
    publicKey: string;
    address: string;
    port: number;
    lastSeen: number;
}

/**
 * كَاشِف (Kashif) - The Discoverer
 */
export class Kashif extends EventEmitter {
    private socket: dgram.Socket | null = null;
    private announceInterval: NodeJS.Timeout | null = null;
    private identity: WyreSUpIdentity | null = null;
    private peers: Map<string, DiscoveredPeer> = new Map();
    private running = false;

    /**
     * بَدْء (Bad') - Start discovery
     */
    async bad(identity: WyreSUpIdentity, listenPort: number): Promise<void> {
        if (this.running) return;

        this.identity = identity;

        return new Promise((resolve, reject) => {
            this.socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

            this.socket.on('error', (err) => {
                console.error(`[KASHF] Discovery error: ${err.message}`);
                this.emit('error', err);
            });

            this.socket.on('message', (msg, rinfo) => {
                this.handleDiscovery(msg, rinfo);
            });

            this.socket.bind(DISCOVERY_PORT, () => {
                // Enable broadcast
                this.socket!.setBroadcast(true);

                console.log(`[KASHF] كَشْف discovery on port ${DISCOVERY_PORT}`);
                this.running = true;

                // Start periodic announcements
                this.startAnnouncing(listenPort);

                resolve();
            });
        });
    }

    /**
     * وَقْف (Waqf) - Stop discovery
     */
    async waqf(): Promise<void> {
        if (!this.running) return;

        if (this.announceInterval) {
            clearInterval(this.announceInterval);
            this.announceInterval = null;
        }

        return new Promise((resolve) => {
            this.socket?.close(() => {
                this.running = false;
                console.log('[KASHF] Discovery stopped');
                resolve();
            });
        });
    }

    /**
     * Start periodic announcements
     */
    private startAnnouncing(listenPort: number): void {
        const announce = () => {
            if (!this.identity || !this.socket) return;

            const msg = this.createAnnounceMessage(listenPort);

            // Broadcast to local network
            this.socket.send(msg, DISCOVERY_PORT, '255.255.255.255', (err) => {
                if (err) {
                    console.error(`[KASHF] Broadcast error: ${err.message}`);
                }
            });
        };

        // Announce immediately
        announce();

        // Then periodically
        this.announceInterval = setInterval(announce, DISCOVERY_INTERVAL);
    }

    /**
     * Create announce message
     */
    private createAnnounceMessage(listenPort: number): Buffer {
        if (!this.identity) throw new Error('No identity');

        const idBuffer = Buffer.from(this.identity.fullId, 'utf8');
        const keyBuffer = Buffer.from(this.identity.publicKey);

        // Format: [type:1][port:2][idLen:2][id:n][keyLen:2][key:n]
        const msg = Buffer.alloc(1 + 2 + 2 + idBuffer.length + 2 + keyBuffer.length);
        let offset = 0;

        msg.writeUInt8(KASHF_ANNOUNCE, offset); offset += 1;
        msg.writeUInt16BE(listenPort, offset); offset += 2;
        msg.writeUInt16BE(idBuffer.length, offset); offset += 2;
        idBuffer.copy(msg, offset); offset += idBuffer.length;
        msg.writeUInt16BE(keyBuffer.length, offset); offset += 2;
        keyBuffer.copy(msg, offset);

        return msg;
    }

    /**
     * Handle incoming discovery message
     */
    private handleDiscovery(msg: Buffer, rinfo: dgram.RemoteInfo): void {
        if (msg.length < 5) return;

        const type = msg.readUInt8(0);

        if (type === KASHF_ANNOUNCE || type === KASHF_RESPONSE) {
            try {
                let offset = 1;
                const port = msg.readUInt16BE(offset); offset += 2;
                const idLen = msg.readUInt16BE(offset); offset += 2;
                const id = msg.slice(offset, offset + idLen).toString('utf8'); offset += idLen;
                const keyLen = msg.readUInt16BE(offset); offset += 2;
                const publicKey = msg.slice(offset, offset + keyLen).toString('base64');

                // Ignore self
                if (this.identity && id === this.identity.fullId) return;

                const peer: DiscoveredPeer = {
                    id,
                    publicKey,
                    address: rinfo.address,
                    port,
                    lastSeen: Date.now(),
                };

                const isNew = !this.peers.has(id);
                this.peers.set(id, peer);

                if (isNew) {
                    console.log(`[KASHF] Discovered: ${id} @ ${rinfo.address}:${port}`);
                    this.emit('discovered', peer);
                }

                this.emit('peer', peer);

            } catch (e) {
                // Ignore malformed messages
            }
        }
    }

    /**
     * Get all discovered peers
     */
    getPeers(): DiscoveredPeer[] {
        return Array.from(this.peers.values());
    }

    /**
     * Get peer by ID
     */
    getPeer(id: string): DiscoveredPeer | undefined {
        return this.peers.get(id);
    }
}

// Singleton
let instance: Kashif | null = null;

export function getDiscovery(): Kashif {
    if (!instance) {
        instance = new Kashif();
    }
    return instance;
}
