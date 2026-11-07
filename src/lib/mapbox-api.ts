import { distanceBetween, toLngLat } from '@/lib/geo';
import type { Coord, Place, Route } from '@/lib/types';

/** Public Mapbox token. When missing, the app uses demo places and straight-line routes. */
export const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN || '';
export const hasMapbox = MAPBOX_TOKEN.length > 0;

export const DEFAULT_ORIGIN: Coord = { latitude: 37.7749, longitude: -122.4194 };

const DEMO_PLACES: Place[] = [
  { name: 'San Francisco', subtitle: 'California, USA', coord: { latitude: 37.7749, longitude: -122.4194 } },
  { name: 'Los Angeles', subtitle: 'California, USA', coord: { latitude: 34.0522, longitude: -118.2437 } },
  { name: 'Las Vegas', subtitle: 'Nevada, USA', coord: { latitude: 36.1699, longitude: -115.1398 } },
  { name: 'Yosemite Valley', subtitle: 'California, USA', coord: { latitude: 37.7456, longitude: -119.5936 } },
  { name: 'Lake Tahoe', subtitle: 'California, USA', coord: { latitude: 39.0968, longitude: -120.0324 } },
  { name: 'Paris', subtitle: 'France', coord: { latitude: 48.8566, longitude: 2.3522 } },
  { name: 'Munich', subtitle: 'Germany', coord: { latitude: 48.1351, longitude: 11.582 } },
  { name: 'Berlin', subtitle: 'Germany', coord: { latitude: 52.52, longitude: 13.405 } },
  { name: 'Amsterdam', subtitle: 'Netherlands', coord: { latitude: 52.3676, longitude: 4.9041 } },
  { name: 'Tokyo', subtitle: 'Japan', coord: { latitude: 35.6762, longitude: 139.6503 } },
  { name: 'Kuala Lumpur', subtitle: 'Malaysia', coord: { latitude: 3.139, longitude: 101.6869 } },
  { name: 'Phnom Penh', subtitle: 'Cambodia', coord: { latitude: 11.5564, longitude: 104.9282 } },
];

type GeocodeResponse = {
  features?: {
    geometry: { coordinates: [number, number] };
    properties: { name: string; full_address?: string; place_formatted?: string };
  }[];
};

export async function searchPlaces(query: string, near?: Coord | null): Promise<Place[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  if (!hasMapbox) {
    const needle = q.toLowerCase();
    return DEMO_PLACES.filter((p) => p.name.toLowerCase().includes(needle)).slice(0, 6);
  }

  const params = new URLSearchParams({ q, limit: '6', access_token: MAPBOX_TOKEN });
  if (near) params.set('proximity', `${near.longitude},${near.latitude}`);
  const res = await fetch(`https://api.mapbox.com/search/geocode/v6/forward?${params}`);
  if (!res.ok) throw new Error('Place search failed. Check your connection and try again.');
  const json = (await res.json()) as GeocodeResponse;
  return (json.features ?? []).map((f) => ({
    name: f.properties.name,
    subtitle: f.properties.place_formatted ?? f.properties.full_address,
    coord: { longitude: f.geometry.coordinates[0], latitude: f.geometry.coordinates[1] },
  }));
}

type DirectionsResponse = {
  code?: string;
  routes?: {
    distance: number;
    duration: number;
    geometry: { coordinates: [number, number][] };
    legs: {
      steps: {
        distance: number;
        maneuver: { instruction: string; location: [number, number] };
      }[];
    }[];
  }[];
};

export type RouteProfile = 'driving' | 'walking' | 'cycling';

export async function getRoute(from: Coord, to: Coord, profile: RouteProfile = 'driving'): Promise<Route> {
  if (!hasMapbox) return straightLineRoute(from, to);

  const coords = `${from.longitude},${from.latitude};${to.longitude},${to.latitude}`;
  const params = new URLSearchParams({
    steps: 'true',
    geometries: 'geojson',
    overview: 'full',
    access_token: MAPBOX_TOKEN,
  });
  const res = await fetch(`https://api.mapbox.com/directions/v5/mapbox/${profile}/${coords}?${params}`);
  if (!res.ok) throw new Error('Could not get directions. Check your connection and try again.');
  const json = (await res.json()) as DirectionsResponse;
  const route = json.routes?.[0];
  if (!route) throw new Error('No route found between those places.');

  return {
    geometry: route.geometry.coordinates,
    distance: route.distance,
    duration: route.duration,
    steps: route.legs.flatMap((leg) =>
      leg.steps.map((s) => ({
        instruction: s.maneuver.instruction,
        distance: s.distance,
        location: { longitude: s.maneuver.location[0], latitude: s.maneuver.location[1] },
      })),
    ),
  };
}

/** Demo fallback used when no Mapbox token is configured. */
function straightLineRoute(from: Coord, to: Coord): Route {
  const distance = distanceBetween(from, to);
  const points = 40;
  const geometry: [number, number][] = [];
  for (let i = 0; i <= points; i += 1) {
    const t = i / points;
    geometry.push(
      toLngLat({
        latitude: from.latitude + (to.latitude - from.latitude) * t,
        longitude: from.longitude + (to.longitude - from.longitude) * t,
      }),
    );
  }
  return {
    geometry,
    distance,
    duration: distance / (60 / 3.6),
    steps: [
      { instruction: 'Head towards the destination', distance, location: from },
      { instruction: 'You have arrived', distance: 0, location: to },
    ],
  };
}
