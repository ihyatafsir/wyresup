/**
 * Contacts Screen - List of peers and add new contacts by ID or IP
 * Supports both WyreSup ID (prefix@hash) and IP:port addresses
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    StyleSheet,
    Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Contact {
    id: string;
    displayName: string;
    ip?: string;
    port?: number;
    wyresupId?: string;
    addedAt: number;
    lastSeen?: number;
    status: 'offline' | 'connecting' | 'online';
}

const CONTACTS_STORAGE_KEY = '@wyresup_contacts';

export default function ContactsScreen() {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [showAdd, setShowAdd] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [inputPort, setInputPort] = useState('5188');
    const [inputType, setInputType] = useState<'ip' | 'id'>('ip');

    // Load contacts on mount
    useEffect(() => {
        loadContacts();
    }, []);

    const loadContacts = async () => {
        try {
            const stored = await AsyncStorage.getItem(CONTACTS_STORAGE_KEY);
            if (stored) {
                setContacts(JSON.parse(stored));
            }
        } catch (e) {
            console.error('[Contacts] Load failed:', e);
        }
    };

    const saveContacts = async (newContacts: Contact[]) => {
        try {
            await AsyncStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(newContacts));
        } catch (e) {
            console.error('[Contacts] Save failed:', e);
        }
    };

    const handleAddContact = () => {
        const value = inputValue.trim();
        if (!value) {
            Alert.alert('Error', 'Please enter an IP address or WyreSup ID');
            return;
        }

        let newContact: Contact;

        if (inputType === 'ip') {
            // Validate IP format
            const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
            if (!ipPattern.test(value)) {
                Alert.alert('Invalid IP', 'Please enter a valid IP address (e.g., 192.168.1.1)');
                return;
            }
            const port = parseInt(inputPort) || 5188;

            newContact = {
                id: `${value}:${port}`,
                displayName: value,
                ip: value,
                port,
                addedAt: Date.now(),
                status: 'offline',
            };
        } else {
            // WyreSup ID format: prefix@hash
            if (!value.includes('@')) {
                Alert.alert('Invalid ID', 'WyreSup ID must be in format: prefix@hash');
                return;
            }

            newContact = {
                id: value,
                displayName: value.split('@')[0],
                wyresupId: value,
                addedAt: Date.now(),
                status: 'offline',
            };
        }

        // Check for duplicates
        if (contacts.find(c => c.id === newContact.id)) {
            Alert.alert('Duplicate', 'This contact already exists');
            return;
        }

        const newContacts = [...contacts, newContact];
        setContacts(newContacts);
        saveContacts(newContacts);

        setInputValue('');
        setShowAdd(false);

        Alert.alert('Contact Added', `Added ${newContact.displayName}`);
    };

    const handleDeleteContact = (contactId: string) => {
        Alert.alert(
            'Delete Contact',
            'Are you sure you want to remove this contact?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        const newContacts = contacts.filter(c => c.id !== contactId);
                        setContacts(newContacts);
                        saveContacts(newContacts);
                    }
                }
            ]
        );
    };

    const handleConnectToContact = (contact: Contact) => {
        if (contact.ip && contact.port) {
            Alert.alert(
                'Connect',
                `Connect to ${contact.ip}:${contact.port}?`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Connect',
                        onPress: () => {
                            // TODO: Implement actual connection
                            Alert.alert('Connecting...', `Attempting to connect to ${contact.ip}:${contact.port}`);
                        }
                    }
                ]
            );
        } else if (contact.wyresupId) {
            Alert.alert('P2P Lookup', `Looking up ${contact.wyresupId}...`);
        }
    };

    const renderContact = ({ item }: { item: Contact }) => {
        const statusColor = item.status === 'online' ? '#00ff88' :
            item.status === 'connecting' ? '#ffaa00' : '#666';

        return (
            <TouchableOpacity
                style={styles.contactCard}
                onPress={() => handleConnectToContact(item)}
                onLongPress={() => handleDeleteContact(item.id)}
            >
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>{item.displayName}</Text>
                    <Text style={styles.contactDetails}>
                        {item.ip ? `${item.ip}:${item.port}` : item.wyresupId}
                    </Text>
                </View>
                <Text style={styles.statusText}>
                    {item.status === 'online' ? '●' : '○'}
                </Text>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>جِهَات - Contacts</Text>
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => setShowAdd(!showAdd)}
                >
                    <Text style={styles.addIcon}>{showAdd ? '✕' : '+'}</Text>
                </TouchableOpacity>
            </View>

            {/* Add Contact Section */}
            {showAdd && (
                <View style={styles.addSection}>
                    {/* Type Toggle */}
                    <View style={styles.typeToggle}>
                        <TouchableOpacity
                            style={[styles.typeButton, inputType === 'ip' && styles.typeButtonActive]}
                            onPress={() => setInputType('ip')}
                        >
                            <Text style={[styles.typeButtonText, inputType === 'ip' && styles.typeButtonTextActive]}>
                                By IP
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.typeButton, inputType === 'id' && styles.typeButtonActive]}
                            onPress={() => setInputType('id')}
                        >
                            <Text style={[styles.typeButtonText, inputType === 'id' && styles.typeButtonTextActive]}>
                                By ID
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Input Fields */}
                    <View style={styles.inputRow}>
                        <TextInput
                            style={[styles.input, inputType === 'ip' && { flex: 2 }]}
                            value={inputValue}
                            onChangeText={setInputValue}
                            placeholder={inputType === 'ip' ? 'IP Address (e.g., 192.168.1.1)' : 'WyreSup ID (e.g., enver@abc123)'}
                            placeholderTextColor="#666"
                            autoCapitalize="none"
                            autoCorrect={false}
                            keyboardType={inputType === 'ip' ? 'numeric' : 'default'}
                        />
                        {inputType === 'ip' && (
                            <TextInput
                                style={styles.portInput}
                                value={inputPort}
                                onChangeText={setInputPort}
                                placeholder="Port"
                                placeholderTextColor="#666"
                                keyboardType="numeric"
                            />
                        )}
                    </View>

                    <TouchableOpacity style={styles.addContactButton} onPress={handleAddContact}>
                        <Text style={styles.addContactButtonText}>+ Add Contact</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Contacts List */}
            {contacts.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyIcon}>👥</Text>
                    <Text style={styles.emptyText}>No contacts yet</Text>
                    <Text style={styles.emptyHint}>
                        Tap + to add a contact by IP address or WyreSup ID
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={contacts}
                    renderItem={renderContact}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                />
            )}

            {/* Hint */}
            {contacts.length > 0 && (
                <Text style={styles.hint}>Long press to delete • Tap to connect</Text>
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        paddingTop: 48,
        borderBottomWidth: 1,
        borderBottomColor: '#1a1a2e',
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#00ff88',
    },
    addButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#00ff88',
        justifyContent: 'center',
        alignItems: 'center',
    },
    addIcon: {
        fontSize: 24,
        color: '#050510',
        fontWeight: '700',
    },
    addSection: {
        padding: 16,
        backgroundColor: '#0a0a15',
        borderBottomWidth: 1,
        borderBottomColor: '#1a1a2e',
    },
    typeToggle: {
        flexDirection: 'row',
        marginBottom: 12,
        gap: 8,
    },
    typeButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        backgroundColor: '#1a1a2e',
        alignItems: 'center',
    },
    typeButtonActive: {
        backgroundColor: '#00ff8833',
        borderWidth: 1,
        borderColor: '#00ff88',
    },
    typeButtonText: {
        color: '#666',
        fontWeight: '600',
    },
    typeButtonTextActive: {
        color: '#00ff88',
    },
    inputRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },
    input: {
        flex: 1,
        backgroundColor: '#1a1a2e',
        borderRadius: 12,
        padding: 14,
        fontSize: 15,
        color: '#fff',
    },
    portInput: {
        width: 80,
        backgroundColor: '#1a1a2e',
        borderRadius: 12,
        padding: 14,
        fontSize: 15,
        color: '#fff',
        textAlign: 'center',
    },
    addContactButton: {
        backgroundColor: '#00ff88',
        borderRadius: 12,
        padding: 14,
        alignItems: 'center',
    },
    addContactButtonText: {
        color: '#050510',
        fontWeight: '700',
        fontSize: 16,
    },
    list: {
        padding: 16,
    },
    contactCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#1a1a2e',
        borderRadius: 12,
        marginBottom: 8,
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 14,
    },
    contactInfo: {
        flex: 1,
    },
    contactName: {
        fontSize: 16,
        color: '#fff',
        fontWeight: '600',
    },
    contactDetails: {
        fontSize: 13,
        color: '#666',
        fontFamily: 'monospace',
        marginTop: 2,
    },
    statusText: {
        fontSize: 16,
        color: '#666',
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
    hint: {
        textAlign: 'center',
        color: '#444',
        fontSize: 12,
        paddingBottom: 16,
    },
});
