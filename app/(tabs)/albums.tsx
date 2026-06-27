import { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, useWindowDimensions, ActivityIndicator, RefreshControl, BackHandler } from 'react-native';
import { jellyfinApi } from '@/api/jellyfin';
import { usePlayerStore } from '@/store/playerStore';
import SafeImage from '@/components/SafeImage';
import BackButton from '@/components/BackButton';
import Svg, { Path } from 'react-native-svg';
import type { BaseItemDto, MediaStream } from '@/types/jellyfin';
import { formatDuration, formatBitrate } from '@/utils/format';
import { colors } from '@/utils/theme';

const PAGE_SIZE = 50;

export default function AlbumsPage() {
  const [albums, setAlbums] = useState<BaseItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const { width } = useWindowDimensions();
  const cardWidth = (width - 48) / 2;
  const pendingAlbumId = usePlayerStore((s) => s.pendingAlbumId);
  const clearPendingDetail = usePlayerStore((s) => s.clearPendingDetail);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const result = await jellyfinApi.getItems({
        includeItemTypes: 'MusicAlbum', sortBy: 'DateCreated', sortOrder: 'Descending',
        startIndex: albums.length, limit: PAGE_SIZE, recursive: true,
        fields: 'PrimaryImageAspectRatio,SortName,DateCreated',
      });
      const items = result.Items || [];
      setAlbums((prev) => [...prev, ...items]);
      setTotalCount(result.TotalRecordCount);
      if (items.length < PAGE_SIZE) setHasMore(false);
    } catch (e) { console.error(e); }
    finally { setLoadingMore(false); }
  }, [albums.length, loadingMore, hasMore]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setHasMore(true);
    try {
      const result = await jellyfinApi.getItems({
        includeItemTypes: 'MusicAlbum', sortBy: 'DateCreated', sortOrder: 'Descending',
        startIndex: 0, limit: PAGE_SIZE, recursive: true,
        fields: 'PrimaryImageAspectRatio,SortName,DateCreated',
      });
      const items = result.Items || [];
      setAlbums(items);
      setTotalCount(result.TotalRecordCount);
      if (items.length < PAGE_SIZE) setHasMore(false);
    } catch (e) { console.error(e); }
    finally { setRefreshing(false); }
  }, []);

  useEffect(() => {
    async function init() {
      try {
        const result = await jellyfinApi.getItems({
          includeItemTypes: 'MusicAlbum', sortBy: 'DateCreated', sortOrder: 'Descending',
          startIndex: 0, limit: PAGE_SIZE, recursive: true,
          fields: 'PrimaryImageAspectRatio,SortName,DateCreated',
        });
        const items = result.Items || [];
        setAlbums(items);
        setTotalCount(result.TotalRecordCount);
        if (items.length < PAGE_SIZE) setHasMore(false);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    init();
  }, []);

  useEffect(() => {
    if (pendingAlbumId) { setSelectedAlbumId(pendingAlbumId); clearPendingDetail(); }
  }, [pendingAlbumId]);

  useEffect(() => {
    if (selectedAlbumId) {
      const handler = BackHandler.addEventListener('hardwareBackPress', () => {
        setSelectedAlbumId(null);
        return true;
      });
      return () => handler.remove();
    }
  }, [selectedAlbumId]);

  if (loading) {
    return <View style={styles.loading}><Text style={{color:colors.textMuted}}>加载中...</Text></View>;
  }

  return (
    <View style={styles.wrap}>
      <FlatList
        data={albums}
        keyExtractor={(item) => item.Id}
        numColumns={2}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        style={{ backgroundColor: '#1a1a2e' }}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        columnWrapperStyle={{ gap: 16, marginBottom: 20 }}
        ListHeaderComponent={<Text style={styles.title}>专辑 ({albums.length}{totalCount > albums.length ? ` / ${totalCount}` : ''})</Text>}
        ListFooterComponent={!hasMore && albums.length > 0 ? <Text style={styles.endMarker}>到底啦</Text> : null}
        ListEmptyComponent={<Text style={styles.empty}>没有找到专辑</Text>}
        renderItem={({ item }) => (
          <Pressable style={[styles.card, { width: cardWidth }]} onPress={() => setSelectedAlbumId(item.Id)}>
            <SafeImage src={jellyfinApi.getImageUrl(item.Id, 'Primary', 200, 200, 90, item.ImageTags?.Primary)} type="album" size={cardWidth} />
            <View style={styles.cardInfo}>
              <Text style={styles.cardName} numberOfLines={1}>{item.Name || '未知标题'}</Text>
              <Text style={styles.cardArtist} numberOfLines={1}>{item.AlbumArtist || item.Artists?.join(', ') || '未知艺术家'}</Text>
            </View>
          </Pressable>
        )}
      />

      {selectedAlbumId && <AlbumOverlay albumId={selectedAlbumId} onBack={() => setSelectedAlbumId(null)} />}
    </View>
  );
}

function AlbumOverlay({ albumId, onBack }: { albumId: string; onBack: () => void }) {
  const [album, setAlbum] = useState<BaseItemDto | null>(null);
  const [tracks, setTracks] = useState<BaseItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const { setQueue } = usePlayerStore();

  useEffect(() => {
    async function load() {
      try {
        const [albumData, tracksData] = await Promise.all([
          jellyfinApi.getItem(albumId), jellyfinApi.getAlbumTracks(albumId),
        ]);
        setAlbum(albumData);
        setTracks(tracksData.Items || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    load();
  }, [albumId]);

  return (
    <View style={styles.overlay}>
      <BackButton onPress={onBack} />
      {loading ? (
        <View style={styles.overlayLoading}><ActivityIndicator size="large" color={colors.accent} /></View>
      ) : album ? (
        <FlatList
          data={tracks}
          keyExtractor={(item) => item.Id}
          contentContainerStyle={{ paddingBottom: 40 }}
          ListHeaderComponent={
            <View>
              <View style={styles.detailHeader}>
                <SafeImage src={jellyfinApi.getImageUrl(album.Id, 'Primary', 300, 300, 90, album.ImageTags?.Primary)} type="album" size={180} />
                <View style={styles.detailInfo}>
                  <Text style={styles.detailLabel}>歌单</Text>
                  <Text style={styles.detailName}>{album.Name}</Text>
                  <Text style={styles.detailMeta}>年代: {album.ProductionYear || '未知'} | {album.AlbumArtist || album.Artists?.join(', ') || '未知艺术家'}</Text>
                </View>
              </View>
              <Pressable style={styles.playAllBtn} onPress={() => tracks.length > 0 && setQueue(tracks, 0)}>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="white"><Path d="M8 5v14l11-7z" /></Svg>
                <Text style={styles.playAllText}>全部播放 (共{tracks.length}首)</Text>
              </Pressable>
            </View>
          }
          ListFooterComponent={tracks.length > 0 ? <Text style={styles.endMarker}>到底啦</Text> : null}
          ListEmptyComponent={<Text style={styles.empty}>该专辑没有歌曲</Text>}
          renderItem={({ item, index }) => {
            const bs = item.MediaStreams?.find((s: MediaStream) => s.Type === 'Audio')?.BitRate;
            return (
              <Pressable style={styles.trackRow} onPress={() => setQueue(tracks, index)}>
                <Text style={styles.trackIndex}>{index + 1}</Text>
                <View style={styles.trackMain}>
                  <Text style={styles.trackName} numberOfLines={1}>{item.Name}</Text>
                  <View style={styles.trackMeta}>
                    <Text style={styles.formatBadge}>{item.Container?.toUpperCase() || 'MP3'} {formatBitrate(bs ? Math.round(bs / 1000) : undefined)}</Text>
                    <Text style={styles.trackArtist} numberOfLines={1}>{item.Artists?.join(', ') || item.AlbumArtist || ''}</Text>
                  </View>
                </View>
                <Text style={styles.trackDuration}>{formatDuration(item.RunTimeTicks)}</Text>
              </Pressable>
            );
          }}
        />
      ) : <Text style={styles.empty}>专辑未找到</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#1a1a2e' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  title: { fontSize: 28, fontWeight: '700', color: '#fff', marginBottom: 20 },
  card: { borderRadius: 8, overflow: 'hidden' },
  cardInfo: { padding: 6, paddingLeft: 2 },
  cardName: { fontSize: 14, fontWeight: '500', color: '#fff' },
  cardArtist: { fontSize: 12, color: colors.textMuted, marginTop: 2 },

  overlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: '#1a1a2e', paddingTop: 8 },
  overlayLoading: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  detailHeader: { flexDirection: 'row', gap: 16, paddingHorizontal: 16, marginBottom: 16 },
  detailInfo: { flex: 1, justifyContent: 'flex-end' },
  detailLabel: { fontSize: 12, color: colors.textMuted, marginBottom: 4 },
  detailName: { fontSize: 28, fontWeight: '700', color: '#fff', marginBottom: 6 },
  detailMeta: { fontSize: 13, color: colors.textSecondary },

  playAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.accent, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24, alignSelf: 'flex-start', marginLeft: 16, marginBottom: 16 },
  playAllText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  trackRow: { flexDirection: 'row', alignItems: 'center', padding: 10, paddingHorizontal: 16, borderRadius: 8, gap: 12 },
  trackIndex: { width: 36, textAlign: 'center', fontSize: 14, fontWeight: '600', color: colors.accent },
  trackMain: { flex: 1 },
  trackName: { fontSize: 15, fontWeight: '500', color: '#fff' },
  trackMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  formatBadge: { fontSize: 11, color: colors.textMuted, borderWidth: 1, borderColor: colors.textMuted, borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1 },
  trackArtist: { fontSize: 12, color: colors.textMuted, flex: 1 },
  trackDuration: { fontSize: 13, color: colors.textMuted },
  endMarker: { textAlign: 'center', padding: 32, color: colors.textMuted, fontSize: 14 },
  empty: { textAlign: 'center', padding: 60, color: colors.textMuted, fontSize: 15 },
});
