import { ChevronRight, ExternalLink, type LucideIcon } from 'lucide-react-native';
import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconBadge } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type MenuRowProps = {
  icon: LucideIcon;
  label: string;
  /** Short value shown on the right, such as the current language. */
  value?: string;
  onPress: () => void;
  /** Leaves the app (browser, mail): shows an "open" icon instead of a chevron. */
  external?: boolean;
  /** Set by MenuGroup: draws a divider above every row but the first. */
  showDivider?: boolean;
};

/** One tappable line of a menu: icon, label, optional value, and a chevron. */
export function MenuRow({ icon, label, value, onPress, external, showDivider }: MenuRowProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}, ${value}` : label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        showDivider && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border },
        { opacity: pressed ? 0.7 : 1 },
      ]}>
      <IconBadge icon={icon} size={40} tone="soft" />
      <ThemedText type="smallBold" style={styles.label} numberOfLines={2}>
        {label}
      </ThemedText>
      {value ? (
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.value}>
          {value}
        </ThemedText>
      ) : null}
      <Icon icon={external ? ExternalLink : ChevronRight} size={18} color="textSecondary" />
    </Pressable>
  );
}

type MenuGroupProps = { title?: string; children: ReactNode };

/** A titled card that holds a list of MenuRows separated by hairlines. */
export function MenuGroup({ title, children }: MenuGroupProps) {
  const theme = useTheme();
  const rows = Children.toArray(children).filter(isValidElement) as ReactElement<MenuRowProps>[];
  return (
    <View style={styles.group}>
      {title ? (
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.title}>
          {title}
        </ThemedText>
      ) : null}
      <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        {rows.map((row, index) => cloneElement(row, { showDivider: index > 0 }))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: Spacing.two },
  title: { paddingHorizontal: Spacing.one },
  card: { borderRadius: Radius.lg, borderWidth: 1, paddingHorizontal: Spacing.three },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 64,
    paddingVertical: Spacing.two,
  },
  label: { flex: 1 },
  value: { maxWidth: '40%' },
});
