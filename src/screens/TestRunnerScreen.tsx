/**
 * Test Runner Screen
 * Run and display 5G Lite protocol tests
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';
import { runAllTests, TestResult } from '../test/FiveGLiteTests';

export default function TestRunnerScreen() {
    const [running, setRunning] = useState(false);
    const [results, setResults] = useState<TestResult[]>([]);
    const [summary, setSummary] = useState<{ passed: number; failed: number } | null>(null);

    const handleRunTests = async () => {
        setRunning(true);
        setResults([]);
        setSummary(null);

        try {
            const { passed, failed, results } = await runAllTests();
            setResults(results);
            setSummary({ passed, failed });
        } catch (e) {
            console.error('Test error:', e);
        }

        setRunning(false);
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>اختبار</Text>
                <Text style={styles.subtitle}>5G Lite Test Environment</Text>
            </View>

            <TouchableOpacity
                style={[styles.runButton, running && styles.runButtonDisabled]}
                onPress={handleRunTests}
                disabled={running}
            >
                {running ? (
                    <ActivityIndicator color="#050510" />
                ) : (
                    <Text style={styles.runButtonText}>▶ Run All Tests</Text>
                )}
            </TouchableOpacity>

            {summary && (
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryText}>
                        <Text style={styles.passedText}>{summary.passed} ✓</Text>
                        {'  '}
                        <Text style={styles.failedText}>{summary.failed} ✗</Text>
                    </Text>
                </View>
            )}

            <ScrollView style={styles.resultsContainer}>
                {results.map((result, i) => (
                    <View key={i} style={[styles.resultCard, result.passed ? styles.passedCard : styles.failedCard]}>
                        <View style={styles.resultHeader}>
                            <Text style={styles.resultIcon}>{result.passed ? '✓' : '✗'}</Text>
                            <Text style={styles.resultName}>{result.name}</Text>
                        </View>
                        <Text style={styles.resultDuration}>{result.duration}ms</Text>
                        {result.error && (
                            <Text style={styles.resultError}>{result.error}</Text>
                        )}
                    </View>
                ))}
            </ScrollView>
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
        fontSize: 36,
        fontWeight: '700',
        color: '#00ff88',
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
    },
    runButton: {
        backgroundColor: '#00ff88',
        margin: 16,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    runButtonDisabled: {
        opacity: 0.5,
    },
    runButtonText: {
        color: '#050510',
        fontSize: 18,
        fontWeight: '700',
    },
    summaryCard: {
        backgroundColor: '#1a1a2e',
        margin: 16,
        marginTop: 0,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    summaryText: {
        fontSize: 24,
    },
    passedText: {
        color: '#00ff88',
        fontWeight: '700',
    },
    failedText: {
        color: '#ff4444',
        fontWeight: '700',
    },
    resultsContainer: {
        flex: 1,
        padding: 16,
    },
    resultCard: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 8,
        borderWidth: 1,
    },
    passedCard: {
        backgroundColor: 'rgba(0,255,136,0.1)',
        borderColor: 'rgba(0,255,136,0.3)',
    },
    failedCard: {
        backgroundColor: 'rgba(255,68,68,0.1)',
        borderColor: 'rgba(255,68,68,0.3)',
    },
    resultHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    resultIcon: {
        fontSize: 18,
    },
    resultName: {
        fontSize: 14,
        color: '#fff',
        flex: 1,
    },
    resultDuration: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
    resultError: {
        fontSize: 12,
        color: '#ff4444',
        marginTop: 8,
    },
});
