/**
 * Welcome/Setup Screen
 * First-time user creates their WyreSup identity
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { createIdentity, serializeIdentity } from '../utils/Identity';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Props {
    onComplete: () => void;
}

export default function WelcomeScreen({ onComplete }: Props) {
    const [prefix, setPrefix] = useState('');
    const [loading, setLoading] = useState(false);
    const [generatedId, setGeneratedId] = useState<string | null>(null);

    const handleCreate = async () => {
        if (prefix.length < 3) {
            Alert.alert('Error', 'Choose at least 3 characters');
            return;
        }

        setLoading(true);
        try {
            const identity = await createIdentity(prefix.toLowerCase());
            await AsyncStorage.setItem('wyresup_identity', serializeIdentity(identity));
            setGeneratedId(identity.fullId);
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
        setLoading(false);
    };

    const handleContinue = () => {
        if (generatedId) {
            onComplete();
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>وايرصَب</Text>
            <Text style={styles.subtitle}>WyreSup</Text>
            <Text style={styles.tagline}>P2P • Encrypted • Decentralized</Text>

            {!generatedId ? (
                <>
                    <Text style={styles.label}>Choose your identity prefix:</Text>
                    <TextInput
                        style={styles.input}
                        value={prefix}
                        onChangeText={setPrefix}
                        placeholder="e.g., ahmad42"
                        placeholderTextColor="#666"
                        autoCapitalize="none"
                        autoCorrect={false}
                        maxLength={16}
                    />
                    <Text style={styles.hint}>
                        3-16 alphanumeric characters
                    </Text>

                    <TouchableOpacity
                        style={[styles.button, prefix.length < 3 && styles.buttonDisabled]}
                        onPress={handleCreate}
                        disabled={loading || prefix.length < 3}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>Create Identity</Text>
                        )}
                    </TouchableOpacity>
                </>
            ) : (
                <>
                    <Text style={styles.successLabel}>Your WyreSup ID:</Text>
                    <View style={styles.idContainer}>
                        <Text style={styles.idText}>{generatedId}</Text>
                    </View>
                    <Text style={styles.hint}>
                        Share this ID with others to connect
                    </Text>

                    <TouchableOpacity style={styles.button} onPress={handleContinue}>
                        <Text style={styles.buttonText}>Continue</Text>
                    </TouchableOpacity>
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0a',
        padding: 24,
        justifyContent: 'center',
    },
    title: {
        fontSize: 48,
        fontWeight: '700',
        color: '#1DB954',
        textAlign: 'center',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 24,
        fontWeight: '300',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 8,
    },
    tagline: {
        fontSize: 14,
        color: '#888',
        textAlign: 'center',
        marginBottom: 48,
        letterSpacing: 2,
    },
    label: {
        fontSize: 16,
        color: '#fff',
        marginBottom: 12,
    },
    successLabel: {
        fontSize: 18,
        color: '#1DB954',
        marginBottom: 16,
        textAlign: 'center',
    },
    input: {
        backgroundColor: '#1a1a1a',
        borderRadius: 12,
        padding: 16,
        fontSize: 18,
        color: '#fff',
        borderWidth: 1,
        borderColor: '#333',
    },
    hint: {
        fontSize: 12,
        color: '#666',
        marginTop: 8,
        marginBottom: 32,
        textAlign: 'center',
    },
    button: {
        backgroundColor: '#1DB954',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    buttonDisabled: {
        backgroundColor: '#333',
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    idContainer: {
        backgroundColor: '#1a1a1a',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#1DB954',
    },
    idText: {
        fontSize: 18,
        color: '#1DB954',
        fontFamily: 'monospace',
        textAlign: 'center',
    },
});
