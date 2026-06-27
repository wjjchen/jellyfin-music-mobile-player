import { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import BackButton from '@/components/BackButton';
import { jellyfinApi } from '@/api/jellyfin';
import { usePlayerStore } from '@/store/playerStore';
import SafeImage from '@/components/SafeImage';
import Svg, { Path, Polyline, Circle, Line } from 'react-native-svg';
import type { BaseItemDto, MediaStream } from '@/types/jellyfin';
import { formatDuration, formatBitrate } from '@/utils/format';
import { colors } from '@/utils/theme';

export default function PlaylistsPage() {
  const [playlists, setPlaylists] = useState<BaseItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlaylist, setSelectedPlaylist] = useState<{ id: string; name: string } | null>(null);
  const { width } = useWindowDimensions();
  const cardWidth = (width - 48) / 2;
  const pendingPlaylistId = usePlayerStore((s) => s.pendingPlaylistId);
  const clearPendingDetail = usePlayerStore((s) => s.clearPendingDetail);

  const loadPlaylists = async () => {
    try {
      const result = await jellyfinApi.getPlaylists();
      setPlaylists(result.Items || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadPlaylists(); }, []);

  useEffect(() => {
    if (pendingPlaylistId && playlists.length > 0) {
      const pl = playlists.find((p) => p.Id === pendingPlaylistId);
      if (pl) setSelectedPlaylist({ id: pl.Id, name: pl.Name });
      clearPendingDetail();
    }
  }, [pendingPlaylistId, playlists]);

  const handleBack = () => { setSelectedPlaylist(null); loadPlaylists(); };

  if (loading) return <View style={styles.loading}><Text style={{color:colors.textMuted}}>加载中...</Text></View>;

  return (
    <View style={styles.wrap}>
      <BackButton onPress={() => router.push('/(tabs)')} />
      <FlatList
        data={playlists}
        keyExtractor={(item) => item.Id}
        numColumns={2}
        style={{ backgroundColor: '#1a1a2e' }}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        columnWrapperStyle={{ gap: 16, marginBottom: 20 }}
        ListHeaderComponent={<Text style={styles.title}>我的歌单 ({playlists.length})</Text>}
        ListEmptyComponent={<Text style={styles.empty}>还没有歌单</Text>}
        renderItem={({ item }) => (
          <Pressable style={[styles.card, { width: cardWidth }]} onPress={() => setSelectedPlaylist({ id: item.Id, name: item.Name })}>
            <SafeImage src={jellyfinApi.getImageUrl(item.Id, 'Primary', 200, 200, 90, item.ImageTags?.Primary)} type="album" size={cardWidth} />
            <View style={styles.cardInfo}>
              <Text style={styles.cardName} numberOfLines={1}>{item.Name}</Text>
              <Text style={styles.cardCount}>{item.ChildCount || 0} 首歌曲</Text>
            </View>
          </Pressable>
        )}
      />
      {selectedPlaylist && <PlaylistOverlay playlistId={selectedPlaylist.id} playlistName={selectedPlaylist.name} onBack={handleBack} />}
    </View>
  );
}

function PlaylistOverlay({ playlistId, playlistName, onBack }: { playlistId: string; playlistName: string; onBack: () => void }) {
  const [tracks, setTracks] = useState<BaseItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const { setQueue } = usePlayerStore();

  useEffect(() => {
    async function load() {
      try {
        const result = await jellyfinApi.getPlaylistItems(playlistId);
        setTracks(result.Items || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    load();
  }, [playlistId]);

  const handleRemove = async (trackId: string) => {
    try {
      await jellyfinApi.removeFromPlaylist(playlistId, [trackId]);
      setTracks((prev) => prev.filter((t) => t.Id !== trackId));
    } catch (e) { console.error(e); }
  };

  if (loading) return (
    <View style={styles.overlay}>
      <View style={styles.overlayLoading}><ActivityIndicator size="large" color={colors.accent} /></View>
    </View>
  );

  return (
    <View style={styles.overlay}>
      <BackButton onPress={onBack} />
      <FlatList
        data={tracks}
        keyExtractor={(item) => item.Id}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListHeaderComponent={
          <View>
            <View style={styles.coverRow}>
              <SafeImage src={jellyfinApi.getImageUrl(playlistId, 'Primary', 300, 300, 90)} type="album" size={160} />
              <View style={styles.detailInfo}>
                <Text style={styles.detailLabel}>歌单</Text>
                <Text style={styles.detailName}>{playlistName}</Text>
                <Text style={styles.detailMeta}>{tracks.length} 首歌曲</Text>
              </View>
            </View>
            <Pressable style={styles.playAllBtn} onPress={() => tracks.length > 0 && setQueue(tracks, 0)}>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="white"><Path d="M8 5v14l11-7z" /></Svg>
              <Text style={styles.playAllText}>全部播放 (共{tracks.length}首)</Text>
            </Pressable>
          </View>
        }
        ListFooterComponent={tracks.length > 0 ? <Text style={styles.endMarker}>到底啦</Text> : null}
        ListEmptyComponent={<Text style={styles.empty}>歌单中没有歌曲</Text>}
        renderItem={({ item, index }) => {
          const bs = item.MediaStreams?.find((s: MediaStream) => s.Type === 'Audio')?.BitRate;
          return (
            <Pressable style={styles.trackRow} onPress={() => setQueue(tracks, index)}>
              <Text style={styles.trackIndex}>{index + 1}</Text>
              <View style={styles.trackMain}>
                <Text style={styles.trackName} numberOfLines={1}>{item.Name}</Text>
                <View style={styles.trackMeta}>
                  <Text style={styles.formatBadge}>{item.Container?.toUpperCase() || 'MP3'} {formatBitrate(bs ? Math.round(bs / 1000) : undefined)}</Text>
                  <Text style={styles.trackArtist} numberOfLines={1}>{item.Artists?.join(', ') || item.AlbumArtist || ''} - {item.Album || ''}</Text>
                </View>
              </View>
              <Text style={styles.trackDur}>{formatDuration(item.RunTimeTicks)}</Text>
              <Pressable style={styles.removeBtn} onPress={() => handleRemove(item.Id)}>
                <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.danger} strokeWidth={2}>
                  <Circle cx={12} cy={12} r={10} /><Line x1={15} y1={9} x2={9} y2={15} /><Line x1={9} y1={9} x2={15} y2={15} />
                </Svg>
              </Pressable>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#1a1a2e' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a1a2e', paddingVertical: 80 },
  title: { fontSize: 28, fontWeight: '700', color: '#fff', marginBottom: 20 },
  card: { borderRadius: 8, overflow: 'hidden' },
  cardInfo: { padding: 6, paddingLeft: 2 },
  cardName: { fontSize: 14, fontWeight: '500', color: '#fff' },
  cardCount: { fontSize: 12, color: colors.textMuted, marginTop: 2 },

  overlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: '#1a1a2e' },
  overlayLoading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  endMarker: { textAlign: 'center', padding: 32, color: colors.textMuted, fontSize: 14 },
  empty: { textAlign: 'center', padding: 60, color: colors.textMuted, fontSize: 15 },

  coverRow: { flexDirection: 'row', gap: 16, paddingHorizontal: 16, marginBottom: 16 },
  detailInfo: { flex: 1 },
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
  trackDur: { fontSize: 13, color: colors.textMuted },
  removeBtn: { padding: 8 },
});
