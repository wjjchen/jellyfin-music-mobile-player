import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { jellyfinApi } from '@/api/jellyfin';

export default function Index() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    jellyfinApi.isAuthenticated().then(setAuthed);
  }, []);

  if (authed === null) {
    return (
      <View style={{ flex: 1, backgroundColor: '#1a1a2e', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#00A4DC" />
      </View>
    );
  }

  return <Redirect href={authed ? '/(tabs)' : '/login'} />;
}
