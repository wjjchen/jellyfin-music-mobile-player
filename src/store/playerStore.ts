import { create } from 'zustand';
import { Alert, Platform } from 'react-native';
import type { BaseItemDto, LyricLine } from '@/types/jellyfin';
import { jellyfinApi } from '@/api/jellyfin';
import { getExpoAudio, playWeb, seekWeb, stopWeb, startWebPoll, getWeb } from '@/utils/trackPlayer';
import { startForegroundService, stopForegroundService, updatePlaybackState, onLockScreenEvent } from '@/services/foregroundService';

let audioSessionConfigured = false;
let lockScreenSubscribed = false;

async function configureAudioSession() {
  if (audioSessionConfigured) return;
  audioSessionConfigured = true;
  if (Platform.OS !== 'android') return;
  try {
    const ExpoAudio = await getExpoAudio();
    if (ExpoAudio?.setAudioModeAsync) {
      console.log('[AudioSession] configuring with playsInSilentMode=true, shouldPlayInBackground=true');
      await ExpoAudio.setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        interruptionMode: 'doNotMix',
      });
      console.log('[AudioSession] configured successfully');
    } else {
      console.warn('[AudioSession] setAudioModeAsync not found');
    }
  } catch (e: any) {
    console.warn('[AudioSession] configure failed:', e?.message || e);
  }
}

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

function getLyrics(itemId: string) {
  jellyfinApi.getLyrics(itemId).then((d) => { if (d?.Lyrics) usePlayerStore.setState({ lyrics: d.Lyrics, currentLyricIndex: -1 }); });
}

function updateLyricIndex(timeSec: number, lyrics: LyricLine[]): number {
  if (!lyrics || lyrics.length === 0) return -1;
  const timeTicks = timeSec * 10_000_000;
  let idx = -1;
  for (let i = 0; i < lyrics.length; i++) {
    if (timeTicks >= (lyrics[i].Start || 0)) idx = i;
    else break;
  }
  return idx;
}

let progressTimer: ReturnType<typeof setInterval> | null = null;
let audioPlayer: any = null;

function clearProgressTimer() {
  if (progressTimer) { clearInterval(progressTimer); progressTimer = null; }
}

function startProgressPolling() {
  clearProgressTimer();
  progressTimer = setInterval(() => {
    const store = usePlayerStore.getState();
    if (!store.isPlaying) return;
    const t = audioPlayer?.currentTime;
    const d = audioPlayer?.duration;
    if (t != null) {
      store.setCurrentTime(t);
      const idx = updateLyricIndex(t, store.lyrics);
      if (idx !== store.currentLyricIndex) store.setCurrentLyricIndex(idx);
    }
    if (d) store.setDuration(d);
    if (t != null && d && t >= d - 0.5 && store.currentIndex >= 0) {
      clearProgressTimer();
      store.next();
    }
  }, 250);
}

async function playNative(url: string, meta?: { title?: string; artist?: string; album?: string; artwork?: string }) {
  const Audio = await getExpoAudio();
  if (!Audio?.AudioPlayer) throw new Error('expo-audio 不可用');
  const source = { uri: url };
  if (!audioPlayer) {
    audioPlayer = new Audio.AudioPlayer(source, 250, true, 0);
    console.log('[AudioPlayer] created new instance');
  } else {
    console.log('[AudioPlayer] replacing source');
    audioPlayer.replace(source);
  }
  audioPlayer.play();
}

async function pauseNative() {
  if (audioPlayer) audioPlayer.pause();
}

async function resumeNative() {
  if (audioPlayer) audioPlayer.play();
}

async function seekNative(t: number) {
  if (audioPlayer?.seekTo) audioPlayer.seekTo(t);
}

async function setVolumeNative(v: number) {
  if (audioPlayer) audioPlayer.volume = v;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  queue: [], currentIndex: -1, isPlaying: false, currentTime: 0, duration: 0,
  volume: 0.8, isMuted: false, isShuffled: false, repeatMode: 'off', isFavorite: false,
  showPlaylist: false, showFullPlayer: false, lyrics: [], currentLyricIndex: -1,
  backHandler: null, pendingAlbumId: null, pendingArtistId: null, pendingPlaylistId: null,

  setQueue: async (items, startIndex = 0) => {
    set({ queue: items, currentIndex: startIndex });
    if (items.length > 0) await get().playItem(items[startIndex], items);
  },

  playItem: async (item, queue) => {
    const newQueue = queue || get().queue;
    try {
      const url = jellyfinApi.getAudioStreamUrl(item.Id, item.Container);
      clearProgressTimer();
      if (Platform.OS === 'web') {
        stopWeb(); playWeb(url); startWebPoll(() => {
          const a = getWeb(); if (!a || a.paused) return;
          const s = usePlayerStore.getState(); s.setCurrentTime(a.currentTime); s.setDuration(a.duration || 0);
          const idx = updateLyricIndex(a.currentTime, s.lyrics);
          if (idx !== s.currentLyricIndex) s.setCurrentLyricIndex(idx);
          if (a.currentTime >= (a.duration || 0) - 0.5 && s.currentIndex >= 0) {
            s.next();
          }
        });
      } else {
        const artwork = jellyfinApi.getImageUrl(item.Id, 'Primary', 400, 400);
        await configureAudioSession();
        await playNative(url, { title: item.Name || undefined, artist: item.Artists?.join(', ') || item.AlbumArtist || undefined, album: item.Album || undefined, artwork });
        startProgressPolling();
      }
      const idx = newQueue.findIndex((i) => i.Id === item.Id);
      const name = item.Name || '未知';
      const artist = item.Artists?.join(', ') || item.AlbumArtist || '未知艺术家';
      startForegroundService(name, artist);
      updatePlaybackState(true);
      set({ queue: newQueue, currentIndex: idx >= 0 ? idx : 0, isPlaying: true, currentTime: 0, duration: 0, lyrics: [], currentLyricIndex: -1, isFavorite: item.UserData?.IsFavorite ?? false });
      getLyrics(item.Id);
    } catch (e: any) {
      console.warn('播放失败:', e?.message || e);
      Alert.alert('播放失败', e?.message || '无法播放此歌曲');
      set({ isPlaying: false });
      stopForegroundService();
    }
  },

  togglePlay: async () => {
    if (Platform.OS === 'web') {
      const a = getWeb(); if (!a) return; if (a.paused) { a.play(); set({ isPlaying: true }); } else { a.pause(); set({ isPlaying: false }); } return;
    }
    if (get().isPlaying) { await pauseNative(); set({ isPlaying: false }); updatePlaybackState(false); }
    else { await resumeNative(); set({ isPlaying: true }); const s = get(); const i = s.queue[s.currentIndex]; if (i) { startForegroundService(i.Name || '未知', i.Artists?.join(', ') || i.AlbumArtist || '未知艺术家'); updatePlaybackState(true); } }
  },

  next: async () => {
    const { queue, currentIndex } = get();
    if (currentIndex + 1 >= queue.length) { set({ isPlaying: false }); stopForegroundService(); updatePlaybackState(false); return; }
    await get().playItem(queue[currentIndex + 1], queue);
  },

  previous: async () => {
    const { currentTime, queue, currentIndex } = get();
    if (currentTime > 3) { await seekNative(0); set({ currentTime: 0 }); return; }
    if (currentIndex <= 0) { await seekNative(0); set({ currentTime: 0 }); return; }
    await get().playItem(queue[currentIndex - 1], queue);
  },

  seek: async (time: number) => {
    if (!isFinite(time) || time < 0) return;
    if (Platform.OS === 'web') seekWeb(time); else await seekNative(time);
    set({ currentTime: time });
  },

  setVolume: async (v: number) => {
    await setVolumeNative(v);
    set({ volume: v, isMuted: v === 0 });
  },

  toggleMute: async () => {
    const { isMuted, volume } = get();
    await setVolumeNative(isMuted ? volume : 0);
    set({ isMuted: !isMuted });
  },

  toggleShuffle: () => set((s) => ({ isShuffled: !s.isShuffled })),
  cycleRepeat: () => set((s) => { const m: Array<'off'|'all'|'one'> = ['off','all','one']; return { repeatMode: m[(m.indexOf(s.repeatMode) + 1) % 3] }; }),
  toggleFavorite: async () => {
    const { queue, currentIndex } = get();
    if (currentIndex < 0 || currentIndex >= queue.length) return;
    try { await jellyfinApi.toggleFavorite(queue[currentIndex].Id); set((s) => ({ isFavorite: !s.isFavorite })); } catch {}
  },
  togglePlaylist: () => set((s) => ({ showPlaylist: !s.showPlaylist })),
  toggleFullPlayer: () => set((s) => ({ showFullPlayer: !s.showFullPlayer })),
  removeFromQueue: (index) => {
    const s = get();
    const q = [...s.queue]; q.splice(index, 1);
    let i = s.currentIndex;
    if (index < i) {
      i--;
      set({ queue: q, currentIndex: i });
    } else if (index === i) {
      if (q.length === 0) {
        clearProgressTimer();
        if (Platform.OS !== 'web') pauseNative();
        else stopWeb();
        stopForegroundService();
        updatePlaybackState(false);
        set({ queue: [], currentIndex: -1, isPlaying: false });
      } else if (i >= q.length) {
        i = q.length - 1;
        set({ queue: q, currentIndex: i, isPlaying: false });
        stopForegroundService();
        updatePlaybackState(false);
      } else {
        set({ queue: q });
        get().playItem(q[i], q);
      }
    } else {
      set({ queue: q });
    }
  },
  setCurrentTime: (t) => set({ currentTime: t }), setDuration: (d) => set({ duration: d }),
  setLyrics: (l) => set({ lyrics: l }), setCurrentLyricIndex: (i) => set({ currentLyricIndex: i }),
  shuffleQueue: () => set((s) => ({ queue: [...s.queue].sort(() => Math.random() - 0.5) })),
  setBackHandler: (h) => set({ backHandler: h }),
  openAlbumDetail: (id) => set({ pendingAlbumId: id }), openArtistDetail: (id) => set({ pendingArtistId: id }),
   openPlaylistDetail: (id) => set({ pendingPlaylistId: id }),
   clearPendingDetail: () => set({ pendingAlbumId: null, pendingArtistId: null, pendingPlaylistId: null }),
 }));

function handleLockScreenEvent(event: string) {
  const state = usePlayerStore.getState();
  if (event === 'TOGGLE') {
    state.togglePlay();
  } else if (event === 'NEXT') {
    state.next();
  } else if (event === 'PREV') {
    state.previous();
  }
}

export function initLockScreenHandler() {
  if (Platform.OS !== 'android' || lockScreenSubscribed) return;
  lockScreenSubscribed = true;
  try {
    onLockScreenEvent(handleLockScreenEvent);
  } catch (e) {
    console.warn('[LockScreen] init failed:', e);
  }
}
