import { X } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { Radius, Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';
import { formatDistance, formatDuration } from '@/lib/geo';

type DriveBarProps = {
  /** Clock time of arrival, e.g. "18:47". */
  arrival: string;
  remainingDistance: number;
  remainingDuration: number;
  /** Current speed in km/h, or null when unknown. */
  speedKmh: number | null;
  onEnd: () => void;
  bottomInset: number;
};

/** What a driver glances at: when they arrive, how far is left, how fast they are going. */
export function DriveBar({ arrival, remainingDistance, remainingDuration, speedKmh, onEnd, bottomInset }: DriveBarProps) {
  const theme = useTheme();
  const { t } = useI18n();

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: theme.background,
          borderColor: theme.border,
          paddingBottom: Math.max(bottomInset, Spacing.three),
        },
      ]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('drive.end')}
        onPress={onEnd}
        style={({ pressed }) => [styles.end, { backgroundColor: theme.danger, opacity: pressed ? 0.8 : 1 }]}>
        <Icon icon={X} size={22} color="#FFFFFF" strokeWidth={2.6} />
      </Pressable>

      <View style={styles.column}>
        <ThemedText style={styles.value}>{arrival}</ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">
          {t('drive.arrival')}
        </ThemedText>
      </View>

      <View style={styles.column}>
        <ThemedText style={styles.value} numberOfLines={1}>
          {formatDistance(remainingDistance)}
        </ThemedText>
        <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
          {formatDuration(remainingDuration)}
        </ThemedText>
      </View>

      <View style={[styles.speed, { backgroundColor: theme.accent }]}>
        <ThemedText style={styles.speedValue}>{speedKmh ?? '–'}</ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">
          {t('unit.kmh')}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingTop: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  end: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  column: { flex: 1 },
  value: { fontSize: 22, lineHeight: 28, fontWeight: 800 },
  speed: {
    minWidth: 76,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
  },
  speedValue: { fontSize: 24, lineHeight: 30, fontWeight: 800 },
});
