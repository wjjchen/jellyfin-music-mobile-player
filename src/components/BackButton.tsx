import { Pressable, Text, StyleSheet } from 'react-native';

interface BackButtonProps {
  onPress: () => void;
}

export default function BackButton({ onPress }: BackButtonProps) {
  return (
    <Pressable style={styles.btn} onPress={onPress}>
      <Text style={styles.arrow}>‹</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'flex-start' },
  arrow: { color: '#00A4DC', fontSize: 28, fontWeight: '700', lineHeight: 30 },
});
