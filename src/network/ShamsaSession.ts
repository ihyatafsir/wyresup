/**
 * Shamsa Session Manager
 * 
 * Combines Shamsa protocol with WireGuard encryption
 * Manages the full lifecycle of peer connections
 */

import * as Shamsa from './ShamsaProtocol';
import * as WireGuard from './WireGuardCore';
import * as D2DLite from './D2DLite';
import { WyreSUpIdentity } from '../utils/Identity';
import { Message, Post } from '../messaging/types';

export interface ShamsaSession {
    peerId: string;
    protocolState: Shamsa.ShamsaState;
    encrypted: boolean;
    connectionType: D2DLite.D2DConnectionType | null;
    lastActivity: number;
}

// Session registry
const activeSessions: Map<string, ShamsaSession> = new Map();

/**
 * Initialize Shamsa with identity
 */
export async function initialize(identity: WyreSUpIdentity): Promise<void> {
    console.log('[SHAMSA-SESSION] Initializing...');
    await Shamsa.startProtocol(identity);
}

/**
 * Connect to a peer using full Shamsa flow
 */
export async function connectPeer(
    identity: WyreSUpIdentity,
    peerId: string,
    introMessage?: string
): Promise<boolean> {
    console.log(`[SHAMSA-SESSION] Connecting to ${peerId}...`);

    // 1. Request connection (طَلَب → إِجَازَة)
    const requested = await Shamsa.requestConnection(identity, peerId, introMessage);
    if (!requested) return false;

    // Create session entry
    const session: ShamsaSession = {
        peerId,
        protocolState: 'requesting',
        encrypted: false,
        connectionType: null,
        lastActivity: Date.now(),
    };
    activeSessions.set(peerId, session);

    return true;
}

/**
 * Accept incoming connection and establish encryption
 */
export async function acceptPeer(
    identity: WyreSUpIdentity,
    peerId: string,
    peerPublicKey: string
): Promise<boolean> {
    console.log(`[SHAMSA-SESSION] Accepting ${peerId}...`);

    // 1. Accept at protocol level
    const accepted = await Shamsa.acceptConnection(identity, peerId);
    if (!accepted) return false;

    // 2. Create WireGuard session
    const wgSession = await WireGuard.createSession(peerId, peerPublicKey);

    // 3. Update session
    const session: ShamsaSession = {
        peerId,
        protocolState: 'connected',
        encrypted: true,
        connectionType: null,
        lastActivity: Date.now(),
    };
    activeSessions.set(peerId, session);

    console.log(`[SHAMSA-SESSION] ✓ Connected & encrypted with ${peerId}`);
    return true;
}

/**
 * Send encrypted message to peer
 */
export async function sendMessage(
    peerId: string,
    content: string
): Promise<boolean> {
    const session = activeSessions.get(peerId);
    if (!session || !session.encrypted) {
        console.error(`[SHAMSA-SESSION] No encrypted session with ${peerId}`);
        return false;
    }

    // Encrypt the message
    const encrypted = await WireGuard.encrypt(peerId, content);
    if (!encrypted) return false;

    // TODO: Send via D2D transport
    console.log(`[SHAMSA-SESSION] Sent encrypted message to ${peerId}`);
    session.lastActivity = Date.now();

    return true;
}

/**
 * Receive and decrypt message from peer
 */
export async function receiveMessage(
    peerId: string,
    encryptedContent: string
): Promise<string | null> {
    const session = activeSessions.get(peerId);
    if (!session || !session.encrypted) {
        return null;
    }

    const decrypted = await WireGuard.decrypt(peerId, encryptedContent);
    if (decrypted) {
        session.lastActivity = Date.now();
    }

    return decrypted;
}

/**
 * Disconnect from peer
 */
export function disconnectPeer(peerId: string): void {
    WireGuard.closeSession(peerId);
    activeSessions.delete(peerId);
    console.log(`[SHAMSA-SESSION] Disconnected from ${peerId}`);
}

/**
 * Get all active sessions
 */
export function getActiveSessions(): ShamsaSession[] {
    return Array.from(activeSessions.values());
}

/**
 * Get session for peer
 */
export function getSession(peerId: string): ShamsaSession | undefined {
    return activeSessions.get(peerId);
}

/**
 * Check if connected and encrypted
 */
export function isSecurelyConnected(peerId: string): boolean {
    const session = activeSessions.get(peerId);
    return !!session && session.encrypted && session.protocolState === 'connected';
}
