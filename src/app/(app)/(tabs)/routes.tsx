import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { BottomTabInset, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { backend } from '@/lib/backend';
import { formatDistance, formatDuration } from '@/lib/geo';
import type { SavedRoute } from '@/lib/types';

export default function RoutesScreen() {
  const theme = useTheme();
  const [routes, setRoutes] = useState<SavedRoute[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setRoutes(await backend.routes.list());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your routes.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.fill, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}>
        <ThemedText type="subtitle">Saved routes</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Keep routes for future trips, reverse them for the trip home, and share them with friends.
        </ThemedText>

        <Button
          label="Plan a route"
          icon={{ sf: 'plus', md: 'add' }}
          onPress={() => router.push('/routes/new')}
        />

        {error && (
          <ThemedText type="small" themeColor="danger">
            {error}
          </ThemedText>
        )}

        {routes?.length === 0 && (
          <View style={[styles.empty, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <Icon sf="bookmark.fill" md="bookmark" size={32} color="textSecondary" />
            <ThemedText type="smallBold">Nothing saved yet</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
              Plan a route here, or save the route of a group trip from its map.
            </ThemedText>
          </View>
        )}

        {routes?.map((r) => (
          <Pressable
            key={r.id}
            onPress={() => router.push({ pathname: '/routes/[id]', params: { id: r.id } })}
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: theme.backgroundElement, borderColor: theme.border, opacity: pressed ? 0.8 : 1 },
            ]}>
            <View style={[styles.cardIcon, { backgroundColor: theme.accent }]}>
              <Icon sf="signpost.right.fill" md="signpost" size={22} color="onAccent" />
            </View>
            <View style={styles.cardText}>
              <ThemedText type="smallBold">{r.name}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                {r.origin ? `${r.origin.name} → ` : ''}
                {r.destination.name} · {formatDistance(r.route.distance)} · {formatDuration(r.route.duration)}
                {r.isShared ? ' · Shared' : ''}
              </ThemedText>
            </View>
            <Icon sf="chevron.right" md="chevron_right" size={18} color="textSecondary" />
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: BottomTabInset + Spacing.five },
  empty: { alignItems: 'center', gap: Spacing.two, padding: Spacing.four, borderRadius: Radius.md, borderWidth: 1 },
  emptyText: { textAlign: 'center' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  cardIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  cardText: { flex: 1 },
});
