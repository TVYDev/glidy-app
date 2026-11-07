import type { Coord, MemberLocation, Route } from '@/lib/types';

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
  if (metres < 1000) return `${Math.round(metres / 10) * 10} m`;
  const km = metres / 1000;
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
}

export function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${Math.max(1, minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
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

/** Index of the next manoeuvre the traveller has not reached yet. */
export function nextStepIndex(route: Route, position: Coord | null, previous: number): number {
  if (!position) return previous;
  let index = previous;
  while (
    index < route.steps.length - 1 &&
    distanceBetween(position, route.steps[index].location) < 40
  ) {
    index += 1;
  }
  return index;
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
