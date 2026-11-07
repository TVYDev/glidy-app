import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LiveMap } from '@/components/map/live-map';
import { MemberStrip } from '@/components/session/member-strip';
import { NavBanner } from '@/components/session/nav-banner';
import { PlaceSearch } from '@/components/session/place-search';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Radius, Spacing } from '@/constants/theme';
import { useSessionLive } from '@/hooks/use-session-live';
import { useTheme } from '@/hooks/use-theme';
import { backend } from '@/lib/backend';
import { formatDistance, formatDuration } from '@/lib/geo';
import type { MemberLocation } from '@/lib/types';

const SHEET_HEIGHT = 330;

export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const live = useSessionLive(id);
  const { session, me, myLocation } = live;

  const [fitSignal, setFitSignal] = useState(0);
  const [choosingDestination, setChoosingDestination] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  if (!session) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        {live.error ? (
          <>
            <ThemedText themeColor="danger" style={styles.centerText}>
              {live.error}
            </ThemedText>
            <Button label="Back" variant="secondary" onPress={() => router.back()} />
          </>
        ) : (
          <ActivityIndicator color={theme.primary} />
        )}
      </View>
    );
  }

  if (session.status === 'ended') {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Icon sf="flag.checkered" md="flag" size={40} color="primary" />
        <ThemedText type="subtitle">This group has ended</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.centerText}>
          {session.name} is finished. Start a new group any time.
        </ThemedText>
        <Button label="Back home" onPress={() => router.replace('/')} />
      </View>
    );
  }

  const locations: Record<string, MemberLocation | undefined> = { ...live.othersById };
  if (myLocation) locations[me.id] = myLocation;

  const route = session.route;
  const topInset = insets.top + (route ? 150 : 72);

  function confirmEnd() {
    Alert.alert('End this group?', 'Everyone will stop sharing and the group closes for all members.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End group',
        style: 'destructive',
        onPress: async () => {
          await live.endSession();
          router.replace('/');
        },
      },
    ]);
  }

  function confirmLeave() {
    Alert.alert('Leave this group?', 'You will stop sharing your location with the group.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          await live.leaveSession();
          router.replace('/');
        },
      },
    ]);
  }

  async function saveRoute() {
    if (!session?.route || !session.destination) return;
    setNotice(null);
    try {
      const [lng, lat] = session.route.geometry[0];
      await backend.routes.save({
        name: `${session.name} → ${session.destination.name}`,
        origin: { name: 'Starting point', coord: { latitude: lat, longitude: lng } },
        destination: session.destination,
        route: session.route,
      });
      setNotice('Route saved to your Routes tab.');
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Could not save the route.');
    }
  }

  return (
    <View style={[styles.fill, { backgroundColor: theme.background }]}>
      <LiveMap
        route={route}
        destination={session.destination}
        me={myLocation}
        others={live.others}
        fitSignal={fitSignal}
        insets={{ top: topInset, bottom: SHEET_HEIGHT + insets.bottom }}
      />

      <View style={[styles.top, { paddingTop: insets.top + Spacing.two }]} pointerEvents="box-none">
        <View style={styles.topRow}>
          <RoundButton label="Back" sf="chevron.left" md="arrow_back" onPress={() => router.back()} />
          <View style={[styles.titlePill, { backgroundColor: theme.backgroundElement }]}>
            <View
              style={[
                styles.dot,
                { backgroundColor: live.status === 'live' ? theme.primary : live.status === 'connecting' ? theme.accent : theme.danger },
              ]}
            />
            <ThemedText type="smallBold" numberOfLines={1} style={styles.titleText}>
              {session.name}
            </ThemedText>
          </View>
          <RoundButton
            label="Invite"
            sf="person.badge.plus"
            md="person_add"
            onPress={() => router.push({ pathname: '/session/invite', params: { id: session.id } })}
          />
        </View>
        {route && <NavBanner route={route} position={myLocation?.coord ?? null} />}
      </View>

      <View
        style={[
          styles.sheet,
          { backgroundColor: theme.background, paddingBottom: insets.bottom + Spacing.two, maxHeight: SHEET_HEIGHT + insets.bottom },
        ]}>
        <ScrollView contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled">
          {choosingDestination ? (
            <>
              <PlaceSearch
                label="Where is the group heading?"
                near={myLocation?.coord}
                onSelect={async (place) => {
                  setChoosingDestination(false);
                  await live.setDestination(place);
                  setFitSignal((n) => n + 1);
                }}
              />
              <Button label="Cancel" variant="ghost" compact onPress={() => setChoosingDestination(false)} />
            </>
          ) : (
            <>
              <View style={styles.destRow}>
                <View style={[styles.destIcon, { backgroundColor: theme.accent }]}>
                  <Icon sf="flag.fill" md="flag" size={18} color="onAccent" />
                </View>
                <View style={styles.destText}>
                  <ThemedText type="smallBold" numberOfLines={1}>
                    {session.destination ? session.destination.name : 'No destination yet'}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {route
                      ? `${formatDistance(route.distance)} · ${formatDuration(route.duration)}`
                      : live.isLeader
                        ? 'Set one so everyone can follow the route'
                        : 'Waiting for the leader to set one'}
                  </ThemedText>
                </View>
                {live.busy && <ActivityIndicator color={theme.primary} />}
              </View>

              <MemberStrip
                members={live.members}
                meId={me.id}
                leaderId={session.leaderId}
                locations={locations}
                destination={session.destination?.coord ?? null}
              />

              <View style={styles.controls}>
                <Button
                  label="Re-centre"
                  variant="secondary"
                  compact
                  icon={{ sf: 'scope', md: 'my_location' }}
                  onPress={() => setFitSignal((n) => n + 1)}
                />
                <Button
                  label={live.paused ? 'Resume sharing' : 'Pause sharing'}
                  variant={live.paused ? 'accent' : 'secondary'}
                  compact
                  icon={{ sf: live.paused ? 'location.fill' : 'location.slash.fill', md: live.paused ? 'location_on' : 'location_off' }}
                  onPress={() => live.setPaused(!live.paused)}
                />
                {live.isLeader && (
                  <Button
                    label={session.destination ? 'Change destination' : 'Set destination'}
                    variant="secondary"
                    compact
                    icon={{ sf: 'magnifyingglass', md: 'search' }}
                    onPress={() => setChoosingDestination(true)}
                  />
                )}
                {route && (
                  <Button
                    label="Save route"
                    variant="secondary"
                    compact
                    icon={{ sf: 'bookmark', md: 'bookmark' }}
                    onPress={saveRoute}
                  />
                )}
              </View>

              {live.permission === 'denied' && (
                <Pressable onPress={() => Linking.openSettings()} style={[styles.warn, { backgroundColor: theme.accent }]}>
                  <ThemedText type="small" themeColor="onAccent">
                    Location is off, so the group cannot see you. Tap to open Settings.
                  </ThemedText>
                </Pressable>
              )}
              {live.paused && (
                <ThemedText type="small" themeColor="textSecondary">
                  Sharing is paused. Your group cannot see where you are.
                </ThemedText>
              )}
              {live.status === 'offline' && (
                <ThemedText type="small" themeColor="danger">
                  Connection lost. Reconnecting…
                </ThemedText>
              )}
              {notice && (
                <ThemedText type="small" themeColor="textSecondary">
                  {notice}
                </ThemedText>
              )}
              {live.error && (
                <ThemedText type="small" themeColor="danger">
                  {live.error}
                </ThemedText>
              )}

              <Button
                label={live.isLeader ? 'End group' : 'Leave group'}
                variant="danger"
                compact
                onPress={live.isLeader ? confirmEnd : confirmLeave}
              />
            </>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

function RoundButton({
  label,
  sf,
  md,
  onPress,
}: {
  label: string;
  sf: Parameters<typeof Icon>[0]['sf'];
  md: Parameters<typeof Icon>[0]['md'];
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.round, { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.7 : 1 }]}>
      <Icon sf={sf} md={md} size={20} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three, padding: Spacing.four },
  centerText: { textAlign: 'center' },
  top: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: Spacing.three, gap: Spacing.two },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  titlePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    height: 44,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
  },
  titleText: { flex: 1 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
  },
  sheetContent: { padding: Spacing.three, gap: Spacing.three },
  destRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  destIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  destText: { flex: 1 },
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  warn: { padding: Spacing.three, borderRadius: Radius.md },
});
