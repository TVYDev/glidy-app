import { Tabs, TabList, TabSlot, TabTrigger, type TabTriggerSlotProps } from 'expo-router/ui';
import { House, Map, User, type LucideIcon } from 'lucide-react-native';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Glass, hasLiquidGlass } from '@/components/ui/glass';
import { Icon } from '@/components/ui/icon';
import { Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';

/**
 * Floating pill tab bar from the reference design, drawn as iOS 26 liquid glass (the same
 * material as the system tab bar) with Lucide icons. The active tab sits in a brand-amber
 * circle. Where liquid glass is unavailable it falls back to a solid black pill, so it looks
 * the same on Android. Built on expo-router/ui for full control of the icons.
 */
export default function TabsLayout() {
  const { t } = useI18n();
  return (
    <Tabs>
      <TabSlot style={styles.slot} />
      <TabList asChild>
        <FloatingBar>
          <TabTrigger name="home" href="/" asChild>
            <TabItem icon={House} label={t('tabs.home')} />
          </TabTrigger>
          <TabTrigger name="routes" href="/routes" asChild>
            <TabItem icon={Map} label={t('tabs.routes')} />
          </TabTrigger>
          <TabTrigger name="profile" href="/profile" asChild>
            <TabItem icon={User} label={t('tabs.profile')} />
          </TabTrigger>
        </FloatingBar>
      </TabList>
    </Tabs>
  );
}

function FloatingBar({ children }: ViewProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={[styles.barWrap, { bottom: Math.max(insets.bottom, Spacing.three) }]}>
      <Glass
        style={[styles.bar, !hasLiquidGlass && styles.barShadow]}
        fallbackColor={theme.ink}
        fallbackBorderColor={theme.border}
        interactive>
        {children}
      </Glass>
    </View>
  );
}

type TabItemProps = TabTriggerSlotProps & { icon: LucideIcon; label: string };

function TabItem({ icon, label, isFocused, ...props }: TabItemProps) {
  const theme = useTheme();
  // Icons sit on glass (follows the system light/dark look) or on the solid black fallback.
  const idleColor = hasLiquidGlass ? 'text' : 'onInk';
  return (
    <Pressable
      {...(props as ComponentProps<typeof Pressable>)}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!isFocused }}
      style={[styles.item, isFocused && { backgroundColor: theme.primary }]}>
      <Icon icon={icon} size={22} color={isFocused ? 'onPrimary' : idleColor} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  slot: { flex: 1 },
  barWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.two,
    borderRadius: 999,
  },
  barShadow: {
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  item: {
    width: 64,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
