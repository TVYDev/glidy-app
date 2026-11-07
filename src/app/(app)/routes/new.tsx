import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PlaceSearch } from '@/components/session/place-search';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { backend } from '@/lib/backend';
import { formatDistance, formatDuration } from '@/lib/geo';
import { getOrigin } from '@/lib/location';
import { getRoute } from '@/lib/mapbox-api';
import type { Place, Route } from '@/lib/types';

/** Plan a route from your current position to a place and save it for later. */
export default function NewRouteScreen() {
  const theme = useTheme();
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
      const start: Place = { name: 'My location', coord: here.coord };
      const planned = await getRoute(start.coord, place.coord);
      setOrigin(start);
      setDestination(place);
      setRoute(planned);
      setName(`To ${place.name}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not plan that route.');
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
      setError(e instanceof Error ? e.message : 'Could not save the route.');
      setLoading(false);
    }
  }

  return (
    <Screen scroll edges={['left', 'right', 'bottom']}>
      {route && destination ? (
        <>
          <View style={[styles.summary, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <ThemedText type="smallBold">{destination.name}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {formatDistance(route.distance)} · {formatDuration(route.duration)} · {route.steps.length} steps
            </ThemedText>
          </View>
          <TextField label="Route name" value={name} onChangeText={setName} />
          {error && (
            <ThemedText type="small" themeColor="danger">
              {error}
            </ThemedText>
          )}
          <Button label="Save route" onPress={save} loading={loading} disabled={name.trim().length === 0} />
          <Button
            label="Choose a different place"
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
            Pick where you want to go. The route starts from your current location.
          </ThemedText>
          <PlaceSearch label="Destination" onSelect={choose} />
          {loading && (
            <ThemedText type="small" themeColor="textSecondary">
              Planning route…
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
  summary: { padding: Spacing.three, borderRadius: Radius.md, borderWidth: 1, gap: Spacing.one },
});
