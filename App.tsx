// Crypto polyfill - MUST be first import
import 'react-native-get-random-values';

/**
 * WyreSup - P2P Decentralized Chat App
 * وايرصَب
 */

import React, { useState, useEffect } from 'react';
import { StatusBar, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text } from 'react-native';

import WelcomeScreen from './src/screens/WelcomeScreen';
import ContactsScreen from './src/screens/ContactsScreen';
import ChatScreen from './src/screens/ChatScreen';
import FeedScreen from './src/screens/FeedScreen';
import ConnectionRequestScreen from './src/screens/ConnectionRequestScreen';
import NearbyPeersScreen from './src/screens/NearbyPeersScreen';
import TestRunnerScreen from './src/screens/TestRunnerScreen';
import P2PConnectionScreen from './src/screens/P2PConnectionScreen';
import { deserializeIdentity, WyreSUpIdentity } from './src/utils/Identity';
import { Peer } from './src/messaging/types';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Tab bar icons
function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    P2P: '🌐',
    Nearby: '📡',
    Contacts: '👥',
    Requests: '🔔',
    Feed: '📝',
    Tests: '🧪',
    Settings: '⚙️',
  };
  return (
    <Text style={{ fontSize: 24, opacity: focused ? 1 : 0.5 }}>
      {icons[name] || '•'}
    </Text>
  );
}

// Settings placeholder
function SettingsScreen() {
  const [identity, setIdentity] = useState<WyreSUpIdentity | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('wyresup_identity').then(data => {
      if (data) setIdentity(deserializeIdentity(data));
    });
  }, []);

  return (
    <View style={styles.settingsContainer}>
      <Text style={styles.settingsTitle}>Settings</Text>
      {identity && (
        <View style={styles.idCard}>
          <Text style={styles.idLabel}>Your WyreSup ID:</Text>
          <Text style={styles.idValue}>{identity.fullId}</Text>
        </View>
      )}
    </View>
  );
}

// Main tabs
function MainTabs() {
  const [selectedPeer, setSelectedPeer] = useState<Peer | null>(null);

  if (selectedPeer) {
    return (
      <ChatScreen
        peerId={selectedPeer.id}
        peerName={selectedPeer.id.split('@')[0]}
      />
    );
  }

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#050510',
          borderTopColor: '#1a1a2e',
        },
        tabBarActiveTintColor: '#00ff88',
        tabBarInactiveTintColor: '#666',
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
      })}
    >
      <Tab.Screen name="P2P" component={P2PConnectionScreen} />
      <Tab.Screen name="Nearby" component={NearbyPeersScreen} />
      <Tab.Screen name="Contacts">
        {() => <ContactsScreen onSelectPeer={setSelectedPeer} />}
      </Tab.Screen>
      <Tab.Screen name="Requests" component={ConnectionRequestScreen} />
      <Tab.Screen name="Feed" component={FeedScreen} />
      <Tab.Screen name="Tests" component={TestRunnerScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasIdentity, setHasIdentity] = useState(false);

  useEffect(() => {
    checkIdentity();
  }, []);

  const checkIdentity = async () => {
    try {
      const identity = await AsyncStorage.getItem('wyresup_identity');
      setHasIdentity(!!identity);
    } catch (error) {
      console.error('Error checking identity:', error);
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>وايرصَب</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
      <NavigationContainer
        theme={{
          dark: true,
          colors: {
            primary: '#1DB954',
            background: '#0a0a0a',
            card: '#1a1a1a',
            text: '#fff',
            border: '#222',
            notification: '#1DB954',
          },
          fonts: {
            regular: { fontFamily: 'System', fontWeight: '400' },
            medium: { fontFamily: 'System', fontWeight: '500' },
            bold: { fontFamily: 'System', fontWeight: '700' },
            heavy: { fontFamily: 'System', fontWeight: '900' },
          },
        }}
      >
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!hasIdentity ? (
            <Stack.Screen name="Welcome">
              {() => <WelcomeScreen onComplete={() => setHasIdentity(true)} />}
            </Stack.Screen>
          ) : (
            <Stack.Screen name="Main" component={MainTabs} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 48,
    fontWeight: '700',
    color: '#1DB954',
  },
  settingsContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    padding: 24,
  },
  settingsTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 24,
  },
  idCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
  },
  idLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  idValue: {
    fontSize: 16,
    color: '#1DB954',
    fontFamily: 'monospace',
  },
});
