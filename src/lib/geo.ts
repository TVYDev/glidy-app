import { t } from '@/i18n';
import type { Coord, MemberLocation, Place, Route, RouteStep } from '@/lib/types';

const EARTH_RADIUS_M = 6371000;

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in metres. */
export function distanceBetween(a: Coord, b: Coord): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function formatDistance(metres: number): string {
  if (metres < 1000) return `${Math.round(metres / 10) * 10} ${t('unit.m')}`;
  const km = metres / 1000;
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} ${t('unit.km')}`;
}

export function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${Math.max(1, minutes)} ${t('unit.min')}`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} ${t('unit.h')}` : `${hours} ${t('unit.h')} ${rest} ${t('unit.min')}`;
}

const cumulativeCache = new WeakMap<Route, number[]>();

/** Distance in metres from the start of the route to each vertex. Cached per route object. */
function cumulativeDistances(route: Route): number[] {
  const cached = cumulativeCache.get(route);
  if (cached) return cached;
  const cumulative = [0];
  for (let i = 1; i < route.geometry.length; i += 1) {
    const [lng1, lat1] = route.geometry[i - 1];
    const [lng2, lat2] = route.geometry[i];
    cumulative.push(
      cumulative[i - 1] + distanceBetween({ latitude: lat1, longitude: lng1 }, { latitude: lat2, longitude: lng2 }),
    );
  }
  cumulativeCache.set(route, cumulative);
  return cumulative;
}

const stepAnchorCache = new WeakMap<Route, number[]>();

export type RouteSnap = {
  /** Index of the vertex that starts the closest segment. */
  index: number;
  /** Metres from the start of the route to the snapped point. */
  along: number;
  /** Metres between the position and the route (how far off it you are). */
  offset: number;
  /** The snapped point, [longitude, latitude]. */
  point: [number, number];
};

/**
 * Projects a position onto the nearest part of the route. Works per segment (not per vertex), so
 * the result is exact even where the route has long straight stretches between vertices.
 */
export function snapToRoute(route: Route, position: Coord): RouteSnap | null {
  const g = route.geometry;
  if (g.length < 2) return null;
  const cumulative = cumulativeDistances(route);
  const refLat = position.latitude;
  const refLng = position.longitude;
  // Local flat projection in metres around the position: accurate to centimetres at this scale.
  const kx = Math.cos(toRad(refLat)) * 111320;
  const ky = 110540;

  let best: RouteSnap = { index: 0, along: 0, offset: Infinity, point: g[0] };
  for (let i = 0; i < g.length - 1; i += 1) {
    const ax = (g[i][0] - refLng) * kx;
    const ay = (g[i][1] - refLat) * ky;
    const dx = (g[i + 1][0] - refLng) * kx - ax;
    const dy = (g[i + 1][1] - refLat) * ky - ay;
    const lengthSquared = dx * dx + dy * dy;
    const t = lengthSquared === 0 ? 0 : Math.min(1, Math.max(0, -(ax * dx + ay * dy) / lengthSquared));
    const px = ax + t * dx;
    const py = ay + t * dy;
    const offset = Math.hypot(px, py);
    if (offset < best.offset) {
      best = {
        index: i,
        along: cumulative[i] + t * (cumulative[i + 1] - cumulative[i]),
        offset,
        point: [refLng + px / kx, refLat + py / ky],
      };
    }
  }
  return best;
}

export type RouteProgress = {
  /** Metres left to drive, following the route (plus any detour back onto it). */
  remainingDistance: number;
  /** Seconds left, scaled from the route's total duration. */
  remainingDuration: number;
};

/** How much of the route is left for someone at `position`, measured along the route itself. */
export function routeProgress(route: Route, position: Coord): RouteProgress {
  const snap = snapToRoute(route, position);
  if (!snap) return { remainingDistance: route.distance, remainingDuration: route.duration };
  const cumulative = cumulativeDistances(route);
  const length = cumulative[cumulative.length - 1] || route.distance;
  const remainingDistance = Math.max(0, length - snap.along) + snap.offset;
  return {
    remainingDistance,
    remainingDuration: route.duration * Math.min(1, remainingDistance / (length || 1)),
  };
}

/** Where along the route each step's manoeuvre happens, in metres. Cached per route object. */
function stepAnchors(route: Route): number[] {
  const cached = stepAnchorCache.get(route);
  if (cached) return cached;
  let previous = 0;
  const anchors = route.steps.map((step) => {
    // Keep the anchors in order even if two manoeuvres snap to the same spot.
    previous = Math.max(previous, snapToRoute(route, step.location)?.along ?? previous);
    return previous;
  });
  stepAnchorCache.set(route, anchors);
  return anchors;
}

export type NextTurn = {
  index: number;
  step: RouteStep;
  /** Metres along the route to the manoeuvre. */
  distance: number;
  isArrival: boolean;
};

/**
 * The next manoeuvre ahead of the traveller, with the distance along the route to it. Measured
 * along the route, so it stays right on bends and after a GPS jump (unlike "within 40 m of it").
 */
export function nextTurn(route: Route, snap: RouteSnap): NextTurn | null {
  const last = route.steps.length - 1;
  if (last < 0) return null;
  const anchors = stepAnchors(route);
  for (let i = 0; i <= last; i += 1) {
    // A manoeuvre stays "next" until you are 15 m past it; the departure instruction for 40 m.
    const grace = i === 0 ? 40 : 15;
    if (i === last || anchors[i] - snap.along > -grace) {
      // "Head east on X" at the start really means "continue to the first turn", so measure to that.
      const target = i === 0 && last > 0 ? anchors[1] : anchors[i];
      return {
        index: i,
        step: route.steps[i],
        distance: Math.max(0, target - snap.along),
        isArrival: i === last,
      };
    }
  }
  return null;
}

/** Compass bearing in degrees (0 = north, clockwise) from a to b. */
export function bearingBetween(a: Coord, b: Coord): number {
  const phi1 = toRad(a.latitude);
  const phi2 = toRad(b.latitude);
  const dLambda = toRad(b.longitude - a.longitude);
  const y = Math.sin(dLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Direction of the route segment that starts at vertex `index`, or null past the end. */
export function routeBearingAt(route: Route, index: number): number | null {
  const a = route.geometry[index];
  const b = route.geometry[index + 1];
  if (!a || !b) return null;
  return bearingBetween({ longitude: a[0], latitude: a[1] }, { longitude: b[0], latitude: b[1] });
}

/** Signed shortest difference between two bearings, in degrees (-180..180). */
export function angleDelta(from: number, to: number): number {
  return ((((to - from) % 360) + 540) % 360) - 180;
}

/** Moves `from` towards `to` along the shortest way round the compass by `factor` (0..1). */
export function lerpAngle(from: number, to: number, factor: number): number {
  return (from + angleDelta(from, to) * factor + 360) % 360;
}

/** Camera zoom for the current speed: close in when slow, wider at motorway speed. */
export function zoomForSpeed(metresPerSecond: number | null): number {
  const v = Math.max(0, metresPerSecond ?? 0);
  return Math.min(17.3, Math.max(15, 17.3 - v * 0.075));
}

/** The point `metres` ahead of `coord` in the direction of `headingDegrees`. */
export function offsetAhead(coord: Coord, headingDegrees: number, metres: number): Coord {
  const heading = toRad(headingDegrees);
  const dLat = (metres * Math.cos(heading)) / 110540;
  const dLng = (metres * Math.sin(heading)) / (111320 * Math.max(0.2, Math.cos(toRad(coord.latitude))));
  return { latitude: coord.latitude + dLat, longitude: coord.longitude + dLng };
}

/** Ground metres covered by one screen point at a map zoom and latitude (512 px tiles). */
export function metersPerPoint(zoom: number, latitude: number): number {
  return (78271.517 * Math.cos(toRad(latitude))) / 2 ** zoom;
}

/**
 * Metres left for a traveller: along the route when there is one, otherwise straight to the
 * destination. `null` when there is nothing to travel to.
 */
export function distanceLeft(route: Route | null, destination: Coord | null, position: Coord): number | null {
  if (route) return routeProgress(route, position).remainingDistance;
  if (destination) return distanceBetween(position, destination);
  return null;
}

/** 24-hour clock time such as "16:05". Avoids Intl so it behaves the same on every device. */
export function formatClock(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Rounds to roughly 110 m so exact positions are not shared. */
export function blurCoord(coord: Coord): Coord {
  const round = (n: number) => Math.round(n * 1000) / 1000;
  return { latitude: round(coord.latitude), longitude: round(coord.longitude) };
}

export function toLngLat(coord: Coord): [number, number] {
  return [coord.longitude, coord.latitude];
}

/** Returns [[swLng, swLat], [neLng, neLat]] or null when there are no points. */
export function boundsOf(points: [number, number][]): { sw: [number, number]; ne: [number, number] } | null {
  if (points.length === 0) return null;
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  for (const [lng, lat] of points) {
    minLng = Math.min(minLng, lng);
    minLat = Math.min(minLat, lat);
    maxLng = Math.max(maxLng, lng);
    maxLat = Math.max(maxLat, lat);
  }
  // Avoid a zero-area box when there is a single point.
  if (minLng === maxLng) {
    minLng -= 0.01;
    maxLng += 0.01;
  }
  if (minLat === maxLat) {
    minLat -= 0.01;
    maxLat += 0.01;
  }
  return { sw: [minLng, minLat], ne: [maxLng, maxLat] };
}

/** Straight-line distance from a member to the destination, in metres. */
export function distanceToGo(member: MemberLocation, destination: Coord): number {
  return distanceBetween(member.coord, destination);
}

export function initials(name: string): string {
  // Ignore bracketed suffixes such as "Alex (demo)".
  const parts = name.replace(/\(.*?\)/g, ' ').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '';
  return (first + last).toUpperCase();
}

const MEMBER_COLORS = ['#2F7A4F', '#E07A1F', '#2D6CDF', '#B23A8A', '#0E8F8F', '#7A4FD0', '#C8402E'];

/** Stable colour for a member, derived from their id. */
export function colorFor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i += 1) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }
  return MEMBER_COLORS[Math.abs(hash) % MEMBER_COLORS.length];
}

const stopIndexCache = new WeakMap<Route, number[]>();

/**
 * Where each stop sits along the route, as an index into its geometry. A stop is usually a point
 * off the road (the middle of a roundabout, a building), so the nearest road vertex to it can be on
 * the far side of a loop. Each leg of the route ends exactly where the router put that stop on the
 * road (the leg's "arrive" step), so that point is used, searching forward from the previous stop so
 * an out-and-back route (leaving along the road it came in on) keeps the stops in order.
 */
function stopIndices(route: Route): number[] {
  const cached = stopIndexCache.get(route);
  if (cached) return cached;
  const stops = route.stops ?? [];
  const arrivals = route.steps.filter((step) => step.type === 'arrive').slice(0, stops.length);
  const indices: number[] = [];
  let from = 0;
  stops.forEach((stop, k) => {
    const target = arrivals[k]?.location ?? stop.coord;
    let best = from;
    let bestDistance = Infinity;
    for (let i = from; i < route.geometry.length; i += 1) {
      const [longitude, latitude] = route.geometry[i];
      const d = distanceBetween(target, { latitude, longitude });
      // Only a clearly closer vertex replaces the best, so the first of several equal ones is kept.
      if (d < bestDistance - 1) {
        bestDistance = d;
        best = i;
      }
    }
    indices.push(best);
    from = best;
  });
  stopIndexCache.set(route, indices);
  return indices;
}

/**
 * The stops of a route that are still ahead of the point `fromIndex` along its geometry. A stop
 * counts as passed once you are on or beyond the route vertex where its leg ends.
 */
export function remainingStops(route: Route, fromIndex: number): Place[] {
  const stops = route.stops ?? [];
  if (stops.length === 0) return [];
  const indices = stopIndices(route);
  return stops.filter((_, k) => indices[k] > fromIndex);
}
