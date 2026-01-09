/**
 * Chat Screen - 1:1 messaging with a peer
 */

import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { TextMessage } from '../messaging/types';

interface Props {
    peerId: string;
    peerName: string;
}

export default function ChatScreen({ peerId, peerName }: Props) {
    const [messages, setMessages] = useState<TextMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const flatListRef = useRef<FlatList>(null);

    const sendMessage = () => {
        if (!inputText.trim()) return;

        const newMessage: TextMessage = {
            id: Date.now().toString(),
            type: 'text',
            senderId: 'me', // TODO: Get from identity
            recipientId: peerId,
            content: inputText.trim(),
            timestamp: Date.now(),
            signature: '', // TODO: Sign with private key
        };

        setMessages(prev => [...prev, newMessage]);
        setInputText('');
    };

    const renderMessage = ({ item }: { item: TextMessage }) => {
        const isMe = item.senderId === 'me';
        return (
            <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.theirMessage]}>
                <Text style={styles.messageText}>{item.content}</Text>
                <Text style={styles.messageTime}>
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.statusDot} />
                <Text style={styles.headerTitle}>{peerName}</Text>
                <Text style={styles.headerSubtitle}>{peerId}</Text>
            </View>

            {/* Messages */}
            <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.messageList}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
            />

            {/* Input */}
            <View style={styles.inputContainer}>
                <TouchableOpacity style={styles.voiceButton}>
                    <Text style={styles.voiceIcon}>🎙️</Text>
                </TouchableOpacity>
                <TextInput
                    style={styles.input}
                    value={inputText}
                    onChangeText={setInputText}
                    placeholder="Message..."
                    placeholderTextColor="#666"
                    multiline
                    maxLength={4000}
                />
                <TouchableOpacity
                    style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
                    onPress={sendMessage}
                    disabled={!inputText.trim()}
                >
                    <Text style={styles.sendIcon}>➤</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0a',
    },
    header: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#222',
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#1DB954',
        marginRight: 12,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
    },
    headerSubtitle: {
        fontSize: 12,
        color: '#666',
        marginLeft: 8,
        fontFamily: 'monospace',
    },
    messageList: {
        padding: 16,
    },
    messageBubble: {
        maxWidth: '80%',
        padding: 12,
        borderRadius: 16,
        marginVertical: 4,
    },
    myMessage: {
        backgroundColor: '#1DB954',
        alignSelf: 'flex-end',
        borderBottomRightRadius: 4,
    },
    theirMessage: {
        backgroundColor: '#222',
        alignSelf: 'flex-start',
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontSize: 16,
        color: '#fff',
    },
    messageTime: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.6)',
        marginTop: 4,
        alignSelf: 'flex-end',
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 12,
        borderTopWidth: 1,
        borderTopColor: '#222',
        alignItems: 'flex-end',
    },
    voiceButton: {
        padding: 8,
        marginRight: 8,
    },
    voiceIcon: {
        fontSize: 24,
    },
    input: {
        flex: 1,
        backgroundColor: '#1a1a1a',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 16,
        color: '#fff',
        maxHeight: 100,
    },
    sendButton: {
        backgroundColor: '#1DB954',
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    sendButtonDisabled: {
        backgroundColor: '#333',
    },
    sendIcon: {
        fontSize: 18,
        color: '#fff',
    },
});
