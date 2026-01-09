/**
 * شَاهِد (SHAHID) - Witness-Based Discovery Protocol
 * 
 * From Lisan al-Arab:
 * الشهيد من أَسماء الله: "The Witness from the names of Allah"
 * 
 * Novel decentralized discovery:
 * - No central server
 * - Peers witness each other's existence
 * - Chain of witnesses (سِلْسِلَة) spreads organically
 * - Traces (أَثَر) decay over time
 */

import { EventEmitter } from 'events';
import { WyreSUpIdentity } from '../utils/Identity';
import { getNAT, NafadhInfo } from './NafadhNAT';
import * as ed from '@noble/ed25519';

// Witness record TTL (time to live)
export const ATHAR_TTL = 300000; // 5 minutes (trace fades)

/**
 * شَهَادَة (Shahadat) - Witness Attestation
 * A signed statement that "I witnessed peer X at IP:port at time T"
 */
export interface Shahadat {
    witnessId: string;        // Who is witnessing
    peerId: string;           // Who is being witnessed
    publicIP: string;         // Where they were seen
    publicPort: number;
    timestamp: number;        // When witnessed
    signature: string;        // Cryptographic proof
    expiresAt: number;        // When this trace فades
}

/**
 * أَثَر (Athar) - Trace/Footprint
 * Collected information about a peer's location
 */
export interface Athar {
    peerId: string;
    lastKnownIP: string;
    lastKnownPort: number;
    lastSeen: number;
    witnesses: Shahadat[];    // Multiple witnesses for trust
    confidence: number;       // 0-1 based on witness count and recency
}

/**
 * شَاهِد (Shahid) - The Witness Manager
 */
export class Shahid extends EventEmitter {
    private identity: WyreSUpIdentity | null = null;
    private knownPeers: Map<string, Athar> = new Map();
    private myWitnesses: Shahadat[] = [];
    private bootstrapPeers: string[] = [];

    /**
     * تَهْيِئَة (Tahyi'a) - Initialize with identity
     */
    async tahyia(identity: WyreSUpIdentity): Promise<void> {
        this.identity = identity;
        console.log(`[SHAHID] تَهْيِئَة - Initialized for ${identity.fullId}`);
    }

    /**
     * إِضَافَة بَذْرَة (Idafat Badhra) - Add bootstrap peer by IP
     * The "seed" to start the witness chain
     */
    addBootstrap(ip: string, port: number = 5188): void {
        const addr = `${ip}:${port}`;
        if (!this.bootstrapPeers.includes(addr)) {
            this.bootstrapPeers.push(addr);
            console.log(`[SHAHID] بَذْرَة (Seed) added: ${addr}`);
        }
    }

    /**
     * شَهِدَ (Shahida) - Create witness attestation for a peer
     * "I witness that this peer exists at this IP"
     */
    async shahida(
        peerId: string,
        publicIP: string,
        publicPort: number
    ): Promise<Shahadat | null> {
        if (!this.identity) {
            console.error('[SHAHID] Not initialized');
            return null;
        }

        const timestamp = Date.now();
        const message = `SHAHID:${this.identity.fullId}:${peerId}:${publicIP}:${publicPort}:${timestamp}`;

        // Sign the attestation
        const msgBytes = new TextEncoder().encode(message);
        const signature = await ed.signAsync(msgBytes, this.identity.privateKey);

        const shahadat: Shahadat = {
            witnessId: this.identity.fullId,
            peerId,
            publicIP,
            publicPort,
            timestamp,
            signature: Buffer.from(signature).toString('base64'),
            expiresAt: timestamp + ATHAR_TTL,
        };

        console.log(`[SHAHID] شَهِدَ - Witnessed ${peerId} at ${publicIP}:${publicPort}`);

        // Store the attestation
        this.updateAthar(peerId, shahadat);

        return shahadat;
    }

    /**
     * Update trace with new witness
     */
    private updateAthar(peerId: string, shahadat: Shahadat): void {
        let athar = this.knownPeers.get(peerId);

        if (!athar) {
            athar = {
                peerId,
                lastKnownIP: shahadat.publicIP,
                lastKnownPort: shahadat.publicPort,
                lastSeen: shahadat.timestamp,
                witnesses: [],
                confidence: 0,
            };
            this.knownPeers.set(peerId, athar);
        }

        // Add witness
        athar.witnesses.push(shahadat);

        // Update if newer
        if (shahadat.timestamp > athar.lastSeen) {
            athar.lastKnownIP = shahadat.publicIP;
            athar.lastKnownPort = shahadat.publicPort;
            athar.lastSeen = shahadat.timestamp;
        }

        // Calculate confidence
        athar.confidence = this.calculateConfidence(athar);

        this.emit('athar-updated', athar);
    }

    /**
     * Calculate confidence based on witnesses and recency
     */
    private calculateConfidence(athar: Athar): number {
        const now = Date.now();

        // Filter valid (non-expired) witnesses
        const validWitnesses = athar.witnesses.filter(w => w.expiresAt > now);

        if (validWitnesses.length === 0) return 0;

        // More witnesses = more confidence (max at 5)
        const witnessFactor = Math.min(validWitnesses.length / 5, 1);

        // More recent = more confidence
        const age = now - athar.lastSeen;
        const recencyFactor = Math.max(0, 1 - (age / ATHAR_TTL));

        return witnessFactor * 0.5 + recencyFactor * 0.5;
    }

    /**
     * طَلَب (Talab) - Request peer location
     * Ask witnesses about a peer's location
     */
    async talab(peerId: string): Promise<Athar | null> {
        // First check local cache
        const cached = this.knownPeers.get(peerId);
        if (cached && cached.confidence > 0.5) {
            console.log(`[SHAHID] طَلَب - Found ${peerId} in cache (confidence: ${cached.confidence.toFixed(2)})`);
            return cached;
        }

        console.log(`[SHAHID] طَلَب - Searching for ${peerId}...`);

        // Ask bootstrap peers
        // In real implementation, would send UDP query to all known peers

        return cached || null;
    }

    /**
     * Get all known peers
     */
    getAllPeers(): Athar[] {
        return Array.from(this.knownPeers.values());
    }

    /**
     * Get bootstrap peers
     */
    getBootstrapPeers(): string[] {
        return this.bootstrapPeers;
    }

    /**
     * Clean expired traces
     */
    cleanExpired(): void {
        const now = Date.now();

        for (const [peerId, athar] of this.knownPeers) {
            athar.witnesses = athar.witnesses.filter(w => w.expiresAt > now);
            athar.confidence = this.calculateConfidence(athar);

            if (athar.confidence === 0) {
                this.knownPeers.delete(peerId);
                console.log(`[SHAHID] أَثَر (Trace) expired for ${peerId}`);
            }
        }
    }
}

// Singleton
let instance: Shahid | null = null;

export function getShahid(): Shahid {
    if (!instance) {
        instance = new Shahid();
    }
    return instance;
}
