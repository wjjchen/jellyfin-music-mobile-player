import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Line, Polygon } from 'react-native-svg';

function TabIcon({ name, color }: { name: string; color: any }) {
  const size = 22;
  switch (name) {
    case 'home':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
          <Polygon points="12 2 2 7 12 12 22 7 12 2" fill={color} opacity={0.3} />
          <Path d="M2 17l10 5 10-5" />
          <Path d="M2 12l10 5 10-5" />
        </Svg>
      );
    case 'songs':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
          <Path d="M9 18V5l12-2v13" />
          <Circle cx="6" cy="18" r="3" />
          <Circle cx="18" cy="16" r="3" />
        </Svg>
      );
    case 'albums':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
          <Circle cx="12" cy="12" r="10" />
          <Circle cx="12" cy="12" r="3" />
        </Svg>
      );
    case 'artists':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
          <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <Circle cx="9" cy="7" r="4" />
          <Path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <Path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </Svg>
      );
    case 'genres':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
          <Path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
          <Line x1="7" y1="7" x2="7.01" y2="7" />
        </Svg>
      );
    default:
      return null;
  }
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: '#1a1a2e', paddingTop: insets.top }}>
      <Tabs
        screenOptions={{
          headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0f0f1a',
          borderTopColor: 'rgba(255,255,255,0.08)',
          borderTopWidth: 1,
          height: 56 + insets.bottom,
          paddingBottom: 6 + insets.bottom,
          paddingTop: 6,
          bottom: 0,
        },
        tabBarActiveTintColor: '#00A4DC',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.4)',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarShowLabel: false,
        }}
      >
        <Tabs.Screen name="index" options={{ title: '推荐', tabBarIcon: ({ color }) => <TabIcon name="home" color={color} /> }} />
        <Tabs.Screen name="songs" options={{ title: '歌曲', tabBarIcon: ({ color }) => <TabIcon name="songs" color={color} /> }} />
        <Tabs.Screen name="albums" options={{ title: '专辑', tabBarIcon: ({ color }) => <TabIcon name="albums" color={color} /> }} />
        <Tabs.Screen name="artists" options={{ title: '歌手', tabBarIcon: ({ color }) => <TabIcon name="artists" color={color} /> }} />
          <Tabs.Screen name="genres" options={{ title: '流派', tabBarIcon: ({ color }) => <TabIcon name="genres" color={color} /> }} />
          <Tabs.Screen name="favorites" options={{ href: null, title: '我喜欢的' }} />
          <Tabs.Screen name="playlists" options={{ href: null, title: '我的歌单' }} />
      </Tabs>
    </View>
  );
}
