import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlayerStore } from '@/store/playerStore';
import { jellyfinApi } from '@/api/jellyfin';
import SafeImage from '@/components/SafeImage';
import Svg, { Line } from 'react-native-svg';
import { colors } from '@/utils/theme';

export default function PlaylistPanel() {
  const insets = useSafeAreaInsets();
  const {
    queue, currentIndex, showPlaylist, togglePlaylist,
    removeFromQueue, playItem, isShuffled, shuffleQueue,
  } = usePlayerStore();

  if (!showPlaylist) return null;

  return (
    <View style={[styles.panel, { top: insets.top, bottom: 108 + insets.bottom }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>播放列表 ({queue.length})</Text>
        <View style={styles.headerActions}>
          {isShuffled && (
            <Pressable style={styles.shuffleBtn} onPress={shuffleQueue}>
              <Text style={styles.shuffleText}>重新随机</Text>
            </Pressable>
          )}
          <Pressable style={styles.closeBtn} onPress={togglePlaylist}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5}>
              <Line x1="18" y1="6" x2="6" y2="18" />
              <Line x1="6" y1="6" x2="18" y2="18" />
            </Svg>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={queue}
        keyExtractor={(item, index) => `${item.Id}-${index}`}
        contentContainerStyle={{ padding: 8 }}
        renderItem={({ item, index }) => (
          <Pressable
            style={[styles.item, index === currentIndex && styles.itemActive]}
            onPress={() => playItem(item)}
          >
            <SafeImage
              src={jellyfinApi.getImageUrl(item.AlbumId || item.Id, 'Primary', 40, 40, 90, item.ImageTags?.Primary || item.AlbumPrimaryImageTag)}
              type="album" size={40}
            />
            <View style={styles.itemInfo}>
              <Text style={styles.itemName} numberOfLines={1}>{item.Name}</Text>
              <Text style={styles.itemArtist} numberOfLines={1}>{item.Artists?.join(', ') || item.AlbumArtist || '未知艺术家'}</Text>
            </View>
            <Pressable style={styles.removeBtn} onPress={() => removeFromQueue(index)}>
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth={2}>
                <Line x1="18" y1="6" x2="6" y2="18" />
                <Line x1="6" y1="6" x2="18" y2="18" />
              </Svg>
            </Pressable>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.empty}>播放列表为空</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute', right: 0, width: 300,
    backgroundColor: 'rgba(15,15,26,0.98)', borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 15, fontWeight: '600', color: '#fff' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  shuffleBtn: { paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: colors.border, borderRadius: 12 },
  shuffleText: { fontSize: 11, color: colors.textSecondary },
  closeBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, borderRadius: 8 },
  itemActive: { backgroundColor: colors.bgActive },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 13, fontWeight: '500', color: '#fff' },
  itemArtist: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  removeBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  empty: { textAlign: 'center', padding: 40, color: colors.textMuted, fontSize: 14 },
});
