/**
 * Connection Request Manager
 * Handles pending connection requests that need user acceptance
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Peer } from './types';

export type ConnectionRequestStatus = 'pending' | 'accepted' | 'rejected';

export interface ConnectionRequest {
    id: string;
    fromPeerId: string;        // WyreSup ID of requester
    fromPublicKey: string;     // Base64 public key
    timestamp: number;
    status: ConnectionRequestStatus;
    message?: string;          // Optional intro message
}

const STORAGE_KEY = 'wyresup_connection_requests';

// In-memory cache
let requests: ConnectionRequest[] = [];
let listeners: ((reqs: ConnectionRequest[]) => void)[] = [];

/**
 * Load requests from storage
 */
export async function loadRequests(): Promise<ConnectionRequest[]> {
    try {
        const data = await AsyncStorage.getItem(STORAGE_KEY);
        requests = data ? JSON.parse(data) : [];
    } catch (e) {
        requests = [];
    }
    return requests;
}

/**
 * Save requests to storage
 */
async function saveRequests(): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
    listeners.forEach(l => l([...requests]));
}

/**
 * Add incoming connection request
 */
export async function addRequest(
    fromPeerId: string,
    fromPublicKey: string,
    message?: string
): Promise<ConnectionRequest> {
    const request: ConnectionRequest = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        fromPeerId,
        fromPublicKey,
        timestamp: Date.now(),
        status: 'pending',
        message,
    };

    // Don't duplicate
    if (!requests.find(r => r.fromPeerId === fromPeerId && r.status === 'pending')) {
        requests.push(request);
        await saveRequests();
    }

    return request;
}

/**
 * Accept a connection request
 */
export async function acceptRequest(requestId: string): Promise<Peer | null> {
    const request = requests.find(r => r.id === requestId);
    if (!request) return null;

    request.status = 'accepted';
    await saveRequests();

    // Convert to Peer
    const peer: Peer = {
        id: request.fromPeerId,
        publicKey: request.fromPublicKey,
        lastSeen: Date.now(),
        isFollowing: false,
        isFollower: true,
    };

    return peer;
}

/**
 * Reject a connection request
 */
export async function rejectRequest(requestId: string): Promise<void> {
    const request = requests.find(r => r.id === requestId);
    if (request) {
        request.status = 'rejected';
        await saveRequests();
    }
}

/**
 * Get pending requests
 */
export function getPendingRequests(): ConnectionRequest[] {
    return requests.filter(r => r.status === 'pending');
}

/**
 * Subscribe to request changes
 */
export function onRequestsChange(
    listener: (reqs: ConnectionRequest[]) => void
): () => void {
    listeners.push(listener);
    return () => {
        listeners = listeners.filter(l => l !== listener);
    };
}
