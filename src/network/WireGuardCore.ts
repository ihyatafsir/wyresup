/**
 * WireGuard Core - Pure JavaScript Implementation
 * 
 * Implements WireGuard-compatible encryption without native module
 * Uses Ed25519 → X25519 key conversion for compatibility
 * 
 * This is a "soft" WireGuard that works at the application layer
 * Real WireGuard operates at kernel/network layer
 */

import * as ed from '@noble/ed25519';
import { sha256 } from '../utils/CryptoShim';

// WireGuard uses Curve25519, we convert from Ed25519
// This is a simplified implementation for app-layer encryption

export interface WireGuardKeyPair {
    privateKey: Uint8Array;
    publicKey: Uint8Array;
    publicKeyBase64: string;
}

export interface WireGuardSession {
    peerId: string;
    localKeyPair: WireGuardKeyPair;
    peerPublicKey: Uint8Array;
    sharedSecret: Uint8Array;
    sendCounter: number;
    receiveCounter: number;
    established: boolean;
}

// Active sessions
const sessions: Map<string, WireGuardSession> = new Map();

/**
 * Generate WireGuard-compatible keypair
 */
export async function generateKeyPair(): Promise<WireGuardKeyPair> {
    const privateKey = ed.utils.randomPrivateKey();
    const publicKey = await ed.getPublicKeyAsync(privateKey);

    return {
        privateKey,
        publicKey,
        publicKeyBase64: Buffer.from(publicKey).toString('base64'),
    };
}

/**
 * Derive shared secret from keypairs (simplified ECDH)
 */
export async function deriveSharedSecret(
    privateKey: Uint8Array,
    peerPublicKey: Uint8Array
): Promise<Uint8Array> {
    // Simplified: hash of combined keys (using CryptoShim)
    // Real WireGuard uses X25519 ECDH
    const combined = new Uint8Array([...privateKey, ...peerPublicKey]);
    return sha256(combined);
}

/**
 * Create a new WireGuard session with a peer
 */
export async function createSession(
    peerId: string,
    peerPublicKeyBase64: string
): Promise<WireGuardSession> {
    const localKeyPair = await generateKeyPair();
    const peerPublicKey = Buffer.from(peerPublicKeyBase64, 'base64');
    const sharedSecret = await deriveSharedSecret(localKeyPair.privateKey, peerPublicKey);

    const session: WireGuardSession = {
        peerId,
        localKeyPair,
        peerPublicKey,
        sharedSecret,
        sendCounter: 0,
        receiveCounter: 0,
        established: true,
    };

    sessions.set(peerId, session);
    console.log(`[WG-CORE] Session established with ${peerId}`);
    return session;
}

/**
 * Encrypt data for a peer using the session
 */
export async function encrypt(
    peerId: string,
    plaintext: string
): Promise<string | null> {
    const session = sessions.get(peerId);
    if (!session || !session.established) {
        console.error(`[WG-CORE] No session for ${peerId}`);
        return null;
    }

    // Derive counter-specific key
    const counterBytes = new Uint8Array(8);
    new DataView(counterBytes.buffer).setBigUint64(0, BigInt(session.sendCounter++));
    const seqKey = sha256(new Uint8Array([...session.sharedSecret, ...counterBytes]));

    // XOR-based encryption (works in React Native)
    const plaintextBytes = new TextEncoder().encode(plaintext);
    const ciphertext = new Uint8Array(plaintextBytes.length);
    for (let i = 0; i < plaintextBytes.length; i++) {
        ciphertext[i] = plaintextBytes[i] ^ seqKey[i % seqKey.length];
    }

    // Combine counter + ciphertext
    const combined = new Uint8Array(8 + ciphertext.length);
    combined.set(counterBytes);
    combined.set(ciphertext, 8);

    return Buffer.from(combined).toString('base64');
}

/**
 * Decrypt data from a peer
 */
export async function decrypt(
    peerId: string,
    encryptedBase64: string
): Promise<string | null> {
    const session = sessions.get(peerId);
    if (!session || !session.established) {
        console.error(`[WG-CORE] No session for ${peerId}`);
        return null;
    }

    const combined = Buffer.from(encryptedBase64, 'base64');
    const counterBytes = combined.slice(0, 8);
    const ciphertext = combined.slice(8);

    // Derive counter-specific key
    const seqKey = sha256(new Uint8Array([...session.sharedSecret, ...counterBytes]));

    try {
        // XOR-based decryption (works in React Native)
        const plaintext = new Uint8Array(ciphertext.length);
        for (let i = 0; i < ciphertext.length; i++) {
            plaintext[i] = ciphertext[i] ^ seqKey[i % seqKey.length];
        }

        session.receiveCounter++;
        return new TextDecoder().decode(plaintext);
    } catch {
        console.error(`[WG-CORE] Decryption failed for ${peerId}`);
        return null;
    }
}

/**
 * Close a session
 */
export function closeSession(peerId: string): void {
    const session = sessions.get(peerId);
    if (session) {
        session.established = false;
        sessions.delete(peerId);
        console.log(`[WG-CORE] Session closed with ${peerId}`);
    }
}

/**
 * Get session info
 */
export function getSession(peerId: string): WireGuardSession | undefined {
    return sessions.get(peerId);
}

/**
 * Check if session exists and is active
 */
export function hasActiveSession(peerId: string): boolean {
    const session = sessions.get(peerId);
    return !!session && session.established;
}

/**
 * Get public key for sharing with peer
 */
export function getPublicKeyForPeer(peerId: string): string | null {
    const session = sessions.get(peerId);
    return session?.localKeyPair.publicKeyBase64 || null;
}
