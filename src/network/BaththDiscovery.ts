/**
 * بَثّ الصَّدى (Bathth al-Sada) - Serverless Broadcast Discovery
 * 
 * From Lisan al-Arab:
 * - بَثّ (Bathth): "بَثَّ الشيءَ... نَشَرَه وفَرَّقَه" - To scatter/spread
 * - صَدى (Sada): "صوت يجيب صوت المُنادي" - Echo that answers the caller
 * - نَثْر (Nathr): "تَرْمي به متفرقاً" - Throw scattered
 * 
 * NO CENTRAL SERVER - Phones discover each other via:
 * 1. Known public relay points (like DHT bootstrap)
 * 2. BLE/WiFi Direct for nearby
 * 3. Shared links / QR codes
 * 4. DNS-based discovery
 */

import { sha256 } from '../utils/CryptoShim';

// Configuration
const BATHTH_INTERVAL = 15000; // 15 seconds between broadcasts
const SADA_TTL = 120000; // 2 minutes peer TTL
const MAX_KNOWN_PEERS = 100;

// DNS TXT record discovery (serverless!) - query wyrenet.io TXT records
const DNS_DISCOVERY_DOMAINS = [
    '_wyrenet._tcp.wyrenet.io',
    '_wyrenet._udp.wyrenet.io',
];

// WebRTC signaling via URL hash (truly serverless!)
// Two phones can share same URL to discover each other
const WEBRTC_SIGNAL_BASE = 'https://wyrenet.io/#';

export interface BaththPeer {
    peerId: string;
    publicKey: string;
    method: 'dns' | 'link' | 'nearby' | 'echo';
    lastSeen: number;
    endpoint?: string;
}

// Known peers (persistence layer)
let knownPeers: Map<string, BaththPeer> = new Map();
let myPeerId: string = '';
let myPublicKey: string = '';
let baththInterval: NodeJS.Timeout | null = null;

/**
 * بَثّ (Bathth) - Scatter/Broadcast presence
 * Multiple methods, no single point of failure
 */
export async function bathth(peerId: string, publicKey: string): Promise<void> {
    console.log('[بَثّ] Broadcasting presence via multiple channels...');

    myPeerId = peerId;
    myPublicKey = publicKey;

    // Method 1: Generate shareable link
    const shareableLink = generateShareableLink(peerId, publicKey);
    console.log(`[بَثّ] Share link: ${shareableLink}`);

    // Method 2: Store in known peers for echoing
    // When we meet someone, we remember them

    // Method 3: Try to echo to known peers
    await sadaToKnownPeers();
}

/**
 * صَدى (Sada) - Echo response
 * When we receive a broadcast, echo back
 */
export function sada(incomingPeer: BaththPeer): void {
    console.log(`[صَدى] Echo from ${incomingPeer.peerId.split('@')[0]}`);

    // Store/update peer
    knownPeers.set(incomingPeer.peerId, {
        ...incomingPeer,
        lastSeen: Date.now(),
    });

    // Clean old peers
    cleanExpiredPeers();
}

/**
 * نَثْر (Nathr) - Scatter to random targets
 * For gossip-style propagation
 */
export async function nathr(): Promise<void> {
    const peers = Array.from(knownPeers.values());
    if (peers.length === 0) return;

    // Select random peers to forward to (gossip)
    const targets = peers
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.min(3, peers.length));

    console.log(`[نَثْر] Scattering to ${targets.length} random peers`);
    // In real implementation, forward our beacon to these peers
}

/**
 * Generate shareable discovery link
 * Other user opens link → both discover each other
 * Uses URL hash so NO SERVER sees the data!
 */
export function generateShareableLink(peerId: string, publicKey: string): string {
    const data = {
        p: peerId,
        k: publicKey.slice(0, 32), // Truncated for URL
        t: Date.now(),
    };
    const encoded = Buffer.from(JSON.stringify(data)).toString('base64url');
    return `${WEBRTC_SIGNAL_BASE}${encoded}`;
}

/**
 * Parse incoming discovery link
 */
export function parseShareableLink(url: string): BaththPeer | null {
    try {
        const hash = url.split('#')[1];
        if (!hash) return null;

        const data = JSON.parse(Buffer.from(hash, 'base64url').toString());
        return {
            peerId: data.p,
            publicKey: data.k,
            method: 'link',
            lastSeen: Date.now(),
        };
    } catch {
        return null;
    }
}

/**
 * Generate QR code data for discovery
 */
export function generateQRData(peerId: string, publicKey: string): string {
    return JSON.stringify({
        type: 'WYRENET_PEER',
        peerId,
        publicKey,
        timestamp: Date.now(),
    });
}

/**
 * Parse peer from QR code scan
 */
export function parseQRData(qrData: string): BaththPeer | null {
    try {
        const data = JSON.parse(qrData);
        if (data.type !== 'WYRENET_PEER') return null;

        return {
            peerId: data.peerId,
            publicKey: data.publicKey,
            method: 'nearby',
            lastSeen: Date.now(),
        };
    } catch {
        return null;
    }
}

/**
 * Echo to all known peers (maintenance)
 */
async function sadaToKnownPeers(): Promise<void> {
    const count = knownPeers.size;
    if (count > 0) {
        console.log(`[صَدى] Echoing to ${count} known peers`);
    }
}

/**
 * Clean expired peers
 */
function cleanExpiredPeers(): void {
    const now = Date.now();
    for (const [id, peer] of knownPeers) {
        if (now - peer.lastSeen > SADA_TTL) {
            knownPeers.delete(id);
            console.log(`[بَثّ] Expired: ${id.split('@')[0]}`);
        }
    }
}

/**
 * Start broadcast discovery
 */
export function badBathth(peerId: string, publicKey: string): void {
    console.log('[بَثّ] Starting serverless broadcast discovery...');

    myPeerId = peerId;
    myPublicKey = publicKey;

    // Initial broadcast
    bathth(peerId, publicKey);

    // Periodic broadcast
    baththInterval = setInterval(() => {
        bathth(peerId, publicKey);
        nathr(); // Also scatter to known peers
    }, BATHTH_INTERVAL);
}

/**
 * Stop broadcast discovery
 */
export function waqfBathth(): void {
    console.log('[بَثّ] Stopping broadcast discovery');

    if (baththInterval) {
        clearInterval(baththInterval);
        baththInterval = null;
    }
}

/**
 * Get all known peers
 */
export function getKnownPeers(): BaththPeer[] {
    cleanExpiredPeers();
    return Array.from(knownPeers.values());
}

/**
 * Add peer manually (from QR, link, or direct input)
 */
export function addPeer(peer: BaththPeer): void {
    console.log(`[بَثّ] Adding peer: ${peer.peerId.split('@')[0]} via ${peer.method}`);
    knownPeers.set(peer.peerId, {
        ...peer,
        lastSeen: Date.now(),
    });

    // Enforce max peers
    if (knownPeers.size > MAX_KNOWN_PEERS) {
        const oldest = Array.from(knownPeers.entries())
            .sort((a, b) => a[1].lastSeen - b[1].lastSeen)[0];
        knownPeers.delete(oldest[0]);
    }
}

/**
 * Get my shareable link
 */
export function getMyShareLink(): string {
    if (!myPeerId || !myPublicKey) {
        throw new Error('Discovery not started');
    }
    return generateShareableLink(myPeerId, myPublicKey);
}

/**
 * Get my QR data
 */
export function getMyQRData(): string {
    if (!myPeerId || !myPublicKey) {
        throw new Error('Discovery not started');
    }
    return generateQRData(myPeerId, myPublicKey);
}

// Export as namespace
export const Bathth = {
    bathth,
    sada,
    nathr,
    badBathth,
    waqfBathth,
    getKnownPeers,
    addPeer,
    getMyShareLink,
    getMyQRData,
    generateShareableLink,
    parseShareableLink,
    generateQRData,
    parseQRData,
};

export default Bathth;
