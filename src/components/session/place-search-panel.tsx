import { ArrowLeft, Clock, Map as MapIcon, MapPin, Search, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View, type TextInputInstance } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconBadge } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Radius, Spacing, fontFamilyFor, scaleText } from '@/constants/theme';
import { useTextScale } from '@/hooks/use-settings';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { distanceBetween, formatDistance } from '@/lib/geo';
import { getOrigin } from '@/lib/location';
import { hasMaps, newSessionToken, resolveSuggestion, searchPlaces, type PlaceSuggestion } from '@/lib/maps-api';
import { pickPlaceOnMap } from '@/lib/place-picker';
import { storage } from '@/lib/storage';
import type { Coord, Place } from '@/lib/types';

type PlaceSearchProps = {
  onSelect: (place: Place) => void;
  label?: string;
  placeholder?: string;
  /** Bias results towards this point and show how far each one is from it. */
  near?: Coord | null;
  /** Offer "Choose on map" in the list. */
  mapPick?: boolean;
  /** Put the cursor in the box straight away. */
  autoFocus?: boolean;
  /** Shows a back arrow in place of the magnifier; used when the panel is a full screen of its own. */
  onBack?: () => void;
};

const RECENTS_KEY = 'glidy.recentPlaces.v1';
const MAX_RECENTS = 5;

const sameSpot = (a: Place, b: Place) =>
  a.name === b.name &&
  Math.abs(a.coord.latitude - b.coord.latitude) < 1e-4 &&
  Math.abs(a.coord.longitude - b.coord.longitude) < 1e-4;

/**
 * Destination search: a search bar with a clear button, recent places while it is empty, results
 * with their distance, and "Choose on map" always in reach (first when nothing is typed, last
 * under the results), so a place that cannot be found by name is never a dead end.
 */
export function PlaceSearchPanel({
  onSelect,
  label,
  placeholder,
  near: nearProp,
  mapPick,
  autoFocus,
  onBack,
}: PlaceSearchProps) {
  const theme = useTheme();
  const { t, language } = useI18n();
  const scale = useTextScale();
  const input = useRef<TextInputInstance>(null);
  const [query, setQuery] = useState('');
  // Without a point from the caller, bias to where the phone is: otherwise "Central Market" finds
  // one on the other side of the world before the one down the road.
  const [here, setHere] = useState<Coord | null>(null);
  useEffect(() => {
    if (nearProp) return;
    let cancelled = false;
    getOrigin().then((origin) => {
      if (!cancelled && !origin.isFallback) setHere(origin.coord);
    });
    return () => {
      cancelled = true;
    };
  }, [nearProp]);
  const near = nearProp ?? here;
  const [recents, setRecents] = useState<Place[]>(() => storage.get<Place[]>(RECENTS_KEY, []));
  // The outcome of the most recent finished search, tagged with the query it answers.
  const [outcome, setOutcome] = useState<{ q: string; places: PlaceSuggestion[]; error: string | null } | null>(null);
  // Google bills the typing and the final pick as one "session"; a new one starts after each pick.
  const session = useRef<string | null>(null);
  const [resolving, setResolving] = useState<string | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);

  const q = query.trim();
  const active = q.length >= 2;

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      session.current ??= newSessionToken();
      searchPlaces(q, near, session.current)
        .then((places) => {
          if (!cancelled) setOutcome({ q, places, error: places.length === 0 ? t('search.none') : null });
        })
        .catch((e: unknown) => {
          if (!cancelled) setOutcome({ q, places: [], error: e instanceof Error ? e.message : t('search.failed') });
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q, active, near, t]);

  // Everything below is derived: no state is reset inside an effect.
  const current = active && outcome?.q === q ? outcome : null;
  const loading = active && current === null;
  const results = current?.places ?? [];
  const error = current?.error ?? null;
  const showMapRow = !!mapPick && hasMaps;

  /** A suggestion from the list: fetch its exact point, then use it. */
  async function chooseSuggestion(suggestion: PlaceSuggestion) {
    setResolving(suggestion.id);
    setPickError(null);
    try {
      const place = await resolveSuggestion(suggestion, session.current ?? undefined);
      session.current = null;
      choose(place);
    } catch (e) {
      setPickError(e instanceof Error ? e.message : t('search.failed'));
    } finally {
      setResolving(null);
    }
  }

  function choose(place: Place) {
    const next = [place, ...recents.filter((r) => !sameSpot(r, place))].slice(0, MAX_RECENTS);
    setRecents(next);
    storage.set(RECENTS_KEY, next);
    onSelect(place);
  }

  async function chooseOnMap() {
    const place = await pickPlaceOnMap(near);
    if (place) choose(place);
  }

  return (
    <View style={styles.wrapper}>
      {label ? (
        <ThemedText type="smallBold" themeColor="textSecondary">
          {label}
        </ThemedText>
      ) : null}

      <View style={[styles.bar, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        {onBack ? (
          <Pressable accessibilityRole="button" accessibilityLabel={t('session.back')} hitSlop={12} onPress={onBack}>
            <Icon icon={ArrowLeft} size={22} />
          </Pressable>
        ) : (
          <Icon icon={Search} size={20} color="textSecondary" />
        )}
        <TextInput
          ref={input}
          value={query}
          onChangeText={setQuery}
          placeholder={placeholder ?? t('search.placeholder')}
          placeholderTextColor={theme.textSecondary}
          selectionColor={theme.primary}
          autoFocus={autoFocus}
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="never"
          style={[
            styles.input,
            { color: theme.text, fontFamily: fontFamilyFor(language, 500), fontSize: scaleText(16, scale) },
          ]}
        />
        {loading ? (
          <ActivityIndicator color={theme.primaryDark} />
        ) : query.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('search.clear')}
            hitSlop={10}
            onPress={() => {
              setQuery('');
              input.current?.focus();
            }}
            style={[styles.clear, { backgroundColor: theme.backgroundSelected }]}
          >
            <Icon icon={X} size={14} />
          </Pressable>
        ) : null}
      </View>

      {/* Nothing typed yet: the map first, then places used before. */}
      {!active && showMapRow && <MapRow onPress={chooseOnMap} hint={t('search.onMapHint')} />}
      {!active && recents.length > 0 && (
        <>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.heading}>
            {t('search.recent')}
          </ThemedText>
          {recents.map((place) => (
            <PlaceRow
              key={`r-${place.name}-${place.coord.latitude}`}
              place={place}
              distance={near ? distanceBetween(near, place.coord) : undefined}
              recent
              onPress={() => choose(place)}
            />
          ))}
        </>
      )}

      {results.map((suggestion) => (
        <PlaceRow
          key={suggestion.id}
          place={suggestion}
          distance={
            suggestion.distanceMeters ??
            (suggestion.coord && near ? distanceBetween(near, suggestion.coord) : undefined)
          }
          busy={resolving === suggestion.id}
          onPress={() => chooseSuggestion(suggestion)}
        />
      ))}
      {pickError && (
        <ThemedText type="small" themeColor="danger">
          {pickError}
        </ThemedText>
      )}

      {error && (
        <View style={styles.empty}>
          <ThemedText type="smallBold">{error}</ThemedText>
          {showMapRow && (
            <ThemedText type="small" themeColor="textSecondary">
              {t('search.noneHint')}
            </ThemedText>
          )}
        </View>
      )}
      {active && showMapRow && !loading && <MapRow onPress={chooseOnMap} hint={t('search.onMapHint')} />}
    </View>
  );
}

function PlaceRow({
  place,
  distance,
  recent,
  busy,
  onPress,
}: {
  place: { name: string; subtitle?: string };
  distance?: number;
  recent?: boolean;
  busy?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <IconBadge icon={recent ? Clock : MapPin} size={40} tone="soft" />
      <View style={styles.rowText}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {place.name}
        </ThemedText>
        {place.subtitle ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {place.subtitle}
          </ThemedText>
        ) : null}
      </View>
      {busy ? (
        <ActivityIndicator color={theme.primaryDark} />
      ) : distance != null ? (
        <ThemedText type="small" themeColor="textSecondary" fontLanguage="en">
          {formatDistance(distance)}
        </ThemedText>
      ) : null}
    </Pressable>
  );
}

function MapRow({ onPress, hint }: { onPress: () => void; hint: string }) {
  const theme = useTheme();
  const { t } = useI18n();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: theme.accent, borderColor: theme.primary, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <IconBadge icon={MapIcon} size={40} />
      <View style={styles.rowText}>
        <ThemedText type="smallBold">{t('search.onMap')}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {hint}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: Spacing.two },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 56,
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
  },
  input: { flex: 1, minHeight: 52 },
  clear: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  heading: { marginTop: Spacing.one },
  empty: { gap: Spacing.half, paddingVertical: Spacing.one },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  rowText: { flex: 1 },
});
