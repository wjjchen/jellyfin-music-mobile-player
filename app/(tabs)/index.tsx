import { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator, useWindowDimensions, TextInput, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { jellyfinApi } from '@/api/jellyfin';
import { usePlayerStore } from '@/store/playerStore';
import SafeImage from '@/components/SafeImage';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import type { BaseItemDto } from '@/types/jellyfin';
import { colors } from '@/utils/theme';

export default function HomePage() {
  const [latestAlbums, setLatestAlbums] = useState<BaseItemDto[]>([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState<BaseItemDto[]>([]);
  const [mostPlayed, setMostPlayed] = useState<BaseItemDto[]>([]);
  const [dailyPicks, setDailyPicks] = useState<BaseItemDto[]>([]);
  const [playlists, setPlaylists] = useState<BaseItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const { playItem, setQueue, openAlbumDetail, openArtistDetail, openPlaylistDetail } = usePlayerStore();
  const { width } = useWindowDimensions();
  const albumSize = Math.min((width - 64) / 3, 160);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const [latest, recent, most, random, pl] = await Promise.all([
        jellyfinApi.getLatestAlbums(10),
        jellyfinApi.getRecentlyPlayed(12),
        jellyfinApi.getItems({ includeItemTypes: 'Audio', sortBy: 'PlayCount', sortOrder: 'Descending', limit: 12, recursive: true, filters: 'IsPlayed' }),
        jellyfinApi.getItems({ includeItemTypes: 'Audio', sortBy: 'Random', limit: 12, recursive: true }),
        jellyfinApi.getPlaylists(),
      ]);
      setLatestAlbums(latest || []);
      setRecentlyPlayed(recent || []);
      setMostPlayed(most?.Items || []);
      setDailyPicks(random?.Items || []);
      setPlaylists(pl?.Items || []);
    } catch (e) {
      console.error('Refresh failed:', e);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const [latest, recent, most, random, pl] = await Promise.all([
          jellyfinApi.getLatestAlbums(10),
          jellyfinApi.getRecentlyPlayed(12),
          jellyfinApi.getItems({ includeItemTypes: 'Audio', sortBy: 'PlayCount', sortOrder: 'Descending', limit: 12, recursive: true, filters: 'IsPlayed' }),
          jellyfinApi.getItems({ includeItemTypes: 'Audio', sortBy: 'Random', limit: 12, recursive: true }),
          jellyfinApi.getPlaylists(),
        ]);
        setLatestAlbums(latest || []);
        setRecentlyPlayed(recent || []);
        setMostPlayed(most?.Items || []);
        setDailyPicks(random?.Items || []);
        setPlaylists(pl?.Items || []);
      } catch (e) {
        console.error('Failed to load home:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const renderAlbumCard = (item: BaseItemDto, onTap: () => void, onPlay?: () => void) => (
    <Pressable key={item.Id} style={[styles.albumCard, { width: albumSize }]} onPress={onTap}>
      <View style={styles.albumImage}>
        <SafeImage
          src={jellyfinApi.getImageUrl(item.Id, 'Primary', 200, 200, 90, item.ImageTags?.Primary)}
          type="album"
          size={albumSize}
        />
        {onPlay ? (
          <Pressable style={styles.albumPlayBtn} onPress={onPlay}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="white">
              <Path d="M8 5v14l11-7z" />
            </Svg>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.albumInfo}>
        <Text style={styles.albumName} numberOfLines={1}>{item.Name || '未知标题'}</Text>
        <Text style={styles.albumArtist} numberOfLines={1}>{item.AlbumArtist || item.Artists?.join(', ') || '未知艺术家'}</Text>
      </View>
    </Pressable>
  );

  return (
    <View style={styles.wrap}>
      {/* Search bar fixed at top */}
      <View style={styles.searchWrap}>
        <Svg style={styles.searchIcon} width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={2}>
          <Circle cx="11" cy="11" r="8" />
          <Line x1="21" y1="21" x2="16.65" y2="16.65" />
        </Svg>
        <TextInput
          style={styles.searchInput}
          placeholder="搜索歌曲/专辑/歌手"
          placeholderTextColor="rgba(255,255,255,0.4)"
          value={searchTerm}
          onChangeText={(text) => {
            setSearchTerm(text);
            if (text.length < 2) { setSearchResults([]); setShowSearch(false); return; }
            jellyfinApi.search(text, 10).then((r) => {
              setSearchResults(r.SearchHints || []);
              setShowSearch(true);
            }).catch(() => {});
          }}
        />
      </View>

      <FlatList
        style={{ backgroundColor: '#1a1a2e' }}
        data={[]}
        renderItem={null}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        contentContainerStyle={styles.scroll}
        ListHeaderComponent={
          <View>
            {/* 我的歌单 */}
          <View style={styles.section}>
            <Pressable onPress={() => router.push('/(tabs)/playlists')}>
              <Text style={styles.sectionTitle}>我的歌单</Text>
            </Pressable>
            <FlatList
              horizontal
              data={playlists}
              keyExtractor={(item) => item.Id}
              ListHeaderComponent={
                <Pressable style={[styles.albumCard, { width: albumSize }]} onPress={() => router.push('/(tabs)/favorites')}>
                  <View style={[styles.albumImage, { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)', width: albumSize, height: albumSize }]}>
                    <Svg width={albumSize * 0.4} height={albumSize * 0.4} viewBox="0 0 24 24" fill="#00A4DC" stroke="#00A4DC" strokeWidth={2}>
                      <Path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </Svg>
                  </View>
                  <View style={styles.albumInfo}>
                    <Text style={styles.albumName} numberOfLines={1}>我喜欢的</Text>
                    <Text style={styles.albumArtist}>收藏歌曲</Text>
                  </View>
                </Pressable>
              }
              renderItem={({ item }) => (
                <Pressable style={[styles.albumCard, { width: albumSize }]} onPress={() => { openPlaylistDetail(item.Id); router.push('/playlists'); }}>
                  <View style={styles.albumImage}>
                    <SafeImage
                      src={jellyfinApi.getImageUrl(item.Id, 'Primary', 200, 200, 90, item.ImageTags?.Primary)}
                      type="album"
                      size={albumSize}
                    />
                  </View>
                  <View style={styles.albumInfo}>
                    <Text style={styles.albumName} numberOfLines={1}>{item.Name}</Text>
                    <Text style={styles.albumArtist}>{item.SongCount || 0} 首歌曲</Text>
                  </View>
                </Pressable>
              )}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 16, paddingHorizontal: 4 }}
            />
          </View>

          {latestAlbums.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>最新专辑</Text>
              <FlatList
                horizontal
                data={latestAlbums}
                keyExtractor={(item) => item.Id}
                renderItem={({ item }) =>
                  renderAlbumCard(
                    item,
                    () => { router.navigate('/(tabs)/albums'); openAlbumDetail(item.Id); },
                    () => { jellyfinApi.getAlbumTracks(item.Id).then((r) => { if (r.Items.length > 0) setQueue(r.Items, 0); }); }
                  )
                }
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 16, paddingHorizontal: 4 }}
              />
            </View>
          )}

          {dailyPicks.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>每日推荐</Text>
                <Pressable style={styles.playAllBtn} onPress={() => setQueue(dailyPicks, 0)}>
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="white"><Path d="M8 5v14l11-7z" /></Svg>
                  <Text style={styles.playAllText}>全部播放</Text>
                </Pressable>
              </View>
              {dailyPicks.slice(0, 9).map((song) => (
                <Pressable key={song.Id} style={styles.songCompact} onPress={() => playItem(song, [song])}>
                  <SafeImage
                    src={jellyfinApi.getImageUrl(song.AlbumId || song.Id, 'Primary', 48, 48, 90, song.ImageTags?.Primary || song.AlbumPrimaryImageTag)}
                    type="song" size={48}
                  />
                  <View style={styles.songCompactInfo}>
                    <Text style={styles.songCompactName} numberOfLines={1}>{song.Name}</Text>
                    <Text style={styles.songCompactMeta} numberOfLines={1}>{song.Artists?.join(', ') || song.AlbumArtist || ''} - {song.Album || ''}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}

          {recentlyPlayed.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>最近播放</Text>
              <View style={styles.albumGrid}>
                {recentlyPlayed.map((item) =>
                  renderAlbumCard(item, () => {
                    if (item.Type === 'MusicAlbum') { router.navigate('/(tabs)/albums'); openAlbumDetail(item.Id); }
                    else { playItem(item, [item]); }
                  })
                )}
              </View>
            </View>
          )}

          {mostPlayed.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>最常播放</Text>
              <View style={styles.albumGrid}>
                {mostPlayed.map((item) =>
                  renderAlbumCard(item, () => playItem(item, [item]))
                )}
              </View>
            </View>
          )}
        </View>
      }
    />

    {showSearch && searchResults.length > 0 && (
      <View style={styles.searchOverlay}>
        {searchResults.map((hint) => (
          <Pressable key={hint.Id} style={styles.searchItem} onPress={() => {
            if (hint.Type === 'Audio') {
              jellyfinApi.getItem(hint.Id).then((item) => playItem(item, [item]));
            } else if (hint.Type === 'MusicAlbum') {
              router.navigate('/(tabs)/albums');
              openAlbumDetail(hint.Id);
            } else if (hint.Type === 'MusicArtist') {
              router.navigate('/(tabs)/artists');
              openArtistDetail(hint.Id);
            }
            setShowSearch(false);
            setSearchTerm('');
          }}>
            <Text style={styles.searchItemName} numberOfLines={1}>{hint.Name}</Text>
            <Text style={styles.searchItemType} numberOfLines={1}>
              {hint.Type === 'Audio' ? `${hint.Artist || ''} - ${hint.Album || ''}` : hint.Type === 'MusicAlbum' ? hint.AlbumArtist || '' : '歌手'}
            </Text>
          </Pressable>
        ))}
      </View>
    )}
  </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#1a1a2e' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a1a2e', paddingVertical: 80 },
  scroll: { padding: 16, paddingTop: 8, paddingBottom: 120 },
  section: { marginBottom: 32 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sectionTitle: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 16 },
  albumGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  albumCard: { marginBottom: 4 },
  albumImage: { position: 'relative', borderRadius: 8, overflow: 'hidden' },
  albumPlayBtn: {
    position: 'absolute', bottom: 8, right: 8, width: 36, height: 36,
    borderRadius: 18, backgroundColor: '#00A4DC', alignItems: 'center', justifyContent: 'center',
  },
  albumInfo: { padding: 6, paddingLeft: 2 },
  albumName: { fontSize: 13, fontWeight: '500', color: '#fff' },
  albumArtist: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  playAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#00A4DC', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  playAllText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  songCompact: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8, borderRadius: 8 },
  songCompactInfo: { flex: 1 },
  songCompactName: { fontSize: 14, fontWeight: '500', color: '#fff' },
  songCompactMeta: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  searchWrap: { position: 'relative', paddingHorizontal: 16, paddingTop: 8 },
  searchIcon: { position: 'absolute', left: 40, top: 18, zIndex: 1 },
  searchInput: { padding: 10, paddingLeft: 40, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: 14 },
  searchOverlay: { position: 'absolute', top: 52, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(26,26,46,0.97)', paddingTop: 4, zIndex: 100 },
  searchItem: { padding: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  searchItemName: { fontSize: 14, fontWeight: '500', color: '#fff' },
  searchItemType: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
});
