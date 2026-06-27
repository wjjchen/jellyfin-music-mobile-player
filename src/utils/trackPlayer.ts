import { Platform } from 'react-native';

let eaCache: any = null;
let eaTried = false;

export async function getExpoAudio(): Promise<any> {
  if (eaTried) return eaCache;
  eaTried = true;
  if (Platform.OS === 'web') return null;
  try {
    const { requireNativeModule } = require('expo-modules-core');
    eaCache = requireNativeModule('ExpoAudio');
  } catch { eaCache = null; }
  return eaCache;
}

let webAudio: HTMLAudioElement | null = null;
let webPoll: ReturnType<typeof setInterval> | null = null;
export function playWeb(url: string) { stopWeb(); webAudio = new Audio(url); webAudio.play().catch(() => {}); }
export function pauseWeb() { webAudio?.pause(); }
export function resumeWeb() { webAudio?.play().catch(() => {}); }
export function seekWeb(t: number) { if (webAudio) webAudio.currentTime = t; }
export function stopWeb() { if (webAudio) { webAudio.pause(); webAudio.src = ''; webAudio = null; } clearInterval(webPoll as any); webPoll = null; }
export function getWeb() { return webAudio; }
export function startWebPoll(cb: () => void) { stopWeb(); webPoll = setInterval(cb, 200); }
