import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type Stat = { value: string; label: string };

/**
 * Numbers on a black strip, as on Home: big amber figures with a small label under each. A value
 * like "1.8 km" or "1 h 20 min" is split so the digits stay big and Latin while the units are
 * drawn small, in Khmer when the app is in Khmer.
 */
export function StatStrip({ stats }: { stats: Stat[] }) {
  const theme = useTheme();
  return (
    <View style={[styles.strip, { backgroundColor: theme.ink }]}>
      {stats.map((stat, index) => (
        <View key={stat.label} style={styles.item}>
          {index > 0 && <View style={[styles.divider, { backgroundColor: theme.textSecondary }]} />}
          <View style={styles.stat}>
            <View style={styles.value}>
              {stat.value.split(' ').map((part, i) =>
                /^[\d.,:]+$/.test(part) ? (
                  <ThemedText key={i} type="display" fontLanguage="en" style={[styles.number, { color: theme.primary }]}>
                    {part}
                  </ThemedText>
                ) : (
                  <ThemedText key={i} type="smallBold" style={{ color: theme.primary }}>
                    {part}
                  </ThemedText>
                ),
              )}
            </View>
            <ThemedText type="small" themeColor="onInk" numberOfLines={2}>
              {stat.label}
            </ThemedText>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.lg, padding: Spacing.three },
  item: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  stat: { flex: 1, paddingHorizontal: Spacing.two, gap: Spacing.half },
  // Numbers are big and always Latin; the unit beside each is a small word in the app's language.
  value: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: Spacing.one },
  number: { fontSize: 28, lineHeight: 34 },
  divider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', opacity: 0.5 },
});
