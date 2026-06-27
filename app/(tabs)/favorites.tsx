import { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import BackButton from '@/components/BackButton';
import { jellyfinApi } from '@/api/jellyfin';
import { usePlayerStore } from '@/store/playerStore';
import SafeImage from '@/components/SafeImage';
import Svg, { Path } from 'react-native-svg';
import type { BaseItemDto, MediaStream } from '@/types/jellyfin';
import { formatDuration, formatBitrate } from '@/utils/format';
import { colors } from '@/utils/theme';

export default function FavoritesPage() {
  const [songs, setSongs] = useState<BaseItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { setQueue } = usePlayerStore();

  const load = async () => {
    try {
      const result = await jellyfinApi.getItems({
        includeItemTypes: 'Audio', isFavorite: true, sortBy: 'DateCreated',
        sortOrder: 'Descending', limit: 200, recursive: true,
        fields: 'PrimaryImageAspectRatio,SortName,MediaSourceCount,MediaStreams',
      });
      setSongs(result.Items || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { (async () => { await load(); setLoading(false); })(); }, []);

  if (loading) return <View style={styles.loading}><Text style={{color:colors.textMuted}}>加载中...</Text></View>;

  return (
    <View style={styles.container}>
    <FlatList
      data={songs}
      keyExtractor={(item) => item.Id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.accent} />}
      style={{ backgroundColor: '#1a1a2e' }}
      contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        ListHeaderComponent={
          <View>
            <BackButton onPress={() => router.push('/(tabs)')} />
            <Text style={styles.title}>我喜欢的 ({songs.length})</Text>
            {songs.length > 0 && (
              <Pressable style={styles.playAllBtn} onPress={() => setQueue(songs, 0)}>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="white"><Path d="M8 5v14l11-7z" /></Svg>
                <Text style={styles.playAllText}>全部播放</Text>
              </Pressable>
            )}
          </View>
        }
        ListEmptyComponent={<Text style={styles.empty}>还没有收藏的歌曲</Text>}
        renderItem={({ item, index }) => {
          const audioStream = item.MediaStreams?.find((s: MediaStream) => s.Type === 'Audio');
          const bitrate = audioStream?.BitRate;
          return (
            <Pressable style={styles.trackRow} onPress={() => setQueue(songs, index)}>
              <Text style={styles.trackIndex}>{index + 1}</Text>
              <SafeImage
                src={jellyfinApi.getImageUrl(item.AlbumId || item.Id, 'Primary', 40, 40, 90, item.ImageTags?.Primary || item.AlbumPrimaryImageTag)}
                type="song" size={40}
              />
              <View style={styles.trackMain}>
                <Text style={styles.trackName} numberOfLines={1}>{item.Name}</Text>
                <View style={styles.trackMeta}>
                  <Text style={styles.formatBadge}>{item.Container?.toUpperCase() || 'MP3'} {formatBitrate(bitrate ? Math.round(bitrate / 1000) : undefined)}</Text>
                  <Text style={styles.trackArtist} numberOfLines={1}>{item.Artists?.join(', ') || item.AlbumArtist || ''} - {item.Album || ''}</Text>
                </View>
              </View>
              <Text style={styles.trackDur}>{formatDuration(item.RunTimeTicks)}</Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a1a2e' },
  title: { fontSize: 28, fontWeight: '700', color: '#fff', marginBottom: 16 },
  playAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.accent, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24, alignSelf: 'flex-start', marginBottom: 16 },
  playAllText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  trackRow: { flexDirection: 'row', alignItems: 'center', padding: 10, paddingHorizontal: 12, borderRadius: 8, gap: 12 },
  trackIndex: { width: 36, textAlign: 'center', fontSize: 14, fontWeight: '600', color: colors.accent },
  trackMain: { flex: 1 },
  trackName: { fontSize: 15, fontWeight: '500', color: '#fff' },
  trackMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  formatBadge: { fontSize: 11, color: colors.textMuted, borderWidth: 1, borderColor: colors.textMuted, borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1 },
  trackArtist: { fontSize: 12, color: colors.textMuted, flex: 1 },
  trackDur: { fontSize: 13, color: colors.textMuted },
  empty: { textAlign: 'center', padding: 60, color: colors.textMuted, fontSize: 15 },
});
