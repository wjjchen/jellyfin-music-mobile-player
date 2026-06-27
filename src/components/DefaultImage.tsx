import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Line, Polygon, Rect } from 'react-native-svg';

interface DefaultImageProps {
  type: 'album' | 'artist' | 'song';
  size?: number;
}

export default function DefaultImage({ type, size = 200 }: DefaultImageProps) {
  const iconSize = size * 0.5;

  return (
    <View
      style={[
        styles.container,
        type === 'artist' ? styles.artist : type === 'song' ? styles.song : styles.album,
        { width: size, height: size },
      ]}
    >
      {type === 'artist' ? (
        <Svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth={1.5}>
          <Circle cx={9} cy={7} r={4} />
          <Circle cx={17} cy={8} r={3} />
          <Circle cx={12} cy={12} r={1} />
          <Line x1={5} y1={22} x2={5} y2={17} />
          <Line x1={21} y1={22} x2={21} y2={16} />
          <Line x1={9} y1={22} x2={9} y2={17} />
          <Line x1={17} y1={22} x2={17} y2={18} />
        </Svg>
      ) : type === 'song' ? (
        <Svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth={1.5}>
          <Circle cx="12" cy="12" r="10" />
          <Circle cx="12" cy="12" r="3" />
          <Circle cx="12" cy="12" r="1" fill="#666" />
        </Svg>
      ) : (
        <Svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth={1.5}>
          <Circle cx={12} cy={12} r={10} />
          <Circle cx={12} cy={12} r={3} />
          <Circle cx={12} cy={12} r={1} fill="#666" />
        </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  artist: { borderRadius: 999 },
  song: { borderRadius: 999 },
  album: { borderRadius: 8 },
});
