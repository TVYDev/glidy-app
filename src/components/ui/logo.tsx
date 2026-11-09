import { StyleSheet, View } from 'react-native';

import { LogoMark } from '@/components/ui/brand-art';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

/** Glidy mark (a route curve ending in a pin) and wordmark. */
export function Logo({ size = 40, showWordmark = true }: { size?: number; showWordmark?: boolean }) {
  return (
    <View style={styles.row}>
      <LogoMark size={size} />
      {showWordmark && (
        <ThemedText type="subtitle" style={styles.word}>
          glidy
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  word: { fontSize: 26, lineHeight: 32, fontWeight: 800 },
});
