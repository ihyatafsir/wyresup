/**
 * Crypto Shim for React Native
 * Provides crypto.subtle-like functions using pure JS implementations
 * 
 * This avoids the "Cannot read property 'digest' of undefined" error
 * that occurs when crypto.subtle is not available in React Native
 */

import { sha256 as jsSha256 } from 'js-sha256';
import { sha512 as jsSha512 } from 'js-sha512';

/**
 * SHA-256 hash (replacement for crypto.subtle.digest('SHA-256', ...))
 */
export function sha256(data: Uint8Array): Uint8Array {
    const hex = jsSha256(data);
    return hexToBytes(hex);
}

/**
 * SHA-512 hash (replacement for crypto.subtle.digest('SHA-512', ...))
 */
export function sha512(data: Uint8Array): Uint8Array {
    const hex = jsSha512(data);
    return hexToBytes(hex);
}

/**
 * Convert hex string to Uint8Array
 */
function hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return bytes;
}

/**
 * Convert Uint8Array to hex string
 */
export function bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Simple XOR-based encryption (fallback when AES-GCM not available)
 * NOT cryptographically secure for production - use for testing only
 * 
 * In production, use a native crypto module or realm
 */
export function xorEncrypt(data: Uint8Array, key: Uint8Array): Uint8Array {
    const result = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
        result[i] = data[i] ^ key[i % key.length];
    }
    return result;
}

/**
 * XOR decrypt (same as encrypt for XOR)
 */
export function xorDecrypt(data: Uint8Array, key: Uint8Array): Uint8Array {
    return xorEncrypt(data, key);
}

/**
 * Derive a key using HKDF-like expansion
 * Uses SHA-256 for key derivation
 */
export function deriveKey(
    secret: Uint8Array,
    info: Uint8Array,
    length: number = 32
): Uint8Array {
    const combined = new Uint8Array(secret.length + info.length);
    combined.set(secret);
    combined.set(info, secret.length);

    const hash = sha256(combined);
    return hash.slice(0, length);
}

/**
 * Simple encrypt function that works in React Native
 * Uses XOR with derived key - for testing/demo only
 */
export function simpleEncrypt(
    plaintext: Uint8Array,
    key: Uint8Array,
    sequence: number
): Uint8Array {
    // Derive sequence-specific key
    const seqBytes = new Uint8Array(8);
    new DataView(seqBytes.buffer).setBigUint64(0, BigInt(sequence), false);
    const seqKey = deriveKey(key, seqBytes);

    // XOR encrypt
    const encrypted = xorEncrypt(plaintext, seqKey);

    // Prepend sequence number for decryption
    const result = new Uint8Array(4 + encrypted.length);
    new DataView(result.buffer).setUint32(0, sequence, false);
    result.set(encrypted, 4);

    return result;
}

/**
 * Simple decrypt function that works in React Native
 */
export function simpleDecrypt(
    ciphertext: Uint8Array,
    key: Uint8Array
): { plaintext: Uint8Array; sequence: number } | null {
    if (ciphertext.length < 5) return null;

    // Extract sequence
    const sequence = new DataView(ciphertext.buffer, ciphertext.byteOffset).getUint32(0, false);
    const encrypted = ciphertext.slice(4);

    // Derive sequence-specific key
    const seqBytes = new Uint8Array(8);
    new DataView(seqBytes.buffer).setBigUint64(0, BigInt(sequence), false);
    const seqKey = deriveKey(key, seqBytes);

    // XOR decrypt
    const plaintext = xorDecrypt(encrypted, seqKey);

    return { plaintext, sequence };
}

export default {
    sha256,
    sha512,
    deriveKey,
    simpleEncrypt,
    simpleDecrypt,
    bytesToHex,
    xorEncrypt,
    xorDecrypt,
};
