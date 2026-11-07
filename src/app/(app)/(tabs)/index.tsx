import { router, useFocusEffect } from 'expo-router';
import { Car, Info, Map, Plus, ScanLine, Search, Users } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Card, IconBadge, ListRow } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { LanguageToggle } from '@/components/ui/language-toggle';
import { Logo } from '@/components/ui/logo';
import { BottomTabInset, Radius, Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';
import { backend } from '@/lib/backend';
import { formatDistance } from '@/lib/geo';
import type { Session } from '@/lib/types';
import { useProfile } from '@/providers/auth-provider';

export default function HomeScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const me = useProfile();
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [routeCount, setRouteCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [groups, routes] = await Promise.all([backend.sessions.listMine(), backend.routes.list()]);
      setSessions(groups);
      setRouteCount(routes.length);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('home.loadError'));
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
        <View style={styles.header}>
          <Logo />
          <LanguageToggle compact />
        </View>

        <View style={styles.titleBlock}>
          <ThemedText type="small" themeColor="textSecondary">
            {t('home.hi', { name: me.displayName })}
          </ThemedText>
          <ThemedText type="subtitle">{t('home.title')}</ThemedText>
        </View>

        <Pressable
          accessibilityRole="search"
          onPress={() => router.push('/session/create')}
          style={({ pressed }) => [
            styles.search,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border, opacity: pressed ? 0.85 : 1 },
          ]}>
          <Icon icon={Search} size={20} color="textSecondary" />
          <ThemedText themeColor="textSecondary" style={styles.searchText}>
            {t('home.search')}
          </ThemedText>
        </Pressable>

        <View style={styles.stats}>
          <View style={[styles.stat, { backgroundColor: theme.primary }]}>
            <View style={[styles.statIcon, { backgroundColor: theme.ink }]}>
              <Icon icon={Users} size={20} color="onInk" />
            </View>
            <ThemedText style={styles.statNumber} themeColor="onPrimary">
              {sessions?.length ?? 0}
            </ThemedText>
            <ThemedText type="small" themeColor="onPrimary">
              {t('home.statGroups')}
            </ThemedText>
          </View>
          <View style={[styles.stat, { backgroundColor: theme.ink }]}>
            <View style={[styles.statIcon, { backgroundColor: theme.primary }]}>
              <Icon icon={Map} size={20} color="onPrimary" />
            </View>
            <ThemedText style={styles.statNumber} themeColor="onInk">
              {routeCount ?? 0}
            </ThemedText>
            <ThemedText type="small" themeColor="onInk">
              {t('home.statRoutes')}
            </ThemedText>
          </View>
        </View>

        <View style={styles.actions}>
          <ListRow
            icon={Plus}
            title={t('home.start')}
            subtitle={t('home.startSub')}
            onPress={() => router.push('/session/create')}
          />
          <ListRow
            icon={ScanLine}
            title={t('home.join')}
            subtitle={t('home.joinSub')}
            onPress={() => router.push('/join')}
          />
        </View>

        {backend.isMock && (
          <Card style={[styles.banner, { backgroundColor: theme.accent, borderColor: theme.border }]}>
            <Icon icon={Info} size={20} color="primaryDark" />
            <ThemedText type="small" style={styles.bannerText}>
              {t('home.demoBanner')}
            </ThemedText>
          </Card>
        )}

        <ThemedText type="smallBold" style={styles.sectionTitle}>
          {t('home.active')}
        </ThemedText>

        {error && (
          <ThemedText type="small" themeColor="danger">
            {error}
          </ThemedText>
        )}

        {sessions?.length === 0 && (
          <Card style={styles.empty}>
            <IconBadge icon={Users} size={52} tone="soft" />
            <ThemedText type="smallBold">{t('home.emptyTitle')}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
              {t('home.emptyBody')}
            </ThemedText>
          </Card>
        )}

        {sessions?.map((session) => (
          <ListRow
            key={session.id}
            icon={Car}
            title={session.name}
            subtitle={`${
              session.destination
                ? `${session.destination.name}${session.route ? ` · ${formatDistance(session.route.distance)}` : ''}`
                : t('home.noDestination')
            }${session.leaderId === me.id ? ` · ${t('home.youLead')}` : ''}`}
            onPress={() => router.push({ pathname: '/session/[id]', params: { id: session.id } })}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: BottomTabInset + Spacing.four },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleBlock: { gap: Spacing.one, marginTop: Spacing.two },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 56,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  searchText: { flex: 1 },
  stats: { flexDirection: 'row', gap: Spacing.three },
  stat: { flex: 1, borderRadius: Radius.lg, padding: Spacing.three, gap: Spacing.one },
  statIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  statNumber: { fontSize: 40, lineHeight: 46, fontWeight: 800, marginTop: Spacing.two },
  actions: { gap: Spacing.two },
  banner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  bannerText: { flex: 1 },
  sectionTitle: { marginTop: Spacing.two, fontSize: 18, lineHeight: 24 },
  empty: { alignItems: 'center', gap: Spacing.two, padding: Spacing.four },
  emptyText: { textAlign: 'center' },
});
