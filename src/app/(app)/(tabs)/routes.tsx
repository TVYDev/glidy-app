import { router, useFocusEffect } from 'expo-router';
import { Bookmark, Plus, Route } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card, IconBadge, ListRow } from '@/components/ui/card';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';
import { backend } from '@/lib/backend';
import { formatDistance, formatDuration } from '@/lib/geo';
import type { SavedRoute } from '@/lib/types';

export default function RoutesScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const [routes, setRoutes] = useState<SavedRoute[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setRoutes(await backend.routes.list());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('routes.loadError'));
    }
  }, [t]);

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
        <ThemedText type="subtitle">{t('routes.title')}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {t('routes.subtitle')}
        </ThemedText>

        <Button label={t('routes.plan')} icon={Plus} onPress={() => router.push('/routes/new')} />

        {error && (
          <ThemedText type="small" themeColor="danger">
            {error}
          </ThemedText>
        )}

        {routes?.length === 0 && (
          <Card style={styles.empty}>
            <IconBadge icon={Bookmark} size={52} tone="soft" />
            <ThemedText type="smallBold">{t('routes.emptyTitle')}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
              {t('routes.emptyBody')}
            </ThemedText>
          </Card>
        )}

        {routes?.map((r) => (
          <ListRow
            key={r.id}
            icon={Route}
            title={r.name}
            subtitle={`${r.origin ? `${r.origin.name} → ` : ''}${r.destination.name} · ${formatDistance(
              r.route.distance,
            )} · ${formatDuration(r.route.duration)}${r.isShared ? ` · ${t('routes.shared')}` : ''}`}
            onPress={() => router.push({ pathname: '/routes/[id]', params: { id: r.id } })}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: BottomTabInset + Spacing.four },
  empty: { alignItems: 'center', gap: Spacing.two, padding: Spacing.four },
  emptyText: { textAlign: 'center' },
});
