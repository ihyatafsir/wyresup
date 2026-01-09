/**
 * P2P Connection Screen with WebSocket Relay
 * Enables real messaging between peers via the WASIT relay
 */

import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUnifiedProtocol, DarajaPriority } from '../network/UnifiedProtocolManager';
import * as Miftah from '../network/MiftahEncryption';
import { LISAN_DIAGNOSTICS } from '../utils/LisanAlArab';

// WebSocket relay server (host from emulator perspective)
const WS_RELAY_URL = 'ws://10.0.2.2:5190';

// Encryption modes
const ENCRYPTION_MODE = {
    NONE: 'plaintext',
    ZBAT: 'zbat_encrypted',
};

interface PeerInfo {
    id: string;
    ip?: string;
    status: 'online' | 'offline';
    lastSeen: number;
}

interface Message {
    id: string;
    from: string;
    content: string;
    timestamp: number;
    isMine: boolean;
}

interface NATInfo {
    publicIP: string;
    publicPort: number;
    natType: string;
}

export default function P2PConnectionScreen() {
    const [myId, setMyId] = useState<string>('');
    const [myIP, setMyIP] = useState<NATInfo | null>(null);
    const [discovering, setDiscovering] = useState(false);
    const [wsConnected, setWsConnected] = useState(false);
    const [peers, setPeers] = useState<PeerInfo[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [messageInput, setMessageInput] = useState('');
    const [encryptionEnabled, setEncryptionEnabled] = useState(true);
    const wsRef = useRef<WebSocket | null>(null);
    const messagesEndRef = useRef<ScrollView | null>(null);
    const protocolRef = useRef(getUnifiedProtocol());

    // Load identity and connect on mount
    useEffect(() => {
        loadIdentityAndConnect();
        return () => {
            wsRef.current?.close();
        };
    }, []);

    const loadIdentityAndConnect = async () => {
        try {
            const storedId = await AsyncStorage.getItem('wyresup_identity');
            if (storedId) {
                const identity = JSON.parse(storedId);
                setMyId(identity.fullId);
                connectToRelay(identity.fullId);
            }
        } catch (e) {
            console.error('[P2P] Failed to load identity:', e);
        }
        discoverNAT();
    };

    const connectToRelay = (identity: string) => {
        console.log('[P2P] Connecting to relay...');

        try {
            const ws = new WebSocket(WS_RELAY_URL);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log('[P2P] WebSocket connected!');
                setWsConnected(true);
                // Register with our identity
                ws.send(JSON.stringify({
                    type: 'REGISTER',
                    identity
                }));
            };

            ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    handleRelayMessage(msg);
                } catch (e) {
                    console.error('[P2P] Parse error:', e);
                }
            };

            ws.onerror = (error) => {
                console.error('[P2P] WebSocket error:', error);
            };

            ws.onclose = () => {
                console.log('[P2P] WebSocket disconnected');
                setWsConnected(false);
                // Retry after 5s
                setTimeout(() => {
                    if (identity) connectToRelay(identity);
                }, 5000);
            };
        } catch (e) {
            console.error('[P2P] WebSocket connect failed:', e);
        }
    };

    const handleRelayMessage = (msg: any) => {
        switch (msg.type) {
            case 'REGISTERED':
                console.log(`[P2P] Registered! ${msg.peerCount} peers online`);
                if (msg.peers && msg.peers.length > 0) {
                    setPeers(msg.peers.map((id: string) => ({
                        id,
                        status: 'online',
                        lastSeen: Date.now()
                    })));
                    // تَأْسِيس (Ta'sis) - Establish Miftah keys for all existing peers
                    msg.peers.forEach((peerId: string) => {
                        if (myId && !Miftah.hasMiftah(peerId)) {
                            Miftah.tasis(myId, peerId);
                        }
                    });
                }
                break;

            case 'PEER_JOINED':
                console.log(`[P2P] Peer joined: ${msg.peerId}`);
                setPeers(prev => {
                    if (!prev.find(p => p.id === msg.peerId)) {
                        return [...prev, {
                            id: msg.peerId,
                            status: 'online',
                            lastSeen: Date.now()
                        }];
                    }
                    return prev;
                });
                // تَأْسِيس (Ta'sis) - Establish Miftah key for E2E encryption
                if (myId && !Miftah.hasMiftah(msg.peerId)) {
                    Miftah.tasis(myId, msg.peerId);
                }
                // Add system message
                addMessage({
                    id: `sys-${Date.now()}`,
                    from: 'system',
                    content: `🟢 ${msg.peerId.split('@')[0]} joined (🔐 encrypted)`,
                    timestamp: Date.now(),
                    isMine: false
                });
                break;

            case 'PEER_LEFT':
                console.log(`[P2P] Peer left: ${msg.peerId}`);
                setPeers(prev => prev.filter(p => p.id !== msg.peerId));
                addMessage({
                    id: `sys-${Date.now()}`,
                    from: 'system',
                    content: `🔴 ${msg.peerId.split('@')[0]} left`,
                    timestamp: Date.now(),
                    isMine: false
                });
                break;

            case 'MSG':
                console.log(`[P2P] Message from ${msg.from}: ${msg.content}`);
                handleIncomingMessage(msg);
                break;

            case 'PEERS':
                setPeers(msg.peers.map((id: string) => ({
                    id,
                    status: 'online',
                    lastSeen: Date.now()
                })));
                break;
        }
    };

    const addMessage = (msg: Message) => {
        setMessages(prev => [...prev, msg]);
    };

    /**
     * Handle incoming message with possible decryption
     * ZBAT format: [ZBAT:sequence]base64_encrypted_data
     */
    const handleIncomingMessage = async (msg: any) => {
        let displayContent = msg.content;
        let wasDecrypted = false;

        // Check if message is ZBAT encrypted
        if (msg.content && msg.content.startsWith('[ZBAT:')) {
            const match = msg.content.match(/^\[ZBAT:(\d+)\](.+)$/);
            if (match) {
                const [, sequenceStr, encryptedData] = match;
                console.log(`[P2P] كَشْف (Kashf) - Attempting decrypt seq=${sequenceStr}`);

                try {
                    const decrypted = await Miftah.fakk(msg.from, encryptedData);
                    if (decrypted) {
                        displayContent = `🔓 ${decrypted}`;
                        wasDecrypted = true;
                        console.log(`[P2P] ✓ Decrypted: "${decrypted.slice(0, 30)}..."`);
                    } else {
                        displayContent = `⚠️ [Decrypt failed - possible replay]`;
                        console.warn('[P2P] Decryption failed (replay attack or no key)');
                    }
                } catch (e) {
                    displayContent = `⚠️ [Decrypt error]`;
                    console.error('[P2P] Decryption error:', e);
                }
            }
        }

        addMessage({
            id: `msg-${Date.now()}`,
            from: msg.from,
            content: displayContent,
            timestamp: msg.timestamp || Date.now(),
            isMine: false
        });
    };

    const discoverNAT = async () => {
        setDiscovering(true);
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            setMyIP({
                publicIP: data.ip,
                publicPort: 5188,
                natType: 'Unknown',
            });
        } catch (error) {
            console.error('[NAT] Failed to discover:', error);
            setMyIP({
                publicIP: '?.?.?.?',
                publicPort: 5188,
                natType: 'Unknown',
            });
        } finally {
            setDiscovering(false);
        }
    };

    const sendMessage = async () => {
        if (!messageInput.trim() || !wsRef.current || !wsConnected) {
            return;
        }

        const content = messageInput.trim();
        let encryptedContent = content;
        let wasEncrypted = false;

        // Encrypt with Miftah if enabled
        if (encryptionEnabled && peers.length > 0) {
            try {
                // For broadcast, encrypt for each peer (simplified: use first peer)
                const targetPeer = peers[0].id;
                const result = await Miftah.tashfir(targetPeer, content);
                if (result) {
                    encryptedContent = `[ZBAT:${result.sequence}]${result.encrypted}`;
                    wasEncrypted = true;
                    console.log(`[P2P] تَشْفِير (Tashfir) seq=${result.sequence}`);
                }
            } catch (e) {
                console.warn('[P2P] Encryption failed, sending plaintext');
            }
        }

        // Send via relay (encrypted or plaintext)
        wsRef.current.send(JSON.stringify({
            type: 'MSG',
            content: encryptedContent,
            encrypted: wasEncrypted,
        }));

        // Add to local messages (show original)
        addMessage({
            id: `msg-${Date.now()}`,
            from: myId,
            content: wasEncrypted ? `🔐 ${content}` : content,
            timestamp: Date.now(),
            isMine: true
        });

        setMessageInput('');
    };

    const sendDirectMessage = (peerId: string) => {
        if (!wsRef.current || !wsConnected) {
            Alert.alert('Not Connected', 'WebSocket not connected');
            return;
        }

        Alert.prompt(
            'Send Message',
            `To: ${peerId.split('@')[0]}`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Send',
                    onPress: (text) => {
                        if (text && wsRef.current) {
                            wsRef.current.send(JSON.stringify({
                                type: 'MSG',
                                to: peerId,
                                content: text
                            }));
                            addMessage({
                                id: `msg-${Date.now()}`,
                                from: myId,
                                content: `→ ${peerId.split('@')[0]}: ${text}`,
                                timestamp: Date.now(),
                                isMine: true
                            });
                        }
                    }
                }
            ],
            'plain-text'
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>P2P اِتِّصَال</Text>
                <View style={styles.statusRow}>
                    <View style={[
                        styles.wsStatusDot,
                        wsConnected ? styles.connected : styles.disconnected
                    ]} />
                    <Text style={styles.subtitle}>
                        {wsConnected ? 'Connected to Relay' : 'Disconnected'}
                    </Text>
                </View>
            </View>

            {/* My Info */}
            <View style={styles.myInfoCard}>
                <Text style={styles.myIdLabel}>My ID:</Text>
                <Text style={styles.myId}>{myId.split('@')[0] || 'Loading...'}</Text>
                {myIP && (
                    <Text style={styles.myIPText}>{myIP.publicIP}:{myIP.publicPort}</Text>
                )}
            </View>

            {/* Online Peers */}
            <View style={styles.peersCard}>
                <Text style={styles.sectionTitle}>
                    شُهُود - Online Peers ({peers.length})
                </Text>
                {peers.length === 0 ? (
                    <Text style={styles.noPeers}>No peers online yet</Text>
                ) : (
                    <ScrollView horizontal style={styles.peersList} showsHorizontalScrollIndicator={false}>
                        {peers.map(peer => (
                            <TouchableOpacity
                                key={peer.id}
                                style={styles.peerChip}
                                onPress={() => sendDirectMessage(peer.id)}
                            >
                                <View style={styles.peerDot} />
                                <Text style={styles.peerName}>
                                    {peer.id.split('@')[0]}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                )}
            </View>

            {/* Messages */}
            <View style={styles.messagesSection}>
                <Text style={styles.sectionTitle}>رِسَالَات - Messages</Text>
                <ScrollView
                    style={styles.messagesList}
                    ref={messagesEndRef}
                    onContentSizeChange={() => messagesEndRef.current?.scrollToEnd()}
                >
                    {messages.length === 0 ? (
                        <Text style={styles.noMessages}>No messages yet. Say hello!</Text>
                    ) : (
                        messages.map(msg => (
                            <View
                                key={msg.id}
                                style={[
                                    styles.messageCard,
                                    msg.isMine && styles.myMessage,
                                    msg.from === 'system' && styles.systemMessage
                                ]}
                            >
                                {msg.from !== 'system' && (
                                    <Text style={styles.messageSender}>
                                        {msg.isMine ? 'You' : msg.from.split('@')[0]}
                                    </Text>
                                )}
                                <Text style={[
                                    styles.messageContent,
                                    msg.from === 'system' && styles.systemText
                                ]}>
                                    {msg.content}
                                </Text>
                            </View>
                        ))
                    )}
                </ScrollView>
            </View>

            {/* Message Input */}
            <View style={styles.inputRow}>
                <TextInput
                    style={styles.messageInput}
                    placeholder="Type a message..."
                    placeholderTextColor="#666"
                    value={messageInput}
                    onChangeText={setMessageInput}
                    onSubmitEditing={sendMessage}
                    returnKeyType="send"
                />
                <TouchableOpacity
                    style={[styles.sendButton, !wsConnected && styles.sendDisabled]}
                    onPress={sendMessage}
                    disabled={!wsConnected}
                >
                    <Text style={styles.sendButtonText}>Send</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#050510',
        padding: 16,
    },
    header: {
        paddingTop: 48,
        paddingBottom: 8,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#00ff88',
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    wsStatusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    connected: {
        backgroundColor: '#00ff88',
    },
    disconnected: {
        backgroundColor: '#ff4444',
    },
    subtitle: {
        fontSize: 12,
        color: '#888',
    },
    myInfoCard: {
        backgroundColor: '#1a1a2e',
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    myIdLabel: {
        color: '#666',
        marginRight: 8,
    },
    myId: {
        color: '#00ff88',
        fontWeight: '700',
        fontSize: 16,
        flex: 1,
    },
    myIPText: {
        color: '#666',
        fontSize: 11,
        fontFamily: 'monospace',
    },
    peersCard: {
        backgroundColor: '#1a1a2e',
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 13,
        color: '#888',
        marginBottom: 8,
    },
    noPeers: {
        color: '#444',
        fontSize: 12,
    },
    peersList: {
        flexDirection: 'row',
    },
    peerChip: {
        backgroundColor: '#00ff8822',
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 6,
        marginRight: 8,
        flexDirection: 'row',
        alignItems: 'center',
    },
    peerDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#00ff88',
        marginRight: 6,
    },
    peerName: {
        color: '#00ff88',
        fontSize: 13,
        fontWeight: '600',
    },
    messagesSection: {
        flex: 1,
        backgroundColor: '#0a0a15',
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
    },
    messagesList: {
        flex: 1,
    },
    noMessages: {
        color: '#444',
        textAlign: 'center',
        marginTop: 40,
    },
    messageCard: {
        backgroundColor: '#1a1a2e',
        borderRadius: 8,
        padding: 10,
        marginBottom: 8,
        maxWidth: '85%',
    },
    myMessage: {
        backgroundColor: '#00ff8833',
        alignSelf: 'flex-end',
    },
    systemMessage: {
        backgroundColor: 'transparent',
        alignSelf: 'center',
        padding: 4,
    },
    messageSender: {
        color: '#00ff88',
        fontSize: 11,
        marginBottom: 2,
    },
    messageContent: {
        color: '#fff',
        fontSize: 14,
    },
    systemText: {
        color: '#666',
        fontSize: 12,
        textAlign: 'center',
    },
    inputRow: {
        flexDirection: 'row',
        gap: 8,
    },
    messageInput: {
        flex: 1,
        backgroundColor: '#1a1a2e',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        color: '#fff',
        fontSize: 15,
    },
    sendButton: {
        backgroundColor: '#00ff88',
        borderRadius: 20,
        paddingHorizontal: 20,
        justifyContent: 'center',
    },
    sendDisabled: {
        backgroundColor: '#333',
    },
    sendButtonText: {
        color: '#050510',
        fontWeight: '700',
        fontSize: 15,
    },
});
