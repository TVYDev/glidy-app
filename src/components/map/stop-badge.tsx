import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

/** A numbered dot for a stop along the route. Digits are Latin whatever the app language. */
export function StopBadge({ number, size = 28 }: { number: number; size?: number }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.badge,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: theme.ink, borderColor: theme.primary },
      ]}>
      <ThemedText type="smallBold" fontLanguage="en" style={{ color: theme.primary, fontSize: size * 0.5, lineHeight: size * 0.62 }}>
        {number}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignItems: 'center', justifyContent: 'center', borderWidth: 2.5 },
});
