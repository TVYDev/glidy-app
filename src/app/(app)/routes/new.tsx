import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { PlaceSearch } from '@/components/session/place-search';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n';
import { backend } from '@/lib/backend';
import { formatDistance, formatDuration } from '@/lib/geo';
import { getOrigin } from '@/lib/location';
import { getRoute } from '@/lib/mapbox-api';
import type { Place, Route } from '@/lib/types';

/** Plan a route from your current position to a place and save it for later. */
export default function NewRouteScreen() {
  const { t } = useI18n();
  const [origin, setOrigin] = useState<Place | null>(null);
  const [destination, setDestination] = useState<Place | null>(null);
  const [route, setRoute] = useState<Route | null>(null);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function choose(place: Place) {
    setLoading(true);
    setError(null);
    try {
      const here = await getOrigin();
      const start: Place = { name: t('routeNew.myLocation'), coord: here.coord };
      const planned = await getRoute(start.coord, place.coord);
      setOrigin(start);
      setDestination(place);
      setRoute(planned);
      setName(t('routeNew.defaultName', { place: place.name }));
    } catch (e) {
      setError(e instanceof Error ? e.message : t('routeNew.planError'));
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!destination || !route) return;
    setLoading(true);
    setError(null);
    try {
      const saved = await backend.routes.save({ name, origin, destination, route });
      router.replace({ pathname: '/routes/[id]', params: { id: saved.id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : t('routeNew.saveError'));
      setLoading(false);
    }
  }

  return (
    <Screen scroll edges={['left', 'right', 'bottom']}>
      {route && destination ? (
        <>
          <Card style={styles.summary}>
            <ThemedText type="smallBold" style={styles.summaryTitle}>
              {destination.name}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {formatDistance(route.distance)} · {formatDuration(route.duration)} ·{' '}
              {t('routeNew.steps', { count: route.steps.length })}
            </ThemedText>
          </Card>
          <TextField label={t('routeNew.name')} value={name} onChangeText={setName} />
          {error && (
            <ThemedText type="small" themeColor="danger">
              {error}
            </ThemedText>
          )}
          <Button label={t('routeNew.save')} onPress={save} loading={loading} disabled={name.trim().length === 0} />
          <Button
            label={t('routeNew.another')}
            variant="ghost"
            onPress={() => {
              setRoute(null);
              setDestination(null);
            }}
          />
        </>
      ) : (
        <>
          <ThemedText type="small" themeColor="textSecondary">
            {t('routeNew.intro')}
          </ThemedText>
          <PlaceSearch label={t('routeNew.destination')} onSelect={choose} />
          {loading && (
            <ThemedText type="small" themeColor="textSecondary">
              {t('routeNew.planning')}
            </ThemedText>
          )}
          {error && (
            <ThemedText type="small" themeColor="danger">
              {error}
            </ThemedText>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { gap: Spacing.one },
  summaryTitle: { fontSize: 18, lineHeight: 24 },
});
