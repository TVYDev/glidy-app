import type { LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Variant = 'primary' | 'secondary' | 'ink' | 'ghost' | 'danger' | 'destructive';

type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  /** Optional leading Lucide icon. */
  icon?: LucideIcon;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

const VARIANTS: Record<Variant, { bg: ThemeColor | 'transparent'; fg: ThemeColor; border?: boolean }> = {
  primary: { bg: 'primary', fg: 'onPrimary' },
  secondary: { bg: 'backgroundElement', fg: 'text', border: true },
  ink: { bg: 'ink', fg: 'onInk' },
  ghost: { bg: 'transparent', fg: 'primaryDark' },
  danger: { bg: 'transparent', fg: 'danger' },
  /** A filled red button for the confirming action of something that cannot be undone. */
  destructive: { bg: 'danger', fg: 'onInk' },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  icon,
  compact,
  style,
}: ButtonProps) {
  const theme = useTheme();
  const { bg, fg, border } = VARIANTS[variant];
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        compact && styles.compact,
        { backgroundColor: bg === 'transparent' ? 'transparent' : theme[bg] },
        border && { borderWidth: 1, borderColor: theme.border },
        (pressed || inactive) && { opacity: inactive ? 0.5 : 0.85 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={theme[fg]} />
      ) : (
        <>
          {icon && <Icon icon={icon} size={compact ? 18 : 20} color={fg} />}
          <ThemedText type="smallBold" themeColor={fg} style={compact ? undefined : styles.label}>
            {label}
          </ThemedText>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 56,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.four,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  compact: {
    minHeight: 44,
    paddingHorizontal: Spacing.three,
  },
  label: {
    fontSize: 16,
    lineHeight: 22,
  },
});
