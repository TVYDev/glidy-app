import { router } from 'expo-router';
import { ArrowDown, ArrowUp, Circle, Flag, Plus, Trash2 } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View, type ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LiveMap } from '@/components/map/live-map';
import { StopBadge } from '@/components/map/stop-badge';
import { PlaceSearch } from '@/components/session/place-search';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card, IconBadge } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { formatDistance, formatDuration } from '@/lib/geo';
import { getOrigin } from '@/lib/location';
import { MAX_STOPS, planRoutes } from '@/lib/maps-api';
import { EDIT_ROUTE_KEY, type EditRoutePayload } from '@/lib/route-editor';
import { finish, payloadOf } from '@/lib/screen-results';
import type { Coord, Place, Route } from '@/lib/types';

type Outcome = { key: string; routes: Route[]; error: string | null };

/**
 * Where the group is going, step by step: the start, any stops in the order they are visited, and
 * the destination. Every change is routed again at once and shown on the map. Without stops Google
 * offers other ways to go, and the leader picks one. "Use this route" hands the result back.
 */
export default function EditRouteScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const payload = payloadOf<EditRoutePayload>(EDIT_ROUTE_KEY);

  const [origin, setOrigin] = useState<Coord | null>(payload?.origin ?? null);
  const [destination, setDestination] = useState<Place | null>(payload?.destination ?? null);
  const [stops, setStops] = useState<Place[]>(payload?.stops ?? []);
  const [adding, setAdding] = useState<'stop' | 'destination' | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [pick, setPick] = useState<{ key: string; index: number } | null>(null);
  const [fitSignal, setFitSignal] = useState(0);
  const scroll = useRef<ScrollViewInstance>(null);

  // Whatever way this screen closes, the caller's promise must settle.
  useEffect(() => () => finish(EDIT_ROUTE_KEY, null), []);
  useEffect(() => {
    if (!payload) router.back();
  }, [payload]);

  // The phone's position, unless the caller gave a start.
  useEffect(() => {
    if (origin) return;
    let cancelled = false;
    getOrigin().then((found) => {
      if (!cancelled) setOrigin(found.coord);
    });
    return () => {
      cancelled = true;
    };
  }, [origin]);

  const key =
    origin && destination
      ? [origin, ...stops.map((s) => s.coord), destination.coord]
          .map((c) => `${c.latitude.toFixed(5)},${c.longitude.toFixed(5)}`)
          .join('|')
      : null;

  // Route again whenever the points change. The answer is tagged with the points it is for, so
  // "loading" is derived and an old answer never shows for newer points.
  useEffect(() => {
    if (!key || !origin || !destination) return;
    let cancelled = false;
    planRoutes(origin, stops, destination, { alternatives: stops.length === 0 })
      .then((routes) => {
        if (cancelled) return;
        setOutcome({ key, routes, error: null });
        setFitSignal((n) => n + 1);
      })
      .catch((e: unknown) => {
        if (!cancelled) setOutcome({ key, routes: [], error: e instanceof Error ? e.message : t('routeEdit.error') });
      });
    return () => {
      cancelled = true;
    };
    // `origin`, `stops` and `destination` are all folded into `key`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, t]);

  if (!payload || !destination) return null;

  const answered = key != null && outcome?.key === key ? outcome : null;
  const routes = answered?.routes ?? [];
  const chosen = pick && pick.key === key ? Math.min(pick.index, Math.max(routes.length - 1, 0)) : 0;
  const route = routes[chosen] ?? null;
  const loading = key != null && answered === null;

  function move(index: number, by: -1 | 1) {
    const next = [...stops];
    const [moved] = next.splice(index, 1);
    next.splice(index + by, 0, moved);
    setStops(next);
  }

  /** Open the search and bring it into view; it sits below the list, behind the footer. */
  function startAdding(what: 'stop' | 'destination') {
    setAdding(what);
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 120);
  }

  function choose(place: Place) {
    if (adding === 'destination') setDestination(place);
    else setStops((current) => [...current, place]);
    setAdding(null);
  }

  function use() {
    if (!route || !destination) return;
    finish(EDIT_ROUTE_KEY, { destination, route });
    router.back();
  }

  const mapHeight = 280;

  return (
    <View style={[styles.fill, { backgroundColor: theme.background }]}>
      <View style={{ height: mapHeight }}>
        <LiveMap
          route={route}
          alternatives={routes.filter((_, i) => i !== chosen)}
          destination={destination}
          me={null}
          others={[]}
          fitSignal={fitSignal}
          insets={{ top: 24, bottom: 24 }}
        />
        {loading && (
          <View style={[styles.busy, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <ActivityIndicator color={theme.primaryDark} />
            <ThemedText type="small">{t('routeEdit.planning')}</ThemedText>
          </View>
        )}
      </View>

      <ScrollView
        ref={scroll}
        style={styles.fill}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        keyboardDismissMode="on-drag"
        contentContainerStyle={[styles.content, { paddingBottom: 120 + insets.bottom }]}>
        {answered?.error ? (
          <ThemedText type="small" themeColor="danger">
            {answered.error}
          </ThemedText>
        ) : route ? (
          <View style={styles.summary}>
            <ThemedText type="display" fontLanguage="en" style={styles.summaryText}>
              {formatDistance(route.distance)} · {formatDuration(route.duration)}
            </ThemedText>
          </View>
        ) : null}

        {routes.length > 1 && (
          <View style={styles.section}>
            <ThemedText type="smallBold">{t('routeEdit.options')}</ThemedText>
            {routes.map((option, index) => {
              const selected = index === chosen;
              return (
                <Pressable
                  key={index}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => key && setPick({ key, index })}
                  style={[
                    styles.option,
                    {
                      backgroundColor: selected ? theme.accent : theme.backgroundElement,
                      borderColor: selected ? theme.primary : theme.border,
                    },
                  ]}>
                  <View style={[styles.radio, { borderColor: selected ? theme.ink : theme.border }]}>
                    {selected && <View style={[styles.radioDot, { backgroundColor: theme.ink }]} />}
                  </View>
                  <View style={styles.optionText}>
                    <ThemedText type="smallBold">
                      {index === 0 ? t('routeEdit.recommended') : t('routeEdit.alternative', { n: index })}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {formatDistance(option.distance)} · {formatDuration(option.duration)}
                    </ThemedText>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        <View style={styles.section}>
          <ThemedText type="smallBold">{t('routeEdit.stops')}</ThemedText>
          <Card style={styles.list}>
            <View style={styles.row}>
              <View style={styles.marker}>
                <Icon icon={Circle} size={16} color="text" fill={theme.ink} />
              </View>
              <ThemedText type="small" style={styles.rowText}>
                {t('routeEdit.start')}
              </ThemedText>
            </View>

            {stops.map((stop, index) => (
              <View key={`${stop.name}-${index}`} style={[styles.row, styles.divided, { borderTopColor: theme.border }]}>
                <View style={styles.marker}>
                  <StopBadge number={index + 1} />
                </View>
                <View style={styles.rowText}>
                  <ThemedText type="smallBold" numberOfLines={1}>
                    {stop.name}
                  </ThemedText>
                  {stop.subtitle ? (
                    <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                      {stop.subtitle}
                    </ThemedText>
                  ) : null}
                </View>
                <RowButton label={t('routeEdit.moveUp')} icon={ArrowUp} disabled={index === 0} onPress={() => move(index, -1)} />
                <RowButton
                  label={t('routeEdit.moveDown')}
                  icon={ArrowDown}
                  disabled={index === stops.length - 1}
                  onPress={() => move(index, 1)}
                />
                <RowButton
                  label={t('routeEdit.remove')}
                  icon={Trash2}
                  danger
                  onPress={() => setStops((current) => current.filter((_, i) => i !== index))}
                />
              </View>
            ))}

            <View style={[styles.row, styles.divided, { borderTopColor: theme.border }]}>
              <View style={styles.marker}>
                <IconBadge icon={Flag} size={28} />
              </View>
              <View style={styles.rowText}>
                <ThemedText type="smallBold" numberOfLines={1}>
                  {destination.name}
                </ThemedText>
                {destination.subtitle ? (
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                    {destination.subtitle}
                  </ThemedText>
                ) : null}
              </View>
              <Button label={t('create.change')} variant="ghost" compact onPress={() => startAdding('destination')} />
            </View>
          </Card>

          {adding ? (
            <View style={styles.search}>
              <PlaceSearch
                label={adding === 'stop' ? t('routeEdit.addStop') : t('routeEdit.changeDestination')}
                near={origin}
                onSelect={choose}
                mapPick
                autoFocus
              />
              <Button label={t('common.cancel')} variant="ghost" compact onPress={() => setAdding(null)} />
            </View>
          ) : stops.length < MAX_STOPS ? (
            <Button label={t('routeEdit.addStop')} icon={Plus} variant="secondary" onPress={() => startAdding('stop')} />
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              {t('routeEdit.maxStops', { count: MAX_STOPS })}
            </ThemedText>
          )}

          {stops.length > 0 && (
            <ThemedText type="small" themeColor="textSecondary">
              {t('routeEdit.noAlternatives')}
            </ThemedText>
          )}
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, Spacing.three), backgroundColor: theme.background, borderTopColor: theme.border },
        ]}>
        <Button label={t('routeEdit.use')} onPress={use} disabled={!route || loading} />
      </View>
    </View>
  );
}

function RowButton({
  label,
  icon,
  onPress,
  disabled,
  danger,
}: {
  label: string;
  icon: typeof ArrowUp;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [styles.rowButton, { backgroundColor: theme.backgroundSelected, opacity: disabled ? 0.3 : pressed ? 0.7 : 1 }]}>
      <Icon icon={icon} size={16} color={danger ? 'danger' : 'text'} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three },
  busy: {
    position: 'absolute',
    top: Spacing.two,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  summary: { gap: Spacing.half },
  summaryText: { fontSize: 26, lineHeight: 32 },
  section: { gap: Spacing.two },
  option: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.lg, borderWidth: 1.5 },
  optionText: { flex: 1 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  list: { padding: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.two + Spacing.one, paddingHorizontal: Spacing.three },
  divided: { borderTopWidth: StyleSheet.hairlineWidth },
  marker: { width: 30, alignItems: 'center' },
  rowText: { flex: 1 },
  rowButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  search: { gap: Spacing.two },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: Spacing.three, borderTopWidth: StyleSheet.hairlineWidth },
});
