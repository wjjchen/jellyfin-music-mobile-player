import { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { jellyfinApi } from '@/api/jellyfin';
import { usePlayerStore } from '@/store/playerStore';
import Svg, { Path } from 'react-native-svg';
import BackButton from '@/components/BackButton';
import type { BaseItemDto, MediaStream } from '@/types/jellyfin';
import { formatDuration, formatBitrate } from '@/utils/format';
import { colors } from '@/utils/theme';

export default function GenresPage() {
  const [genres, setGenres] = useState<BaseItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<{ id: string; name: string } | null>(null);

  const load = async () => {
    try {
      const result = await jellyfinApi.getGenres();
      setGenres(result.Items || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { (async () => { await load(); setLoading(false); })(); }, []);

  if (loading) return <View style={styles.loading}><Text style={{color:colors.textMuted}}>加载中...</Text></View>;

  return (
    <View style={styles.wrap}>
      <FlatList
        data={genres}
        keyExtractor={(item) => item.Id}
        numColumns={2}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.accent} />}
        style={{ backgroundColor: '#1a1a2e' }}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        columnWrapperStyle={{ gap: 12, marginBottom: 12 }}
        ListHeaderComponent={<Text style={styles.title}>流派 ({genres.length})</Text>}
        ListEmptyComponent={<Text style={styles.empty}>没有找到流派</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.genreCard} onPress={() => setSelectedGenre({ id: item.Id, name: item.Name })}>
            <Text style={styles.genreName}>{item.Name}</Text>
            <Text style={styles.genreCount}>{item.ChildCount || 0} 首歌曲</Text>
          </Pressable>
        )}
      />
      {selectedGenre && <GenreOverlay genreId={selectedGenre.id} genreName={selectedGenre.name} onBack={() => setSelectedGenre(null)} />}
    </View>
  );
}

function GenreOverlay({ genreId, genreName, onBack }: { genreId: string; genreName: string; onBack: () => void }) {
  const [songs, setSongs] = useState<BaseItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const { setQueue } = usePlayerStore();

  useEffect(() => {
    async function load() {
      try {
        const result = await jellyfinApi.getItems({
          includeItemTypes: 'Audio', genreIds: genreId, sortBy: 'SortName', sortOrder: 'Ascending',
          recursive: true, fields: 'PrimaryImageAspectRatio,SortName,MediaSourceCount,MediaStreams', limit: 500,
        });
        setSongs(result.Items || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    load();
  }, [genreId]);

  return (
    <View style={styles.overlay}>
      <BackButton onPress={onBack} />
      {loading ? (
        <View style={styles.overlayLoading}><ActivityIndicator size="large" color={colors.accent} /></View>
      ) : (
        <FlatList
          data={songs}
          keyExtractor={(item) => item.Id}
          contentContainerStyle={{ paddingBottom: 40 }}
          ListHeaderComponent={
            <View>
              <View style={styles.detailHeader}>
                <View style={styles.genreIcon}><Text style={{ fontSize: 36 }}>🎵</Text></View>
                <View style={styles.detailInfo}>
                  <Text style={styles.detailLabel}>流派</Text>
                  <Text style={styles.detailName}>{genreName}</Text>
                  <Text style={styles.detailMeta}>{songs.length} 首歌曲</Text>
                </View>
              </View>
              <Pressable style={styles.playAllBtn} onPress={() => songs.length > 0 && setQueue(songs, 0)}>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="white"><Path d="M8 5v14l11-7z" /></Svg>
                <Text style={styles.playAllText}>全部播放 (共{songs.length}首)</Text>
              </Pressable>
            </View>
          }
          ListFooterComponent={songs.length > 0 ? <Text style={styles.endMarker}>到底啦</Text> : null}
          ListEmptyComponent={<Text style={styles.empty}>该流派没有歌曲</Text>}
          renderItem={({ item, index }) => {
            const bs = item.MediaStreams?.find((s: MediaStream) => s.Type === 'Audio')?.BitRate;
            return (
              <Pressable style={styles.trackRow} onPress={() => setQueue(songs, index)}>
                <Text style={styles.trackIndex}>{index + 1}</Text>
                <View style={styles.trackMain}>
                  <Text style={styles.trackName} numberOfLines={1}>{item.Name}</Text>
                  <View style={styles.trackMeta}>
                    <Text style={styles.formatBadge}>{item.Container?.toUpperCase() || 'MP3'} {formatBitrate(bs ? Math.round(bs / 1000) : undefined)}</Text>
                    <Text style={styles.trackArtist} numberOfLines={1}>{item.Artists?.join(', ') || item.AlbumArtist || ''} - {item.Album || ''}</Text>
                  </View>
                </View>
                <Text style={styles.trackDuration}>{formatDuration(item.RunTimeTicks)}</Text>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#1a1a2e' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  title: { fontSize: 28, fontWeight: '700', color: '#fff', marginBottom: 16 },
  genreCard: { flex: 1, padding: 20, backgroundColor: colors.bgCard, borderRadius: 12 },
  genreName: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 4 },
  genreCount: { fontSize: 12, color: colors.textMuted },

  overlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: '#1a1a2e', paddingTop: 8 },
  overlayLoading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  genreIcon: { width: 100, height: 100, borderRadius: 12, backgroundColor: colors.bgCard, alignItems: 'center', justifyContent: 'center' },

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
