import { Platform, NativeModules, NativeEventEmitter } from 'react-native';

const NativeMedia = NativeModules.MediaButtonModule;
let emitter: NativeEventEmitter | null = null;

export function initMediaButtonListener(onEvent: (event: string) => void) {
  if (Platform.OS !== 'android' || !NativeMedia) return;
  if (!emitter) {
    emitter = new NativeEventEmitter(NativeMedia);
    emitter.addListener('MediaButtonEvent', onEvent);
    try { NativeMedia.registerMediaButtonListener(); } catch {}
  }
}

export function destroyMediaButtonListener() {
  if (emitter) {
    emitter.removeAllListeners('MediaButtonEvent');
    emitter = null;
  }
  try { NativeMedia?.unregisterMediaButtonListener(); } catch {}
}
