import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Share, StyleSheet, View } from 'react-native';

import { LiveMap } from '@/components/map/live-map';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { backend } from '@/lib/backend';
import { formatDistance, formatDuration } from '@/lib/geo';
import { getRoute } from '@/lib/mapbox-api';
import type { SavedRoute } from '@/lib/types';
import { useProfile } from '@/providers/auth-provider';

/** A saved route: preview, reverse for the trip home, start a group with it, share or delete. */
export default function SavedRouteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const me = useProfile();
  const [saved, setSaved] = useState<SavedRoute | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    backend.routes
      .get(id)
      .then(setSaved)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not load this route.'));
  }, [id]);

  if (!saved) {
    return (
      <Screen>
        {error ? <ThemedText themeColor="danger">{error}</ThemedText> : <ActivityIndicator color={theme.primary} />}
      </Screen>
    );
  }

  const mine = saved.ownerId === me.id;

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
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
      if (!saved.origin) throw new Error('This route has no start point to return to.');
      const back = await getRoute(saved.destination.coord, saved.origin.coord);
      const created = await backend.routes.save({
        name: `${saved.name} (trip home)`,
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
        message: `Check out this route on Glidy: "${saved.name}" (${formatDistance(saved.route.distance)}). Open: glidyapp://routes/${saved.id}`,
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

  const confirmDelete = () =>
    Alert.alert('Delete this route?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          run(async () => {
            await backend.routes.remove(saved.id);
            router.back();
          }),
      },
    ]);

  return (
    <Screen scroll edges={['left', 'right', 'bottom']}>
      <Stack.Screen options={{ title: saved.name }} />
      <View style={[styles.map, { borderColor: theme.border }]}>
        <LiveMap
          route={saved.route}
          destination={saved.destination}
          me={null}
          others={[]}
          fitSignal={0}
          insets={{ top: 24, bottom: 24 }}
        />
      </View>

      <View style={styles.summary}>
        <ThemedText type="subtitle" style={styles.title}>
          {saved.destination.name}
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          {saved.origin ? `From ${saved.origin.name} · ` : ''}
          {formatDistance(saved.route.distance)} · {formatDuration(saved.route.duration)}
          {saved.isShared ? ' · Shared' : ''}
        </ThemedText>
      </View>

      {error && (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      )}
      {notice && (
        <ThemedText type="small" themeColor="textSecondary">
          {notice}
        </ThemedText>
      )}

      <Button label="Start a group with this route" onPress={startGroup} loading={busy} icon={{ sf: 'person.3.fill', md: 'groups' }} />
      {mine ? (
        <>
          <View style={styles.row}>
            <Button
              label="Trip home"
              variant="secondary"
              onPress={reverse}
              disabled={busy}
              icon={{ sf: 'arrow.uturn.backward', md: 'u_turn_left' }}
              style={styles.flex}
            />
            <Button
              label="Share"
              variant="secondary"
              onPress={share}
              disabled={busy}
              icon={{ sf: 'square.and.arrow.up', md: 'share' }}
              style={styles.flex}
            />
          </View>
          <Button label="Delete route" variant="danger" onPress={confirmDelete} disabled={busy} />
        </>
      ) : (
        <Button label="Save a copy" variant="secondary" onPress={saveCopy} disabled={busy} />
      )}

      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.stepsTitle}>
        DIRECTIONS
      </ThemedText>
      {saved.route.steps.map((step, index) => (
        <View key={index} style={[styles.step, { borderColor: theme.border }]}>
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  map: { height: 240, borderRadius: Radius.md, overflow: 'hidden', borderWidth: 1 },
  summary: { gap: Spacing.one },
  title: { fontSize: 28, lineHeight: 36 },
  row: { flexDirection: 'row', gap: Spacing.two },
  flex: { flex: 1 },
  stepsTitle: { marginTop: Spacing.two },
  step: { flexDirection: 'row', gap: Spacing.three, paddingVertical: Spacing.two, borderBottomWidth: StyleSheet.hairlineWidth },
  stepText: { flex: 1 },
});
