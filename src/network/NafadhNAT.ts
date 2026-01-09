/**
 * نَفَاذ (NAFADH) - NAT Traversal & Hole Punching
 * 
 * From Lisan al-Arab:
 * نَفَذَ: جاز وخَلَص
 * "To pass through, to penetrate"
 * 
 * Also related to ثَقْب (thaqb) - piercing
 * 
 * This module implements NAT hole-punching like Tailscale
 * to allow P2P connections across the internet.
 */

import dgram from 'dgram';
import { EventEmitter } from 'events';
import { WyreSUpIdentity } from '../utils/Identity';

// STUN servers for NAT discovery (public, no central server needed)
export const PUBLIC_STUN_SERVERS = [
    { host: 'stun.l.google.com', port: 19302 },
    { host: 'stun1.l.google.com', port: 19302 },
    { host: 'stun.cloudflare.com', port: 3478 },
];

// NAT types
export enum NawNAT {
    MAFTUH = 'open',           // مَفْتُوح - Open (no NAT)
    KAMIL = 'full_cone',       // كَامِل - Full cone (easy)
    MUQAYYAD = 'restricted',   // مُقَيَّد - Restricted
    MUTASHADDID = 'symmetric', // مُتَشَدِّد - Symmetric (hardest)
}

export interface NafadhInfo {
    localIP: string;
    localPort: number;
    publicIP: string;
    publicPort: number;
    natType: NawNAT;
    stunServer: string;
}

export interface ThaqbAttempt {
    peerId: string;
    peerPublicIP: string;
    peerPublicPort: number;
    localPort: number;
    status: 'pending' | 'success' | 'failed';
    attempts: number;
}

/**
 * نَافِذ (Nafidh) - The Penetrator
 * Handles NAT discovery and hole punching
 */
export class Nafidh extends EventEmitter {
    private socket: dgram.Socket | null = null;
    private natInfo: NafadhInfo | null = null;
    private punchAttempts: Map<string, ThaqbAttempt> = new Map();

    /**
     * اِكْتِشَاف (Iktishaf) - Discover NAT type and public endpoint
     */
    async iktishaf(): Promise<NafadhInfo | null> {
        console.log('[NAFADH] اِكْتِشَاف - Discovering NAT...');

        this.socket = dgram.createSocket('udp4');

        return new Promise((resolve) => {
            this.socket!.bind(0, () => {
                const localAddr = this.socket!.address();
                console.log(`[NAFADH] Local: ${localAddr.address}:${localAddr.port}`);

                // Query STUN server
                this.querySTUN(PUBLIC_STUN_SERVERS[0]).then((result) => {
                    if (result) {
                        this.natInfo = {
                            localIP: localAddr.address,
                            localPort: localAddr.port,
                            publicIP: result.ip,
                            publicPort: result.port,
                            natType: this.detectNATType(localAddr.port, result.port),
                            stunServer: PUBLIC_STUN_SERVERS[0].host,
                        };
                        console.log(`[NAFADH] Public: ${result.ip}:${result.port}`);
                        console.log(`[NAFADH] NAT type: ${this.natInfo.natType}`);
                        resolve(this.natInfo);
                    } else {
                        resolve(null);
                    }
                });
            });
        });
    }

    /**
     * Query STUN server for public IP/port
     */
    private async querySTUN(server: { host: string; port: number }): Promise<{ ip: string; port: number } | null> {
        return new Promise((resolve) => {
            // STUN Binding Request (simplified)
            const stunRequest = Buffer.alloc(20);
            stunRequest.writeUInt16BE(0x0001, 0); // Binding Request
            stunRequest.writeUInt16BE(0, 2);       // Message Length
            // Magic cookie
            stunRequest.writeUInt32BE(0x2112A442, 4);
            // Transaction ID (random)
            for (let i = 8; i < 20; i++) {
                stunRequest[i] = Math.floor(Math.random() * 256);
            }

            const timeout = setTimeout(() => {
                console.log('[NAFADH] STUN timeout');
                resolve(null);
            }, 5000);

            this.socket!.once('message', (msg) => {
                clearTimeout(timeout);

                // Parse STUN response (simplified)
                if (msg.length >= 20) {
                    const type = msg.readUInt16BE(0);
                    if (type === 0x0101) { // Binding Response
                        // Look for XOR-MAPPED-ADDRESS (0x0020)
                        let offset = 20;
                        while (offset < msg.length - 4) {
                            const attrType = msg.readUInt16BE(offset);
                            const attrLen = msg.readUInt16BE(offset + 2);

                            if (attrType === 0x0020 && attrLen >= 8) {
                                const port = msg.readUInt16BE(offset + 6) ^ 0x2112;
                                const ip = [
                                    msg[offset + 8] ^ 0x21,
                                    msg[offset + 9] ^ 0x12,
                                    msg[offset + 10] ^ 0xA4,
                                    msg[offset + 11] ^ 0x42,
                                ].join('.');
                                resolve({ ip, port });
                                return;
                            }

                            // Also check MAPPED-ADDRESS (0x0001)
                            if (attrType === 0x0001 && attrLen >= 8) {
                                const port = msg.readUInt16BE(offset + 6);
                                const ip = [
                                    msg[offset + 8],
                                    msg[offset + 9],
                                    msg[offset + 10],
                                    msg[offset + 11],
                                ].join('.');
                                resolve({ ip, port });
                                return;
                            }

                            offset += 4 + attrLen + (attrLen % 4 ? 4 - (attrLen % 4) : 0);
                        }
                    }
                }
                resolve(null);
            });

            this.socket!.send(stunRequest, server.port, server.host, (err) => {
                if (err) {
                    console.error('[NAFADH] STUN send error:', err.message);
                    clearTimeout(timeout);
                    resolve(null);
                }
            });
        });
    }

    /**
     * Detect NAT type based on port mapping
     */
    private detectNATType(localPort: number, publicPort: number): NawNAT {
        if (localPort === publicPort) {
            return NawNAT.MAFTUH; // Open or full cone
        }
        return NawNAT.MUQAYYAD; // Assume restricted for now
    }

    /**
     * ثَقْب (Thaqb) - Punch hole to peer
     * 
     * Both peers send packets to each other's public IP:port
     * The first packet "punches" a hole in the NAT
     */
    async thaqb(
        peerId: string,
        peerPublicIP: string,
        peerPublicPort: number
    ): Promise<boolean> {
        if (!this.socket || !this.natInfo) {
            console.error('[NAFADH] Not initialized');
            return false;
        }

        console.log(`[NAFADH] ثَقْب (Thaqb) - Punching to ${peerPublicIP}:${peerPublicPort}`);

        const attempt: ThaqbAttempt = {
            peerId,
            peerPublicIP,
            peerPublicPort,
            localPort: this.natInfo.localPort,
            status: 'pending',
            attempts: 0,
        };
        this.punchAttempts.set(peerId, attempt);

        // Punch message: "WYRETHAQB" + our public info
        const punchMsg = Buffer.from(JSON.stringify({
            type: 'THAQB',
            from: peerId,
            publicIP: this.natInfo.publicIP,
            publicPort: this.natInfo.publicPort,
        }));

        // Send multiple punches (UDP is unreliable)
        for (let i = 0; i < 5; i++) {
            attempt.attempts++;

            await new Promise<void>((resolve) => {
                this.socket!.send(punchMsg, peerPublicPort, peerPublicIP, (err) => {
                    if (err) {
                        console.error(`[NAFADH] Punch ${i + 1} failed:`, err.message);
                    } else {
                        console.log(`[NAFADH] Punch ${i + 1} sent`);
                    }
                    resolve();
                });
            });

            // Wait between punches
            await new Promise(r => setTimeout(r, 200));
        }

        return true;
    }

    /**
     * Get current NAT info
     */
    getNatInfo(): NafadhInfo | null {
        return this.natInfo;
    }

    /**
     * Get socket for sending/receiving
     */
    getSocket(): dgram.Socket | null {
        return this.socket;
    }

    /**
     * Close socket
     */
    close(): void {
        this.socket?.close();
        this.socket = null;
        this.natInfo = null;
    }
}

// Singleton
let instance: Nafidh | null = null;

export function getNAT(): Nafidh {
    if (!instance) {
        instance = new Nafidh();
    }
    return instance;
}
