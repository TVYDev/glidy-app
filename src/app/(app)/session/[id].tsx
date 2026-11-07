import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Bookmark,
  ChevronDown,
  ChevronUp,
  Flag,
  LocateFixed,
  MapPin,
  Maximize2,
  Minimize2,
  Navigation,
  Pause,
  Play,
  Route as RouteIcon,
  Search,
  UserPlus,
  Users,
} from 'lucide-react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LiveMap } from '@/components/map/live-map';
import { ActionTile, MapButton } from '@/components/session/controls';
import { DriveBar } from '@/components/session/drive-bar';
import { MemberList, MemberStrip } from '@/components/session/member-strip';
import { NavBanner } from '@/components/session/nav-banner';
import { PlaceSearch } from '@/components/session/place-search';
import { ThemedText } from '@/components/themed-text';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Card, IconBadge } from '@/components/ui/card';
import { Glass } from '@/components/ui/glass';
import { Icon } from '@/components/ui/icon';
import { Radius, Spacing } from '@/constants/theme';
import { useDriveNavigation } from '@/hooks/use-drive-navigation';
import { useHeading } from '@/hooks/use-heading';
import { useNow } from '@/hooks/use-now';
import { useSessionLive } from '@/hooks/use-session-live';
import { useI18n } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';
import { backend } from '@/lib/backend';
import { distanceLeft, formatClock, formatDistance, formatDuration, routeBearingAt } from '@/lib/geo';
import type { Coord, MemberLocation } from '@/lib/types';

/** Snap indexes of the bottom sheet; index 0 is the slim peek. */
const HALF = 1;
const FULL = 2;

/**
 * The screen travellers keep open on the road: the map takes everything, a draggable sheet holds
 * the details (peek, half or full), and an immersive mode hides the sheet to leave only the map
 * and the next turn.
 */
export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const live = useSessionLive(id);
  const now = useNow();
  const { session, me, myLocation } = live;

  const [snapIndex, setSnapIndex] = useState(HALF);
  const [immersive, setImmersive] = useState(false);
  const [followMe, setFollowMe] = useState(false);
  const [fitSignal, setFitSignal] = useState(0);
  const [choosingDestination, setChoosingDestination] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  // Real height of the top overlay (bar and turn banner). The banner grows when an instruction
  // wraps, so the map margin has to follow it instead of being a fixed guess.
  const [topHeight, setTopHeight] = useState(0);

  // Drive mode. `driveRequested` is the user's choice; `driving` also turns off once they arrive.
  const [driveRequested, setDriveRequested] = useState(false);
  // The camera follows me. False after the user drags the map, until they tap re-centre.
  const [driveLocked, setDriveLocked] = useState(true);
  const heading = useHeading(myLocation);
  const nav = useDriveNavigation({
    route: session?.route ?? null,
    destination: session?.destination ?? null,
    position: myLocation,
    enabled: driveRequested,
  });
  const arrivedNow = driveRequested && nav.arrived;
  const driving = driveRequested && !nav.arrived;
  const destinationName = session?.destination?.name ?? '';

  // Keep the screen on while navigating: location is only read while the app is in the foreground.
  useEffect(() => {
    if (!driving) return;
    activateKeepAwakeAsync('glidy-drive').catch(() => undefined);
    return () => {
      deactivateKeepAwake('glidy-drive').catch(() => undefined);
    };
  }, [driving]);

  useEffect(() => {
    if (!arrivedNow) return;
    Alert.alert(t('drive.arrivedTitle'), t('drive.arrivedBody', { place: destinationName }), [
      { text: t('common.ok'), onPress: () => setDriveRequested(false) },
    ]);
  }, [arrivedNow, destinationName, t]);

  if (!session) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        {live.error ? (
          <>
            <ThemedText themeColor="danger" style={styles.centerText}>
              {live.error}
            </ThemedText>
            <Button label={t('session.back')} variant="secondary" onPress={() => router.back()} />
          </>
        ) : (
          <ActivityIndicator color={theme.primaryDark} />
        )}
      </View>
    );
  }

  if (session.status === 'ended') {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <IconBadge icon={Flag} size={64} />
        <ThemedText type="subtitle" style={styles.centerText}>
          {t('session.ended')}
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.centerText}>
          {t('session.endedBody', { name: session.name })}
        </ThemedText>
        <Button label={t('session.backHome')} onPress={() => router.replace('/')} />
      </View>
    );
  }

  // While driving this may be a personal reroute; otherwise it is the group's route.
  const route = nav.route;
  const destination = session.destination;
  const destinationCoord: Coord | null = destination?.coord ?? null;

  const locations: Record<string, MemberLocation | undefined> = { ...live.othersById };
  if (myLocation) locations[me.id] = myLocation;
  const leftFor = (position: Coord) => distanceLeft(route, destinationCoord, position);

  // My own progress along the route; before the first GPS fix, show the whole route.
  const progress = nav.progress ?? (route ? { remainingDistance: route.distance, remainingDuration: route.duration } : null);
  // Before the first GPS fix there is no position to measure from: show the first instruction.
  const turn =
    nav.turn ??
    (route && route.steps[0]
      ? { index: 0, step: route.steps[0], distance: 0, isArrival: route.steps.length === 1 }
      : null);
  // The part of the route behind me is drawn grey, but only while I am actually on the road.
  const routeSnap = nav.snap && nav.snap.offset < 100 ? { index: nav.snap.index, point: nav.snap.point } : null;
  // Which way the map points while driving: the way I am moving, or along the road before I move.
  const driveHeading = heading ?? (route && nav.snap ? routeBearingAt(route, nav.snap.index) : null);
  const speedKmh = myLocation?.speed != null && myLocation.speed >= 0 ? Math.round(myLocation.speed * 3.6) : null;
  const eta = progress ? formatClock(new Date(now + progress.remainingDuration * 1000)) : null;

  // Sheet geometry: a slim peek, a half sheet that holds the essentials, and a tall sheet that
  // stops below the turn banner.
  const full = Math.round(height - insets.top - 150);
  const half = Math.min(Math.max(420 + insets.bottom, Math.round(height * 0.44)), full - 60);
  const snaps = [92 + insets.bottom, half, full];

  const topInset = topHeight > 0 ? topHeight + Spacing.two : insets.top + (route ? 170 : 72);
  const driveBarHeight = 92 + Math.max(insets.bottom, Spacing.three);
  const bottomInset = driving ? driveBarHeight + 16 : immersive ? insets.bottom + 24 : snaps[snapIndex] + 16;

  const expanded = snapIndex === FULL;

  function toggleSheet() {
    setSnapIndex(snapIndex === FULL ? HALF : snapIndex + 1);
  }

  function startDriving() {
    setFollowMe(false);
    setImmersive(false);
    setChoosingDestination(false);
    setDriveLocked(true);
    setDriveRequested(true);
  }

  function endDriving() {
    setDriveRequested(false);
    // Level the map again and show the whole trip.
    setFitSignal((n) => n + 1);
  }

  function startChoosingDestination() {
    setSnapIndex(FULL);
    setChoosingDestination(true);
  }

  function confirmEnd() {
    Alert.alert(t('session.endTitle'), t('session.endBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('session.endConfirm'),
        style: 'destructive',
        onPress: async () => {
          await live.endSession();
          router.replace('/');
        },
      },
    ]);
  }

  function confirmLeave() {
    Alert.alert(t('session.leaveTitle'), t('session.leaveBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('session.leaveConfirm'),
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
        origin: { name: t('session.startPoint'), coord: { latitude: lat, longitude: lng } },
        destination: session.destination,
        route: session.route,
      });
      setNotice(t('session.routeSaved'));
    } catch (e) {
      setNotice(e instanceof Error ? e.message : t('session.saveError'));
    }
  }

  const statusColor =
    live.status === 'live' ? '#22C55E' : live.status === 'connecting' ? theme.primary : theme.danger;

  const header = (
    <View>
      <Pressable
        onPress={toggleSheet}
        accessibilityRole="button"
        accessibilityLabel={expanded ? t('session.collapse') : t('session.expand')}
        hitSlop={8}
        style={styles.grabberArea}>
        <View style={[styles.grabber, { backgroundColor: theme.border }]} />
      </Pressable>
      <View style={styles.peekRow}>
        <IconBadge icon={destination ? MapPin : Flag} size={44} />
        <View style={styles.peekText}>
          <ThemedText type="smallBold" numberOfLines={1} style={styles.destTitle}>
            {destination ? destination.name : t('session.noDestination')}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {progress
              ? `${formatDistance(progress.remainingDistance)} · ${formatDuration(progress.remainingDuration)}`
              : live.isLeader
                ? t('session.setPrompt')
                : t('session.waitLeader')}
          </ThemedText>
        </View>
        {live.busy ? (
          <ActivityIndicator color={theme.primaryDark} />
        ) : eta ? (
          <View style={[styles.etaChip, { backgroundColor: theme.accent }]}>
            <ThemedText type="smallBold" numberOfLines={1}>
              {t('session.arrive', { time: eta })}
            </ThemedText>
          </View>
        ) : null}
        <Pressable
          onPress={toggleSheet}
          accessibilityRole="button"
          accessibilityLabel={expanded ? t('session.collapse') : t('session.expand')}
          hitSlop={8}
          style={[styles.chevron, { backgroundColor: theme.backgroundSelected }]}>
          <Icon icon={expanded ? ChevronDown : ChevronUp} size={20} />
        </Pressable>
      </View>
    </View>
  );

  const floating = driving ? (
    <View style={styles.controls}>
      <MapButton
        label={t('drive.overview')}
        icon={RouteIcon}
        onPress={() => {
          setDriveLocked(false);
          setFitSignal((n) => n + 1);
        }}
      />
      <MapButton label={t('drive.recentre')} icon={LocateFixed} active={driveLocked} onPress={() => setDriveLocked(true)} />
    </View>
  ) : (
    <View style={styles.controls}>
      {route && <MapButton label={t('drive.start')} icon={Navigation} active onPress={startDriving} />}
      <MapButton
        label={immersive ? t('session.exitFullscreen') : t('session.fullscreen')}
        icon={immersive ? Minimize2 : Maximize2}
        onPress={() => setImmersive((v) => !v)}
      />
      <MapButton
        label={t('session.fitAll')}
        icon={RouteIcon}
        onPress={() => {
          setFollowMe(false);
          setFitSignal((n) => n + 1);
        }}
      />
      <MapButton label={t('session.follow')} icon={LocateFixed} active={followMe} onPress={() => setFollowMe((v) => !v)} />
    </View>
  );

  return (
    <GestureHandlerRootView style={[styles.fill, { backgroundColor: theme.background }]}>
      {/* Touching the map takes over from "follow me", as in any navigation app. */}
      <View
        style={StyleSheet.absoluteFill}
        onTouchStart={() => {
          if (followMe) setFollowMe(false);
          if (driving && driveLocked) setDriveLocked(false);
        }}>
        <LiveMap
          route={route}
          destination={destination}
          me={myLocation}
          others={live.others}
          fitSignal={fitSignal}
          followMe={followMe && !driving}
          drive={driving ? { locked: driveLocked, heading: driveHeading, speed: myLocation?.speed ?? null } : undefined}
          routeSnap={routeSnap}
          insets={{ top: topInset, bottom: bottomInset }}
        />
      </View>

      <View
        style={[styles.top, { paddingTop: insets.top + Spacing.two }]}
        pointerEvents="box-none"
        onLayout={(e) => setTopHeight(e.nativeEvent.layout.height)}>
        {!immersive && !driving && (
          <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.topRow} pointerEvents="box-none">
            <TopButton label={t('session.back')} icon={ArrowLeft} onPress={() => router.back()} />
            <Glass style={styles.titlePill} fallbackColor={theme.backgroundElement} fallbackBorderColor={theme.border}>
              <View style={[styles.dot, { backgroundColor: statusColor }]} />
              <ThemedText type="smallBold" numberOfLines={1} style={styles.titleText}>
                {session.name}
              </ThemedText>
              <Icon icon={Users} size={16} color="textSecondary" />
              <ThemedText type="caption" themeColor="textSecondary">
                {live.members.length}
              </ThemedText>
            </Glass>
            <TopButton
              label={t('session.invite')}
              icon={UserPlus}
              onPress={() => router.push({ pathname: '/session/invite', params: { id: session.id } })}
            />
          </Animated.View>
        )}
        {route && turn && progress && (
          <NavBanner
            turn={turn}
            remainingDistance={progress.remainingDistance}
            large={driving}
            rerouting={nav.rerouting}
          />
        )}
      </View>

      <BottomSheet
        snaps={snaps}
        index={snapIndex}
        onIndexChange={setSnapIndex}
        hidden={immersive || driving}
        header={header}
        floating={floating}
        floatingMinBottom={driving ? driveBarHeight + Spacing.two : insets.bottom + Spacing.two}
        bottomInset={insets.bottom}>
        {choosingDestination ? (
          <>
            <PlaceSearch
              label={t('session.headingQ')}
              near={myLocation?.coord}
              onSelect={async (place) => {
                setChoosingDestination(false);
                setSnapIndex(HALF);
                await live.setDestination(place);
                setFollowMe(false);
                setFitSignal((n) => n + 1);
              }}
            />
            <Button
              label={t('common.cancel')}
              variant="ghost"
              compact
              onPress={() => {
                setChoosingDestination(false);
                setSnapIndex(HALF);
              }}
            />
          </>
        ) : (
          <>
            {live.permission === 'denied' && (
              <Pressable
                onPress={() => Linking.openSettings()}
                style={[styles.warn, { backgroundColor: theme.accent, borderColor: theme.border }]}>
                <Icon icon={Navigation} size={18} color="primaryDark" />
                <ThemedText type="small" style={styles.warnText}>
                  {t('session.locationOff')}
                </ThemedText>
              </Pressable>
            )}

            {route && <Button label={t('drive.start')} icon={Navigation} onPress={startDriving} />}

            {!expanded && (
              <MemberStrip
                members={live.members}
                meId={me.id}
                leaderId={session.leaderId}
                locations={locations}
                distanceLeft={leftFor}
              />
            )}

            <View style={styles.tiles}>
              <ActionTile
                label={live.paused ? t('session.resumeShort') : t('session.pauseShort')}
                icon={live.paused ? Play : Pause}
                highlight={live.paused}
                onPress={() => live.setPaused(!live.paused)}
              />
              <ActionTile
                label={t('session.invite')}
                icon={UserPlus}
                onPress={() => router.push({ pathname: '/session/invite', params: { id: session.id } })}
              />
              {live.isLeader && (
                <ActionTile
                  label={destination ? t('session.changeDestination') : t('session.destinationShort')}
                  icon={Search}
                  onPress={startChoosingDestination}
                />
              )}
              {route && <ActionTile label={t('session.saveRoute')} icon={Bookmark} onPress={saveRoute} />}
            </View>

            {expanded && (
              <>
                <ThemedText type="smallBold" style={styles.sectionTitle}>
                  {t('session.membersTitle')}
                </ThemedText>
                <MemberList
                  members={live.members}
                  meId={me.id}
                  leaderId={session.leaderId}
                  locations={locations}
                  distanceLeft={leftFor}
                />
              </>
            )}

            {expanded && route && (
              <>
                <ThemedText type="smallBold" style={styles.sectionTitle}>
                  {t('route.directions')}
                </ThemedText>
                <Card style={styles.steps}>
                  {route.steps.map((step, index) => (
                    <View
                      key={index}
                      style={[
                        styles.step,
                        index < route.steps.length - 1 && {
                          borderBottomColor: theme.border,
                          borderBottomWidth: StyleSheet.hairlineWidth,
                        },
                      ]}>
                      <ThemedText type="small" style={styles.stepText}>
                        {step.instruction}
                      </ThemedText>
                      {step.distance > 0 && (
                        <ThemedText type="small" themeColor="textSecondary">
                          {formatDistance(step.distance)}
                        </ThemedText>
                      )}
                    </View>
                  ))}
                </Card>
              </>
            )}

            {live.paused && (
              <ThemedText type="small" themeColor="textSecondary">
                {t('session.paused')}
              </ThemedText>
            )}
            {live.status === 'offline' && (
              <ThemedText type="small" themeColor="danger">
                {t('session.offline')}
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

            {expanded && (
              <Button
                label={live.isLeader ? t('session.endGroup') : t('session.leaveGroup')}
                variant="danger"
                onPress={live.isLeader ? confirmEnd : confirmLeave}
              />
            )}
          </>
        )}
      </BottomSheet>

      {driving && progress && eta && (
        <DriveBar
          arrival={eta}
          remainingDistance={progress.remainingDistance}
          remainingDuration={progress.remainingDuration}
          speedKmh={speedKmh}
          onEnd={endDriving}
          bottomInset={insets.bottom}
        />
      )}
    </GestureHandlerRootView>
  );
}

function TopButton({ label, icon, onPress }: { label: string; icon: typeof ArrowLeft; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
      <Glass style={styles.round} fallbackColor={theme.backgroundElement} fallbackBorderColor={theme.border} interactive>
        <Icon icon={icon} size={20} />
      </Glass>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three, padding: Spacing.four },
  centerText: { textAlign: 'center' },
  top: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: Spacing.three, gap: Spacing.two },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  round: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  titlePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    height: 48,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
  },
  titleText: { flex: 1 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  controls: { gap: Spacing.two + Spacing.one },
  grabberArea: { alignItems: 'center', paddingTop: Spacing.two, paddingBottom: Spacing.two },
  grabber: { width: 40, height: 5, borderRadius: 3 },
  peekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
  },
  peekText: { flex: 1 },
  destTitle: { fontSize: 17, lineHeight: 24 },
  etaChip: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.one + Spacing.half, borderRadius: Radius.pill },
  chevron: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  tiles: { flexDirection: 'row', gap: Spacing.two },
  sectionTitle: { fontSize: 18, lineHeight: 24, marginTop: Spacing.one },
  steps: { padding: 0, paddingHorizontal: Spacing.three },
  step: { flexDirection: 'row', gap: Spacing.three, paddingVertical: Spacing.three },
  stepText: { flex: 1 },
  warn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  warnText: { flex: 1 },
});
