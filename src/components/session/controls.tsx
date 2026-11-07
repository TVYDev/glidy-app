import type { LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Glass } from '@/components/ui/glass';
import { Icon } from '@/components/ui/icon';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type MapButtonProps = {
  label: string;
  icon: LucideIcon;
  onPress: () => void;
  /** Highlights the button in brand amber, e.g. while "follow me" is on. */
  active?: boolean;
};

/** Round glass button that floats over the map. */
export function MapButton({ label, icon, onPress, active }: MapButtonProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!active }}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
      <Glass
        style={styles.round}
        fallbackColor={active ? theme.primary : theme.backgroundElement}
        fallbackBorderColor={theme.border}
        tintColor={active ? theme.primary : undefined}
        interactive>
        <Icon icon={icon} size={22} color={active ? 'onPrimary' : 'text'} />
      </Glass>
    </Pressable>
  );
}

type ActionTileProps = {
  label: string;
  icon: LucideIcon;
  onPress: () => void;
  /** Emphasised (amber) tile, e.g. "resume sharing". */
  highlight?: boolean;
  disabled?: boolean;
};

/** Square quick action: icon in a circle with a short label under it. */
export function ActionTile({ label, icon, onPress, highlight, disabled }: ActionTileProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        {
          backgroundColor: highlight ? theme.accent : theme.backgroundElement,
          borderColor: highlight ? theme.primary : theme.border,
          opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
        },
      ]}>
      <View style={[styles.tileIcon, { backgroundColor: highlight ? theme.primary : theme.backgroundSelected }]}>
        <Icon icon={icon} size={20} color={highlight ? 'onPrimary' : 'text'} />
      </View>
      <ThemedText type="caption" numberOfLines={2} style={styles.tileLabel}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  round: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  tile: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.one,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  tileIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  tileLabel: { textAlign: 'center', minHeight: 32 },
});
