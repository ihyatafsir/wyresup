/**
 * مُتَّصِل (Muttasil) - TCP Relay Client
 * From Lisan al-Arab: "المُتَّصِل - The one who connects/joins"
 * 
 * Connects to a peer's embedded Mudtadeef relay server.
 */

import TcpSocket from 'react-native-tcp-socket';

interface RelayMessage {
    type: 'ID' | 'MSG' | 'PEERS' | 'JOIN' | 'LEAVE';
    id?: string;
    content?: string;
    encrypted?: boolean;
    from?: string;
    peers?: string[];
}

class MuttasilClient {
    private socket: any = null;
    private isConnected = false;
    private myId: string = '';
    private myPublicKey: string = '';
    private buffer: string = '';

    private onConnected?: () => void;
    private onDisconnected?: () => void;
    private onMessage?: (from: string, content: string, encrypted: boolean) => void;
    private onPeersUpdate?: (peers: string[]) => void;
    private onPeerJoin?: (peerId: string) => void;
    private onPeerLeave?: (peerId: string) => void;

    constructor() {
        console.log('[مُتَّصِل] Muttasil client initialized');
    }

    /**
     * اِتِّصَال (Connect to peer relay)
     */
    async connect(host: string, port: number, myId: string, myPublicKey: string): Promise<void> {
        if (this.isConnected) {
            console.log('[مُتَّصِل] Already connected');
            return;
        }

        this.myId = myId;
        this.myPublicKey = myPublicKey;

        return new Promise((resolve, reject) => {
            this.socket = TcpSocket.createConnection(
                { host, port },
                () => {
                    console.log(`[مُتَّصِل] Connected to ${host}:${port}`);
                    this.isConnected = true;

                    // Identify ourselves
                    this.send({
                        type: 'ID',
                        id: myId,
                        content: myPublicKey,
                    });

                    this.onConnected?.();
                    resolve();
                }
            );

            this.socket.on('data', (data: Buffer) => {
                this.handleData(data);
            });

            this.socket.on('close', () => {
                console.log('[مُتَّصِل] Connection closed');
                this.isConnected = false;
                this.onDisconnected?.();
            });

            this.socket.on('error', (error: Error) => {
                console.error('[مُتَّصِل] Connection error:', error.message);
                this.isConnected = false;
                reject(error);
            });

            // Timeout after 10 seconds
            setTimeout(() => {
                if (!this.isConnected) {
                    this.socket?.destroy();
                    reject(new Error('Connection timeout'));
                }
            }, 10000);
        });
    }

    /**
     * قَطْع (Disconnect)
     */
    disconnect(): void {
        if (this.socket) {
            this.socket.destroy();
            this.socket = null;
            this.isConnected = false;
            console.log('[مُتَّصِل] Disconnected');
        }
    }

    /**
     * Handle incoming data
     */
    private handleData(data: Buffer): void {
        this.buffer += data.toString();

        const lines = this.buffer.split('\n');
        this.buffer = lines.pop() || '';

        for (const line of lines) {
            if (line.trim()) {
                try {
                    const msg: RelayMessage = JSON.parse(line);
                    this.handleMessage(msg);
                } catch (e) {
                    console.error('[مُتَّصِل] Parse error:', e);
                }
            }
        }
    }

    /**
     * Handle relay message
     */
    private handleMessage(msg: RelayMessage): void {
        switch (msg.type) {
            case 'MSG':
                if (msg.from && msg.content) {
                    console.log(`[مُتَّصِل] Message from ${msg.from}`);
                    this.onMessage?.(msg.from, msg.content, msg.encrypted || false);
                }
                break;

            case 'PEERS':
                if (msg.peers) {
                    console.log(`[مُتَّصِل] Peers: ${msg.peers.length}`);
                    this.onPeersUpdate?.(msg.peers);
                }
                break;

            case 'JOIN':
                if (msg.id) {
                    console.log(`[مُتَّصِل] Peer joined: ${msg.id}`);
                    this.onPeerJoin?.(msg.id);
                }
                break;

            case 'LEAVE':
                if (msg.id) {
                    console.log(`[مُتَّصِل] Peer left: ${msg.id}`);
                    this.onPeerLeave?.(msg.id);
                }
                break;
        }
    }

    /**
     * إِرْسَال رِسَالَة (Send message)
     */
    sendMessage(content: string, encrypted: boolean = false): boolean {
        if (!this.isConnected) {
            console.warn('[مُتَّصِل] Not connected');
            return false;
        }

        return this.send({
            type: 'MSG',
            content,
            encrypted,
        });
    }

    /**
     * Send raw message
     */
    private send(msg: RelayMessage): boolean {
        if (!this.socket || !this.isConnected) return false;

        try {
            this.socket.write(JSON.stringify(msg) + '\n');
            return true;
        } catch (e) {
            console.error('[مُتَّصِل] Send error:', e);
            return false;
        }
    }

    // Event handlers
    setOnConnected(handler: () => void): void {
        this.onConnected = handler;
    }

    setOnDisconnected(handler: () => void): void {
        this.onDisconnected = handler;
    }

    setOnMessage(handler: (from: string, content: string, encrypted: boolean) => void): void {
        this.onMessage = handler;
    }

    setOnPeersUpdate(handler: (peers: string[]) => void): void {
        this.onPeersUpdate = handler;
    }

    setOnPeerJoin(handler: (peerId: string) => void): void {
        this.onPeerJoin = handler;
    }

    setOnPeerLeave(handler: (peerId: string) => void): void {
        this.onPeerLeave = handler;
    }

    // Getters
    getIsConnected(): boolean {
        return this.isConnected;
    }
}

// Singleton instance
export const muttasilClient = new MuttasilClient();
export default MuttasilClient;
