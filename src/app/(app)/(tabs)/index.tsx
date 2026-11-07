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
import { formatDistance } from '@/lib/geo';
import type { Session } from '@/lib/types';
import { useProfile } from '@/providers/auth-provider';

export default function HomeScreen() {
  const theme = useTheme();
  const me = useProfile();
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setSessions(await backend.sessions.listMine());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your groups.');
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
        <View style={styles.header}>
          <View>
            <ThemedText type="small" themeColor="textSecondary">
              Hi, {me.displayName}
            </ThemedText>
            <ThemedText type="subtitle">Where do you{'\n'}want to go?</ThemedText>
          </View>
        </View>

        {backend.isMock && (
          <View style={[styles.banner, { backgroundColor: theme.accent }]}>
            <Icon sf="info.circle.fill" md="info" size={20} color="onAccent" />
            <ThemedText type="small" themeColor="onAccent" style={styles.bannerText}>
              Demo mode: data stays on this device. Add Supabase and Mapbox keys for the real thing.
            </ThemedText>
          </View>
        )}

        <View style={styles.actions}>
          <Button
            label="Start a group"
            icon={{ sf: 'plus', md: 'add' }}
            onPress={() => router.push('/session/create')}
            style={styles.flex}
          />
          <Button
            label="Join"
            variant="accent"
            icon={{ sf: 'qrcode.viewfinder', md: 'qr_code_scanner' }}
            onPress={() => router.push('/join')}
            style={styles.flex}
          />
        </View>

        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
          ACTIVE GROUPS
        </ThemedText>

        {error && (
          <ThemedText type="small" themeColor="danger">
            {error}
          </ThemedText>
        )}

        {sessions?.length === 0 && (
          <View style={[styles.empty, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <Icon sf="person.3.fill" md="groups" size={32} color="textSecondary" />
            <ThemedText type="smallBold">No active groups</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
              Start a group and invite your friends with a link or QR code, or join one with a code.
            </ThemedText>
          </View>
        )}

        {sessions?.map((session) => (
          <Pressable
            key={session.id}
            onPress={() => router.push({ pathname: '/session/[id]', params: { id: session.id } })}
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: theme.backgroundElement, borderColor: theme.border, opacity: pressed ? 0.8 : 1 },
            ]}>
            <View style={[styles.cardIcon, { backgroundColor: theme.accent }]}>
              <Icon sf="car.fill" md="directions_car" size={22} color="onAccent" />
            </View>
            <View style={styles.cardText}>
              <ThemedText type="smallBold">{session.name}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                {session.destination
                  ? `${session.destination.name}${session.route ? ` · ${formatDistance(session.route.distance)}` : ''}`
                  : 'No destination yet'}
                {session.leaderId === me.id ? ' · You lead' : ''}
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
  flex: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: BottomTabInset + Spacing.five },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  banner: { flexDirection: 'row', gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.md, alignItems: 'center' },
  bannerText: { flex: 1 },
  actions: { flexDirection: 'row', gap: Spacing.two },
  sectionTitle: { marginTop: Spacing.two },
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
