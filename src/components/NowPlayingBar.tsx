import { Pressable, View, Text, StyleSheet } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlayerStore } from '@/store/playerStore';
import { jellyfinApi } from '@/api/jellyfin';
import SafeImage from '@/components/SafeImage';
import Svg, { Path, Line, Polygon } from 'react-native-svg';
import { colors } from '@/utils/theme';

export default function NowPlayingBar() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const {
    queue, currentIndex, isPlaying, isMuted, isFavorite,
    togglePlay, toggleMute, toggleFavorite,
  } = usePlayerStore();

  if (pathname === '/player' || pathname === '/login') return null;

  const item = currentIndex >= 0 && currentIndex < queue.length ? queue[currentIndex] : null;

  return (
    <View style={[styles.container, { bottom: 56 + insets.bottom }]}>
      <View style={styles.content}>
        {item ? (
          <>
            <Pressable style={styles.left} onPress={() => router.push('/player')}>
              <SafeImage
                src={jellyfinApi.getImageUrl(item.AlbumId || item.Id, 'Primary', 60, 60, 90, item.ImageTags?.Primary || item.AlbumPrimaryImageTag)}
                type="album" size={44}
              />
              <View style={styles.trackInfo}>
                <Text style={styles.trackName} numberOfLines={1}>{item.Name}</Text>
                <Text style={styles.trackArtist} numberOfLines={1}>
                  {item.Artists?.join(', ') || item.AlbumArtist || '未知艺术家'}
                </Text>
              </View>
            </Pressable>

            <Pressable style={styles.playBtn} onPress={togglePlay}>
              {isPlaying ? (
                <Svg width={16} height={16} viewBox="0 0 24 24" fill="white"><Path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></Svg>
              ) : (
                <Svg width={16} height={16} viewBox="0 0 24 24" fill="white"><Path d="M8 5v14l11-7z" /></Svg>
              )}
            </Pressable>

            <Pressable style={[styles.ctrlBtn, isFavorite && styles.ctrlBtnActive]} onPress={toggleFavorite}>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill={isFavorite ? colors.accent : 'none'} stroke={isFavorite ? colors.accent : 'rgba(255,255,255,0.6)'} strokeWidth={2}>
                <Path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </Svg>
            </Pressable>

            <Pressable style={styles.ctrlBtn} onPress={toggleMute}>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth={2}>
                <Polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                {isMuted ? (
                  <>
                    <Line x1="23" y1="9" x2="17" y2="15" />
                    <Line x1="17" y1="9" x2="23" y2="15" />
                  </>
                ) : (
                  <Path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                )}
              </Svg>
            </Pressable>
          </>
        ) : (
          <View style={styles.emptyCenter}>
            <Text style={styles.emptyText}>暂无播放</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute', left: 0, right: 0,
    height: 52, backgroundColor: 'rgba(15,15,26,0.95)',
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  content: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 10 },
  left: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 },
  trackInfo: { flex: 1, minWidth: 0 },
  trackName: { fontSize: 13, fontWeight: '500', color: '#fff' },
  trackArtist: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  playBtn: { width: 32, height: 32, backgroundColor: colors.accent, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  ctrlBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
  ctrlBtnActive: {},
  emptyCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 13 },
});
