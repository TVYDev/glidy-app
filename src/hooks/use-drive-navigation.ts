import { useEffect, useRef, useState } from 'react';

import { planRoutes } from '@/lib/maps-api';
import { distanceBetween, nextTurn, remainingStops, routeProgress, snapToRoute } from '@/lib/geo';
import type { Coord, MemberLocation, Place, Route } from '@/lib/types';

/** Further than this from the route counts as having left it (GPS is good to roughly 10–20 m). */
const OFF_ROUTE_METRES = 60;
/** Must stay off the route this long before rerouting, so one bad GPS fix does not trigger it. */
const OFF_ROUTE_SECONDS = 4;
/** Minimum gap between reroute requests. */
const REROUTE_COOLDOWN_MS = 8000;
/** Within this distance of the end of the route you have arrived. */
const ARRIVAL_METRES = 40;

/** Slower than driving: the connector to the first road is usually a car park or a side street. */
const CONNECTOR_METRES_PER_SECOND = 8;

/**
 * Google starts a new route at the nearest road, which can be hundreds of metres from where you are
 * (a car park, a driveway). Start the route at your position with a short connector instead;
 * otherwise you would still count as off the route and be rerouted again and again.
 */
function startingFrom(position: Coord, fresh: Route): Route {
  const first = fresh.geometry[0];
  const gap = first ? distanceBetween(position, { longitude: first[0], latitude: first[1] }) : 0;
  if (gap < 15) return fresh;
  return {
    ...fresh,
    geometry: [[position.longitude, position.latitude], ...fresh.geometry],
    distance: fresh.distance + gap,
    duration: fresh.duration + gap / CONNECTOR_METRES_PER_SECOND,
  };
}

type Input = {
  /** The group's shared route. */
  route: Route | null;
  destination: Place | null;
  position: MemberLocation | null;
  /** Navigation is on: only then are new routes requested. */
  enabled: boolean;
};

/**
 * Turn-by-turn state for one traveller: where they are along the route, the next turn, how far is
 * left, and automatic rerouting when they leave the road. A reroute is personal: it replaces the
 * route for this phone only and is dropped when the leader changes the group's route.
 */
export function useDriveNavigation({ route, destination, position, enabled }: Input) {
  // A personal route is only valid for the shared route it was calculated against.
  const [personal, setPersonal] = useState<{ base: Route; route: Route } | null>(null);
  const active = enabled && route && personal && personal.base === route ? personal.route : route;

  const snap = active && position ? snapToRoute(active, position.coord) : null;
  const offRoute = snap != null && snap.offset > OFF_ROUTE_METRES;
  const turn = active && snap ? nextTurn(active, snap) : null;
  const progress = active && position ? routeProgress(active, position.coord) : null;
  const arrived = progress != null && progress.remainingDistance < ARRIVAL_METRES;
  // A reroute must still pass the stops that are ahead; the ones already visited are dropped.
  const stopsAhead = active && snap ? remainingStops(active, snap.index) : [];
  // How many of the group's stops are behind me. Counted against the group's route, so it stays
  // right after a personal reroute (which only carries the stops still ahead).
  const stopsTotal = route?.stops?.length ?? 0;
  const stopsPassed = snap ? Math.max(0, stopsTotal - stopsAhead.length) : 0;

  // While off the route, re-check every couple of seconds even if GPS goes quiet (a stopped car sends
  // no new fixes), so the reroute is not stuck waiting for the next one.
  const [recheck, setRecheck] = useState(0);
  useEffect(() => {
    if (!offRoute || !enabled) return;
    const timer = setInterval(() => setRecheck((n) => n + 1), 2000);
    return () => clearInterval(timer);
  }, [offRoute, enabled]);

  const offSince = useRef(0);
  const lastAttempt = useRef(0);
  const inFlight = useRef(false);
  const lat = position?.coord.latitude;
  const lng = position?.coord.longitude;

  useEffect(() => {
    if (!offRoute || !enabled) {
      offSince.current = 0;
      return;
    }
    if (!destination || lat == null || lng == null || !route) return;

    const now = Date.now();
    if (!offSince.current) offSince.current = now;
    if (now - offSince.current < OFF_ROUTE_SECONDS * 1000) return;
    if (inFlight.current || now - lastAttempt.current < REROUTE_COOLDOWN_MS) return;

    inFlight.current = true;
    lastAttempt.current = now;
    const here = { latitude: lat, longitude: lng };
    planRoutes(here, stopsAhead, destination)
      .then(([fresh]) => setPersonal({ base: route, route: startingFrom(here, fresh) }))
      .catch(() => {
        // Keep the old route; the next position update past the cooldown tries again.
      })
      .finally(() => {
        inFlight.current = false;
      });
    // `stopsAhead` is a fresh array each render; only its content matters and it changes with `lat`/`lng`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offRoute, enabled, destination, route, lat, lng, recheck]);

  return {
    /** The route to draw and follow: a personal reroute if there is one, otherwise the group's. */
    route: active,
    snap,
    turn,
    progress,
    /** Off the road and a new route is being worked out. */
    rerouting: enabled && offRoute,
    arrived,
    /** Stops of the group's route already passed, and how many there are. */
    stopsPassed,
    stopsTotal,
  };
}
