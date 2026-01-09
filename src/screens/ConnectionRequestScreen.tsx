/**
 * Connection Request Screen
 * Shows pending requests with 3D visualization and accept/reject actions
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
} from 'react-native';
import {
    ConnectionRequest,
    getPendingRequests,
    acceptRequest,
    rejectRequest,
    onRequestsChange,
    loadRequests,
} from '../messaging/ConnectionRequest';

const { width } = Dimensions.get('window');

interface RequestCardProps {
    request: ConnectionRequest;
    onAccept: () => void;
    onReject: () => void;
}

function RequestCard({ request, onAccept, onReject }: RequestCardProps) {
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const slideAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Pulse animation for pending indicator
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
            ])
        ).start();

        // Slide in
        Animated.spring(slideAnim, { toValue: 1, useNativeDriver: true }).start();
    }, []);

    const prefix = request.fromPeerId.split('@')[0];
    const hash = request.fromPeerId.split('@')[1] || '';

    return (
        <Animated.View
            style={[
                styles.card,
                { transform: [{ translateX: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [-width, 0] }) }] }
            ]}
        >
            {/* Glowing orb */}
            <View style={styles.orbContainer}>
                <Animated.View style={[styles.orb, { transform: [{ scale: pulseAnim }] }]}>
                    <View style={styles.orbInner} />
                </Animated.View>
            </View>

            {/* Info */}
            <View style={styles.cardInfo}>
                <Text style={styles.prefix}>{prefix}</Text>
                <Text style={styles.hash}>@{hash}</Text>
                {request.message && (
                    <Text style={styles.message}>"{request.message}"</Text>
                )}
                <Text style={styles.time}>
                    {new Date(request.timestamp).toLocaleString()}
                </Text>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
                <TouchableOpacity style={styles.rejectBtn} onPress={onReject}>
                    <Text style={styles.rejectText}>✕</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.acceptBtn} onPress={onAccept}>
                    <Text style={styles.acceptText}>✓</Text>
                </TouchableOpacity>
            </View>
        </Animated.View>
    );
}

export default function ConnectionRequestScreen() {
    const [requests, setRequests] = useState<ConnectionRequest[]>([]);

    useEffect(() => {
        loadRequests().then(() => {
            setRequests(getPendingRequests());
        });

        const unsub = onRequestsChange(() => {
            setRequests(getPendingRequests());
        });

        return unsub;
    }, []);

    const handleAccept = async (id: string) => {
        await acceptRequest(id);
        setRequests(getPendingRequests());
    };

    const handleReject = async (id: string) => {
        await rejectRequest(id);
        setRequests(getPendingRequests());
    };

    return (
        <View style={styles.container}>
            {/* Header with 3D-style gradient */}
            <View style={styles.header}>
                <Text style={styles.title}>قَبُول</Text>
                <Text style={styles.subtitle}>Connection Requests</Text>
                <Text style={styles.count}>{requests.length} pending</Text>
            </View>

            {/* 3D Background effect */}
            <View style={styles.bgEffect}>
                <View style={styles.gridLine} />
                <View style={[styles.gridLine, { top: '25%' }]} />
                <View style={[styles.gridLine, { top: '50%' }]} />
                <View style={[styles.gridLine, { top: '75%' }]} />
            </View>

            {requests.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <View style={styles.emptyOrb}>
                        <View style={styles.emptyOrbInner} />
                    </View>
                    <Text style={styles.emptyText}>No pending requests</Text>
                    <Text style={styles.emptyHint}>
                        When someone wants to connect, you'll see them here
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={requests}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                    renderItem={({ item }) => (
                        <RequestCard
                            request={item}
                            onAccept={() => handleAccept(item.id)}
                            onReject={() => handleReject(item.id)}
                        />
                    )}
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
        background: 'linear-gradient(180deg, #1a1a2e 0%, #050510 100%)',
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
        fontSize: 18,
        color: '#fff',
        marginTop: 4,
    },
    count: {
        fontSize: 14,
        color: '#666',
        marginTop: 8,
    },
    bgEffect: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: 0.1,
    },
    gridLine: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: '#00ff88',
        top: 0,
    },
    list: {
        padding: 16,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 255, 136, 0.05)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(0, 255, 136, 0.2)',
    },
    orbContainer: {
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    orb: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0, 255, 136, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    orbInner: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#00ff88',
    },
    cardInfo: {
        flex: 1,
        marginLeft: 16,
    },
    prefix: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fff',
    },
    hash: {
        fontSize: 12,
        color: '#00ff88',
        fontFamily: 'monospace',
    },
    message: {
        fontSize: 14,
        color: '#888',
        fontStyle: 'italic',
        marginTop: 8,
    },
    time: {
        fontSize: 10,
        color: '#444',
        marginTop: 4,
    },
    actions: {
        flexDirection: 'row',
        gap: 8,
    },
    rejectBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 68, 68, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ff4444',
    },
    rejectText: {
        fontSize: 20,
        color: '#ff4444',
    },
    acceptBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0, 255, 136, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#00ff88',
    },
    acceptText: {
        fontSize: 20,
        color: '#00ff88',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    emptyOrb: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(0, 255, 136, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    emptyOrbInner: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0, 255, 136, 0.3)',
    },
    emptyText: {
        fontSize: 20,
        color: '#fff',
        fontWeight: '600',
    },
    emptyHint: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginTop: 8,
    },
});
