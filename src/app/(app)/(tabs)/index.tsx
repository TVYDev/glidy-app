import { router, useFocusEffect } from 'expo-router';
import { Info, Plus, ScanLine } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { EmptyArt, RouteMotif } from '@/components/ui/brand-art';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { LanguageToggle } from '@/components/ui/language-toggle';
import { Logo } from '@/components/ui/logo';
import { TripCard } from '@/components/ui/trip-card';
import { BottomTabInset, Radius, Spacing } from '@/constants/theme';
import { useTextScale } from '@/hooks/use-settings';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { backend } from '@/lib/backend';
import { formatDistance } from '@/lib/geo';
import type { Session } from '@/lib/types';
import { useProfile } from '@/providers/auth-provider';

export default function HomeScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const me = useProfile();
  const textScale = useTextScale();
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

  // With big text two pills side by side no longer fit, so they stack.
  const stackButtons = textScale > 1.1;

  return (
    <SafeAreaView edges={['top']} style={[styles.fill, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primaryDark} />}>
        <View style={styles.header}>
          <Logo />
          <LanguageToggle compact />
        </View>

        {/* Hero: the one big call to action, with the Glidy route motif drawn behind the headline. */}
        <View style={[styles.hero, { backgroundColor: theme.primary }]}>
          <View style={styles.greeting}>
            <Avatar userId={me.id} name={me.displayName} avatar={me.avatar} size={36} ring={theme.ink} />
            <ThemedText type="smallBold" themeColor="onPrimary" numberOfLines={1} style={styles.greetingText}>
              {t('home.hi', { name: me.displayName })}
            </ThemedText>
          </View>
          <ThemedText type="display" themeColor="onPrimary" style={styles.heroTitle}>
            {t('home.hero')}
          </ThemedText>
          <View style={styles.motif} pointerEvents="none">
            <RouteMotif width={300} height={140} color={theme.ink} />
          </View>
          <View style={[styles.heroButtons, stackButtons && styles.heroButtonsStacked]}>
            <Button
              label={t('home.start')}
              variant="ink"
              icon={Plus}
              onPress={() => router.push('/session/create')}
              style={styles.flex}
            />
            <Button
              label={t('home.joinShort')}
              variant="secondary"
              icon={ScanLine}
              onPress={() => router.push('/join')}
              style={stackButtons ? styles.flex : styles.joinButton}
            />
          </View>
        </View>

        {/* Stats: one ink strip instead of two separate tiles. */}
        <View style={[styles.stats, { backgroundColor: theme.ink, borderColor: theme.border }]}>
          <View style={styles.stat}>
            <ThemedText type="display" fontLanguage="en" style={[styles.statNumber, { color: theme.primary }]}>
              {sessions?.length ?? 0}
            </ThemedText>
            <ThemedText type="small" themeColor="onInk" numberOfLines={2}>
              {t('home.statGroups')}
            </ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.textSecondary }]} />
          <View style={styles.stat}>
            <ThemedText type="display" fontLanguage="en" style={[styles.statNumber, { color: theme.primary }]}>
              {routeCount ?? 0}
            </ThemedText>
            <ThemedText type="small" themeColor="onInk" numberOfLines={2}>
              {t('home.statRoutes')}
            </ThemedText>
          </View>
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
            <EmptyArt kind="groups" />
            <ThemedText type="smallBold" style={styles.emptyTitle}>
              {t('home.emptyTitle')}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
              {t('home.emptyBody')}
            </ThemedText>
          </Card>
        )}

        {sessions?.map((session) => (
          <TripCard
            key={session.id}
            title={session.name}
            geometry={session.route?.geometry}
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
  flex: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: BottomTabInset + Spacing.four },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hero: { borderRadius: Radius.xl, padding: Spacing.four, overflow: 'hidden', gap: Spacing.two },
  greeting: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  greetingText: { flex: 1 },
  heroTitle: { marginTop: Spacing.one },
  motif: { alignItems: 'center', marginVertical: -Spacing.one, opacity: 0.85 },
  heroButtons: { flexDirection: 'row', gap: Spacing.two },
  heroButtonsStacked: { flexDirection: 'column' },
  joinButton: { paddingHorizontal: Spacing.four },
  stats: { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.three },
  stat: { flex: 1, paddingHorizontal: Spacing.two, gap: Spacing.half },
  statNumber: { fontSize: 44, lineHeight: 50 },
  statDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', opacity: 0.5 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  bannerText: { flex: 1 },
  sectionTitle: { marginTop: Spacing.two, fontSize: 18, lineHeight: 24 },
  empty: { alignItems: 'center', gap: Spacing.two, padding: Spacing.four },
  emptyTitle: { marginTop: Spacing.two },
  emptyText: { textAlign: 'center' },
});
