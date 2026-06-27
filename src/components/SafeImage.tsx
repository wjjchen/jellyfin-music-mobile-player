import { useState } from 'react';
import { Image } from 'react-native';
import DefaultImage from './DefaultImage';

interface SafeImageProps {
  src: string;
  type: 'album' | 'artist' | 'song';
  size?: number;
  style?: any;
}

export default function SafeImage({ src, type, size = 200, style }: SafeImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return <DefaultImage type={type} size={size} />;
  }

  const borderRadius = type === 'artist' || type === 'song' ? size / 2 : 8;

  return (
    <Image
      source={{ uri: src }}
      style={[{ width: size, height: size, borderRadius, flexShrink: 0 }, style]}
      resizeMode="cover"
      onError={() => setFailed(true)}
    />
  );
}
