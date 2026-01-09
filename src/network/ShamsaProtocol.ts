/**
 * شَمْسَة (SHAMSA) - 5G Lite Protocol for WyreSup
 * 
 * "Shamsa" (شَمْسَة) - a decorative sun medallion in Islamic art
 * Named for its radial peer-to-peer connection pattern
 * 
 * Inspired by 5G NR sidelink concepts, adapted for 4G phones using:
 * - WiFi Direct / WiFi Aware for physical layer
 * - WireGuard for encryption layer
 * - Custom signaling for peer discovery
 * 
 * Protocol Layers (Named from Lisan al-Arab):
 * 
 * 1. طَلَب (Talab) - Request Layer
 *    - Peer discovery and connection request
 *    - Broadcasts WyreSup identity using available radios
 * 
 * 2. إِجَازَة (Ijazah) - Authorization Layer  
 *    - Connection acceptance/rejection
 *    - Key exchange for WireGuard tunnel
 * 
 * 3. وَصْل (Wasl) - Connection Layer
 *    - WireGuard tunnel establishment
 *    - Keep-alive and reconnection
 * 
 * 4. نَقْل (Naql) - Transport Layer
 *    - Encrypted message/voice/post delivery
 *    - Delivery confirmation with receipts
 * 
 * 5. تَوَاصُل (Tawasul) - Communication Layer
 *    - End-to-end encrypted messaging
 *    - Voice calls and posts
 */

import { WyreSUpIdentity, signMessage, verifySignature } from '../utils/Identity';
import { Peer, Message, Post } from '../messaging/types';
import * as D2DLite from './D2DLite';

// Protocol version
export const SHAMSA_VERSION = '1.0.0';

// Message types in the protocol
export enum ShamsaMessageType {
    // طَلَب (Talab) - Discovery
    TALAB_BROADCAST = 'talab:broadcast',      // Announce presence
    TALAB_DISCOVER = 'talab:discover',        // Query for peers
    TALAB_RESPONSE = 'talab:response',        // Response to query

    // إِجَازَة (Ijazah) - Authorization
    IJAZAH_REQUEST = 'ijazah:request',        // Request to connect
    IJAZAH_ACCEPT = 'ijazah:accept',          // Accept connection
    IJAZAH_REJECT = 'ijazah:reject',          // Reject connection
    IJAZAH_KEY_EXCHANGE = 'ijazah:key',       // WireGuard key exchange

    // وَصْل (Wasl) - Connection
    WASL_TUNNEL_INIT = 'wasl:init',           // Initialize tunnel
    WASL_TUNNEL_READY = 'wasl:ready',         // Tunnel ready
    WASL_KEEPALIVE = 'wasl:ping',             // Keep connection alive
    WASL_DISCONNECT = 'wasl:disconnect',      // Clean disconnect

    // نَقْل (Naql) - Transport
    NAQL_MESSAGE = 'naql:message',            // Text message
    NAQL_VOICE = 'naql:voice',                // Voice data
    NAQL_POST = 'naql:post',                  // Social post
    NAQL_ACK = 'naql:ack',                    // Delivery acknowledgment

    // تَوَاصُل (Tawasul) - Communication
    TAWASUL_TYPING = 'tawasul:typing',        // Typing indicator
    TAWASUL_SEEN = 'tawasul:seen',            // Message seen
    TAWASUL_CALL_START = 'tawasul:call',      // Start voice call
    TAWASUL_CALL_END = 'tawasul:call:end',    // End voice call
}

// Shamsa protocol message structure
export interface ShamsaMessage {
    version: string;
    type: ShamsaMessageType;
    sender: string;              // WyreSup ID
    recipient?: string;          // WyreSup ID (null for broadcast)
    timestamp: number;
    payload: any;
    signature: string;           // Ed25519 signature
    nonce: string;               // Replay protection
}

// Connection state machine
export type ShamsaState =
    | 'idle'                     // Not connected
    | 'discovering'              // Broadcasting/listening
    | 'requesting'               // Sent connection request
    | 'awaiting_acceptance'      // Waiting for user to accept
    | 'exchanging_keys'          // WireGuard key exchange
    | 'establishing_tunnel'      // Setting up WireGuard
    | 'connected'                // Fully connected
    | 'reconnecting';            // Lost connection, trying to restore

// Peer connection info
export interface ShamsaPeer {
    id: string;
    publicKey: Uint8Array;
    wireGuardPublicKey?: string;
    state: ShamsaState;
    lastSeen: number;
    endpoint?: string;
    signalStrength?: number;
    connectionType?: D2DLite.D2DConnectionType;
}

// Active connections
const peers: Map<string, ShamsaPeer> = new Map();
const stateListeners: ((p: ShamsaPeer) => void)[] = [];

/**
 * Generate a unique nonce for replay protection
 */
function generateNonce(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Create a signed Shamsa message
 */
export async function createMessage(
    identity: WyreSUpIdentity,
    type: ShamsaMessageType,
    payload: any,
    recipient?: string
): Promise<ShamsaMessage> {
    const nonce = generateNonce();
    const unsigned = {
        version: SHAMSA_VERSION,
        type,
        sender: identity.fullId,
        recipient,
        timestamp: Date.now(),
        payload,
        nonce,
    };

    // Sign the message content
    const signData = JSON.stringify(unsigned);
    const signature = await signMessage(identity.privateKey, signData);
    const signatureB64 = Buffer.from(signature).toString('base64');

    return { ...unsigned, signature: signatureB64 };
}

/**
 * Verify a received Shamsa message
 */
export async function verifyMessage(
    msg: ShamsaMessage,
    senderPublicKey: Uint8Array
): Promise<boolean> {
    try {
        const { signature, ...unsigned } = msg;
        const signData = JSON.stringify(unsigned);
        const signatureBytes = Buffer.from(signature, 'base64');
        return await verifySignature(senderPublicKey, signData, signatureBytes);
    } catch {
        return false;
    }
}

/**
 * Start the Shamsa protocol (discovery phase)
 */
export async function startProtocol(identity: WyreSUpIdentity): Promise<void> {
    console.log('[SHAMSA] Starting protocol...');
    console.log(`[SHAMSA] Identity: ${identity.fullId}`);

    // Start D2D discovery
    await D2DLite.startDiscovery(identity);

    // Listen for discovered peers
    D2DLite.onPeersChanged((d2dPeers) => {
        for (const d2dPeer of d2dPeers) {
            if (!peers.has(d2dPeer.id)) {
                const peer: ShamsaPeer = {
                    id: d2dPeer.id,
                    publicKey: new Uint8Array(), // Will be exchanged
                    state: 'discovered' as any,
                    lastSeen: d2dPeer.lastSeen,
                    endpoint: d2dPeer.endpoint,
                    signalStrength: d2dPeer.signalStrength,
                    connectionType: d2dPeer.connectionType,
                };
                peers.set(d2dPeer.id, peer);
                console.log(`[SHAMSA] New peer: ${d2dPeer.id}`);
            }
        }
    });
}

/**
 * Request connection to a peer (طَلَب → إِجَازَة flow)
 */
export async function requestConnection(
    identity: WyreSUpIdentity,
    peerId: string,
    message?: string
): Promise<boolean> {
    console.log(`[SHAMSA] طَلَب (Talab) → ${peerId}`);

    const msg = await createMessage(
        identity,
        ShamsaMessageType.IJAZAH_REQUEST,
        {
            message,
            publicKey: Buffer.from(identity.publicKey).toString('base64'),
        },
        peerId
    );

    // Update peer state
    const peer = peers.get(peerId);
    if (peer) {
        peer.state = 'requesting';
        stateListeners.forEach(l => l(peer));
    }

    // TODO: Send via D2D transport
    console.log(`[SHAMSA] Connection request sent`);
    return true;
}

/**
 * Accept incoming connection (إِجَازَة)
 */
export async function acceptConnection(
    identity: WyreSUpIdentity,
    peerId: string
): Promise<boolean> {
    console.log(`[SHAMSA] إِجَازَة (Ijazah) Accept → ${peerId}`);

    const peer = peers.get(peerId);
    if (!peer) return false;

    // Generate WireGuard keypair for this connection
    // In production: use actual WireGuard key generation
    const mockWgKey = Buffer.from(identity.publicKey.slice(0, 32)).toString('base64');

    const msg = await createMessage(
        identity,
        ShamsaMessageType.IJAZAH_ACCEPT,
        {
            wireGuardPublicKey: mockWgKey,
            endpoint: '0.0.0.0:51820', // Will be replaced with actual
        },
        peerId
    );

    peer.state = 'exchanging_keys';
    stateListeners.forEach(l => l(peer));

    console.log(`[SHAMSA] Connection accepted, exchanging keys...`);
    return true;
}

/**
 * Get current protocol state for a peer
 */
export function getPeerState(peerId: string): ShamsaState {
    return peers.get(peerId)?.state || 'idle';
}

/**
 * Get all known peers
 */
export function getAllPeers(): ShamsaPeer[] {
    return Array.from(peers.values());
}

/**
 * Subscribe to peer state changes
 */
export function onPeerStateChange(listener: (peer: ShamsaPeer) => void): () => void {
    stateListeners.push(listener);
    return () => {
        const idx = stateListeners.indexOf(listener);
        if (idx > -1) stateListeners.splice(idx, 1);
    };
}
