/**
 * نَقْل (NAQL) - Network Transport Layer
 * 
 * From Lisan al-Arab:
 * نَقَلَ الشَّيْءَ: حَوَّلَهُ مِنْ مَوْضِعٍ إِلى مَوْضِع
 * "To transfer something from one place to another"
 * 
 * This module handles actual UDP socket communication
 * Bridges Barq protocol to real network packets
 */

import dgram from 'dgram';
import { EventEmitter } from 'events';

// Default ports
export const DEFAULT_LISTEN_PORT = 5188;  // 5G = 5, Lite = 188
export const DEFAULT_DISCOVERY_PORT = 5189;

export interface NaqlConfig {
    listenPort: number;
    discoveryPort: number;
    bindAddress?: string;
}

export interface NaqlPeer {
    id: string;
    address: string;
    port: number;
    lastSeen: number;
}

/**
 * نَاقِل (Naqil) - The Transporter
 * Handles UDP socket operations
 */
export class Naqil extends EventEmitter {
    private socket: dgram.Socket | null = null;
    private discoverySocket: dgram.Socket | null = null;
    private config: NaqlConfig;
    private peers: Map<string, NaqlPeer> = new Map();
    private running = false;

    constructor(config: Partial<NaqlConfig> = {}) {
        super();
        this.config = {
            listenPort: config.listenPort || DEFAULT_LISTEN_PORT,
            discoveryPort: config.discoveryPort || DEFAULT_DISCOVERY_PORT,
            bindAddress: config.bindAddress || '0.0.0.0',
        };
    }

    /**
     * فَتْح (Fath) - Open the transport
     */
    async fath(): Promise<void> {
        if (this.running) return;

        return new Promise((resolve, reject) => {
            // Main data socket
            this.socket = dgram.createSocket('udp4');

            this.socket.on('error', (err) => {
                console.error(`[NAQL] Socket error: ${err.message}`);
                this.emit('error', err);
            });

            this.socket.on('message', (msg, rinfo) => {
                this.handleMessage(msg, rinfo);
            });

            this.socket.bind(this.config.listenPort, this.config.bindAddress, () => {
                console.log(`[NAQL] نَقْل listening on ${this.config.bindAddress}:${this.config.listenPort}`);
                this.running = true;
                resolve();
            });
        });
    }

    /**
     * إِغْلاق (Ighlaq) - Close the transport
     */
    async ighlaq(): Promise<void> {
        if (!this.running) return;

        return new Promise((resolve) => {
            this.socket?.close(() => {
                this.discoverySocket?.close(() => {
                    this.running = false;
                    console.log('[NAQL] Transport closed');
                    resolve();
                });
            });
        });
    }

    /**
     * إِرْسَال (Irsal) - Send data to peer
     */
    async irsal(peerId: string, data: Buffer): Promise<boolean> {
        const peer = this.peers.get(peerId);
        if (!peer || !this.socket) {
            console.error(`[NAQL] No peer or socket: ${peerId}`);
            return false;
        }

        return new Promise((resolve) => {
            this.socket!.send(data, peer.port, peer.address, (err) => {
                if (err) {
                    console.error(`[NAQL] Send error: ${err.message}`);
                    resolve(false);
                } else {
                    resolve(true);
                }
            });
        });
    }

    /**
     * إِرْسَال مُبَاشِر (Irsal Mubashir) - Send directly to address
     */
    async irsalMubashir(address: string, port: number, data: Buffer): Promise<boolean> {
        if (!this.socket) return false;

        return new Promise((resolve) => {
            this.socket!.send(data, port, address, (err) => {
                if (err) {
                    console.error(`[NAQL] Direct send error: ${err.message}`);
                    resolve(false);
                } else {
                    resolve(true);
                }
            });
        });
    }

    /**
     * Register a peer endpoint
     */
    registerPeer(id: string, address: string, port: number): void {
        this.peers.set(id, {
            id,
            address,
            port,
            lastSeen: Date.now(),
        });
        console.log(`[NAQL] Peer registered: ${id} @ ${address}:${port}`);
    }

    /**
     * Get peer info
     */
    getPeer(id: string): NaqlPeer | undefined {
        return this.peers.get(id);
    }

    /**
     * Handle incoming message
     */
    private handleMessage(msg: Buffer, rinfo: dgram.RemoteInfo): void {
        // Check for Barq magic bytes (BQ)
        if (msg.length >= 2 && msg[0] === 0x42 && msg[1] === 0x51) {
            this.emit('barq', msg, rinfo);
        } else {
            this.emit('data', msg, rinfo);
        }
    }

    /**
     * Get transport statistics
     */
    getStats(): { peers: number; running: boolean; port: number } {
        return {
            peers: this.peers.size,
            running: this.running,
            port: this.config.listenPort,
        };
    }
}

// Singleton instance
let instance: Naqil | null = null;

export function getTransport(): Naqil {
    if (!instance) {
        instance = new Naqil();
    }
    return instance;
}

export function createTransport(config?: Partial<NaqlConfig>): Naqil {
    instance = new Naqil(config);
    return instance;
}
