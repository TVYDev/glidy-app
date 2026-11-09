import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';

import { usePrivacy } from '@/hooks/use-privacy';
import { useI18n } from '@/i18n';
import { useProfile } from '@/providers/auth-provider';
import { backend } from '@/lib/backend';
import { blurCoord } from '@/lib/geo';
import { getOrigin, toCoord } from '@/lib/location';
import { getRoute } from '@/lib/maps-api';
import type { Member, MemberLocation, Place, Route, Session, SessionChannel } from '@/lib/types';

export type LiveStatus = 'connecting' | 'live' | 'offline';
export type LocationPermission = 'unknown' | 'granted' | 'denied';

/** Minimum gap between broadcasts. Together with the distance filter this keeps battery use low. */
const SEND_INTERVAL_MS = 3000;

/**
 * Everything the live session screen needs: the session, its members, their live
 * locations, my own position, and the leader's actions. Location is only read and
 * shared while this hook is mounted, i.e. while the user has the session open.
 */
export function useSessionLive(sessionId: string) {
  const me = useProfile();
  const { t } = useI18n();
  const { preciseLocation } = usePrivacy();

  const [session, setSession] = useState<Session | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [others, setOthers] = useState<Record<string, MemberLocation>>({});
  const [myLocation, setMyLocation] = useState<MemberLocation | null>(null);
  const [status, setStatus] = useState<LiveStatus>('connecting');
  const [permission, setPermission] = useState<LocationPermission>('unknown');
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Leadership: a member's request waiting for the leader, whether mine is out, and a short notice.
  const [leaderRequest, setLeaderRequest] = useState<{ userId: string; displayName: string } | null>(null);
  const [requestedLeadership, setRequestedLeadership] = useState(false);
  const [leaderNotice, setLeaderNotice] = useState<string | null>(null);

  const channel = useRef<SessionChannel | null>(null);
  const lastSent = useRef(0);
  const sessionRef = useRef<Session | null>(null);
  const membersRef = useRef<Member[]>([]);

  /** Every new copy of the session goes through here, so a change of leader is noticed wherever it came from. */
  const applySession = useCallback(
    (next: Session) => {
      const previous = sessionRef.current;
      sessionRef.current = next;
      setSession(next);
      if (previous && previous.leaderId !== next.leaderId) {
        setLeaderRequest(null);
        setRequestedLeadership(false);
        const name = membersRef.current.find((m) => m.userId === next.leaderId)?.displayName ?? t('common.traveller');
        setLeaderNotice(next.leaderId === me.id ? t('leader.nowYou') : t('leader.nowOther', { name }));
      }
    },
    [me.id, t],
  );

  const refreshSession = useCallback(async () => {
    try {
      applySession(await backend.sessions.get(sessionId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load this session.');
    }
  }, [sessionId, applySession]);

  const refreshMembers = useCallback(async () => {
    try {
      const next = await backend.sessions.members(sessionId);
      membersRef.current = next;
      setMembers(next);
    } catch {
      // Keep the previous list; the next event will retry.
    }
  }, [sessionId]);

  // Load the session, then open its realtime channel.
  useEffect(() => {
    let cancelled = false;
    let opened: SessionChannel | null = null;

    (async () => {
      try {
        const loaded = await backend.sessions.get(sessionId);
        if (cancelled) return;
        sessionRef.current = loaded;
        setSession(loaded);
        const loadedMembers = await backend.sessions.members(sessionId);
        membersRef.current = loadedMembers;
        setMembers(loadedMembers);
        if (cancelled) return;
        opened = backend.sessions.openChannel(loaded, me, {
          onLocation: (location) => setOthers((prev) => ({ ...prev, [location.userId]: location })),
          onSessionChanged: () => void refreshSession(),
          onMembersChanged: () => void refreshMembers(),
          onStatus: setStatus,
          // Only the leader is shown a request; everyone else's copy is ignored.
          onLeaderRequest: (from) => {
            if (sessionRef.current?.leaderId === me.id) setLeaderRequest(from);
          },
          onLeaderDeclined: () => {
            setRequestedLeadership(false);
            setLeaderNotice(t('leader.declined'));
          },
        });
        channel.current = opened;
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load this session.');
      }
    })();

    return () => {
      cancelled = true;
      opened?.stop();
      channel.current = null;
    };
  }, [sessionId, me, t, refreshSession, refreshMembers]);

  // Watch my own position while the screen is open.
  useEffect(() => {
    let cancelled = false;
    let subscription: Location.LocationSubscription | undefined;

    (async () => {
      const result = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;
      setPermission(result.granted ? 'granted' : 'denied');
      if (!result.granted) return;

      const watcher = await Location.watchPositionAsync(
        // High accuracy (GPS): the turn banner and the arrival check need road-level positions, and this only runs while the screen is open.
        { accuracy: Location.Accuracy.High, distanceInterval: 10, timeInterval: 4000 },
        (location) => {
          setMyLocation({
            userId: me.id,
            displayName: me.displayName,
            coord: toCoord(location),
            heading: location.coords.heading,
            speed: location.coords.speed,
            updatedAt: location.timestamp,
          });
        },
      );
      if (cancelled) watcher.remove();
      else subscription = watcher;
    })().catch(() => setPermission('denied'));

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [me.id, me.displayName]);

  // Broadcast my position (throttled) unless sharing is paused.
  useEffect(() => {
    if (paused || !myLocation || !channel.current) return;
    const now = Date.now();
    if (now - lastSent.current < SEND_INTERVAL_MS) return;
    lastSent.current = now;
    channel.current.sendLocation({
      ...myLocation,
      coord: preciseLocation ? myLocation.coord : blurCoord(myLocation.coord),
    });
  }, [myLocation, paused, preciseLocation, status]);

  const isLeader = session?.leaderId === me.id;

  const run = useCallback(async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }, []);

  /** Leader: route from the current position to a new destination and share it. */
  const setDestination = useCallback(
    (destination: Place) =>
      run(async () => {
        const origin = myLocation?.coord ?? (await getOrigin()).coord;
        const route = await getRoute(origin, destination.coord);
        applySession(await backend.sessions.update(sessionId, { destination, route }));
        channel.current?.notifySessionChanged();
      }),
    [run, myLocation, sessionId, applySession],
  );

  /** Leader: share a route that was planned elsewhere (the route editor), stops and all. */
  const setRoute = useCallback(
    (destination: Place, route: Route) =>
      run(async () => {
        applySession(await backend.sessions.update(sessionId, { destination, route }));
        channel.current?.notifySessionChanged();
      }),
    [run, sessionId, applySession],
  );

  const clearDestination = useCallback(
    () =>
      run(async () => {
        applySession(await backend.sessions.update(sessionId, { destination: null, route: null }));
        channel.current?.notifySessionChanged();
      }),
    [run, sessionId, applySession],
  );

  // Stable identity: the screen's auto-dismiss timer depends on it and must not restart on every render.
  const dismissLeaderNotice = useCallback(() => setLeaderNotice(null), []);

  /** Leader: hand the group to another member. */
  const makeLeader = useCallback(
    (userId: string) =>
      run(async () => {
        applySession(await backend.sessions.transferLeader(sessionId, userId));
        channel.current?.notifySessionChanged();
      }),
    [run, sessionId, applySession],
  );

  /** Member: ask the leader to hand the group over. The ask times out after a minute so it can be repeated. */
  const requestLeadership = useCallback(() => {
    channel.current?.requestLeadership({ userId: me.id, displayName: me.displayName });
    setRequestedLeadership(true);
    setTimeout(() => setRequestedLeadership(false), 60_000);
  }, [me.id, me.displayName]);

  /** Leader: answer the request on screen, handing over or saying not now. */
  const answerLeaderRequest = useCallback(
    (accept: boolean) => {
      const request = leaderRequest;
      setLeaderRequest(null);
      if (!request) return;
      if (accept) void makeLeader(request.userId);
      else channel.current?.declineLeadership(request.userId);
    },
    [leaderRequest, makeLeader],
  );

  const endSession = useCallback(
    () =>
      run(async () => {
        await backend.sessions.end(sessionId);
        channel.current?.notifySessionChanged();
      }),
    [run, sessionId],
  );

  const leaveSession = useCallback(
    () =>
      run(async () => {
        await backend.sessions.leave(sessionId);
        channel.current?.notifyMembersChanged();
      }),
    [run, sessionId],
  );

  return {
    me,
    session,
    members,
    others: Object.values(others),
    othersById: others,
    myLocation,
    status,
    permission,
    paused,
    setPaused,
    isLeader,
    error,
    busy,
    setDestination,
    setRoute,
    clearDestination,
    makeLeader,
    requestLeadership,
    answerLeaderRequest,
    leaderRequest,
    requestedLeadership,
    leaderNotice,
    dismissLeaderNotice,
    endSession,
    leaveSession,
  };
}
