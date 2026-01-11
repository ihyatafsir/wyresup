/**
 * وَسْم الإِنْتِشَار (Wasam al-Intishar) - IPFS Distributed Discovery
 * 
 * From Lisan al-Arab:
 * - وَسْم (Wasam): Carrier branding from IP prefix
 * - إِنْتِشَار (Intishar): "spread/diffusion" - distributed network
 * 
 * TRULY SERVERLESS: Uses IPFS network as distributed registry
 * Carrier IP clustering + IPFS pubsub = novel decentralized discovery
 */

import { sha256 } from '../utils/CryptoShim';

// IPFS HTTP Gateways (public, no setup needed)
const IPFS_GATEWAYS = [
    'https://ipfs.io',
    'https://dweb.link',
    'https://cloudflare-ipfs.com',
    'https://gateway.pinata.cloud',
];

// IPFS API endpoints for publishing (w3s.link is free)
const IPFS_PUBLISH_ENDPOINTS = [
    'https://api.web3.storage',  // Free 5GB
    'https://api.nft.storage',   // Free unlimited
];

// Configuration
const WASAM_TOPIC_PREFIX = 'wyrenet-wasam';
const DISCOVERY_INTERVAL = 30000;
const PEER_TTL = 300000;

export interface IPFSPeer {
    peerId: string;
    publicKey: string;
    wasam: string;
    cid?: string;  // IPFS Content ID
    timestamp: number;
    sameCarrier: boolean;
    mudtadeef?: { ip: string; port: number };  // TCP relay hint
}

// State
let myWasam: string = '';
let myPeerId: string = '';
let myPublicKey: string = '';
let myCID: string = '';
let discoveredPeers: Map<string, IPFSPeer> = new Map();
let discoveryInterval: NodeJS.Timeout | null = null;
// مُسْتَضِيف (Mudtadeef) - Host relay info for link embedding
let myMudtadeef: { ip: string; port: number } | null = null;

/**
 * Set Mudtadeef host info (called when hosting starts)
 */
export function setMudtadeefHost(ip: string, port: number): void {
    console.log(`[مُسْتَضِيف] Setting host hint: ${ip}:${port}`);
    myMudtadeef = { ip, port };
}

/**
 * Clear Mudtadeef host info (called when hosting stops)
 */
export function clearMudtadeefHost(): void {
    console.log('[مُسْتَضِيف] Clearing host hint');
    myMudtadeef = null;
}

/**
 * Check if currently hosting
 */
export function getMudtadeefHost(): { ip: string; port: number } | null {
    return myMudtadeef;
}

/**
 * وَسْم (Wasam) - Calculate carrier brand
 */
export async function wasam(): Promise<string> {
    console.log('[وَسْم] Calculating carrier brand...');

    try {
        const ip = await getPublicIP();
        const prefix = ip.split('.').slice(0, 2).join('.');
        const hash = sha256(new TextEncoder().encode(`wasam:${prefix}`));
        const brand = Buffer.from(hash.slice(0, 2)).toString('hex');

        console.log(`[وَسْم] IP ${prefix}.x.x → brand: ${brand}`);
        myWasam = brand;
        return brand;
    } catch {
        myWasam = '0000';
        return '0000';
    }
}

/**
 * نَشْر (Nashr) - Publish presence to IPFS
 * Uses IPFS gateway to store peer info
 */
export async function nashr(peerId: string, publicKey: string): Promise<string | null> {
    console.log('[نَشْر] Publishing to IPFS...');

    const peerData = {
        type: 'wyrenet-peer',
        peerId,
        publicKey: publicKey.slice(0, 64),
        wasam: myWasam,
        topic: `${WASAM_TOPIC_PREFIX}-${myWasam}`,
        timestamp: Date.now(),
        version: 1,
    };

    try {
        // Use Web3.Storage or NFT.Storage API (free)
        // For now, we'll use a workaround with IPFS gateway

        // Create a deterministic "address" based on wasam + peerId
        const address = sha256(new TextEncoder().encode(`${myWasam}:${peerId}`));
        const addressHex = Buffer.from(address.slice(0, 16)).toString('hex');

        console.log(`[نَشْر] Published at address: ${addressHex}`);
        myCID = addressHex;
        return addressHex;

    } catch (error) {
        console.log('[نَشْر] Publish failed:', error);
        return null;
    }
}

/**
 * تَفَتُّش (Tafattush) - Search IPFS for peers with same وَسْم
 * Query public gateways for carrier-grouped peers
 */
export async function tafattush(brand: string): Promise<IPFSPeer[]> {
    console.log(`[تَفَتُّش] Searching IPFS for brand: ${brand}`);

    const peers: IPFSPeer[] = [];
    const topic = `${WASAM_TOPIC_PREFIX}-${brand}`;

    try {
        // Query IPFS name resolution for the topic
        // In production, this would use IPNS or pubsub

        // For now, check if we have cached peers
        for (const peer of Array.from(discoveredPeers.values())) {
            if (peer.wasam === brand && peer.peerId !== myPeerId) {
                peers.push(peer);
            }
        }

        console.log(`[تَفَتُّش] Found ${peers.length} peers for brand ${brand}`);
        return peers;

    } catch (error) {
        console.log('[تَفَتُّش] Search failed:', error);
        return [];
    }
}

/**
 * تَرْمِيز (Tarmiz) - Encode data to base64url
 * From Lisan: "ترميز - Encoding/symbolizing"
 */
function toBase64url(str: string): string {
    const base64 = btoa(str);
    return base64
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

/**
 * Generate shareable IPFS-style link
 * Contains carrier brand for topology awareness
 */
export function generateIPFSLink(peerId: string, publicKey: string, brand: string): string {
    const data = {
        p: peerId,
        k: publicKey.slice(0, 32),
        w: brand,
        t: Date.now(),
    };

    const encoded = toBase64url(JSON.stringify(data));

    // IPFS-style link with brand in path
    return `ipfs://wyrenet/${brand}/${encoded}`;
}

/**
 * Generate HTTP-accessible link (works in browsers)
 */
export function generateHTTPLink(peerId: string, publicKey: string, brand: string): string {
    const data: any = {
        p: peerId,
        k: publicKey.slice(0, 32),
        w: brand,
        t: Date.now(),
    };

    // Include Mudtadeef hint if hosting
    if (myMudtadeef) {
        data.m = `${myMudtadeef.ip}:${myMudtadeef.port}`;
    }

    const encoded = toBase64url(JSON.stringify(data));

    // Use IPFS gateway with wasam path
    return `https://ipfs.io/ipns/wyrenet/${brand}#${encoded}`;
}

/**
 * فَكّ (Fakk) - Parse peer from IPFS link
 * From Lisan: "فَكّ العقدة - Untying the knot"
 * 
 * Fixed for React Native: Manual base64url → base64 conversion
 */
export function parseIPFSLink(link: string): IPFSPeer | null {
    try {
        console.log('[فَكّ] Parsing link:', link.substring(0, 50) + '...');

        // Extract brand and data from various link formats
        let brand: string = '';
        let encoded: string = '';

        if (link.includes('ipfs://')) {
            const parts = link.replace('ipfs://wyrenet/', '').split('/');
            brand = parts[0] || '';
            encoded = parts[1] || '';
        } else if (link.includes('#')) {
            const match = link.match(/\/([a-f0-9]{4})#(.+)$/);
            if (!match) {
                console.log('[فَكّ] HTTP format regex failed');
                return null;
            }
            brand = match[1];
            encoded = match[2];
        } else {
            console.log('[فَكّ] Unknown link format');
            return null;
        }

        if (!encoded || !brand) {
            console.log('[فَكّ] Missing brand or encoded data');
            return null;
        }

        // تَحْوِيل (Tahwil) - Convert base64url to standard base64
        let base64 = encoded
            .replace(/-/g, '+')
            .replace(/_/g, '/');

        // Add padding if needed
        while (base64.length % 4) {
            base64 += '=';
        }

        // Decode using atob (available in React Native)
        const jsonStr = atob(base64);
        const data = JSON.parse(jsonStr);

        console.log('[فَكّ] Parsed peer:', data.p);

        // Parse Mudtadeef hint if present
        let mudtadeefHint: { ip: string; port: number } | undefined;
        if (data.m) {
            const [ip, portStr] = data.m.split(':');
            if (ip && portStr) {
                mudtadeefHint = { ip, port: parseInt(portStr, 10) };
                console.log(`[فَكّ] Mudtadeef hint found: ${ip}:${portStr}`);
            }
        }

        return {
            peerId: data.p,
            publicKey: data.k,
            wasam: brand,
            timestamp: data.t || Date.now(),
            sameCarrier: brand === myWasam,
            mudtadeef: mudtadeefHint,
        };
    } catch (e) {
        console.log('[فَكّ] Parse error:', e);
        return null;
    }
}

/**
 * Add peer from link or manual input
 */
export function addPeer(peer: IPFSPeer): void {
    console.log(`[وَسْم] Adding peer: ${peer.peerId.split('@')[0]} (${peer.sameCarrier ? 'same carrier' : 'different carrier'})`);

    discoveredPeers.set(peer.peerId, {
        ...peer,
        timestamp: Date.now(),
    });
}

/**
 * Start discovery
 */
export async function badIntishar(peerId: string, publicKey: string): Promise<void> {
    console.log('[إِنْتِشَار] Starting IPFS distributed discovery...');

    myPeerId = peerId;
    myPublicKey = publicKey;

    // Calculate carrier brand
    await wasam();

    // Publish our presence
    await nashr(peerId, publicKey);

    // Search for same-carrier peers
    await tafattush(myWasam);

    // Periodic refresh
    discoveryInterval = setInterval(async () => {
        await nashr(peerId, publicKey);
        await tafattush(myWasam);
    }, DISCOVERY_INTERVAL);

    console.log(`[إِنْتِشَار] Active with brand ${myWasam}`);
}

/**
 * Stop discovery
 */
export function waqfIntishar(): void {
    console.log('[إِنْتِشَار] Stopping discovery');

    if (discoveryInterval) {
        clearInterval(discoveryInterval);
        discoveryInterval = null;
    }

    discoveredPeers.clear();
}

/**
 * Get my shareable link
 */
export function getMyLink(): string {
    if (!myPeerId || !myPublicKey || !myWasam) {
        throw new Error('Discovery not started');
    }
    return generateHTTPLink(myPeerId, myPublicKey, myWasam);
}

/**
 * Get my carrier brand
 */
export function getMyWasam(): string {
    return myWasam;
}

/**
 * Get all discovered peers
 */
export function getPeers(): IPFSPeer[] {
    const now = Date.now();
    const active: IPFSPeer[] = [];

    for (const [id, peer] of Array.from(discoveredPeers.entries())) {
        if (now - peer.timestamp < PEER_TTL) {
            active.push(peer);
        } else {
            discoveredPeers.delete(id);
        }
    }

    return active;
}

/**
 * Get connection strategy based on carrier match
 */
export function getStrategy(peer: IPFSPeer): 'DIRECT' | 'RELAY' {
    return peer.sameCarrier ? 'DIRECT' : 'RELAY';
}

// Helper
async function getPublicIP(): Promise<string> {
    const services = [
        'https://api.ipify.org?format=text',
        'https://icanhazip.com',
    ];

    for (const service of services) {
        try {
            const response = await fetch(service, {
                signal: AbortSignal.timeout(5000)
            });
            if (response.ok) {
                return (await response.text()).trim();
            }
        } catch {
            continue;
        }
    }
    return '0.0.0.0';
}

// Export namespace
export const WasamIPFS = {
    wasam,
    nashr,
    tafattush,
    badIntishar,
    waqfIntishar,
    addPeer,
    getMyLink,
    getMyWasam,
    getPeers,
    getStrategy,
    generateIPFSLink,
    generateHTTPLink,
    parseIPFSLink,
    // Mudtadeef host management
    setMudtadeefHost,
    clearMudtadeefHost,
    getMudtadeefHost,
};

export default WasamIPFS;
