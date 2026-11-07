import { ActivityIndicator, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Variant = 'primary' | 'secondary' | 'accent' | 'ghost' | 'danger';

type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  /** Optional leading icon. */
  icon?: { sf: Parameters<typeof Icon>[0]['sf']; md: Parameters<typeof Icon>[0]['md'] };
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

const VARIANTS: Record<Variant, { bg: ThemeColor | 'transparent'; fg: ThemeColor }> = {
  primary: { bg: 'primary', fg: 'onPrimary' },
  secondary: { bg: 'backgroundElement', fg: 'text' },
  accent: { bg: 'accent', fg: 'onAccent' },
  ghost: { bg: 'transparent', fg: 'primary' },
  danger: { bg: 'transparent', fg: 'danger' },
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
  const { bg, fg } = VARIANTS[variant];
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        compact && styles.compact,
        { backgroundColor: bg === 'transparent' ? 'transparent' : theme[bg] },
        variant === 'secondary' && { borderWidth: 1, borderColor: theme.border },
        (pressed || inactive) && { opacity: inactive ? 0.5 : 0.8 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={theme[fg]} />
      ) : (
        <>
          {icon && <Icon sf={icon.sf} md={icon.md} size={compact ? 18 : 20} color={fg} />}
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
    minHeight: 54,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.four,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  compact: {
    minHeight: 40,
    paddingHorizontal: Spacing.three,
  },
  label: {
    fontSize: 16,
  },
});
