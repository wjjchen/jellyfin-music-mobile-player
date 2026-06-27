import { Platform, Alert, PermissionsAndroid } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { jellyfinApi } from '@/api/jellyfin';

const APP_FOLDER = 'Jellyfin Player';

function getMimeType(container?: string): string {
  const map: Record<string, string> = {
    mp3: 'audio/mpeg',
    aac: 'audio/aac',
    m4a: 'audio/mp4',
    flac: 'audio/flac',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    wma: 'audio/x-ms-wma',
  };
  return map[container?.toLowerCase() || ''] || 'audio/mpeg';
}

function getExtension(container?: string): string {
  return container?.toLowerCase() || 'mp3';
}

export async function downloadTrack(
  itemId: string,
  name: string,
  container?: string,
  mediaSourceId?: string,
): Promise<string | null> {
  if (Platform.OS !== 'android') return null;

  try {
    const url = jellyfinApi.getAudioStreamUrl(itemId, container, mediaSourceId);
    const ext = getExtension(container);
    const mime = getMimeType(container);
    const safeName = name.replace(/[\\/:*?"<>|]/g, '_').trim() || 'audio';
    const fileName = `${safeName}.${ext}`;
    const filePath = `${ReactNativeBlobUtil.fs.dirs.DownloadDir}/${fileName}`;

    // Check if already exists
    const exists = await ReactNativeBlobUtil.fs.exists(filePath);
    if (exists) {
      Alert.alert('已下载', `歌曲已在 Downloads/${fileName}`);
      return filePath;
    }

    // For Android 10+ (API 29+), WRITE_EXTERNAL_STORAGE not needed
    if (Platform.Version < 29) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        { title: '存储权限', message: '下载歌曲需要访问存储空间', buttonPositive: '允许' },
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert('权限不足', '需要存储权限才能下载歌曲');
        return null;
      }
    }

    const res = await ReactNativeBlobUtil.config({
      path: filePath,
      fileCache: true,
      addAndroidDownloads: {
        useDownloadManager: true,
        notification: true,
        title: fileName,
        description: `正在下载 ${name}`,
        mime: mime,
        path: filePath,
      },
    }).fetch('GET', url, {
      'X-Emby-Token': jellyfinApi.getAccessToken(),
    });

    const actualPath = res.path();

    // For Android 10+, copy to MediaStore so it shows in system file manager
    if (Platform.Version >= 29) {
      try {
        await ReactNativeBlobUtil.MediaCollection.copyToMediaStore(
          {
            name: fileName,
            parentFolder: APP_FOLDER,
            mimeType: mime,
          },
          'Download',
          actualPath,
        );
      } catch (mediaErr) {
        console.warn('MediaStore copy failed, file still saved:', mediaErr);
      }
    }

    Alert.alert('下载完成', `${name} 已保存到 Downloads/${APP_FOLDER}/`);
    return actualPath;
  } catch (e: any) {
    console.warn('下载失败:', e?.message || e);
    if (e?.message?.includes('exist') || e?.message?.includes('File')) {
      Alert.alert('文件已存在', '同名文件已下载过');
    } else {
      Alert.alert('下载失败', e?.message || '请检查网络连接');
    }
    return null;
  }
}
