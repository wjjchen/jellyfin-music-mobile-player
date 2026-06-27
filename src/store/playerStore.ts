import { create } from 'zustand';
import { Alert } from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import type { BaseItemDto, LyricLine } from '@/types/jellyfin';
import { jellyfinApi } from '@/api/jellyfin';

export interface PlayerState {
  queue: BaseItemDto[];
  currentIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isShuffled: boolean;
  repeatMode: 'off' | 'all' | 'one';
  isFavorite: boolean;
  showPlaylist: boolean;
  showFullPlayer: boolean;
  lyrics: LyricLine[];
  currentLyricIndex: number;
  streamUrl: string;
  backHandler: (() => void) | null;

  setQueue: (items: BaseItemDto[], startIndex?: number) => void;
  playItem: (item: BaseItemDto, queue?: BaseItemDto[]) => void;
  togglePlay: () => void;
  next: () => Promise<void>;
  previous: () => Promise<void>;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  toggleFavorite: () => void;
  togglePlaylist: () => void;
  toggleFullPlayer: () => void;
  removeFromQueue: (index: number) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setLyrics: (lyrics: LyricLine[]) => void;
  setCurrentLyricIndex: (index: number) => void;
  shuffleQueue: () => void;
  setBackHandler: (handler: (() => void) | null) => void;
  openAlbumDetail: (albumId: string) => void;
  openArtistDetail: (artistId: string) => void;
  openPlaylistDetail: (playlistId: string) => void;
  pendingAlbumId: string | null;
  pendingArtistId: string | null;
  pendingPlaylistId: string | null;
  clearPendingDetail: () => void;
}

let sound: Audio.Sound | null = null;

async function initAudio() {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: true,
    staysActiveInBackground: true,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
  });
}

async function createSound(uri: string, volume: number): Promise<Audio.Sound> {
  if (sound) {
    try { await sound.stopAsync(); } catch {}
    try { await sound.unloadAsync(); } catch {}
  }

  const { sound: newSound } = await Audio.Sound.createAsync(
    { uri },
    { shouldPlay: true, volume, progressUpdateIntervalMillis: 200 },
    onPlaybackStatusUpdate,
  );
  sound = newSound;
  return newSound;
}

function onPlaybackStatusUpdate(status: AVPlaybackStatus) {
  if (!status.isLoaded) return;
  const store = usePlayerStore.getState();
  if (status.didJustFinish) {
    if (store.repeatMode === 'one') {
      sound?.setPositionAsync(0);
      sound?.playAsync();
    } else {
      store.next().catch(() => {});
    }
    return;
  }
  store.setCurrentTime(status.positionMillis / 1000);
  store.setDuration((status.durationMillis || 0) / 1000);
  const { lyrics } = store;
  if (lyrics.length > 0) {
    const currentMs = status.positionMillis * 10000;
    let idx = -1;
    for (let i = 0; i < lyrics.length; i++) {
      if (lyrics[i].Start <= currentMs) idx = i; else break;
    }
    if (idx !== store.currentLyricIndex) store.setCurrentLyricIndex(idx);
  }
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  queue: [],
  currentIndex: -1,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.8,
  isMuted: false,
  isShuffled: false,
  repeatMode: 'off',
  isFavorite: false,
  showPlaylist: false,
  showFullPlayer: false,
  lyrics: [],
  currentLyricIndex: -1,
  streamUrl: '',
  backHandler: null,
  pendingAlbumId: null,
  pendingArtistId: null,
  pendingPlaylistId: null,

  setQueue: (items, startIndex = 0) => {
    set({ queue: items, currentIndex: startIndex });
    if (items.length > 0) get().playItem(items[startIndex], items);
  },

  playItem: async (item, queue) => {
    const state = get();
    const newQueue = queue || state.queue;
    const newIndex = queue ? newQueue.findIndex((i) => i.Id === item.Id) : state.currentIndex;
    try {
      await initAudio();
      const streamUrl = jellyfinApi.getAudioStreamUrl(item.Id, item.Container);
      const vol = state.isMuted ? 0 : state.volume;
      await createSound(streamUrl, vol);
      set({ queue: newQueue, currentIndex: newIndex >= 0 ? newIndex : 0, streamUrl, isPlaying: true, currentTime: 0, duration: 0, lyrics: [], currentLyricIndex: -1, isFavorite: item.UserData?.IsFavorite ?? false });
      jellyfinApi.getLyrics(item.Id).then((d) => { if (d?.Lyrics) set({ lyrics: d.Lyrics }); });
    } catch (e) {
      console.warn('播放失败:', e);
      Alert.alert('播放失败', '无法播放此歌曲');
      set({ isPlaying: false });
    }
  },

  togglePlay: async () => {
    const audioSound = sound;
    if (!audioSound) return;
    const status = await audioSound.getStatusAsync();
    if (!status.isLoaded) return;
    if (get().isPlaying) { await audioSound.pauseAsync(); set({ isPlaying: false }); }
    else { await audioSound.playAsync(); set({ isPlaying: true }); }
  },

  next: async () => {
    const { queue, currentIndex, isShuffled, repeatMode } = get();
    if (queue.length === 0) return;
    let nextIndex: number;
    if (isShuffled) nextIndex = Math.floor(Math.random() * queue.length);
    else {
      nextIndex = currentIndex + 1;
      if (nextIndex >= queue.length) {
        if (repeatMode === 'all') { nextIndex = 0; }
        else { set({ isPlaying: false }); return; }
      }
    }
    await get().playItem(queue[nextIndex], queue);
  },

  previous: async () => {
    const { currentTime, queue, currentIndex } = get();
    if (currentTime > 3) { get().seek(0); return; }
    if (queue.length === 0) return;
    const prevIndex = currentIndex - 1;
    if (prevIndex < 0) { get().seek(0); return; }
    await get().playItem(queue[prevIndex], queue);
  },

  seek: async (time: number) => {
    if (!isFinite(time) || time < 0) return;
    const s = sound;
    if (s) {
      const st = await s.getStatusAsync();
      if (st.isLoaded) { await s.setPositionAsync(time * 1000); set({ currentTime: time }); }
    }
  },

  setVolume: async (v: number) => { await sound?.setVolumeAsync(v); set({ volume: v, isMuted: v === 0 }); },
  toggleMute: async () => { const { isMuted, volume } = get(); await sound?.setVolumeAsync(isMuted ? volume : 0); set({ isMuted: !isMuted }); },
  toggleShuffle: () => set((s) => ({ isShuffled: !s.isShuffled })),
  cycleRepeat: () => set((s) => { const modes: Array<'off'|'all'|'one'> = ['off','all','one']; return { repeatMode: modes[(modes.indexOf(s.repeatMode) + 1) % 3] }; }),
  toggleFavorite: async () => {
    const { queue, currentIndex } = get();
    if (currentIndex < 0 || currentIndex >= queue.length) return;
    try { await jellyfinApi.toggleFavorite(queue[currentIndex].Id); set((s) => ({ isFavorite: !s.isFavorite })); }
    catch (e) { console.error(e); }
  },
  togglePlaylist: () => set((s) => ({ showPlaylist: !s.showPlaylist })),
  toggleFullPlayer: () => set((s) => ({ showFullPlayer: !s.showFullPlayer })),
  removeFromQueue: (index) => set((s) => {
    const q = [...s.queue]; q.splice(index, 1);
    let i = s.currentIndex;
    if (index < i) i--; else if (index === i) { if (q.length === 0) i = -1; else if (i >= q.length) i = q.length - 1; }
    return { queue: q, currentIndex: i };
  }),
  setCurrentTime: (t) => set({ currentTime: t }),
  setDuration: (d) => set({ duration: d }),
  setLyrics: (l) => set({ lyrics: l }),
  setCurrentLyricIndex: (i) => set({ currentLyricIndex: i }),
  shuffleQueue: () => set((s) => ({ queue: [...s.queue].sort(() => Math.random() - 0.5) })),
  setBackHandler: (h) => set({ backHandler: h }),
  openAlbumDetail: (id) => set({ pendingAlbumId: id }),
  openArtistDetail: (id) => set({ pendingArtistId: id }),
  openPlaylistDetail: (id) => set({ pendingPlaylistId: id }),
  clearPendingDetail: () => set({ pendingAlbumId: null, pendingArtistId: null, pendingPlaylistId: null }),
}));
