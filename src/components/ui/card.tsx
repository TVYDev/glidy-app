import type { LucideIcon } from 'lucide-react-native';
import { ArrowRight } from 'lucide-react-native';
import { Pressable, StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Rounded surface with a hairline border: the basic building block of every screen. */
export function Card({ style, ...rest }: ViewProps) {
  const theme = useTheme();
  return (
    <View
      style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }, style]}
      {...rest}
    />
  );
}

type BadgeProps = {
  icon: LucideIcon;
  size?: number;
  /** `solid` is brand amber; `soft` is the pale amber tint. */
  tone?: 'solid' | 'soft';
};

/** Round icon badge, as used for list rows and stats in the reference design. */
export function IconBadge({ icon, size = 44, tone = 'solid' }: BadgeProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.badge,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: tone === 'solid' ? theme.primary : theme.accent,
        },
      ]}>
      <Icon icon={icon} size={size * 0.48} color={tone === 'solid' ? 'onPrimary' : 'primaryDark'} />
    </View>
  );
}

/** Small outlined circle with an arrow, the "go" affordance at the end of a row. */
export function ArrowButton() {
  const theme = useTheme();
  return (
    <View style={[styles.arrow, { borderColor: theme.border }]}>
      <Icon icon={ArrowRight} size={18} />
    </View>
  );
}

type RowProps = {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

/** Pressable card row: icon badge, title and subtitle, arrow. */
export function ListRow({ icon, title, subtitle, onPress, style }: RowProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border, opacity: pressed ? 0.85 : 1 },
        style,
      ]}>
      <IconBadge icon={icon} />
      <View style={styles.rowText}>
        <ThemedText type="smallBold" numberOfLines={2}>
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      <ArrowButton />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.three,
  },
  badge: { alignItems: 'center', justifyContent: 'center' },
  arrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  rowText: { flex: 1 },
});
