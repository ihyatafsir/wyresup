/**
 * مَوْعِد الكَشْف (Maw'id al-Kashf)
 * Decentralized Peer Discovery
 * 
 * Based on Lisan al-Arab research:
 * - مَوْعِد (Maw'id): Appointed meeting point - IP-derived rendezvous
 * - حُضُور (Hudur): Presence - register availability
 * - مَنارة (Manara): Lighthouse beacon - broadcast
 * - لِقَاء (Liqa): Meeting - connection established
 */

import { sha256 } from '../utils/CryptoShim';

// Configuration
const BASE_PORT = 9000;
const PORT_RANGE = 1000;
const BEACON_INTERVAL = 30000; // 30 seconds
const PRESENCE_TTL = 60000; // 60 seconds

// Manara servers for HTTP fallback (when UDP not available)
// In dev: Use local manaraServer.js (10.0.2.2 = host from Android emulator)
// In prod: Use Cloudflare Workers
const IS_DEV = __DEV__ ?? true;
const MANARA_SERVERS = IS_DEV
    ? ['http://10.0.2.2:5191']  // Local test server
    : ['https://manara.wyrenet.workers.dev'];


export interface Peer {
    peerId: string;
    publicKey: string;
    ip?: string;
    mawIdPort: number;
    lastSeen: number;
}

// Local state
let myPeerId: string = '';
let myPublicKey: string = '';
let myMawIdPort: number = 0;
let discoveredPeers: Map<string, Peer> = new Map();
let beaconInterval: NodeJS.Timeout | null = null;

/**
 * اِسْتِطْلاع (Istitlaa) - Reconnaissance
 * Get public IP address to determine maw'id point
 */
export async function istitlaa(): Promise<string> {
    console.log('[MAWID] اِسْتِطْلاع (Istitlaa) - Getting public IP...');

    try {
        // Try multiple IP detection services
        const services = [
            'https://api.ipify.org?format=text',
            'https://icanhazip.com',
            'https://ifconfig.me/ip',
        ];

        for (const service of services) {
            try {
                const response = await fetch(service, {
                    signal: AbortSignal.timeout(5000)
                });
                if (response.ok) {
                    const ip = (await response.text()).trim();
                    console.log(`[MAWID] ✓ Public IP: ${ip}`);
                    return ip;
                }
            } catch {
                continue;
            }
        }

        throw new Error('All IP services failed');
    } catch (error) {
        console.log('[MAWID] ✗ Could not determine public IP, using fallback');
        return '0.0.0.0';
    }
}

/**
 * مَوْعِد (Maw'id) - Calculate Rendezvous Point
 * Derives deterministic port from IP prefix
 * 
 * From Lisan: "الميعادُ: وقت الوعد وموضعه"
 * "The mi'ad is the time and place of the promise"
 */
export function mawId(publicIP: string): number {
    // Use first 2 octets (carrier prefix) for clustering
    const prefix = publicIP.split('.').slice(0, 2).join('.');
    const hash = sha256(new TextEncoder().encode(prefix));
    const hashNum = parseInt(Buffer.from(hash.slice(0, 4)).toString('hex'), 16);
    const port = BASE_PORT + (hashNum % PORT_RANGE);

    console.log(`[MAWID] مَوْعِد for ${prefix}.x.x → port ${port}`);
    return port;
}

/**
 * مَنارة (Manara) - Create Beacon Message
 * 
 * From Lisan: "المَنَارَة: موضع النُّور"
 * "The lighthouse is the place of light"
 */
export function manara(peerId: string, publicKey: string): object {
    return {
        type: 'MANARA',
        peerId,
        publicKey,
        mawIdPort: myMawIdPort,
        timestamp: Date.now(),
        ttl: PRESENCE_TTL,
    };
}

/**
 * حُضُور (Hudur) - Register Presence via HTTP
 * Fallback when UDP is not available (React Native)
 * 
 * From Lisan: "المكان المحضور" - "The attended place"
 */
export async function hudur(peerId: string, publicKey: string): Promise<Peer[]> {
    if (!myMawIdPort) {
        const ip = await istitlaa();
        myMawIdPort = mawId(ip);
    }

    const beacon = manara(peerId, publicKey);
    const server = MANARA_SERVERS[myMawIdPort % MANARA_SERVERS.length];

    console.log(`[MAWID] حُضُور (Hudur) - Registering at ${server}/mawid/${myMawIdPort}`);

    try {
        // POST my presence
        await fetch(`${server}/mawid/${myMawIdPort}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(beacon),
        });

        // GET other peers at same maw'id
        const response = await fetch(`${server}/mawid/${myMawIdPort}`);
        const peers: Peer[] = await response.json();

        // Filter self and update local cache
        const otherPeers = peers.filter(p => p.peerId !== peerId);
        for (const peer of otherPeers) {
            discoveredPeers.set(peer.peerId, peer);
            console.log(`[MAWID] ✓ Found peer: ${peer.peerId.split('@')[0]}`);
        }

        return otherPeers;
    } catch (error) {
        console.log('[MAWID] ✗ Hudur failed:', error);
        return [];
    }
}

/**
 * لِقَاء (Liqa) - Initiate Connection
 * Called when peer is discovered
 * 
 * From Lisan: "لَقِيَ فلاناً" - "Met someone"
 */
export async function liqa(peer: Peer): Promise<boolean> {
    console.log(`[MAWID] لِقَاء (Liqa) - Connecting to ${peer.peerId.split('@')[0]}`);

    // Store peer in discovered list
    discoveredPeers.set(peer.peerId, {
        ...peer,
        lastSeen: Date.now(),
    });

    // Return true to indicate peer is ready for connection
    // The actual Miftah key exchange happens in P2PConnectionScreen
    return true;
}

/**
 * بَدْء (Bad') - Start Discovery
 * Initialize discovery system
 */
export async function bad(peerId: string, publicKey: string): Promise<void> {
    console.log('[MAWID] بَدْء (Bad\') - Starting discovery...');

    myPeerId = peerId;
    myPublicKey = publicKey;

    // Get IP and calculate maw'id
    const ip = await istitlaa();
    myMawIdPort = mawId(ip);

    // Initial presence registration
    await hudur(peerId, publicKey);

    // Start periodic beacon
    beaconInterval = setInterval(async () => {
        await hudur(peerId, publicKey);
    }, BEACON_INTERVAL);

    console.log(`[MAWID] ✓ Discovery active on مَوْعِد port ${myMawIdPort}`);
}

/**
 * وَقْف (Waqf) - Stop Discovery
 */
export function waqf(): void {
    console.log('[MAWID] وَقْف (Waqf) - Stopping discovery');

    if (beaconInterval) {
        clearInterval(beaconInterval);
        beaconInterval = null;
    }

    discoveredPeers.clear();
}

/**
 * Get all discovered peers
 */
export function getPeers(): Peer[] {
    const now = Date.now();
    // Filter expired peers
    const activePeers: Peer[] = [];

    for (const [id, peer] of discoveredPeers) {
        if (now - peer.lastSeen < PRESENCE_TTL * 2) {
            activePeers.push(peer);
        } else {
            discoveredPeers.delete(id);
        }
    }

    return activePeers;
}

/**
 * Get my maw'id port
 */
export function getMyMawIdPort(): number {
    return myMawIdPort;
}

// Export as namespace for convenience
export const MawId = {
    istitlaa,
    mawId,
    manara,
    hudur,
    liqa,
    bad,
    waqf,
    getPeers,
    getMyMawIdPort,
};

export default MawId;
