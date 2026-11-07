import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PlaceSearch } from '@/components/session/place-search';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { backend } from '@/lib/backend';
import { getOrigin } from '@/lib/location';
import { getRoute } from '@/lib/mapbox-api';
import type { Place } from '@/lib/types';

export default function CreateSessionScreen() {
  const theme = useTheme();
  const [name, setName] = useState('Road trip');
  const [destination, setDestination] = useState<Place | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setLoading(true);
    setError(null);
    try {
      let route = null;
      if (destination) {
        const origin = await getOrigin();
        route = await getRoute(origin.coord, destination.coord);
      }
      const session = await backend.sessions.create({ name, destination, route });
      router.replace({ pathname: '/session/[id]', params: { id: session.id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start the group.');
      setLoading(false);
    }
  }

  return (
    <Screen scroll edges={['left', 'right', 'bottom']}>
      <ThemedText type="small" themeColor="textSecondary">
        You will be the group leader: you pick the route and everyone follows. You can invite friends after the group
        starts.
      </ThemedText>

      <TextField label="Group name" value={name} onChangeText={setName} />

      {destination ? (
        <View style={styles.field}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Destination
          </ThemedText>
          <View style={[styles.chosen, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <Icon sf="mappin.circle.fill" md="location_on" size={24} color="primary" />
            <View style={styles.chosenText}>
              <ThemedText type="smallBold">{destination.name}</ThemedText>
              {destination.subtitle ? (
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                  {destination.subtitle}
                </ThemedText>
              ) : null}
            </View>
            <Button label="Change" variant="ghost" compact onPress={() => setDestination(null)} />
          </View>
        </View>
      ) : (
        <PlaceSearch label="Destination (optional)" onSelect={setDestination} />
      )}

      {error && (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      )}

      <Button label="Start group" onPress={start} loading={loading} disabled={name.trim().length === 0} />
      {!destination && (
        <ThemedText type="small" themeColor="textSecondary">
          No destination yet? You can set or change it from the map at any time.
        </ThemedText>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  field: { gap: Spacing.two },
  chosen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  chosenText: { flex: 1 },
});
