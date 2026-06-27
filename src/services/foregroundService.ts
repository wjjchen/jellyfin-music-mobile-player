import { Platform, NativeModules, NativeEventEmitter } from 'react-native';

const NativeFG = NativeModules.ForegroundServiceModule;
let eventEmitter: NativeEventEmitter | null = null;

function getEmitter() {
  if (!eventEmitter && NativeFG && Platform.OS === 'android') {
    eventEmitter = new NativeEventEmitter(NativeFG);
  }
  return eventEmitter;
}

export function startForegroundService(title: string, artist: string) {
  if (Platform.OS !== 'android' || !NativeFG) return;
  try { NativeFG.start(title, artist); } catch {}
}

export function stopForegroundService() {
  if (Platform.OS !== 'android' || !NativeFG) return;
  try { NativeFG.stop(); } catch {}
}

export function updatePlaybackState(isPlaying: boolean) {
  if (Platform.OS !== 'android' || !NativeFG) return;
  try { NativeFG.updatePlaybackState(isPlaying); } catch {}
}

export function sendLockScreenAction(action: string) {
  if (Platform.OS !== 'android' || !NativeFG) return;
  try { NativeFG.sendEvent(action); } catch {}
}

export function onLockScreenEvent(callback: (event: string) => void) {
  const emitter = getEmitter();
  if (!emitter) return null;
  return emitter.addListener('PlaybackEvent', callback);
}
