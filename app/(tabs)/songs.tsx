import { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { jellyfinApi } from '@/api/jellyfin';
import { usePlayerStore } from '@/store/playerStore';
import Svg, { Path } from 'react-native-svg';
import type { BaseItemDto, MediaStream } from '@/types/jellyfin';
import { formatBitrate } from '@/utils/format';
import { colors } from '@/utils/theme';

const PAGE_SIZE = 200;

export default function SongsPage() {
  const [songs, setSongs] = useState<BaseItemDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const { setQueue } = usePlayerStore();

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const result = await jellyfinApi.getItems({
        includeItemTypes: 'Audio', sortBy: 'SortName', sortOrder: 'Ascending',
        startIndex: songs.length, limit: PAGE_SIZE, recursive: true,
        fields: 'PrimaryImageAspectRatio,SortName,MediaSourceCount,MediaStreams',
      });
      const items = result.Items || [];
      setSongs((prev) => [...prev, ...items]);
      setTotalCount(result.TotalRecordCount);
      if (items.length < PAGE_SIZE || songs.length + items.length >= result.TotalRecordCount) {
        setHasMore(false);
      }
    } catch (e) {
      console.error('Load songs failed:', e);
    } finally {
      setLoadingMore(false);
    }
  }, [songs.length, loadingMore, hasMore]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setHasMore(true);
    try {
      const result = await jellyfinApi.getItems({
        includeItemTypes: 'Audio', sortBy: 'SortName', sortOrder: 'Ascending',
        startIndex: 0, limit: PAGE_SIZE, recursive: true,
        fields: 'PrimaryImageAspectRatio,SortName,MediaSourceCount,MediaStreams',
      });
      const items = result.Items || [];
      setSongs(items);
      setTotalCount(result.TotalRecordCount);
      if (items.length < PAGE_SIZE) setHasMore(false);
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    async function init() {
      try {
        const result = await jellyfinApi.getItems({
          includeItemTypes: 'Audio', sortBy: 'SortName', sortOrder: 'Ascending',
          startIndex: 0, limit: PAGE_SIZE, recursive: true,
          fields: 'PrimaryImageAspectRatio,SortName,MediaSourceCount,MediaStreams',
        });
        const items = result.Items || [];
        setSongs(items);
        setTotalCount(result.TotalRecordCount);
        if (items.length < PAGE_SIZE) setHasMore(false);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  if (loading) {
    return <View style={styles.center}><Svg width={36} height={36} viewBox="0 0 24 24"><Path d="M12 2a10 10 0 1 0 10 10" fill="none" stroke={colors.accent} strokeWidth={3} /></Svg></View>;
  }

  return (
    <FlatList
      data={songs}
      keyExtractor={(item) => item.Id}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      style={{ backgroundColor: '#1a1a2e' }}
      contentContainerStyle={styles.container}
      ListHeaderComponent={
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={1.5}>
              <Path d="M9 18V5l12-2v13" />
              <Path d="M6 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
              <Path d="M18 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
            </Svg>
            <View>
              <Text style={styles.headerLabel}>歌单</Text>
              <Text style={styles.headerTitle}>全部音乐</Text>
            </View>
          </View>
          <Pressable style={styles.playAllBtn} onPress={() => songs.length > 0 && setQueue(songs, 0)}>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="white"><Path d="M8 5v14l11-7z" /></Svg>
            <Text style={styles.playAllText}>全部播放 (共{totalCount}首)</Text>
          </Pressable>
        </View>
      }
      ListFooterComponent={
        loadingMore ? (
          <View style={styles.center}><Text style={{ color: colors.textMuted }}>加载中...</Text></View>
        ) : !hasMore && songs.length > 0 ? (
          <Text style={styles.endMarker}>到底啦</Text>
        ) : null
      }
      ListEmptyComponent={<Text style={styles.empty}>没有找到歌曲</Text>}
      renderItem={({ item, index }) => {
        const audioStream = item.MediaStreams?.find((s: MediaStream) => s.Type === 'Audio');
        const bitrate = audioStream?.BitRate;
        return (
          <Pressable style={styles.songRow} onPress={() => setQueue(songs, index)}>
            <Text style={styles.index}>{index + 1}</Text>
            <View style={styles.songMain}>
              <Text style={styles.songName} numberOfLines={1}>{item.Name}</Text>
              <View style={styles.songMeta}>
                <Text style={styles.formatBadge}>{item.Container?.toUpperCase() || 'MP3'} {formatBitrate(bitrate ? Math.round(bitrate / 1000) : undefined)}</Text>
                <Text style={styles.metaText} numberOfLines={1}>{item.Artists?.join(', ') || item.AlbumArtist || '未知艺术家'} - {item.Album || ''}</Text>
              </View>
            </View>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 120 },
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  header: { marginBottom: 24 },
  headerIcon: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  headerLabel: { fontSize: 12, color: colors.textMuted, marginBottom: 4 },
  headerTitle: { fontSize: 28, fontWeight: '700', color: '#fff' },
  playAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.accent, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24, alignSelf: 'flex-start' },
  playAllText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  songRow: { flexDirection: 'row', alignItems: 'center', padding: 10, paddingHorizontal: 12, borderRadius: 8, gap: 12 },
  index: { width: 36, textAlign: 'center', fontSize: 14, fontWeight: '600', color: colors.accent },
  songMain: { flex: 1 },
  songName: { fontSize: 15, fontWeight: '500', color: '#fff' },
  songMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  formatBadge: { fontSize: 11, color: colors.textMuted, borderWidth: 1, borderColor: colors.textMuted, borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1 },
  metaText: { fontSize: 12, color: colors.textMuted, flex: 1 },
  endMarker: { textAlign: 'center', padding: 32, color: colors.textMuted, fontSize: 14 },
  empty: { textAlign: 'center', padding: 60, color: colors.textMuted, fontSize: 15 },
});
