import { useRef, useState, useEffect } from 'react';
import { View, Text, FlatList, ScrollView, Pressable, StyleSheet, Alert, useWindowDimensions, NativeScrollEvent, NativeSyntheticEvent, Platform } from 'react-native';
import { router, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing, cancelAnimation } from 'react-native-reanimated';
import { usePlayerStore } from '@/store/playerStore';
import { jellyfinApi } from '@/api/jellyfin';
import SafeImage from '@/components/SafeImage';
import PlaylistPanel from '@/components/PlaylistPanel';
import Svg, { Polyline, Path, Line } from 'react-native-svg';
import type { BaseItemDto } from '@/types/jellyfin';
import { colors } from '@/utils/theme';
import { downloadTrack } from '@/services/downloadService';

function formatPlayerTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function FullPlayerPage() {
  const {
    queue, currentIndex, isPlaying, currentTime, duration,
    lyrics, currentLyricIndex, isFavorite, isShuffled, repeatMode,
    togglePlay, next, previous, seek, toggleFavorite,
    togglePlaylist,
    toggleShuffle, cycleRepeat,
  } = usePlayerStore();

  const insets = useSafeAreaInsets();
  const pagerRef = useRef<ScrollView>(null);
  const barRef = useRef<View>(null);
  const barWidthRef = useRef(0);
  const [activeTab, setActiveTab] = useState(0);
  const [pagerHeight, setPagerHeight] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [serverPlaylists, setServerPlaylists] = useState<BaseItemDto[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { width } = useWindowDimensions();

  const rotation = useSharedValue(0);
  const animatedVinyl = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value % 360}deg` }],
  }));

  useEffect(() => {
    if (isPlaying) {
      rotation.value = withTiming(999999999, {
        duration: 16666666650,
        easing: Easing.linear,
      });
    } else {
      cancelAnimation(rotation);
    }
  }, [isPlaying]);

  const LYRIC_LINE_HEIGHT = 48;
  const lyricsOffsetY = useSharedValue(0);
  const lyricsAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: lyricsOffsetY.value }],
  }));

  useEffect(() => {
    if (currentLyricIndex >= 0) {
      const targetY = Math.max(0, currentLyricIndex * LYRIC_LINE_HEIGHT - 120);
      lyricsOffsetY.value = withTiming(-targetY, { duration: 300, easing: Easing.linear });
    }
  }, [currentLyricIndex]);

  const item = currentIndex >= 0 && currentIndex < queue.length ? queue[currentIndex] : null;

  const handleTab = (index: number) => {
    setActiveTab(index);
    pagerRef.current?.scrollTo({ x: index * width, animated: true });
  };

  const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const page = Math.round(e.nativeEvent.contentOffset.x / width);
    if (page !== activeTab) setActiveTab(page);
  };

  if (!item) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={{ color: colors.textMuted, fontSize: 16 }}>没有正在播放的歌曲</Text>
          <Pressable style={styles.closeEmptyBtn} onPress={() => router.back()}>
            <Text style={{ color: '#fff' }}>关闭</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const albumImageUrl = jellyfinApi.getImageUrl(item.AlbumId || item.Id, 'Primary', 400, 400, 90, item.ImageTags?.Primary || item.AlbumPrimaryImageTag);
  const vinylSize = Math.min(width * 0.8, 360);

  const openAddModal = async () => {
    setShowAddModal(true);
    try {
      const result = await jellyfinApi.getPlaylists();
      setServerPlaylists(result.Items || []);
    } catch { }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2}>
            <Polyline points="6 9 12 15 18 9" />
          </Svg>
        </Pressable>
        <Pressable style={styles.iconBtn} onPress={togglePlaylist}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2}>
            <Line x1="8" y1="6" x2="21" y2="6" />
            <Line x1="8" y1="12" x2="21" y2="12" />
            <Line x1="8" y1="18" x2="21" y2="18" />
            <Line x1="3" y1="6" x2="3.01" y2="6" />
            <Line x1="3" y1="12" x2="3.01" y2="12" />
            <Line x1="3" y1="18" x2="3.01" y2="18" />
          </Svg>
        </Pressable>
      </View>

      {/* Tab bar */}
      <View style={styles.tabRow}>
        <Pressable style={styles.tabItem} onPress={() => handleTab(0)}>
          <Text style={[styles.tabLabel, activeTab === 0 && styles.tabLabelActive]}>歌曲</Text>
          {activeTab === 0 && <View style={styles.tabIndicator} />}
        </Pressable>
        <Pressable style={styles.tabItem} onPress={() => handleTab(1)}>
          <Text style={[styles.tabLabel, activeTab === 1 && styles.tabLabelActive]}>歌词</Text>
          {activeTab === 1 && <View style={styles.tabIndicator} />}
        </Pressable>
      </View>

      {/* Track name below tabs */}
      <Text style={styles.songTitle} numberOfLines={1}>{item.Name}</Text>
      <Text style={styles.songArtist} numberOfLines={1}>
        {item.Artists?.join(', ') || item.AlbumArtist || ''}
        {item.Album ? ` - ${item.Album}` : ''}
      </Text>

      {/* Pager: song view / lyrics view */}
      <ScrollView
        ref={pagerRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        onLayout={(e) => setPagerHeight(e.nativeEvent.layout.height)}
        style={styles.pager}
      >
        {/* Page 0: Album art + actions */}
        <View style={[styles.page, { width, height: pagerHeight || undefined }]} key="song">
          <Animated.View style={[styles.vinylWrap, { width: vinylSize, height: vinylSize }, animatedVinyl]}>
            <View style={[styles.vinyl, { width: vinylSize, height: vinylSize }]}>
              <SafeImage src={albumImageUrl} type="artist" size={vinylSize * 0.7} />
            </View>
          </Animated.View>

          <View style={styles.actionsRow}>
            <Pressable style={styles.actionBtn} onPress={openAddModal}>
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5}>
                <Line x1="12" y1="5" x2="12" y2="19" />
                <Line x1="5" y1="12" x2="19" y2="12" />
              </Svg>
            </Pressable>
            <Pressable style={styles.actionBtn} onPress={async () => {
              if (Platform.OS === 'web' && typeof document !== 'undefined') {
                try {
                  const url = jellyfinApi.getAudioStreamUrl(item.Id, item.Container, item.MediaSources?.[0]?.Id);
                  const fileName = `${item.Name || 'audio'}.${item.Container || 'mp3'}`.replace(/[\\/:*?"<>|]/g, '_');
                  const resp = await fetch(url);
                  const blob = await resp.blob();
                  const a = document.createElement('a');
                  a.href = URL.createObjectURL(blob);
                  a.download = fileName;
                  document.body.appendChild(a); a.click();
                  document.body.removeChild(a);
                  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
                } catch (e) { Alert.alert('下载失败', (e as any)?.message || '请重试'); }
              } else {
                await downloadTrack(item.Id, item.Name || 'audio', item.Container, item.MediaSources?.[0]?.Id);
              }
            }}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2}>
                <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <Polyline points="7 10 12 15 17 10" /><Line x1="12" y1="15" x2="12" y2="3" />
              </Svg>
            </Pressable>
            <Pressable style={[styles.actionBtn, isFavorite && styles.activeBtn]} onPress={toggleFavorite}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill={isFavorite ? '#00A4DC' : 'none'} stroke={isFavorite ? '#00A4DC' : 'white'} strokeWidth={2}>
                <Path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </Svg>
            </Pressable>
            <Pressable style={styles.actionBtn} onPress={() => setShowDeleteConfirm(true)}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2}>
                <Polyline points="3 6 5 6 21 6" />
                <Path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </Svg>
            </Pressable>
          </View>
        </View>

        {/* Page 1: Lyrics */}
        <View style={[styles.lyricsPage, { width, height: pagerHeight || 300 }]} key="lyrics-transform">
          {lyrics.length > 0 ? (
            <View style={styles.lyricsScrollContainer}>
              <Animated.View style={[styles.lyricsContentWrapper, lyricsAnimatedStyle]}>
                {lyrics.map((item, index) => (
                  <Text key={index}
                    style={[
                      styles.lyricLine,
                      index === currentLyricIndex && styles.lyricLineActive,
                      index < currentLyricIndex && styles.lyricLinePast,
                    ]}
                  >
                    {item.Text || '...'}
                  </Text>
                ))}
              </Animated.View>
            </View>
          ) : (
            <View style={styles.lyricsEmpty}>
              <Text style={{ color: colors.textMuted, fontSize: 15 }}>暂无歌词</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Progress bar + time */}
      <View style={styles.progressSection}>
        <View
          style={styles.progressBar}
          onLayout={(e) => { barWidthRef.current = e.nativeEvent.layout.width; }}
          onStartShouldSetResponder={() => true}
          onResponderRelease={(e) => {
            if (duration > 0 && barWidthRef.current > 0) {
              const pct = e.nativeEvent.locationX / barWidthRef.current;
              if (pct >= 0 && pct <= 1) seek(pct * duration);
            }
          }}
        >
          <View style={[styles.progressFill, { width: `${progress}%` }]}>
            {progress > 0 && <View style={styles.progressDot} />}
          </View>
        </View>
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>{formatPlayerTime(currentTime)}</Text>
          <Text style={styles.timeText}>{formatPlayerTime(duration)}</Text>
        </View>
      </View>

      {/* Controls */}
      <View style={[styles.controls, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Pressable style={[styles.ctrlBtn, isShuffled && styles.ctrlBtnActive]} onPress={toggleShuffle}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={isShuffled ? colors.accent : 'white'} strokeWidth={2}>
            <Polyline points="16 3 21 3 21 8" /><Line x1="4" y1="20" x2="21" y2="3" />
            <Polyline points="21 16 21 21 16 21" /><Line x1="15" y1="15" x2="21" y2="21" /><Line x1="4" y1="4" x2="9" y2="9" />
          </Svg>
        </Pressable>
        <Pressable style={styles.ctrlBtn} onPress={previous}>
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="white"><Path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" /></Svg>
        </Pressable>
        <Pressable style={styles.playBtn} onPress={togglePlay}>
          {isPlaying ? (
            <Svg width={32} height={32} viewBox="0 0 24 24" fill="white"><Path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></Svg>
          ) : (
            <Svg width={32} height={32} viewBox="0 0 24 24" fill="white"><Path d="M8 5v14l11-7z" /></Svg>
          )}
        </Pressable>
        <Pressable style={styles.ctrlBtn} onPress={next}>
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="white"><Path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" /></Svg>
        </Pressable>
        <Pressable style={[styles.ctrlBtn, repeatMode !== 'off' && styles.ctrlBtnActive]} onPress={cycleRepeat}>
          {repeatMode === 'one' ? (
            <View style={{ width: 18, height: 18, alignItems: 'center', justifyContent: 'center' }}>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth={2}>
                <Polyline points="17 1 21 5 17 9" /><Path d="M3 11V9a4 4 0 0 1 4-4h14" />
                <Polyline points="7 23 3 19 7 15" /><Path d="M21 13v2a4 4 0 0 1-4 4H3" />
              </Svg>
              <Text style={{ position: 'absolute', fontSize: 9, fontWeight: '800', color: colors.accent }}>1</Text>
            </View>
          ) : (
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={repeatMode !== 'off' ? colors.accent : 'white'} strokeWidth={2}>
              <Polyline points="17 1 21 5 17 9" /><Path d="M3 11V9a4 4 0 0 1 4-4h14" />
              <Polyline points="7 23 3 19 7 15" /><Path d="M21 13v2a4 4 0 0 1-4 4H3" />
            </Svg>
          )}
        </Pressable>
      </View>

      {/* Modals */}
      {showAddModal && (
        <Pressable style={styles.modalOverlay} onPress={() => setShowAddModal(false)}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>添加到列表</Text>
              <Pressable onPress={() => setShowAddModal(false)}>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2}>
                  <Line x1="18" y1="6" x2="6" y2="18" /><Line x1="6" y1="6" x2="18" y2="18" />
                </Svg>
              </Pressable>
            </View>
            <FlatList
              data={serverPlaylists}
              keyExtractor={(pl) => pl.Id}
              style={{ maxHeight: 300 }}
              renderItem={({ item: pl }) => (
                <Pressable style={styles.playlistItem} onPress={async () => {
                  try { await jellyfinApi.addToPlaylist(pl.Id, item.Id); setShowAddModal(false); }
                  catch { Alert.alert('错误', '添加到列表失败'); }
                }}>
                  <Text style={styles.playlistItemName}>{pl.Name}</Text>
                  <Text style={styles.playlistItemCount}>{pl.ChildCount || 0} 首</Text>
                </Pressable>
              )}
              ListEmptyComponent={<Text style={styles.modalEmpty}>服务器上没有播放列表</Text>}
            />
          </View>
        </Pressable>
      )}

      {showDeleteConfirm && (
        <Pressable style={styles.modalOverlay} onPress={() => setShowDeleteConfirm(false)}>
          <View style={[styles.modalCard, { width: 300 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>确认删除</Text>
              <Pressable onPress={() => setShowDeleteConfirm(false)}>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2}>
                  <Line x1="18" y1="6" x2="6" y2="18" /><Line x1="6" y1="6" x2="18" y2="18" />
                </Svg>
              </Pressable>
            </View>
            <View style={{ padding: 20 }}>
              <Text style={{ color: '#fff', fontSize: 14, lineHeight: 22 }}>
                确定要从服务器删除歌曲 {item.Name} 吗？此操作不可撤销。
              </Text>
            </View>
            <View style={styles.modalFooter}>
              <Pressable style={[styles.modalBtn, { backgroundColor: colors.textMuted }]} onPress={() => setShowDeleteConfirm(false)}>
                <Text style={{ color: '#fff' }}>取消</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, { backgroundColor: colors.danger }]} onPress={async () => {
                try {
                  await jellyfinApi.deleteItem(item.Id);
                  const s = usePlayerStore.getState();
                  const newQueue = s.queue.filter((_, i) => i !== s.currentIndex);
                  if (newQueue.length > 0) {
                    const newIndex = s.currentIndex >= newQueue.length ? newQueue.length - 1 : s.currentIndex;
                    await s.playItem(newQueue[newIndex], newQueue);
                  }
                  setShowDeleteConfirm(false);
                } catch (e) { console.error('delete failed', e); Alert.alert('错误', '删除失败'); }
              }}>
                <Text style={{ color: '#fff' }}>删除</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      )}
      <PlaylistPanel />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1020' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  closeEmptyBtn: { paddingHorizontal: 24, paddingVertical: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 8 },

  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 4 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },

  tabRow: { flexDirection: 'row', marginHorizontal: 48, borderBottomWidth: 1, borderBottomColor: colors.border },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 10, position: 'relative' },
  tabLabel: { fontSize: 15, color: colors.textMuted, fontWeight: '500' },
  tabLabelActive: { color: '#fff' },
  tabIndicator: { position: 'absolute', bottom: -1, height: 2, width: 40, backgroundColor: colors.accent, borderRadius: 1 },

  songTitle: { textAlign: 'center', fontSize: 17, fontWeight: '600', color: '#fff', marginTop: 52, paddingHorizontal: 40 },
  songArtist: { textAlign: 'center', fontSize: 13, color: colors.textMuted, marginTop: 4, paddingHorizontal: 40 },

  pager: { flex: 1 },
  page: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, gap: 32 },
  lyricsPage: { alignItems: 'center', justifyContent: 'flex-start', paddingTop: 16, overflow: 'hidden' },

  lyricsScrollContainer: { flex: 1, width: '100%', overflow: 'hidden' },
  lyricsContentWrapper: { alignItems: 'center', paddingTop: 124, paddingBottom: 190 },

  vinylWrap: { alignItems: 'center', justifyContent: 'center' },
  vinyl: { borderRadius: 999, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },

  actionsRow: { flexDirection: 'row', gap: 24 },
  actionBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18 },
  activeBtn: {},

  lyricsList: { flex: 1, width: '100%' },
  lyricsContent: { alignItems: 'center', gap: 14, paddingTop: 124, paddingBottom: 190 },
  lyricLine: { fontSize: 15, color: colors.textMuted, textAlign: 'center', lineHeight: 48 },
  lyricLineActive: { fontSize: 20, fontWeight: '600', color: '#fff', lineHeight: 48 },
  lyricLinePast: { color: 'rgba(255,255,255,0.25)' },
  lyricsEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  progressBar: { height: 20, justifyContent: 'center', marginHorizontal: 20 },
  progressFill: { height: 4, backgroundColor: colors.accent, borderRadius: 2, justifyContent: 'center', alignItems: 'flex-end' },
  progressDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent, position: 'absolute', right: -5 },
  progressSection: { marginTop: 108 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 4 },
  timeText: { fontSize: 11, color: colors.textMuted },

  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  ctrlBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  ctrlBtnActive: {},
  playBtn: { width: 56, height: 56, backgroundColor: colors.accent, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },

  modalOverlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  modalCard: { backgroundColor: '#16213e', borderRadius: 12, width: 360, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontSize: 16, fontWeight: '600', color: '#fff' },
  playlistItem: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  playlistItemName: { fontSize: 14, fontWeight: '500', color: '#fff' },
  playlistItemCount: { fontSize: 13, color: colors.textMuted },
  modalEmpty: { padding: 24, textAlign: 'center', color: colors.textMuted, fontSize: 14 },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: colors.border },
  modalBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6 },
});
