/**
 * WyreSup Identity System (هُوِيَّة - Huwiyya)
 * 
 * User identity: prefix@[hash]
 * - Prefix: user-chosen (e.g., "ahmad42")
 * - Hash: first 16 chars of SHA256(public_key)
 * 
 * Example: ahmad42@7f3a2c91e8b4d0f1
 */

import * as ed from '@noble/ed25519';
import { sha512 as jsSha512 } from 'js-sha512';

// Configure noble/ed25519 to use js-sha512 (no crypto.subtle needed!)
// This is the key fix for React Native compatibility
ed.hashes.sha512 = (data: Uint8Array): Uint8Array => {
    const hex = jsSha512(data);
    const bytes = new Uint8Array(hex.match(/.{1,2}/g)!.map((byte: string) => parseInt(byte, 16)));
    return bytes;
};

export interface WyreSUpIdentity {
    prefix: string;
    privateKey: Uint8Array;
    publicKey: Uint8Array;
    hash: string;
    fullId: string;
}

// Simple hash function using the bytes directly (no external deps)
function simpleHash(data: Uint8Array): string {
    // Use first 8 bytes of public key as hash (unique enough for ID)
    return Array.from(data.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate a new identity with user-chosen prefix
export async function createIdentity(prefix: string): Promise<WyreSUpIdentity> {
    // Validate prefix (alphanumeric, 3-16 chars)
    if (!/^[a-zA-Z0-9]{3,16}$/.test(prefix)) {
        throw new Error('Prefix must be 3-16 alphanumeric characters');
    }

    // Generate Ed25519 keypair using SYNC functions (no crypto.subtle needed)
    const privateKey = ed.utils.randomSecretKey();
    const publicKey = ed.getPublicKey(privateKey);  // SYNC version

    // Create hash from public key (simple approach, no external deps)
    const hash = simpleHash(publicKey);

    const fullId = `${prefix}@${hash}`;

    return { prefix, privateKey, publicKey, hash, fullId };
}

// Derive public key from WyreSup ID for verification
export function parseWyreSUpId(fullId: string): { prefix: string; hash: string } | null {
    const match = fullId.match(/^([a-zA-Z0-9]{3,16})@([a-f0-9]{16})$/);
    if (!match) return null;
    return { prefix: match[1], hash: match[2] };
}

// Sign a message with private key
export async function signMessage(privateKey: Uint8Array, message: string): Promise<Uint8Array> {
    const messageBytes = new TextEncoder().encode(message);
    return await ed.signAsync(messageBytes, privateKey);
}

// Verify a message signature
export async function verifySignature(
    publicKey: Uint8Array,
    message: string,
    signature: Uint8Array
): Promise<boolean> {
    const messageBytes = new TextEncoder().encode(message);
    return await ed.verifyAsync(signature, messageBytes, publicKey);
}

// Convert identity to storable format
export function serializeIdentity(identity: WyreSUpIdentity): string {
    return JSON.stringify({
        prefix: identity.prefix,
        privateKey: Array.from(identity.privateKey),
        publicKey: Array.from(identity.publicKey),
        hash: identity.hash,
        fullId: identity.fullId,
    });
}

// Restore identity from storage
export function deserializeIdentity(data: string): WyreSUpIdentity {
    const parsed = JSON.parse(data);
    return {
        prefix: parsed.prefix,
        privateKey: new Uint8Array(parsed.privateKey),
        publicKey: new Uint8Array(parsed.publicKey),
        hash: parsed.hash,
        fullId: parsed.fullId,
    };
}
