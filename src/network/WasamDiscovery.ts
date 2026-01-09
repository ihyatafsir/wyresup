/**
 * وَسْم القَرار (Wasam al-Qarar) - Novel Distributed Discovery
 * 
 * From Lisan al-Arab:
 * - وَسْم (Wasam): "الوَسْمُ: التأْثير، وَسَمَه وَسْماً" - Branding/marking
 * - قَرار (Qarar): "القَرارُ: المُسْتَقَرّ" - Stable/settled place
 * - أَمَارَة (Amara): "العلامة" - Appointed meeting sign
 * 
 * NOVEL APPROACH: Uses carrier CGNAT IP clustering + DNS TXT as distributed registry
 * NO central server - DNS is inherently distributed infrastructure!
 */

import { sha256 } from '../utils/CryptoShim';

// Configuration
const DNS_BASE = 'wasm.wyrenet.io';  // DNS zone for discovery
const WASAM_TTL = 300000; // 5 minutes peer validity
const CACHE_DURATION = 60000; // 1 minute DNS cache

export interface WasamPeer {
    peerId: string;
    publicKey: string;
    wasam: string;  // Carrier brand (4 hex chars)
    endpoint?: string;
    timestamp: number;
    sameCarrier: boolean;
}

// Local state
let myWasam: string = '';
let myPeerId: string = '';
let myPublicKey: string = '';
let discoveredPeers: Map<string, WasamPeer> = new Map();
let dnsCache: Map<string, { data: any; expires: number }> = new Map();

/**
 * وَسْم (Wasam) - Calculate carrier brand from IP
 * Uses first 2 octets (carrier CGNAT prefix) to create deterministic brand
 * 
 * From Lisan: "وَسَمَه وَسْماً: أثَّر فيه بِسِمَةٍ"
 * "To brand something with a mark"
 */
export async function wasam(): Promise<string> {
    console.log('[وَسْم] Calculating carrier brand...');

    try {
        // Get public IP
        const ip = await getPublicIP();

        // Extract carrier prefix (first 2 octets)
        const prefix = ip.split('.').slice(0, 2).join('.');

        // Hash to create 4-character brand
        const hash = sha256(new TextEncoder().encode(`wasam:${prefix}`));
        const brand = Buffer.from(hash.slice(0, 2)).toString('hex');

        console.log(`[وَسْم] IP prefix ${prefix}.x.x → brand: ${brand}`);
        myWasam = brand;
        return brand;

    } catch (error) {
        console.log('[وَسْم] Could not determine brand, using fallback');
        myWasam = '0000';
        return '0000';
    }
}

/**
 * أَمَارَة (Amara) - DNS TXT as distributed appointment marker
 * Query DNS for peers with same brand (carrier)
 * 
 * From Lisan: "الأَمَارُ والأَمَارةُ: العلامة"
 * "A sign/marker at the appointed place"
 */
export async function amara(brand: string): Promise<WasamPeer[]> {
    const domain = `${brand}.${DNS_BASE}`;
    console.log(`[أَمَارَة] Querying DNS: ${domain}`);

    // Check cache first
    const cached = dnsCache.get(domain);
    if (cached && cached.expires > Date.now()) {
        console.log('[أَمَارَة] Using cached DNS response');
        return cached.data;
    }

    try {
        // Query DNS-over-HTTPS (Cloudflare)
        const response = await fetch(
            `https://cloudflare-dns.com/dns-query?name=${domain}&type=TXT`,
            {
                headers: { 'Accept': 'application/dns-json' },
                signal: AbortSignal.timeout(5000),
            }
        );

        if (!response.ok) {
            return [];
        }

        const data = await response.json();
        const peers: WasamPeer[] = [];

        // Parse TXT records for peer info
        if (data.Answer) {
            for (const answer of data.Answer) {
                if (answer.type === 16) { // TXT record
                    try {
                        const peerData = JSON.parse(answer.data.replace(/"/g, ''));
                        peers.push({
                            ...peerData,
                            wasam: brand,
                            sameCarrier: brand === myWasam,
                        });
                    } catch {
                        // Skip invalid records
                    }
                }
            }
        }

        // Cache result
        dnsCache.set(domain, { data: peers, expires: Date.now() + CACHE_DURATION });

        console.log(`[أَمَارَة] Found ${peers.length} peers at ${domain}`);
        return peers;

    } catch (error) {
        console.log('[أَمَارَة] DNS query failed:', error);
        return [];
    }
}

/**
 * Generate shareable link with embedded وَسْم (brand)
 * Link encodes network topology information!
 */
export function generateWasamLink(peerId: string, publicKey: string, brand: string): string {
    const data = {
        p: peerId,
        k: publicKey.slice(0, 32),
        w: brand,  // وَسْم embedded in link
        t: Date.now(),
    };

    const encoded = Buffer.from(JSON.stringify(data)).toString('base64url');

    // Novel: Brand is visible in URL for carrier-aware routing
    return `https://wyrenet.io/w/${brand}#${encoded}`;
}

/**
 * Parse shareable link and detect carrier match
 */
export function parseWasamLink(url: string): WasamPeer | null {
    try {
        // Extract brand from URL path
        const pathMatch = url.match(/\/w\/([a-f0-9]{4})#/);
        if (!pathMatch) return null;

        const peerBrand = pathMatch[1];
        const hash = url.split('#')[1];
        if (!hash) return null;

        const data = JSON.parse(Buffer.from(hash, 'base64url').toString());

        return {
            peerId: data.p,
            publicKey: data.k,
            wasam: peerBrand,
            timestamp: data.t || Date.now(),
            sameCarrier: peerBrand === myWasam,
        };
    } catch {
        return null;
    }
}

/**
 * عَقْد الوَصْل (Aqd al-Wasl) - Establish connection
 * Uses carrier info for optimal routing
 */
export async function aqdWasl(peer: WasamPeer): Promise<{ strategy: string; peer: WasamPeer }> {
    console.log(`[عَقْد الوَصْل] Connecting to ${peer.peerId.split('@')[0]}`);

    // Store peer
    discoveredPeers.set(peer.peerId, {
        ...peer,
        timestamp: Date.now(),
    });

    // Determine connection strategy based on carrier match
    let strategy: string;

    if (peer.sameCarrier) {
        strategy = 'DIRECT';  // Same carrier = likely same NAT, try direct
        console.log('[عَقْد الوَصْل] Same carrier → attempting direct connection');
    } else {
        strategy = 'RELAY';   // Different carrier = NAT traversal needed
        console.log('[عَقْد الوَصْل] Different carrier → using relay');
    }

    return { strategy, peer };
}

/**
 * Start discovery
 */
export async function badWasam(peerId: string, publicKey: string): Promise<void> {
    console.log('[وَسْم القَرار] Starting distributed discovery...');

    myPeerId = peerId;
    myPublicKey = publicKey;

    // Calculate our carrier brand
    await wasam();

    // Query DNS for same-brand peers
    const sameBrandPeers = await amara(myWasam);

    // Store discovered peers
    for (const peer of sameBrandPeers) {
        if (peer.peerId !== peerId) {
            discoveredPeers.set(peer.peerId, peer);
        }
    }

    console.log(`[وَسْم القَرار] Active with brand ${myWasam}, found ${sameBrandPeers.length} peers`);
}

/**
 * Get helper for public IP
 */
async function getPublicIP(): Promise<string> {
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
                return (await response.text()).trim();
            }
        } catch {
            continue;
        }
    }

    return '0.0.0.0';
}

/**
 * Get my discovery link
 */
export function getMyLink(): string {
    if (!myPeerId || !myPublicKey || !myWasam) {
        throw new Error('Discovery not started');
    }
    return generateWasamLink(myPeerId, myPublicKey, myWasam);
}

/**
 * Get my brand
 */
export function getMyWasam(): string {
    return myWasam;
}

/**
 * Get all discovered peers
 */
export function getPeers(): WasamPeer[] {
    const now = Date.now();
    const active: WasamPeer[] = [];

    for (const [id, peer] of Array.from(discoveredPeers.entries())) {
        if (now - peer.timestamp < WASAM_TTL) {
            active.push(peer);
        } else {
            discoveredPeers.delete(id);
        }
    }

    return active;
}

/**
 * Stop discovery
 */
export function waqfWasam(): void {
    console.log('[وَسْم القَرار] Stopping discovery');
    discoveredPeers.clear();
    dnsCache.clear();
}

// Export as namespace
export const Wasam = {
    wasam,
    amara,
    aqdWasl,
    badWasam,
    waqfWasam,
    getMyLink,
    getMyWasam,
    getPeers,
    generateWasamLink,
    parseWasamLink,
};

export default Wasam;
