/**
 * Nearby Peers Screen
 * Shows peers discovered via D2D Lite (WiFi Aware/Direct)
 */

import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    FlatList,
    StyleSheet,
    Animated,
    Dimensions,
    Alert,
} from 'react-native';
import {
    D2DPeer,
    startDiscovery,
    stopDiscovery,
    connectToPeer,
    getDiscoveredPeers,
    onPeersChanged,
    requestD2DPermissions,
    getD2DCapabilities,
} from '../network/D2DLite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { deserializeIdentity } from '../utils/Identity';

const { width } = Dimensions.get('window');

// Radar animation
function RadarPulse() {
    const pulseAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.timing(pulseAnim, {
                toValue: 1,
                duration: 2000,
                useNativeDriver: true,
            })
        ).start();
    }, []);

    return (
        <View style={styles.radarContainer}>
            {[0, 1, 2].map(i => (
                <Animated.View
                    key={i}
                    style={[
                        styles.radarRing,
                        {
                            transform: [{
                                scale: pulseAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0.3 + i * 0.3, 1 + i * 0.3],
                                })
                            }],
                            opacity: pulseAnim.interpolate({
                                inputRange: [0, 0.5, 1],
                                outputRange: [0.6 - i * 0.2, 0.3 - i * 0.1, 0],
                            }),
                        }
                    ]}
                />
            ))}
            <View style={styles.radarCenter}>
                <Text style={styles.radarIcon}>📡</Text>
            </View>
        </View>
    );
}

// Connection type badge
function ConnectionBadge({ type }: { type: string }) {
    const colors: Record<string, string> = {
        wifi_aware: '#00ff88',
        wifi_direct: '#4488ff',
        bluetooth_le: '#ff8844',
    };
    const labels: Record<string, string> = {
        wifi_aware: 'NAN',
        wifi_direct: 'P2P',
        bluetooth_le: 'BLE',
    };
    return (
        <View style={[styles.badge, { backgroundColor: colors[type] + '33', borderColor: colors[type] }]}>
            <Text style={[styles.badgeText, { color: colors[type] }]}>{labels[type] || type}</Text>
        </View>
    );
}

// Signal strength bar
function SignalBar({ strength }: { strength: number }) {
    const bars = 4;
    return (
        <View style={styles.signalContainer}>
            {Array.from({ length: bars }).map((_, i) => {
                const threshold = ((i + 1) / bars) * 100;
                const active = strength >= threshold - 20;
                return (
                    <View
                        key={i}
                        style={[
                            styles.signalBar,
                            { height: 8 + i * 4 },
                            active ? styles.signalActive : styles.signalInactive,
                        ]}
                    />
                );
            })}
        </View>
    );
}

export default function NearbyPeersScreen() {
    const [peers, setPeers] = useState<D2DPeer[]>([]);
    const [isScanning, setIsScanning] = useState(false);
    const [capabilities, setCapabilities] = useState({ wifiAware: false, wifiDirect: false, bluetoothLE: false });

    useEffect(() => {
        setCapabilities(getD2DCapabilities());

        const unsubscribe = onPeersChanged(setPeers);
        return () => {
            unsubscribe();
            stopDiscovery();
        };
    }, []);

    const handleStartScan = async () => {
        const hasPermissions = await requestD2DPermissions();
        if (!hasPermissions) {
            Alert.alert('Permissions Required', 'Location and WiFi permissions are needed to find nearby peers');
            return;
        }

        const identityData = await AsyncStorage.getItem('wyresup_identity');
        if (!identityData) {
            Alert.alert('Error', 'No identity found');
            return;
        }

        const identity = deserializeIdentity(identityData);
        setIsScanning(true);
        await startDiscovery(identity);
    };

    const handleStopScan = () => {
        stopDiscovery();
        setIsScanning(false);
    };

    const handleConnect = async (peer: D2DPeer) => {
        const identityData = await AsyncStorage.getItem('wyresup_identity');
        if (!identityData) return;

        const identity = deserializeIdentity(identityData);
        const success = await connectToPeer(identity, peer);
        if (success) {
            Alert.alert('Connected', `Connected to ${peer.id.split('@')[0]}`);
        }
    };

    const renderPeer = ({ item }: { item: D2DPeer }) => {
        const prefix = item.id.split('@')[0];
        return (
            <TouchableOpacity style={styles.peerCard} onPress={() => handleConnect(item)}>
                <View style={styles.peerLeft}>
                    <View style={styles.peerAvatar}>
                        <Text style={styles.avatarText}>{prefix[0].toUpperCase()}</Text>
                    </View>
                    <View style={styles.peerInfo}>
                        <Text style={styles.peerName}>{prefix}</Text>
                        <Text style={styles.peerDistance}>
                            {item.distance ? `~${item.distance}m away` : 'Nearby'}
                        </Text>
                    </View>
                </View>
                <View style={styles.peerRight}>
                    <ConnectionBadge type={item.connectionType} />
                    <SignalBar strength={item.signalStrength} />
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>قُرْب</Text>
                <Text style={styles.subtitle}>Nearby</Text>
            </View>

            {/* Capabilities */}
            <View style={styles.capsRow}>
                <Text style={[styles.capBadge, capabilities.wifiAware && styles.capActive]}>
                    WiFi Aware {capabilities.wifiAware ? '✓' : '✗'}
                </Text>
                <Text style={[styles.capBadge, capabilities.wifiDirect && styles.capActive]}>
                    WiFi Direct {capabilities.wifiDirect ? '✓' : '✗'}
                </Text>
                <Text style={[styles.capBadge, capabilities.bluetoothLE && styles.capActive]}>
                    BLE {capabilities.bluetoothLE ? '✓' : '✗'}
                </Text>
            </View>

            {/* Radar / Scan Button */}
            {isScanning ? (
                <TouchableOpacity onPress={handleStopScan}>
                    <RadarPulse />
                    <Text style={styles.scanningText}>Scanning for nearby WyreSup users...</Text>
                </TouchableOpacity>
            ) : (
                <TouchableOpacity style={styles.scanButton} onPress={handleStartScan}>
                    <Text style={styles.scanIcon}>📡</Text>
                    <Text style={styles.scanText}>Scan for Nearby Peers</Text>
                </TouchableOpacity>
            )}

            {/* Peer List */}
            {peers.length > 0 && (
                <FlatList
                    data={peers}
                    keyExtractor={item => item.id}
                    renderItem={renderPeer}
                    contentContainerStyle={styles.list}
                    ListHeaderComponent={
                        <Text style={styles.listHeader}>{peers.length} device{peers.length !== 1 ? 's' : ''} found</Text>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#050510',
    },
    header: {
        padding: 24,
        paddingTop: 48,
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 12,
    },
    title: {
        fontSize: 42,
        fontWeight: '700',
        color: '#00ff88',
        textShadowColor: '#00ff88',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 20,
    },
    subtitle: {
        fontSize: 20,
        color: '#fff',
    },
    capsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        paddingHorizontal: 16,
        marginBottom: 24,
    },
    capBadge: {
        fontSize: 10,
        color: '#666',
        backgroundColor: '#1a1a2e',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    capActive: {
        color: '#00ff88',
        backgroundColor: 'rgba(0,255,136,0.1)',
    },
    radarContainer: {
        width: 200,
        height: 200,
        alignSelf: 'center',
        justifyContent: 'center',
        alignItems: 'center',
    },
    radarRing: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        borderWidth: 2,
        borderColor: '#00ff88',
    },
    radarCenter: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(0,255,136,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    radarIcon: {
        fontSize: 28,
    },
    scanningText: {
        textAlign: 'center',
        color: '#00ff88',
        marginTop: 16,
        fontSize: 14,
    },
    scanButton: {
        alignSelf: 'center',
        backgroundColor: 'rgba(0,255,136,0.1)',
        paddingHorizontal: 32,
        paddingVertical: 24,
        borderRadius: 100,
        borderWidth: 2,
        borderColor: '#00ff88',
        alignItems: 'center',
        marginVertical: 32,
    },
    scanIcon: {
        fontSize: 48,
        marginBottom: 8,
    },
    scanText: {
        color: '#00ff88',
        fontSize: 16,
        fontWeight: '600',
    },
    list: {
        padding: 16,
    },
    listHeader: {
        color: '#666',
        fontSize: 12,
        marginBottom: 12,
        textAlign: 'center',
    },
    peerCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(0,255,136,0.05)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'rgba(0,255,136,0.2)',
    },
    peerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    peerAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#00ff88',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 20,
        fontWeight: '700',
        color: '#050510',
    },
    peerInfo: {
        marginLeft: 12,
    },
    peerName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    peerDistance: {
        fontSize: 12,
        color: '#666',
    },
    peerRight: {
        alignItems: 'flex-end',
        gap: 8,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '600',
    },
    signalContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 2,
    },
    signalBar: {
        width: 4,
        borderRadius: 2,
    },
    signalActive: {
        backgroundColor: '#00ff88',
    },
    signalInactive: {
        backgroundColor: '#333',
    },
});
