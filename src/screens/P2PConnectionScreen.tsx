/**
 * P2P Connection Screen with مُلْتَقى (Multaqa) Hybrid Discovery
 * Supports both WebSocket relay AND serverless link-based P2P
 * 
 * From Lisan al-Arab:
 * - مُلْتَقى (Multaqa): "ملتقى الجلدة - Meeting/Junction point"
 * - بَدْر (Badr): "إظهار البدر - Full moon visibility" (share link)
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
    Clipboard,
    Share,
    Modal,
    Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUnifiedProtocol, DarajaPriority } from '../network/UnifiedProtocolManager';
import * as Miftah from '../network/MiftahEncryption';
import { LISAN_DIAGNOSTICS, LISAN_DISCOVERY } from '../utils/LisanAlArab';
import { WasamIPFS } from '../network/WasamIPFS';
import { mudtadeefServer } from '../network/MudtadeefServer';
import { muttasilClient } from '../network/MuttasilClient';

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
    // وَسْم (Wasam) - Carrier brand for serverless discovery
    const [myWasam, setMyWasam] = useState<string>('');
    const [myLink, setMyLink] = useState<string>('');
    const [myPublicKey, setMyPublicKey] = useState<string>('');
    // حِوَار (Hiwar) - Dialog state for Android modal
    const [showAddPeerModal, setShowAddPeerModal] = useState(false);
    const [peerLinkInput, setPeerLinkInput] = useState('');
    // مُسْتَضِيف (Mudtadeef) - Host Mode state
    const [isHosting, setIsHosting] = useState(false);
    const [hostInfo, setHostInfo] = useState<{ ip: string; port: number } | null>(null);
    const [tcpConnected, setTcpConnected] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const messagesEndRef = useRef<ScrollView | null>(null);
    const protocolRef = useRef(getUnifiedProtocol());

    // Load identity and connect on mount
    useEffect(() => {
        loadIdentityAndConnect();
        return () => {
            wsRef.current?.close();
            WasamIPFS.waqfIntishar(); // Stop serverless discovery
        };
    }, []);

    const loadIdentityAndConnect = async () => {
        try {
            const storedId = await AsyncStorage.getItem('wyresup_identity');
            if (storedId) {
                const identity = JSON.parse(storedId);
                setMyId(identity.fullId);
                setMyPublicKey(identity.publicKey || '');
                connectToRelay(identity.fullId);

                // بَادِرَة (Badira) - Initialize serverless discovery
                await initServerlessDiscovery(identity.fullId, identity.publicKey || '');
            }
        } catch (e) {
            console.error('[P2P] Failed to load identity:', e);
        }
        discoverNAT();
    };

    /**
     * بَادِرَة (Badira) - Initialize serverless discovery
     * From Lisan: "First initiative/move"
     */
    const initServerlessDiscovery = async (peerId: string, publicKey: string) => {
        console.log('[بَادِرَة] Initializing serverless discovery...');
        try {
            await WasamIPFS.badIntishar(peerId, publicKey);
            const wasam = WasamIPFS.getMyWasam();
            const link = WasamIPFS.getMyLink();
            setMyWasam(wasam);
            setMyLink(link);
            console.log(`[بَادِرَة] وَسْم: ${wasam}, Link ready`);
        } catch (e) {
            console.error('[بَادِرَة] Serverless init failed:', e);
        }
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
        const canSend = wsConnected || tcpConnected;
        if (!messageInput.trim() || !canSend) {
            if (!canSend) {
                Alert.alert('Not Connected', 'Neither TCP nor WebSocket connected');
            }
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

        // مُلْتَقى (Multaqa) - Route via appropriate transport
        if (isHosting) {
            // Host mode: send directly to connected clients
            mudtadeefServer.sendToClients(encryptedContent, wasEncrypted);
            console.log('[P2P] Sent via Host (مُسْتَضِيف)');
        } else if (tcpConnected) {
            // Client mode: send via Muttasil TCP client
            muttasilClient.sendMessage(encryptedContent, wasEncrypted);
            console.log('[P2P] Sent via TCP (مُتَّصِل)');
        } else if (wsConnected && wsRef.current) {
            // Send via WebSocket relay
            wsRef.current.send(JSON.stringify({
                type: 'MSG',
                content: encryptedContent,
                encrypted: wasEncrypted,
            }));
            console.log('[P2P] Sent via WebSocket');
        }

        // Add to local messages (show original)
        const transportIcon = tcpConnected ? '🔌' : '🌐';
        addMessage({
            id: `msg-${Date.now()}`,
            from: myId,
            content: wasEncrypted ? `🔐${transportIcon} ${content}` : `${transportIcon} ${content}`,
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

    /**
     * مُسْتَضِيف (Mudtadeef) - Toggle Host Mode
     * Start/stop the embedded relay server
     */
    const toggleHostMode = async () => {
        if (isHosting) {
            // Stop hosting
            mudtadeefServer.stopHosting();
            WasamIPFS.clearMudtadeefHost();  // Clear hint from links
            setMyLink(WasamIPFS.getMyLink());  // Regenerate link
            setIsHosting(false);
            setHostInfo(null);
            addMessage({
                id: `sys-${Date.now()}`,
                from: 'system',
                content: '🔌 Host mode stopped',
                timestamp: Date.now(),
                isMine: false
            });
        } else {
            // Start hosting
            try {
                // Set up host callbacks for peer management
                mudtadeefServer.setOnPeerJoin((peerId: string) => {
                    setPeers(prev => {
                        if (!prev.find(p => p.id === peerId)) {
                            return [...prev, { id: peerId, status: 'online' as const, lastSeen: Date.now() }];
                        }
                        return prev;
                    });
                });

                mudtadeefServer.setOnPeerLeave((peerId: string) => {
                    setPeers(prev => prev.filter(p => p.id !== peerId));
                });

                mudtadeefServer.setOnMessage((from: string, content: string, encrypted: boolean) => {
                    addMessage({
                        id: `msg-${Date.now()}`,
                        from,
                        content: encrypted ? `🔐 ${content}` : content,
                        timestamp: Date.now(),
                        isMine: false
                    });
                });

                const info = await mudtadeefServer.startHosting(5189);
                WasamIPFS.setMudtadeefHost(info.ip, info.port);  // Add hint to links
                setMyLink(WasamIPFS.getMyLink());  // Regenerate link with hint
                setIsHosting(true);
                setHostInfo(info);
                addMessage({
                    id: `sys-${Date.now()}`,
                    from: 'system',
                    content: `📡 Hosting at ${info.ip}:${info.port} - share your link!`,
                    timestamp: Date.now(),
                    isMine: false
                });
            } catch (error) {
                Alert.alert('Host Error', 'Failed to start host mode');
            }
        }
    };

    /**
     * Connect to a peer's hosted relay
     */
    const connectToHost = async (host: string, port: number) => {
        try {
            muttasilClient.setOnConnected(() => {
                setTcpConnected(true);
                addMessage({
                    id: `sys-${Date.now()}`,
                    from: 'system',
                    content: `✅ Connected to ${host}:${port}`,
                    timestamp: Date.now(),
                    isMine: false
                });
            });

            muttasilClient.setOnMessage((from, content, encrypted) => {
                addMessage({
                    id: `msg-${Date.now()}`,
                    from,
                    content: encrypted ? `🔐 ${content}` : content,
                    timestamp: Date.now(),
                    isMine: false
                });
            });

            muttasilClient.setOnDisconnected(() => {
                setTcpConnected(false);
                addMessage({
                    id: `sys-${Date.now()}`,
                    from: 'system',
                    content: '❌ Disconnected from host',
                    timestamp: Date.now(),
                    isMine: false
                });
            });

            await muttasilClient.connect(host, port, myId, myPublicKey);
        } catch (error) {
            Alert.alert('Connection Error', `Failed to connect to ${host}:${port}`);
        }
    };

    /**
     * بَدْر (Badr) - Share my discovery link
     * From Lisan: "إظهار البدر - Showing the full moon" (full visibility)
     */
    const badrShareLink = async () => {
        if (!myLink) {
            Alert.alert('Not Ready', 'Discovery link not generated yet');
            return;
        }

        try {
            // Copy to clipboard
            Clipboard.setString(myLink);

            // Also offer native share
            await Share.share({
                message: `Connect with me on WyreSup:\n${myLink}`,
                title: 'WyreSup P2P Link',
            });

            addMessage({
                id: `sys-${Date.now()}`,
                from: 'system',
                content: `📤 Link copied! Share it with peers to connect.`,
                timestamp: Date.now(),
                isMine: false
            });
        } catch (e) {
            // User cancelled share, but clipboard copy succeeded
            Alert.alert('Copied!', 'Link copied to clipboard');
        }
    };

    /**
     * مُلْتَقى (Multaqa) - Add peer from shared link
     * From Lisan: "ملتقى الجلدة - Junction/Meeting point"
     * 
     * Note: Uses Modal on Android (Alert.prompt is iOS-only)
     */
    const addPeerFromLink = () => {
        // Android uses Modal, iOS can use Alert.prompt
        if (Platform.OS === 'android') {
            setPeerLinkInput('');
            setShowAddPeerModal(true);
        } else {
            // iOS - use native prompt
            Alert.prompt(
                'Add Peer (مُلْتَقى)',
                'Paste the peer\'s WyreSup link:',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Connect', onPress: (link) => processAddPeer(link || '') }
                ],
                'plain-text'
            );
        }
    };

    /**
     * تَوْصِيل (Tawsil) - Process peer connection from link
     * From Lisan: "توصيل الشيء - Connecting things together"
     */
    const processAddPeer = async (link: string) => {
        if (!link.trim()) return;

        const peer = WasamIPFS.parseIPFSLink(link.trim());
        if (!peer) {
            Alert.alert('Invalid Link', 'Could not parse peer link');
            return;
        }

        // Add to WasamIPFS discovery
        WasamIPFS.addPeer(peer);

        // تَأْسِيس (Ta'sis) - Establish encryption key
        if (myId && !Miftah.hasMiftah(peer.peerId)) {
            Miftah.tasis(myId, peer.peerId);
        }

        // Check for Mudtadeef hint - auto-connect via TCP!
        if (peer.mudtadeef) {
            addMessage({
                id: `sys-${Date.now()}`,
                from: 'system',
                content: `🔗 ${peer.peerId.split('@')[0]} is hosting - connecting via TCP...`,
                timestamp: Date.now(),
                isMine: false
            });

            // Auto-connect to host's TCP relay
            try {
                await connectToHost(peer.mudtadeef.ip, peer.mudtadeef.port);
            } catch (e) {
                console.error('[مُلْتَقى] TCP auto-connect failed:', e);
                // Still add peer for potential WebSocket fallback
            }
        } else {
            // No Mudtadeef hint - add to peer list for WebSocket relay
            setPeers(prev => {
                if (!prev.find(p => p.id === peer.peerId)) {
                    return [...prev, {
                        id: peer.peerId,
                        status: 'online' as const,
                        lastSeen: Date.now()
                    }];
                }
                return prev;
            });

            const carrierMatch = peer.sameCarrier ? '✅ Same carrier' : '🌐 Different network';
            addMessage({
                id: `sys-${Date.now()}`,
                from: 'system',
                content: `🔗 Added ${peer.peerId.split('@')[0]} (${carrierMatch}) 🔐`,
                timestamp: Date.now(),
                isMine: false
            });
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>P2P اِتِّصَال</Text>
                <View style={styles.statusRow}>
                    {/* WebSocket status */}
                    <View style={[
                        styles.wsStatusDot,
                        wsConnected ? styles.connected : styles.disconnected
                    ]} />
                    <Text style={styles.subtitle}>
                        WS: {wsConnected ? '✓' : '✗'}
                    </Text>
                    {/* TCP status */}
                    <View style={[
                        styles.wsStatusDot,
                        tcpConnected ? styles.tcpConnected : styles.disconnected,
                        { marginLeft: 12 }
                    ]} />
                    <Text style={styles.subtitle}>
                        TCP: {tcpConnected ? '✓' : '✗'}
                    </Text>
                </View>
            </View>

            {/* My Info & Serverless Discovery */}
            <View style={styles.myInfoCard}>
                <View style={styles.myInfoRow}>
                    <Text style={styles.myIdLabel}>My ID:</Text>
                    <Text style={styles.myId}>{myId.split('@')[0] || 'Loading...'}</Text>
                </View>
                <View style={styles.myInfoRow}>
                    {myIP && (
                        <Text style={styles.myIPText}>{myIP.publicIP}:{myIP.publicPort}</Text>
                    )}
                    {myWasam && (
                        <Text style={styles.wasamBadge}>وَسْم: {myWasam}</Text>
                    )}
                </View>

                {/* بَدْر و مُلْتَقى - Share & Add Peer Buttons */}
                <View style={styles.discoveryButtons}>
                    <TouchableOpacity
                        style={styles.shareButton}
                        onPress={badrShareLink}
                        disabled={!myLink}
                    >
                        <Text style={styles.shareButtonText}>📤 Share Link</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.addPeerButton}
                        onPress={addPeerFromLink}
                    >
                        <Text style={styles.addPeerButtonText}>📥 Add Peer</Text>
                    </TouchableOpacity>
                </View>

                {/* مُسْتَضِيف - Host Mode Section */}
                <View style={styles.hostSection}>
                    <TouchableOpacity
                        style={[styles.hostButton, isHosting && styles.hostButtonActive]}
                        onPress={toggleHostMode}
                    >
                        <Text style={styles.hostButtonText}>
                            {isHosting ? '🔴 Stop Hosting' : '📡 Host Mode'}
                        </Text>
                    </TouchableOpacity>
                    {hostInfo && (
                        <Text style={styles.hostInfo}>
                            {hostInfo.ip}:{hostInfo.port}
                        </Text>
                    )}
                </View>
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
                    style={[styles.sendButton, !(wsConnected || tcpConnected) && styles.sendDisabled]}
                    onPress={sendMessage}
                    disabled={!(wsConnected || tcpConnected)}
                >
                    <Text style={styles.sendButtonText}>Send</Text>
                </TouchableOpacity>
            </View>

            {/* حِوَار (Hiwar) - Add Peer Modal for Android */}
            <Modal
                visible={showAddPeerModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowAddPeerModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Add Peer (مُلْتَقى)</Text>
                        <Text style={styles.modalSubtitle}>Paste the peer's WyreSup link:</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="wyresup://..."
                            placeholderTextColor="#666"
                            value={peerLinkInput}
                            onChangeText={setPeerLinkInput}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.modalCancelButton}
                                onPress={() => setShowAddPeerModal(false)}
                            >
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalConnectButton}
                                onPress={() => {
                                    processAddPeer(peerLinkInput);
                                    setShowAddPeerModal(false);
                                }}
                            >
                                <Text style={styles.modalConnectText}>Connect</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
    tcpConnected: {
        backgroundColor: '#00aaff',
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
    },
    myInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
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
        marginRight: 12,
    },
    wasamBadge: {
        color: '#00aaff',
        fontSize: 11,
        fontFamily: 'monospace',
        backgroundColor: '#00aaff22',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    discoveryButtons: {
        flexDirection: 'row',
        marginTop: 10,
        gap: 8,
    },
    shareButton: {
        backgroundColor: '#00ff8833',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 8,
        flex: 1,
        alignItems: 'center',
    },
    shareButtonText: {
        color: '#00ff88',
        fontWeight: '600',
        fontSize: 13,
    },
    addPeerButton: {
        backgroundColor: '#00aaff33',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 8,
        flex: 1,
        alignItems: 'center',
    },
    addPeerButtonText: {
        color: '#00aaff',
        fontWeight: '600',
        fontSize: 13,
    },
    hostSection: {
        marginTop: 10,
        alignItems: 'center',
    },
    hostButton: {
        backgroundColor: '#ff660033',
        borderRadius: 16,
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    hostButtonActive: {
        backgroundColor: '#ff000044',
    },
    hostButtonText: {
        color: '#ff6600',
        fontWeight: '700',
        fontSize: 14,
    },
    hostInfo: {
        color: '#00ff88',
        fontSize: 12,
        marginTop: 6,
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
    // حِوَار (Hiwar) Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#1a1a2e',
        borderRadius: 16,
        padding: 24,
        width: '85%',
        borderWidth: 1,
        borderColor: '#00ff8833',
    },
    modalTitle: {
        color: '#00ff88',
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 8,
    },
    modalSubtitle: {
        color: '#888',
        fontSize: 14,
        marginBottom: 16,
    },
    modalInput: {
        backgroundColor: '#0a0a14',
        borderRadius: 8,
        padding: 12,
        color: '#fff',
        fontSize: 14,
        borderWidth: 1,
        borderColor: '#333',
        marginBottom: 16,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    modalCancelButton: {
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    modalCancelText: {
        color: '#888',
        fontSize: 14,
    },
    modalConnectButton: {
        backgroundColor: '#00ff8833',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    modalConnectText: {
        color: '#00ff88',
        fontSize: 14,
        fontWeight: '600',
    },
});
