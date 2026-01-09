/**
 * WyreSup P2P Connection Manager (وَصْل - Waṣl)
 * 
 * Handles WireGuard tunnel establishment and P2P messaging
 */

import { Peer, Message, Post } from '../messaging/types';

// Connection state
export type ConnectionState = 'disconnected' | 'connecting' | 'connected';

export interface P2PConnection {
    peerId: string;
    state: ConnectionState;
    endpoint: string;
    publicKey: string;
}

// Active connections map
const connections: Map<string, P2PConnection> = new Map();

// Event listeners
type MessageHandler = (message: Message) => void;
type PostHandler = (post: Post) => void;
const messageHandlers: MessageHandler[] = [];
const postHandlers: PostHandler[] = [];

/**
 * Establish WireGuard connection to a peer
 */
export async function connectToPeer(peer: Peer): Promise<boolean> {
    if (connections.has(peer.id)) {
        return true; // Already connected
    }

    // TODO: Integrate with react-native-wireguard-vpn-connect
    // For now, simulate connection
    const connection: P2PConnection = {
        peerId: peer.id,
        state: 'connecting',
        endpoint: peer.endpoint || '',
        publicKey: peer.publicKey,
    };

    connections.set(peer.id, connection);

    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    connection.state = 'connected';
    console.log(`[P2P] Connected to ${peer.id}`);

    return true;
}

/**
 * Disconnect from a peer
 */
export function disconnectFromPeer(peerId: string): void {
    connections.delete(peerId);
    console.log(`[P2P] Disconnected from ${peerId}`);
}

/**
 * Send a message to a connected peer
 */
export async function sendMessage(peerId: string, message: Message): Promise<boolean> {
    const connection = connections.get(peerId);
    if (!connection || connection.state !== 'connected') {
        console.error(`[P2P] Not connected to ${peerId}`);
        return false;
    }

    // TODO: Send over WireGuard tunnel
    console.log(`[P2P] Sending message to ${peerId}:`, message.type);

    return true;
}

/**
 * Broadcast a post to all followers
 */
export async function broadcastPost(post: Post, followers: Peer[]): Promise<number> {
    let successCount = 0;

    for (const follower of followers) {
        if (connections.has(follower.id) && connections.get(follower.id)?.state === 'connected') {
            // TODO: Send post over WireGuard tunnel
            console.log(`[P2P] Broadcasting post to ${follower.id}`);
            successCount++;
        }
    }

    return successCount;
}

/**
 * Register message handler
 */
export function onMessage(handler: MessageHandler): () => void {
    messageHandlers.push(handler);
    return () => {
        const index = messageHandlers.indexOf(handler);
        if (index > -1) messageHandlers.splice(index, 1);
    };
}

/**
 * Register post handler
 */
export function onPost(handler: PostHandler): () => void {
    postHandlers.push(handler);
    return () => {
        const index = postHandlers.indexOf(handler);
        if (index > -1) postHandlers.splice(index, 1);
    };
}

/**
 * Get connection state for a peer
 */
export function getConnectionState(peerId: string): ConnectionState {
    return connections.get(peerId)?.state || 'disconnected';
}

/**
 * Get all active connections
 */
export function getActiveConnections(): P2PConnection[] {
    return Array.from(connections.values()).filter(c => c.state === 'connected');
}
