/**
 * D2D Lite - Device-to-Device Communication for WyreSup
 * "5G NR Lite" approach using WiFi Direct + WiFi Aware
 * 
 * Works on any Android 8+ device (no 5G required!)
 * 
 * Layers:
 * 1. Discovery: WiFi Aware (NAN) for finding nearby peers
 * 2. Connection: WiFi Direct (P2P) for high-speed links
 * 3. Security: WireGuard-style encryption over the connection
 */

import { NativeModules, Platform, PermissionsAndroid, NativeEventEmitter } from 'react-native';
import { Peer } from '../messaging/types';
import { WyreSUpIdentity, signMessage } from '../utils/Identity';

// Connection types in priority order
export type D2DConnectionType = 'wifi_aware' | 'wifi_direct' | 'bluetooth_le' | 'internet';

export interface D2DPeer {
    id: string;                    // WyreSup ID
    connectionType: D2DConnectionType;
    signalStrength: number;        // 0-100
    distance?: number;             // Estimated distance in meters
    endpoint?: string;             // IP:port for established connections
    lastSeen: number;
}

// Discovery state
let isDiscovering = false;
let discoveredPeers: Map<string, D2DPeer> = new Map();
const peerListeners: ((peers: D2DPeer[]) => void)[] = [];

/**
 * Request necessary permissions for D2D
 */
export async function requestD2DPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;

    try {
        const permissions = [
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            PermissionsAndroid.PERMISSIONS.ACCESS_WIFI_STATE,
            PermissionsAndroid.PERMISSIONS.CHANGE_WIFI_STATE,
            PermissionsAndroid.PERMISSIONS.ACCESS_NETWORK_STATE,
            PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES, // Android 13+
        ].filter(Boolean);

        const results = await PermissionsAndroid.requestMultiple(permissions);
        return Object.values(results).every(r => r === 'granted');
    } catch (e) {
        console.error('[D2D] Permission error:', e);
        return false;
    }
}

/**
 * Start discovering nearby WyreSup peers
 */
export async function startDiscovery(myIdentity: WyreSUpIdentity): Promise<boolean> {
    if (isDiscovering) return true;

    console.log('[D2D] Starting peer discovery...');
    console.log(`[D2D] Broadcasting as: ${myIdentity.fullId}`);

    isDiscovering = true;

    // Mock: Simulate finding peers (real implementation needs native module)
    // In production, this would use:
    // 1. WiFi Aware (NAN) - publish service + subscribe
    // 2. WiFi Direct - peer discovery
    // 3. Bluetooth LE - GATT advertising

    simulatePeerDiscovery(myIdentity);

    return true;
}

/**
 * Stop discovery
 */
export function stopDiscovery(): void {
    console.log('[D2D] Stopping peer discovery');
    isDiscovering = false;
}

/**
 * Connect to a discovered peer
 */
export async function connectToPeer(
    myIdentity: WyreSUpIdentity,
    peer: D2DPeer
): Promise<boolean> {
    console.log(`[D2D] Connecting to ${peer.id} via ${peer.connectionType}...`);

    // Mock connection - real implementation would:
    // 1. WiFi Aware: Create NAN data path
    // 2. WiFi Direct: Send connection request
    // 3. After IP connection: Establish encrypted channel

    await new Promise(resolve => setTimeout(resolve, 1500));

    // Update peer with endpoint
    peer.endpoint = '192.168.49.1:7777'; // WiFi Direct default gateway
    discoveredPeers.set(peer.id, peer);
    notifyPeerChange();

    console.log(`[D2D] Connected to ${peer.id}`);
    return true;
}

/**
 * Send encrypted data to peer
 */
export async function sendData(
    myIdentity: WyreSUpIdentity,
    peerId: string,
    data: string
): Promise<boolean> {
    const peer = discoveredPeers.get(peerId);
    if (!peer?.endpoint) {
        console.error(`[D2D] Not connected to ${peerId}`);
        return false;
    }

    // In production: encrypt with peer's public key, send over socket
    console.log(`[D2D] Sending ${data.length} bytes to ${peerId}`);
    return true;
}

/**
 * Get all discovered peers
 */
export function getDiscoveredPeers(): D2DPeer[] {
    return Array.from(discoveredPeers.values());
}

/**
 * Subscribe to peer discovery changes
 */
export function onPeersChanged(listener: (peers: D2DPeer[]) => void): () => void {
    peerListeners.push(listener);
    return () => {
        const idx = peerListeners.indexOf(listener);
        if (idx > -1) peerListeners.splice(idx, 1);
    };
}

function notifyPeerChange(): void {
    const peers = getDiscoveredPeers();
    peerListeners.forEach(l => l(peers));
}

// Mock peer discovery simulation
function simulatePeerDiscovery(myIdentity: WyreSUpIdentity): void {
    // Simulate finding peers over time
    const mockPeers: D2DPeer[] = [
        {
            id: 'test_user@abcd1234efgh5678',
            connectionType: 'wifi_aware',
            signalStrength: 85,
            distance: 5,
            lastSeen: Date.now(),
        },
        {
            id: 'nearby_dev@1234abcd5678efgh',
            connectionType: 'wifi_direct',
            signalStrength: 70,
            distance: 15,
            lastSeen: Date.now(),
        },
    ];

    // Add mock peers with delay
    let index = 0;
    const interval = setInterval(() => {
        if (!isDiscovering || index >= mockPeers.length) {
            clearInterval(interval);
            return;
        }

        const peer = mockPeers[index];
        discoveredPeers.set(peer.id, peer);
        console.log(`[D2D] Discovered: ${peer.id} (${peer.connectionType}, ${peer.distance}m)`);
        notifyPeerChange();
        index++;
    }, 2000);
}

/**
 * Check D2D capabilities
 */
export function getD2DCapabilities(): {
    wifiAware: boolean;
    wifiDirect: boolean;
    bluetoothLE: boolean;
} {
    // In production: check actual device capabilities
    return {
        wifiAware: true,  // Android 8+
        wifiDirect: true, // Android 4.0+
        bluetoothLE: true, // Most devices
    };
}
