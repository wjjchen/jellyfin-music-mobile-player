import { Platform, NativeModules } from 'react-native';

const NativeFG = NativeModules.ForegroundServiceModule;

export function startForegroundService(title: string, artist: string) {
  if (Platform.OS === 'android' && NativeFG) {
    try {
      NativeFG.start(title, artist);
    } catch {}
  }
}

export function stopForegroundService() {
  if (Platform.OS === 'android' && NativeFG) {
    try {
      NativeFG.stop();
    } catch {}
  }
}
