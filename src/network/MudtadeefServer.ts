/**
 * مُسْتَضِيف (Mudtadeef) - Embedded TCP Relay Server
 * From Lisan al-Arab: "المُسْتَضِيف - The one who hosts/shelters"
 * 
 * Allows each WyreSup phone to become its own relay server,
 * enabling true P2P messaging without any central server.
 */

import TcpSocket from 'react-native-tcp-socket';

// Helper to get local IP address (alternative to react-native-network-info)
async function getLocalIPAddress(): Promise<string> {
    try {
        // Try to get external IP first (useful for linking)
        const response = await fetch('https://api.ipify.org?format=text', {
            signal: AbortSignal.timeout(3000)
        });
        if (response.ok) {
            return (await response.text()).trim();
        }
    } catch {
        // Fallback: use localhost for local mesh
    }
    return '10.0.2.15'; // Android emulator default
}

// Message types (same as WebSocket relay)
interface RelayMessage {
    type: 'ID' | 'MSG' | 'PEERS' | 'JOIN' | 'LEAVE';
    id?: string;
    content?: string;
    encrypted?: boolean;
    from?: string;
    peers?: string[];
}

interface ConnectedClient {
    socket: any;
    id: string;
    publicKey: string;
    wasam: string;
    lastSeen: number;
}

class MudtadeefServer {
    private server: any = null;
    private clients: Map<string, ConnectedClient> = new Map();
    private isHosting = false;
    private hostPort = 5189;
    private hostIP = '';
    private onStatusChange?: (status: string) => void;
    private onPeerJoin?: (peerId: string) => void;
    private onPeerLeave?: (peerId: string) => void;
    private onMessage?: (from: string, content: string, encrypted: boolean) => void;

    constructor() {
        console.log('[مُسْتَضِيف] Mudtadeef server initialized');
    }

    /**
     * بَدْء الاِسْتِضَافَة (Start hosting)
     */
    async startHosting(port: number = 5189): Promise<{ ip: string; port: number }> {
        if (this.isHosting) {
            console.log('[مُسْتَضِيف] Already hosting');
            return { ip: this.hostIP, port: this.hostPort };
        }

        try {
            // Get local IP address
            this.hostIP = await getLocalIPAddress();
            this.hostPort = port;

            this.server = TcpSocket.createServer((socket: any) => {
                this.handleNewConnection(socket);
            });

            await new Promise<void>((resolve, reject) => {
                this.server.listen({ port, host: '0.0.0.0' }, () => {
                    console.log(`[مُسْتَضِيف] Hosting on ${this.hostIP}:${port}`);
                    this.isHosting = true;
                    this.onStatusChange?.(`Hosting on ${this.hostIP}:${port}`);
                    resolve();
                });

                this.server.on('error', (error: Error) => {
                    console.error('[مُسْتَضِيف] Server error:', error);
                    reject(error);
                });
            });

            return { ip: this.hostIP, port: this.hostPort };
        } catch (error) {
            console.error('[مُسْتَضِيف] Failed to start hosting:', error);
            throw error;
        }
    }

    /**
     * إِيقَاف الاِسْتِضَافَة (Stop hosting)
     */
    stopHosting(): void {
        if (this.server) {
            // Disconnect all clients
            this.clients.forEach((client) => {
                try {
                    client.socket.destroy();
                } catch (e) { }
            });
            this.clients.clear();

            // Close server
            this.server.close();
            this.server = null;
            this.isHosting = false;
            console.log('[مُسْتَضِيف] Hosting stopped');
            this.onStatusChange?.('Hosting stopped');
        }
    }

    /**
     * Handle new client connection
     */
    private handleNewConnection(socket: any): void {
        const clientAddr = `${socket.remoteAddress}:${socket.remotePort}`;
        console.log(`[مُسْتَضِيف] New connection from ${clientAddr}`);

        let buffer = '';

        socket.on('data', (data: Buffer) => {
            buffer += data.toString();

            // Process complete JSON messages (newline-delimited)
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.trim()) {
                    try {
                        const msg: RelayMessage = JSON.parse(line);
                        this.handleMessage(socket, msg, clientAddr);
                    } catch (e) {
                        console.error('[مُسْتَضِيف] Parse error:', e);
                    }
                }
            }
        });

        socket.on('close', () => {
            this.handleDisconnection(clientAddr);
        });

        socket.on('error', (error: Error) => {
            console.error(`[مُسْتَضِيف] Client error (${clientAddr}):`, error.message);
        });
    }

    /**
     * Handle incoming message
     */
    private handleMessage(socket: any, msg: RelayMessage, clientAddr: string): void {
        switch (msg.type) {
            case 'ID':
                // Client identifying itself
                if (msg.id) {
                    const client: ConnectedClient = {
                        socket,
                        id: msg.id,
                        publicKey: msg.content || '',
                        wasam: '',
                        lastSeen: Date.now(),
                    };
                    this.clients.set(msg.id, client);
                    console.log(`[مُسْتَضِيف] Client registered: ${msg.id}`);
                    this.onPeerJoin?.(msg.id);

                    // Send current peer list
                    this.broadcastPeerList();

                    // Notify all clients of new peer
                    this.broadcast({
                        type: 'JOIN',
                        id: msg.id,
                    }, msg.id);
                }
                break;

            case 'MSG':
                // Broadcast message to all clients
                const senderId = this.getClientIdBySocket(socket);
                if (senderId && msg.content) {
                    console.log(`[مُسْتَضِيف] Message from ${senderId}: ${msg.content.slice(0, 20)}...`);
                    this.onMessage?.(senderId, msg.content, msg.encrypted || false);

                    this.broadcast({
                        type: 'MSG',
                        from: senderId,
                        content: msg.content,
                        encrypted: msg.encrypted,
                    }, senderId);
                }
                break;
        }
    }

    /**
     * Handle client disconnection
     */
    private handleDisconnection(clientAddr: string): void {
        // Find client by address
        for (const [id, client] of this.clients) {
            const addr = `${client.socket.remoteAddress}:${client.socket.remotePort}`;
            if (addr === clientAddr) {
                this.clients.delete(id);
                console.log(`[مُسْتَضِيف] Client disconnected: ${id}`);
                this.onPeerLeave?.(id);

                this.broadcast({
                    type: 'LEAVE',
                    id,
                });
                this.broadcastPeerList();
                break;
            }
        }
    }

    /**
     * Broadcast message to all clients except sender
     */
    private broadcast(msg: RelayMessage, excludeId?: string): void {
        const data = JSON.stringify(msg) + '\n';
        this.clients.forEach((client, id) => {
            if (id !== excludeId) {
                try {
                    client.socket.write(data);
                } catch (e) {
                    console.error(`[مُسْتَضِيف] Failed to send to ${id}`);
                }
            }
        });
    }

    /**
     * Broadcast updated peer list
     */
    private broadcastPeerList(): void {
        const peers = Array.from(this.clients.keys());
        this.broadcast({
            type: 'PEERS',
            peers,
        });
    }

    /**
     * Get client ID by socket reference
     */
    private getClientIdBySocket(socket: any): string | null {
        for (const [id, client] of this.clients) {
            if (client.socket === socket) {
                return id;
            }
        }
        return null;
    }

    // Event handlers
    setOnStatusChange(handler: (status: string) => void): void {
        this.onStatusChange = handler;
    }

    setOnPeerJoin(handler: (peerId: string) => void): void {
        this.onPeerJoin = handler;
    }

    setOnPeerLeave(handler: (peerId: string) => void): void {
        this.onPeerLeave = handler;
    }

    setOnMessage(handler: (from: string, content: string, encrypted: boolean) => void): void {
        this.onMessage = handler;
    }

    // Getters
    getIsHosting(): boolean {
        return this.isHosting;
    }

    getHostInfo(): { ip: string; port: number } | null {
        if (!this.isHosting) return null;
        return { ip: this.hostIP, port: this.hostPort };
    }

    getConnectedPeers(): string[] {
        return Array.from(this.clients.keys());
    }

    getPeerCount(): number {
        return this.clients.size;
    }

    /**
     * إِرْسَال (Irsal) - Send message from host to all clients
     */
    sendToClients(content: string, encrypted: boolean = false): void {
        if (!this.isHosting) {
            console.warn('[مُسْتَضِيف] Not hosting, cannot send');
            return;
        }
        const msg: RelayMessage = {
            type: 'MSG',
            from: 'host',
            content,
            encrypted,
        };
        // Send to ALL clients (no exclusion)
        for (const [id, client] of this.clients) {
            try {
                const data = JSON.stringify(msg) + '\n';
                client.socket.write(data);
                console.log(`[مُسْتَضِيف] Sent to ${id}: ${content.slice(0, 20)}...`);
            } catch (e) {
                console.error(`[مُسْتَضِيف] Failed to send to ${id}`);
            }
        }
    }
}

// Singleton instance
export const mudtadeefServer = new MudtadeefServer();
export default MudtadeefServer;
