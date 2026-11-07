import { Navigation } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Glidy mark (amber tile with a navigation arrow) and wordmark. */
export function Logo({ size = 40, showWordmark = true }: { size?: number; showWordmark?: boolean }) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <View
        style={[
          styles.mark,
          { width: size, height: size, borderRadius: size * 0.32, backgroundColor: theme.primary },
        ]}>
        <Icon icon={Navigation} size={size * 0.5} color="onPrimary" fill={theme.ink} strokeWidth={2.2} />
      </View>
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
  mark: { alignItems: 'center', justifyContent: 'center' },
  word: { fontSize: 26, lineHeight: 32, fontWeight: 800 },
});
