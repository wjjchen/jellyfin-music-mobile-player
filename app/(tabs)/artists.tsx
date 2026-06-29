import { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator, RefreshControl, BackHandler } from 'react-native';
import { router } from 'expo-router';
import { jellyfinApi } from '@/api/jellyfin';
import { usePlayerStore } from '@/store/playerStore';
import SafeImage from '@/components/SafeImage';
import BackButton from '@/components/BackButton';
import AlbumOverlay from './album-overlay';
import Svg, { Path } from 'react-native-svg';
import type { BaseItemDto } from '@/types/jellyfin';
import { formatDuration } from '@/utils/format';
import { colors } from '@/utils/theme';

const PAGE_SIZE = 100;

export default function ArtistsPage() {
  const [artists, setArtists] = useState<BaseItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedArtistId, setSelectedArtistId] = useState<string | null>(null);
  const pendingArtistId = usePlayerStore((s) => s.pendingArtistId);
  const clearPendingDetail = usePlayerStore((s) => s.clearPendingDetail);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const result = await jellyfinApi.getArtists({ startIndex: artists.length, limit: PAGE_SIZE, sortBy: 'SortName' });
      const items = result.Items || [];
      setArtists((prev) => [...prev, ...items]);
      setTotalCount(result.TotalRecordCount);
      if (items.length < PAGE_SIZE) setHasMore(false);
    } catch (e) { console.error(e); }
    finally { setLoadingMore(false); }
  }, [artists.length, loadingMore, hasMore]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setHasMore(true);
    try {
      const result = await jellyfinApi.getArtists({ startIndex: 0, limit: PAGE_SIZE, sortBy: 'SortName' });
      const items = result.Items || [];
      setArtists(items);
      setTotalCount(result.TotalRecordCount);
      if (items.length < PAGE_SIZE) setHasMore(false);
    } catch (e) { console.error(e); }
    finally { setRefreshing(false); }
  }, []);

  useEffect(() => {
    async function init() {
      try {
        const result = await jellyfinApi.getArtists({ startIndex: 0, limit: PAGE_SIZE, sortBy: 'SortName' });
        const items = result.Items || [];
        setArtists(items);
        setTotalCount(result.TotalRecordCount);
        if (items.length < PAGE_SIZE) setHasMore(false);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    init();
  }, []);

  useEffect(() => {
    if (pendingArtistId) { setSelectedArtistId(pendingArtistId); clearPendingDetail(); }
  }, [pendingArtistId]);

  useEffect(() => {
    if (selectedArtistId) {
      const handler = BackHandler.addEventListener('hardwareBackPress', () => {
        setSelectedArtistId(null);
        return true;
      });
      return () => handler.remove();
    }
  }, [selectedArtistId]);

  if (loading) return <View style={styles.loading}><Text style={{color:colors.textMuted}}>加载中...</Text></View>;

  return (
    <View style={styles.wrap}>
      <FlatList
        data={artists}
        keyExtractor={(item) => item.Id}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        style={{ backgroundColor: '#1a1a2e' }}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        ListHeaderComponent={<Text style={styles.title}>歌手列表 ({artists.length}{totalCount > artists.length ? ` / ${totalCount}` : ''})</Text>}
        ListFooterComponent={!hasMore && artists.length > 0 ? <Text style={styles.endMarker}>到底啦</Text> : null}
        ListEmptyComponent={<Text style={styles.empty}>没有找到歌手</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.artistRow} onPress={() => setSelectedArtistId(item.Id)}>
            <SafeImage src={item.ImageTags?.Primary ? jellyfinApi.getImageUrl(item.Id, 'Primary', 60, 60, 90, item.ImageTags.Primary) : ''} type="artist" size={48} />
            <View style={styles.artistInfo}>
              <Text style={styles.artistName}>{item.Name}</Text>
              <Text style={styles.artistCount}>{item.SongCount || 0} 首歌曲</Text>
            </View>
          </Pressable>
        )}
      />
      {selectedArtistId && <ArtistOverlay artistId={selectedArtistId} onBack={() => setSelectedArtistId(null)} />}
    </View>
  );
}

function ArtistOverlay({ artistId, onBack }: { artistId: string; onBack: () => void }) {
  const [artist, setArtist] = useState<BaseItemDto | null>(null);
  const [albums, setAlbums] = useState<BaseItemDto[]>([]);
  const [songs, setSongs] = useState<BaseItemDto[]>([]);
  const [activeTab, setActiveTab] = useState<'albums' | 'songs'>('albums');
  const [loading, setLoading] = useState(true);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const { setQueue } = usePlayerStore();

  useEffect(() => {
    async function load() {
      try {
        const artistData = await jellyfinApi.getItem(artistId);
        setArtist(artistData);
        const [albumsData, songsData] = await Promise.all([
          jellyfinApi.getArtistAlbums(artistId), jellyfinApi.getArtistSongs(artistId),
        ]);
        setAlbums(albumsData.Items || []);
        setSongs(songsData.Items || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    load();
  }, [artistId]);

  return (
    <View style={styles.overlay}>
      <BackButton onPress={onBack} />
      {loading ? (
        <View style={styles.overlayLoading}><ActivityIndicator size="large" color={colors.accent} /></View>
      ) : artist ? (
        <FlatList
          data={activeTab === 'albums' ? albums : songs}
          key={activeTab}
          keyExtractor={(item) => item.Id}
          numColumns={activeTab === 'albums' ? 2 : 1}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          columnWrapperStyle={activeTab === 'albums' ? { gap: 12, marginBottom: 16 } : undefined}
          ListHeaderComponent={
            <View>
              <View style={styles.detailHeader}>
                <SafeImage src={jellyfinApi.getImageUrl(artist.Id, 'Primary', 200, 200, 90, artist.ImageTags?.Primary)} type="artist" size={120} />
                <View style={styles.detailInfo}>
                  <Text style={styles.detailName}>{artist.Name}</Text>
                  <Text style={styles.detailMeta}>{albums.length} 张专辑 / {songs.length} 首歌曲</Text>
                </View>
              </View>
              <View style={styles.artistTabs}>
                <Pressable style={[styles.artistTab, activeTab === 'albums' && styles.artistTabActive]} onPress={() => setActiveTab('albums')}>
                  <Text style={[styles.artistTabText, activeTab === 'albums' && styles.artistTabTextActive]}>专辑 ({albums.length})</Text>
                </Pressable>
                <Pressable style={[styles.artistTab, activeTab === 'songs' && styles.artistTabActive]} onPress={() => setActiveTab('songs')}>
                  <Text style={[styles.artistTabText, activeTab === 'songs' && styles.artistTabTextActive]}>歌曲 ({songs.length})</Text>
                </Pressable>
              </View>
              {activeTab === 'songs' && (
                <Pressable style={styles.playAllBtn} onPress={() => songs.length > 0 && setQueue(songs, 0)}>
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="white"><Path d="M8 5v14l11-7z" /></Svg>
                  <Text style={styles.playAllText}>全部播放 (共{songs.length}首)</Text>
                </Pressable>
              )}
            </View>
          }
          ListEmptyComponent={<Text style={styles.empty}>{activeTab === 'albums' ? '没有找到专辑' : '没有找到歌曲'}</Text>}
          renderItem={({ item, index }) =>
            activeTab === 'albums' ? (
              <Pressable style={{ width: '48%' }}                                         onPress={() => {
                                            setSelectedAlbumId(item.Id);
                                        }}>
                <SafeImage src={jellyfinApi.getImageUrl(item.Id, 'Primary', 140, 140, 90, item.ImageTags?.Primary)} type="album" size={140} />
                <Text style={styles.albumCardName} numberOfLines={1}>{item.Name}</Text>
                <Text style={styles.albumCardYear}>{item.ProductionYear || ''}</Text>
              </Pressable>
            ) : (
              <Pressable style={styles.trackRow} onPress={() => setQueue(songs, index)}>
                <Text style={styles.trackIndex}>{index + 1}</Text>
                <View style={styles.trackMain}>
                  <Text style={styles.trackName} numberOfLines={1}>{item.Name}</Text>
                  <Text style={styles.trackMetaArtist} numberOfLines={1}>{item.Album || ''}</Text>
                </View>
                <Text style={styles.trackDuration}>{formatDuration(item.RunTimeTicks)}</Text>
              </Pressable>
            )
          }
        />
      ) : <Text style={styles.empty}>歌手未找到</Text>}
      {selectedAlbumId && <AlbumOverlay albumId={selectedAlbumId} onClose={() => setSelectedAlbumId(null)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#1a1a2e' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  title: { fontSize: 28, fontWeight: '700', color: '#fff', marginBottom: 16 },
  artistRow: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 10, paddingHorizontal: 12, borderRadius: 8 },
  artistInfo: { flex: 1 },
  artistName: { fontSize: 15, fontWeight: '500', color: '#fff' },
  artistCount: { fontSize: 12, color: colors.textMuted, marginTop: 2 },

  overlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: '#1a1a2e', paddingTop: 8 },
  overlayLoading: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  detailHeader: { flexDirection: 'row', gap: 16, paddingHorizontal: 16, marginBottom: 16 },
  detailInfo: { flex: 1, justifyContent: 'flex-end' },
  detailName: { fontSize: 28, fontWeight: '700', color: '#fff', marginBottom: 6 },
  detailMeta: { fontSize: 13, color: colors.textSecondary },

  artistTabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border, marginHorizontal: 16, marginBottom: 16 },
  artistTab: { paddingVertical: 10, paddingHorizontal: 20, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  artistTabActive: { borderBottomColor: colors.accent },
  artistTabText: { fontSize: 14, color: colors.textMuted },
  artistTabTextActive: { color: colors.accent },

  playAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.accent, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24, alignSelf: 'flex-start', marginLeft: 16, marginBottom: 16 },
  playAllText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  albumCardName: { fontSize: 13, fontWeight: '500', color: '#fff', marginTop: 4 },
  albumCardYear: { fontSize: 11, color: colors.textMuted },

  trackRow: { flexDirection: 'row', alignItems: 'center', padding: 10, paddingHorizontal: 12, borderRadius: 8, gap: 12 },
  trackIndex: { width: 36, textAlign: 'center', fontSize: 14, fontWeight: '600', color: colors.accent },
  trackMain: { flex: 1 },
  trackName: { fontSize: 15, fontWeight: '500', color: '#fff' },
  trackMetaArtist: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  trackDuration: { fontSize: 13, color: colors.textMuted },

  endMarker: { textAlign: 'center', padding: 32, color: colors.textMuted, fontSize: 14 },
  empty: { textAlign: 'center', padding: 60, color: colors.textMuted, fontSize: 15 },
});
