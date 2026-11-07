import { router, useLocalSearchParams } from 'expo-router';
import { LocateFixed, X, type LucideIcon } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LiveMap } from '@/components/map/live-map';
import { ThemedText } from '@/components/themed-text';
import { Glass } from '@/components/ui/glass';
import { Icon } from '@/components/ui/icon';
import { Radius, Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';
import { backend } from '@/lib/backend';
import { formatDistance, formatDuration } from '@/lib/geo';
import type { SavedRoute } from '@/lib/types';

/**
 * Full-screen, fully interactive view of a saved route. The map takes every gesture: pan, pinch to
 * zoom, two-finger rotate and tilt. The compass resets north.
 */
export default function RouteMapScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [saved, setSaved] = useState<SavedRoute | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fitSignal, setFitSignal] = useState(0);

  useEffect(() => {
    backend.routes
      .get(id)
      .then(setSaved)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : t('route.loadError')));
  }, [id, t]);

  if (!saved) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        {error ? <ThemedText themeColor="danger">{error}</ThemedText> : <ActivityIndicator color={theme.primaryDark} />}
        {error && <GlassButton label={t('route.closeMap')} icon={X} onPress={() => router.back()} />}
      </View>
    );
  }

  return (
    <View style={[styles.fill, { backgroundColor: theme.background }]}>
      <LiveMap
        route={saved.route}
        destination={saved.destination}
        me={null}
        others={[]}
        fitSignal={fitSignal}
        insets={{ top: insets.top + 80, bottom: insets.bottom + 40 }}
      />

      <View style={[styles.top, { paddingTop: insets.top + Spacing.two }]} pointerEvents="box-none">
        <GlassButton label={t('route.closeMap')} icon={X} onPress={() => router.back()} />
        <Glass style={styles.title} fallbackColor={theme.backgroundElement} fallbackBorderColor={theme.border}>
          <ThemedText type="smallBold" numberOfLines={1}>
            {saved.name}
          </ThemedText>
          <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
            {formatDistance(saved.route.distance)} · {formatDuration(saved.route.duration)}
          </ThemedText>
        </Glass>
        <GlassButton label={t('session.recentre')} icon={LocateFixed} onPress={() => setFitSignal((n) => n + 1)} />
      </View>
    </View>
  );
}

function GlassButton({ label, icon, onPress }: { label: string; icon: LucideIcon; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
      <Glass style={styles.round} fallbackColor={theme.backgroundElement} fallbackBorderColor={theme.border} interactive>
        <Icon icon={icon} size={20} />
      </Glass>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
  top: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  round: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  title: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radius.lg,
    justifyContent: 'center',
  },
});
