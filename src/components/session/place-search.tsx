import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { TextField } from '@/components/ui/text-field';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { searchPlaces } from '@/lib/mapbox-api';
import type { Coord, Place } from '@/lib/types';

type PlaceSearchProps = {
  onSelect: (place: Place) => void;
  label?: string;
  placeholder?: string;
  /** Bias results towards this point. */
  near?: Coord | null;
};

/** Debounced destination search with a tappable result list. */
export function PlaceSearch({ onSelect, label, placeholder = 'Search for a place', near }: PlaceSearchProps) {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  // The outcome of the most recent finished search, tagged with the query it answers.
  const [outcome, setOutcome] = useState<{ q: string; places: Place[]; error: string | null } | null>(null);

  const q = query.trim();
  const active = q.length >= 2;

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      searchPlaces(q, near)
        .then((places) => {
          if (!cancelled) setOutcome({ q, places, error: places.length === 0 ? 'No places found.' : null });
        })
        .catch((e: unknown) => {
          if (!cancelled) setOutcome({ q, places: [], error: e instanceof Error ? e.message : 'Search failed.' });
        });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q, active, near]);

  // Everything below is derived: no state is reset inside an effect.
  const current = active && outcome?.q === q ? outcome : null;
  const loading = active && current === null;
  const shownResults = current?.places ?? [];
  const shownError = current?.error ?? null;

  return (
    <View style={styles.wrapper}>
      <TextField
        label={label}
        value={query}
        onChangeText={setQuery}
        placeholder={placeholder}
        autoCorrect={false}
        returnKeyType="search"
      />
      {loading && <ActivityIndicator color={theme.primary} />}
      {shownError && (
        <ThemedText type="small" themeColor="textSecondary">
          {shownError}
        </ThemedText>
      )}
      {shownResults.map((place) => (
        <Pressable
          key={`${place.name}-${place.coord.latitude}-${place.coord.longitude}`}
          onPress={() => onSelect(place)}
          style={({ pressed }) => [
            styles.row,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
          ]}>
          <Icon sf="mappin.circle.fill" md="location_on" size={24} color="primary" />
          <View style={styles.rowText}>
            <ThemedText type="smallBold">{place.name}</ThemedText>
            {place.subtitle ? (
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                {place.subtitle}
              </ThemedText>
            ) : null}
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: Spacing.two },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  rowText: { flex: 1 },
});
