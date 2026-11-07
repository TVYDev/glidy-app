import { router } from 'expo-router';
import { MapPin } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PlaceSearch } from '@/components/session/place-search';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card, IconBadge } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n';
import { backend } from '@/lib/backend';
import { getOrigin } from '@/lib/location';
import { getRoute } from '@/lib/mapbox-api';
import type { Place } from '@/lib/types';

export default function CreateSessionScreen() {
  const { t } = useI18n();
  const [name, setName] = useState(t('create.defaultName'));
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
      setError(e instanceof Error ? e.message : t('create.error'));
      setLoading(false);
    }
  }

  return (
    <Screen scroll edges={['left', 'right', 'bottom']}>
      <ThemedText type="small" themeColor="textSecondary">
        {t('create.intro')}
      </ThemedText>

      <TextField label={t('create.groupName')} value={name} onChangeText={setName} />

      {destination ? (
        <View style={styles.field}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            {t('create.destination')}
          </ThemedText>
          <Card style={styles.chosen}>
            <IconBadge icon={MapPin} size={40} />
            <View style={styles.chosenText}>
              <ThemedText type="smallBold">{destination.name}</ThemedText>
              {destination.subtitle ? (
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                  {destination.subtitle}
                </ThemedText>
              ) : null}
            </View>
            <Button label={t('create.change')} variant="ghost" compact onPress={() => setDestination(null)} />
          </Card>
        </View>
      ) : (
        <PlaceSearch label={t('create.destinationOptional')} onSelect={setDestination} />
      )}

      {error && (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      )}

      <Button label={t('create.start')} onPress={start} loading={loading} disabled={name.trim().length === 0} />
      {!destination && (
        <ThemedText type="small" themeColor="textSecondary">
          {t('create.hint')}
        </ThemedText>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  field: { gap: Spacing.two },
  chosen: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  chosenText: { flex: 1 },
});
