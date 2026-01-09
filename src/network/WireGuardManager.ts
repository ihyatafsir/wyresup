/**
 * WireGuard VPN Manager
 * Handles VPN tunnel creation and management for P2P connections
 */

import { NativeModules, Platform, PermissionsAndroid } from 'react-native';
import { WyreSUpIdentity } from '../utils/Identity';
import { Peer } from '../messaging/types';

// Try to import the WireGuard module (may not be available)
let WireGuardVPN: any = null;
try {
    WireGuardVPN = require('react-native-wireguard-vpn-connect').default;
} catch (e) {
    console.log('[WireGuard] Module not available, using mock');
}

export type TunnelState = 'disconnected' | 'connecting' | 'connected' | 'error';

interface WireGuardConfig {
    privateKey: string;
    address: string;
    peerPublicKey: string;
    peerEndpoint: string;
    allowedIPs: string;
}

// Connection state tracking
const tunnelStates: Map<string, TunnelState> = new Map();
const stateListeners: ((peerId: string, state: TunnelState) => void)[] = [];

/**
 * Generate WireGuard config for connecting to a peer
 */
function generateConfig(
    myIdentity: WyreSUpIdentity,
    peer: Peer
): WireGuardConfig {
    // Convert Ed25519 keys to WireGuard format (Curve25519)
    // In production, this would need proper key derivation
    const privateKeyBase64 = Buffer.from(myIdentity.privateKey).toString('base64');

    // Generate a virtual IP based on identity hash
    const myIP = `10.${parseInt(myIdentity.hash.slice(0, 2), 16)}.${parseInt(myIdentity.hash.slice(2, 4), 16)}.1`;
    const peerIP = peer.endpoint || '0.0.0.0:51820';

    return {
        privateKey: privateKeyBase64,
        address: `${myIP}/24`,
        peerPublicKey: peer.publicKey,
        peerEndpoint: peerIP,
        allowedIPs: '10.0.0.0/8',
    };
}

/**
 * Request VPN permission on Android
 */
export async function requestVPNPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;

    try {
        // VPN permission is handled by the system when establishing tunnel
        // We just need to ensure INTERNET permission
        const granted = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.INTERNET
        );
        return granted;
    } catch (e) {
        console.error('[WireGuard] Permission error:', e);
        return false;
    }
}

/**
 * Establish WireGuard tunnel to a peer
 */
export async function connectToPeer(
    myIdentity: WyreSUpIdentity,
    peer: Peer
): Promise<boolean> {
    console.log(`[WireGuard] Connecting to ${peer.id}...`);

    tunnelStates.set(peer.id, 'connecting');
    notifyStateChange(peer.id, 'connecting');

    if (!WireGuardVPN) {
        // Mock mode - simulate connection
        await new Promise(resolve => setTimeout(resolve, 1500));
        tunnelStates.set(peer.id, 'connected');
        notifyStateChange(peer.id, 'connected');
        console.log(`[WireGuard] Mock connected to ${peer.id}`);
        return true;
    }

    try {
        const config = generateConfig(myIdentity, peer);

        // Build WireGuard config string
        const configStr = `
[Interface]
PrivateKey = ${config.privateKey}
Address = ${config.address}

[Peer]
PublicKey = ${config.peerPublicKey}
Endpoint = ${config.peerEndpoint}
AllowedIPs = ${config.allowedIPs}
PersistentKeepalive = 25
`;

        await WireGuardVPN.connect(configStr, 'WyreSup');

        tunnelStates.set(peer.id, 'connected');
        notifyStateChange(peer.id, 'connected');
        console.log(`[WireGuard] Connected to ${peer.id}`);
        return true;

    } catch (error: any) {
        console.error(`[WireGuard] Connection failed:`, error);
        tunnelStates.set(peer.id, 'error');
        notifyStateChange(peer.id, 'error');
        return false;
    }
}

/**
 * Disconnect from a peer
 */
export async function disconnectFromPeer(peerId: string): Promise<void> {
    console.log(`[WireGuard] Disconnecting from ${peerId}...`);

    if (WireGuardVPN) {
        try {
            await WireGuardVPN.disconnect();
        } catch (e) {
            console.error('[WireGuard] Disconnect error:', e);
        }
    }

    tunnelStates.set(peerId, 'disconnected');
    notifyStateChange(peerId, 'disconnected');
}

/**
 * Get tunnel state for a peer
 */
export function getTunnelState(peerId: string): TunnelState {
    return tunnelStates.get(peerId) || 'disconnected';
}

/**
 * Subscribe to tunnel state changes
 */
export function onTunnelStateChange(
    listener: (peerId: string, state: TunnelState) => void
): () => void {
    stateListeners.push(listener);
    return () => {
        const idx = stateListeners.indexOf(listener);
        if (idx > -1) stateListeners.splice(idx, 1);
    };
}

function notifyStateChange(peerId: string, state: TunnelState): void {
    stateListeners.forEach(l => l(peerId, state));
}

/**
 * Check if WireGuard is available
 */
export function isWireGuardAvailable(): boolean {
    return WireGuardVPN !== null;
}
