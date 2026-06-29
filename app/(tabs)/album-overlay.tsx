import { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { jellyfinApi } from '@/api/jellyfin';
import { usePlayerStore } from '@/store/playerStore';
import { BaseItemDto } from '@/types/jellyfin';
import { colors } from '@/utils/theme';
import { formatDuration } from '@/utils/format';
import SafeImage from '@/components/SafeImage';
import BackButton from '@/components/BackButton';

export default function AlbumOverlay({ albumId, onClose }: { albumId: string; onClose: () => void }) {
  const setQueue = usePlayerStore(state => state.setQueue);
  const playItem = usePlayerStore(state => state.playItem);
  const shuffleQueue = usePlayerStore(state => state.shuffleQueue);
  const [album, setAlbum] = useState<BaseItemDto | null>(null);
  const [songs, setSongs] = useState<BaseItemDto[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAlbum = useCallback(async () => {
    try {
      const [albumData, tracksData] = await Promise.all([
        jellyfinApi.getItem(albumId),
        jellyfinApi.getAlbumTracks(albumId),
      ]);
      setAlbum(albumData);
      setSongs(tracksData.Items ?? []);
    } catch (error) {
      console.error('Failed to load album:', error);
    } finally {
      setLoading(false);
    }
  }, [albumId]);

  useEffect(() => {
    loadAlbum();
  }, [loadAlbum]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!album) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <BackButton onPress={onClose} />
        <Text style={styles.title}>{album.Name}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Album Info */}
      <View style={styles.infoContainer}>
        <SafeImage
          src={jellyfinApi.getImageUrl(album.Id)}
          type="album"
          size={280}
        />
        <Text style={styles.albumName}>{album.Name}</Text>
        {album.Artists && (
          <Text style={styles.artist}>{album.Artists}</Text>
        )}
        {album.ProductionYear && (
          <Text style={styles.year}>{album.ProductionYear}</Text>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            if (songs.length > 0) {
              setQueue(songs);
              playItem(songs[0]);
            }
          }}
        >
          <Text style={styles.actionText}>▶ 播放全部</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            if (songs.length > 0) {
              setQueue(songs);
              shuffleQueue();
            }
          }}
        >
          <Text style={styles.actionText}>🔀 随机播放</Text>
        </TouchableOpacity>
      </View>

      {/* Songs List */}
      <ScrollView style={styles.songsContainer}>
        {songs.map((song, index) => (
          <Pressable
            key={song.Id}
            style={styles.songItem}
            onPress={() => {
              setQueue(songs);
              playItem(song);
            }}
          >
            <Text style={styles.songIndex}>{index + 1}</Text>
            <View style={styles.songInfo}>
              <Text style={styles.songTitle} numberOfLines={1}>
                {song.Name}
              </Text>
              {song.Artists && (
                <Text style={styles.songArtist} numberOfLines={1}>
                  {song.Artists}
                </Text>
              )}
            </View>
            {song.RunTimeTicks && (
              <Text style={styles.songDuration}>
                {formatDuration(song.RunTimeTicks / 10000000)}
              </Text>
            )}
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bgPrimary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerSpacer: {
    width: 40,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  infoContainer: {
    alignItems: 'center',
    padding: 20,
  },
  coverImage: {
    width: 280,
    height: 280,
    borderRadius: 8,
    marginBottom: 16,
  },
  albumName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  artist: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 4,
  },
  year: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 16,
    gap: 12,
  },
  actionButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: colors.accent,
  },
  actionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  songsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  songIndex: {
    width: 30,
    fontSize: 14,
    color: colors.textSecondary,
  },
  songInfo: {
    flex: 1,
    marginLeft: 12,
  },
  songTitle: {
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  songArtist: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  songDuration: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
