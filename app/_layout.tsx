import { useEffect, useState } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, Platform } from 'react-native';
import { jellyfinApi, setOnAuthFailure } from '@/api/jellyfin';
import NowPlayingBar from '@/components/NowPlayingBar';
import PlaylistPanel from '@/components/PlaylistPanel';

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    jellyfinApi.init().then(() => setReady(true));
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      try {
        const root = document.getElementById('root');
        if (root) {
          root.style.backgroundColor = '#1a1a2e';
          root.style.minHeight = '100vh';
          root.style.color = '#ffffff';
        }
      } catch {}
    }
  }, []);

  useEffect(() => {
    setOnAuthFailure(() => router.replace('/login'));
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: '#1a1a2e', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#00A4DC" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#1a1a2e' }}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="player" options={{ presentation: 'fullScreenModal', headerShown: false }} />
      </Stack>
      <NowPlayingBar />
      <PlaylistPanel />
    </View>
  );
}
