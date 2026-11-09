import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Maximize2, Share2, Trash, Undo2, Users } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Share, StyleSheet, View } from 'react-native';

import { LiveMap } from '@/components/map/live-map';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useDialog } from '@/components/ui/dialog';
import { Glass } from '@/components/ui/glass';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { StatStrip } from '@/components/ui/stat-strip';
import { Radius, Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';
import { backend } from '@/lib/backend';
import { formatDistance, formatDuration } from '@/lib/geo';
import { planRoutes } from '@/lib/maps-api';
import type { SavedRoute } from '@/lib/types';
import { useProfile } from '@/providers/auth-provider';

/** A saved route: preview, reverse for the trip home, start a group with it, share or delete. */
export default function SavedRouteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { t } = useI18n();
  const me = useProfile();
  const dialog = useDialog();
  const [saved, setSaved] = useState<SavedRoute | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // While a finger is on the embedded map the page must not scroll, or map drags would fight it.
  const [mapActive, setMapActive] = useState(false);

  useEffect(() => {
    backend.routes
      .get(id)
      .then(setSaved)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : t('route.loadError')));
  }, [id, t]);

  if (!saved) {
    return (
      <Screen>
        {error ? <ThemedText themeColor="danger">{error}</ThemedText> : <ActivityIndicator color={theme.primaryDark} />}
      </Screen>
    );
  }

  const mine = saved.ownerId === me.id;

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('session.error'));
    } finally {
      setBusy(false);
    }
  }

  const startGroup = () =>
    run(async () => {
      const session = await backend.sessions.create({
        name: saved.name,
        destination: saved.destination,
        route: saved.route,
      });
      router.replace({ pathname: '/session/[id]', params: { id: session.id } });
    });

  /** Trip home: route from the destination back to where this one started. */
  const reverse = () =>
    run(async () => {
      if (!saved.origin) throw new Error(t('route.noStart'));
      // The way home visits the same stops in the opposite order.
      const [back] = await planRoutes(saved.destination.coord, [...(saved.route.stops ?? [])].reverse(), saved.origin);
      const created = await backend.routes.save({
        name: `${saved.name} ${t('route.tripHomeSuffix')}`,
        origin: saved.destination,
        destination: saved.origin,
        route: back,
      });
      router.replace({ pathname: '/routes/[id]', params: { id: created.id } });
    });

  const share = () =>
    run(async () => {
      if (!saved.isShared) setSaved(await backend.routes.setShared(saved.id, true));
      await Share.share({
        message: t('route.shareMessage', {
          name: saved.name,
          distance: formatDistance(saved.route.distance),
          link: `glidyapp://routes/${saved.id}`,
        }),
      });
    });

  const saveCopy = () =>
    run(async () => {
      const copy = await backend.routes.save({
        name: saved.name,
        origin: saved.origin,
        destination: saved.destination,
        route: saved.route,
      });
      router.replace({ pathname: '/routes/[id]', params: { id: copy.id } });
    });

  const confirmDelete = async () => {
    const yes = await dialog.confirm({
      title: t('route.deleteTitle'),
      body: t('route.deleteBody'),
      confirmLabel: t('route.delete'),
      destructive: true,
      icon: Trash,
    });
    if (!yes) return;
    await run(async () => {
      await backend.routes.remove(saved.id);
      router.back();
    });
  };

  return (
    <Screen scroll scrollEnabled={!mapActive} edges={['left', 'right', 'bottom']}>
      <Stack.Screen options={{ title: saved.name }} />
      <View
        style={[styles.map, { borderColor: theme.border }]}
        onTouchStart={() => setMapActive(true)}
        onTouchEnd={() => setMapActive(false)}
        onTouchCancel={() => setMapActive(false)}>
        <LiveMap
          route={saved.route}
          destination={saved.destination}
          me={null}
          others={[]}
          fitSignal={0}
          insets={{ top: 24, bottom: 24 }}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('route.fullscreen')}
          onPress={() => router.push({ pathname: '/routes/map', params: { id: saved.id } })}
          style={({ pressed }) => [styles.maximize, { opacity: pressed ? 0.7 : 1 }]}>
          <Glass
            style={styles.maximizeGlass}
            fallbackColor={theme.backgroundElement}
            fallbackBorderColor={theme.border}
            interactive>
            <Icon icon={Maximize2} size={18} />
          </Glass>
        </Pressable>
      </View>

      <View style={styles.summary}>
        <ThemedText type="display" numberOfLines={3}>
          {saved.destination.name}
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          {saved.origin ? t('route.from', { name: saved.origin.name }) : ''}
          {saved.origin && saved.isShared ? ' · ' : ''}
          {saved.isShared ? t('routes.shared') : ''}
        </ThemedText>
      </View>

      <StatStrip
        stats={[
          { value: formatDistance(saved.route.distance), label: t('stat.distance') },
          { value: formatDuration(saved.route.duration), label: t('stat.time') },
          { value: String(saved.route.steps.length), label: t('stat.steps') },
        ]}
      />

      {error && (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      )}

      <Button label={t('route.startGroup')} onPress={startGroup} loading={busy} icon={Users} />
      {mine ? (
        <>
          <View style={styles.row}>
            <Button label={t('route.tripHome')} variant="secondary" onPress={reverse} disabled={busy} icon={Undo2} style={styles.flex} />
            <Button label={t('route.share')} variant="secondary" onPress={share} disabled={busy} icon={Share2} style={styles.flex} />
          </View>
          <Button label={t('route.delete')} variant="danger" onPress={confirmDelete} disabled={busy} icon={Trash} />
        </>
      ) : (
        <Button label={t('route.saveCopy')} variant="secondary" onPress={saveCopy} disabled={busy} />
      )}

      <ThemedText type="smallBold" style={styles.stepsTitle}>
        {t('route.directions')}
      </ThemedText>
      <Card style={styles.steps}>
        {saved.route.steps.map((step, index) => (
          <View
            key={index}
            style={[
              styles.step,
              index < saved.route.steps.length - 1 && { borderBottomColor: theme.border, borderBottomWidth: StyleSheet.hairlineWidth },
            ]}>
            <ThemedText type="small" style={styles.stepText}>
              {step.instruction}
            </ThemedText>
            {step.distance > 0 && (
              <ThemedText type="small" themeColor="textSecondary">
                {formatDistance(step.distance)}
              </ThemedText>
            )}
          </View>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  map: { height: 260, borderRadius: Radius.lg, overflow: 'hidden', borderWidth: 1 },
  maximize: { position: 'absolute', top: Spacing.two, right: Spacing.two },
  maximizeGlass: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  summary: { gap: Spacing.one },
  row: { flexDirection: 'row', gap: Spacing.two },
  flex: { flex: 1 },
  stepsTitle: { marginTop: Spacing.two, fontSize: 18, lineHeight: 24 },
  steps: { padding: 0, paddingHorizontal: Spacing.three },
  step: { flexDirection: 'row', gap: Spacing.three, paddingVertical: Spacing.three },
  stepText: { flex: 1 },
});
