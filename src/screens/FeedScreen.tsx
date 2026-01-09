/**
 * Feed Screen - Posts from followed users
 * Posts are stored only on followers' devices (decentralized)
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    StyleSheet,
} from 'react-native';
import { Post } from '../messaging/types';

export default function FeedScreen() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [newPost, setNewPost] = useState('');
    const [showCompose, setShowCompose] = useState(false);

    const handlePost = () => {
        if (!newPost.trim()) return;

        const post: Post = {
            id: Date.now().toString(),
            type: 'post',
            authorId: 'me', // TODO: Get from identity
            content: newPost.trim(),
            timestamp: Date.now(),
            signature: '', // TODO: Sign with private key
        };

        setPosts(prev => [post, ...prev]);
        setNewPost('');
        setShowCompose(false);

        // TODO: Broadcast to followers
    };

    const renderPost = ({ item }: { item: Post }) => (
        <View style={styles.postCard}>
            <View style={styles.postHeader}>
                <Text style={styles.authorId}>{item.authorId}</Text>
                <Text style={styles.timestamp}>
                    {new Date(item.timestamp).toLocaleDateString()}
                </Text>
            </View>
            <Text style={styles.postContent}>{item.content}</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>نَشْر</Text>
                <Text style={styles.subtitle}>Feed</Text>
                <TouchableOpacity style={styles.composeButton} onPress={() => setShowCompose(!showCompose)}>
                    <Text style={styles.composeIcon}>{showCompose ? '✕' : '✎'}</Text>
                </TouchableOpacity>
            </View>

            {/* Compose */}
            {showCompose && (
                <View style={styles.composeContainer}>
                    <TextInput
                        style={styles.composeInput}
                        value={newPost}
                        onChangeText={setNewPost}
                        placeholder="Share a thought..."
                        placeholderTextColor="#666"
                        multiline
                        maxLength={500}
                    />
                    <TouchableOpacity
                        style={[styles.postButton, !newPost.trim() && styles.postButtonDisabled]}
                        onPress={handlePost}
                        disabled={!newPost.trim()}
                    >
                        <Text style={styles.postButtonText}>Post</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Posts */}
            {posts.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyIcon}>📝</Text>
                    <Text style={styles.emptyText}>No posts yet</Text>
                    <Text style={styles.emptyHint}>
                        Posts are stored only on followers' devices
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={posts}
                    renderItem={renderPost}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0a',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#222',
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#1DB954',
    },
    subtitle: {
        fontSize: 18,
        color: '#fff',
        marginLeft: 12,
        flex: 1,
    },
    composeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#1DB954',
        justifyContent: 'center',
        alignItems: 'center',
    },
    composeIcon: {
        fontSize: 20,
        color: '#fff',
    },
    composeContainer: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#222',
    },
    composeInput: {
        backgroundColor: '#1a1a1a',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: '#fff',
        minHeight: 100,
        textAlignVertical: 'top',
    },
    postButton: {
        backgroundColor: '#1DB954',
        borderRadius: 12,
        padding: 12,
        marginTop: 12,
        alignItems: 'center',
    },
    postButtonDisabled: {
        backgroundColor: '#333',
    },
    postButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
    list: {
        padding: 16,
    },
    postCard: {
        backgroundColor: '#1a1a1a',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
    },
    postHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    authorId: {
        fontSize: 14,
        color: '#1DB954',
        fontFamily: 'monospace',
    },
    timestamp: {
        fontSize: 12,
        color: '#666',
    },
    postContent: {
        fontSize: 16,
        color: '#fff',
        lineHeight: 24,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    emptyIcon: {
        fontSize: 64,
        marginBottom: 16,
    },
    emptyText: {
        fontSize: 20,
        color: '#fff',
        fontWeight: '600',
        marginBottom: 8,
    },
    emptyHint: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
    },
});
