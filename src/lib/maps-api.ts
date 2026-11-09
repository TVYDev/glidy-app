import { getLanguage, t } from '@/i18n';
import { distanceBetween, toLngLat } from '@/lib/geo';
import type { Coord, Place, Route, RouteStep } from '@/lib/types';

/**
 * Google Maps Platform key. One key serves the native map (through the react-native-maps config
 * plugin) and the web services below, so restrict it in Google Cloud to this app and to the
 * services it needs: Maps SDK for iOS and Android, Places API (New), Routes API, Geocoding API.
 * When missing, the app uses demo places and straight-line routes and draws the schematic map.
 */
export const GOOGLE_MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';
export const hasMaps = GOOGLE_MAPS_KEY.length > 0;

export const DEFAULT_ORIGIN: Coord = { latitude: 11.5564, longitude: 104.9282 };

/** Google accepts 25 points in one request: the start, the end, and up to this many stops. */
export const MAX_STOPS = 8;

/** Language for names and turn instructions: Google supports Khmer, which Mapbox did not. */
const languageCode = () => (getLanguage() === 'km' ? 'km' : 'en');

const DEMO_PLACES: Place[] = [
  { name: 'Phnom Penh', subtitle: 'Cambodia', coord: { latitude: 11.5564, longitude: 104.9282 } },
  { name: 'Siem Reap', subtitle: 'Cambodia', coord: { latitude: 13.3671, longitude: 103.8448 } },
  { name: 'Angkor Wat', subtitle: 'Siem Reap, Cambodia', coord: { latitude: 13.4125, longitude: 103.867 } },
  { name: 'Sihanoukville', subtitle: 'Cambodia', coord: { latitude: 10.6275, longitude: 103.5221 } },
  { name: 'Kampot', subtitle: 'Cambodia', coord: { latitude: 10.6104, longitude: 104.1815 } },
  { name: 'Kep', subtitle: 'Cambodia', coord: { latitude: 10.4829, longitude: 104.3167 } },
  { name: 'Battambang', subtitle: 'Cambodia', coord: { latitude: 13.0957, longitude: 103.2022 } },
  { name: 'Bangkok', subtitle: 'Thailand', coord: { latitude: 13.7563, longitude: 100.5018 } },
  { name: 'Ho Chi Minh City', subtitle: 'Vietnam', coord: { latitude: 10.8231, longitude: 106.6297 } },
  { name: 'San Francisco', subtitle: 'California, USA', coord: { latitude: 37.7749, longitude: -122.4194 } },
  { name: 'Paris', subtitle: 'France', coord: { latitude: 48.8566, longitude: 2.3522 } },
  { name: 'Tokyo', subtitle: 'Japan', coord: { latitude: 35.6762, longitude: 139.6503 } },
];

/** Headers every Google web-service call carries. */
function headers(fieldMask?: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': GOOGLE_MAPS_KEY,
    ...(fieldMask ? { 'X-Goog-FieldMask': fieldMask } : null),
  };
}

type GoogleError = { error?: { code?: number; status?: string; message?: string } };

/** Turns a failed Google response into the message the user should read. */
async function failure(res: Response, fallback: string): Promise<Error> {
  const body = (await res.json().catch(() => null)) as GoogleError | null;
  if (res.status === 401 || res.status === 403 || body?.error?.status === 'PERMISSION_DENIED') {
    return new Error(t('err.keyRejected'));
  }
  if (res.status === 429 || body?.error?.status === 'RESOURCE_EXHAUSTED') return new Error(t('err.rateLimited'));
  return new Error(fallback.replace('{status}', String(res.status)));
}

/** A fresh id that ties a run of search keystrokes to the one place that ends it (billed as one). */
export function newSessionToken(): string {
  const hex = () => Math.floor(Math.random() * 16).toString(16);
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => (c === 'x' ? hex() : ((Math.random() * 4) | 8).toString(16)));
}

/**
 * A place found by typing. Google gives the name and area straight away and the exact point only
 * when one is chosen (`resolveSuggestion`), so a search costs one lookup, not one per result.
 */
export type PlaceSuggestion = {
  id: string;
  name: string;
  subtitle?: string;
  /** From the point passed as `near`, when Google could work it out. */
  distanceMeters?: number;
  /** Present for demo places, which need no second lookup. */
  coord?: Coord;
};

type AutocompleteResponse = {
  suggestions?: {
    placePrediction?: {
      placeId: string;
      text?: { text: string };
      structuredFormat?: { mainText?: { text: string }; secondaryText?: { text: string } };
      distanceMeters?: number;
    };
  }[];
};

export async function searchPlaces(query: string, near?: Coord | null, sessionToken?: string): Promise<PlaceSuggestion[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  if (!hasMaps) {
    const needle = q.toLowerCase();
    return DEMO_PLACES.filter((p) => p.name.toLowerCase().includes(needle))
      .slice(0, 6)
      .map((p) => ({
        id: `demo-${p.name}`,
        name: p.name,
        subtitle: p.subtitle,
        coord: p.coord,
        distanceMeters: near ? distanceBetween(near, p.coord) : undefined,
      }));
  }

  const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      input: q,
      languageCode: languageCode(),
      sessionToken,
      ...(near
        ? {
            // Prefer, but do not require, places within 50 km; `origin` makes Google return distances.
            locationBias: { circle: { center: near, radius: 50000 } },
            origin: near,
          }
        : null),
    }),
  });
  if (!res.ok) throw await failure(res, t('err.placeSearch'));
  const json = (await res.json()) as AutocompleteResponse;

  return (json.suggestions ?? []).flatMap((s) => {
    const p = s.placePrediction;
    if (!p) return [];
    return [
      {
        id: p.placeId,
        name: p.structuredFormat?.mainText?.text ?? p.text?.text ?? '',
        subtitle: p.structuredFormat?.secondaryText?.text,
        distanceMeters: p.distanceMeters,
      },
    ];
  });
}

/** The exact point of a chosen suggestion. Passing the same `sessionToken` closes the search session. */
export async function resolveSuggestion(suggestion: PlaceSuggestion, sessionToken?: string): Promise<Place> {
  if (suggestion.coord) return { name: suggestion.name, subtitle: suggestion.subtitle, coord: suggestion.coord };

  const params = new URLSearchParams({ languageCode: languageCode() });
  if (sessionToken) params.set('sessionToken', sessionToken);
  // Only `location` is requested: it is the cheapest tier of Place Details.
  const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(suggestion.id)}?${params}`, {
    headers: headers('location'),
  });
  if (!res.ok) throw await failure(res, t('err.placeSearch'));
  const json = (await res.json()) as { location?: { latitude: number; longitude: number } };
  if (!json.location) throw new Error(t('err.placeSearch'));
  return { name: suggestion.name, subtitle: suggestion.subtitle, coord: json.location };
}

type RoutesResponse = {
  routes?: {
    distanceMeters?: number;
    duration?: string;
    polyline?: { encodedPolyline: string };
    legs?: {
      endLocation?: { latLng: { latitude: number; longitude: number } };
      steps?: {
        distanceMeters?: number;
        startLocation?: { latLng: { latitude: number; longitude: number } };
        navigationInstruction?: { maneuver?: string; instructions?: string };
      }[];
    }[];
  }[];
};

export type RouteProfile = 'DRIVE' | 'WALK' | 'BICYCLE';

type RouteOptions = {
  profile?: RouteProfile;
  /** Ask for other ways to go. Google only offers them when there are no stops. */
  alternatives?: boolean;
};

/**
 * Traffic-unaware routing is the cheaper tier. Switch to 'TRAFFIC_AWARE' for ETAs that follow live
 * traffic; it is billed at the higher "Pro" tier with a smaller free allowance.
 */
const ROUTING_PREFERENCE = 'TRAFFIC_UNAWARE';

/** The Google maneuver names, as the type and modifier the rest of the app (icons, turn banner) knows. */
function maneuverOf(maneuver: string | undefined): { type?: string; modifier?: string } {
  switch (maneuver) {
    case 'DEPART':
      return { type: 'depart' };
    case 'TURN_LEFT':
      return { type: 'turn', modifier: 'left' };
    case 'TURN_RIGHT':
      return { type: 'turn', modifier: 'right' };
    case 'TURN_SLIGHT_LEFT':
      return { type: 'turn', modifier: 'slight left' };
    case 'TURN_SLIGHT_RIGHT':
      return { type: 'turn', modifier: 'slight right' };
    case 'TURN_SHARP_LEFT':
      return { type: 'turn', modifier: 'sharp left' };
    case 'TURN_SHARP_RIGHT':
      return { type: 'turn', modifier: 'sharp right' };
    case 'UTURN_LEFT':
    case 'UTURN_RIGHT':
      return { type: 'turn', modifier: 'uturn' };
    case 'MERGE':
      return { type: 'merge' };
    case 'RAMP_LEFT':
    case 'FORK_LEFT':
      return { type: 'fork', modifier: 'slight left' };
    case 'RAMP_RIGHT':
    case 'FORK_RIGHT':
      return { type: 'fork', modifier: 'slight right' };
    case 'KEEP_LEFT':
      return { type: 'continue', modifier: 'slight left' };
    case 'KEEP_RIGHT':
      return { type: 'continue', modifier: 'slight right' };
    case 'ROUNDABOUT_LEFT':
    case 'ROUNDABOUT_RIGHT':
      return { type: 'roundabout' };
    case 'STRAIGHT':
    case 'NAME_CHANGE':
      return { type: 'continue', modifier: 'straight' };
    default:
      return {};
  }
}

/** Decodes Google's encoded polyline (precision 5) into [longitude, latitude] pairs. */
export function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  while (index < encoded.length) {
    for (const axis of ['lat', 'lng'] as const) {
      let result = 0;
      let shift = 0;
      let byte: number;
      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20 && index < encoded.length + 1);
      const delta = result & 1 ? ~(result >> 1) : result >> 1;
      if (axis === 'lat') lat += delta;
      else lng += delta;
    }
    points.push([lng / 1e5, lat / 1e5]);
  }
  return points;
}

const latLng = (c: Coord) => ({ location: { latLng: { latitude: c.latitude, longitude: c.longitude } } });

/**
 * Routes through `points` in order (start, stops…, end). The first route is the one Google
 * recommends; with `alternatives` there can be more.
 */
export async function getRoutes(points: Coord[], options: RouteOptions = {}): Promise<Route[]> {
  if (points.length < 2) return [];
  if (!hasMaps) return [straightLineRoute(points)];

  const { profile = 'DRIVE', alternatives = false } = options;
  const origin = points[0];
  const destination = points[points.length - 1];
  const intermediates = points.slice(1, -1);

  const res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
    method: 'POST',
    headers: headers(
      [
        'routes.distanceMeters',
        'routes.duration',
        'routes.polyline.encodedPolyline',
        'routes.legs.endLocation',
        'routes.legs.steps.distanceMeters',
        'routes.legs.steps.startLocation',
        'routes.legs.steps.navigationInstruction',
      ].join(','),
    ),
    body: JSON.stringify({
      origin: latLng(origin),
      destination: latLng(destination),
      ...(intermediates.length > 0 ? { intermediates: intermediates.map(latLng) } : null),
      travelMode: profile,
      ...(profile === 'DRIVE' ? { routingPreference: ROUTING_PREFERENCE } : null),
      computeAlternativeRoutes: alternatives && intermediates.length === 0,
      languageCode: languageCode(),
      units: 'METRIC',
      polylineQuality: 'HIGH_QUALITY',
    }),
  });
  if (!res.ok) throw await failure(res, t('err.directionsHttp'));
  const json = (await res.json()) as RoutesResponse;
  if (!json.routes?.length) throw new Error(t('err.noRoute'));

  return json.routes.map((route) => {
    const legs = route.legs ?? [];
    const steps: RouteStep[] = [];

    legs.forEach((leg, legIndex) => {
      (leg.steps ?? []).forEach((step, stepIndex) => {
        const start = step.startLocation?.latLng;
        const nav = step.navigationInstruction;
        const distance = step.distanceMeters ?? 0;
        if (!start) return;
        // A step without an instruction is a continuation: fold its length into the step before.
        if (!nav?.instructions && steps.length > 0 && stepIndex > 0) {
          steps[steps.length - 1].distance += distance;
          return;
        }
        const first = legIndex === 0 && stepIndex === 0;
        const known = maneuverOf(nav?.maneuver);
        steps.push({
          instruction: nav?.instructions ?? t('nav.head'),
          distance,
          location: { latitude: start.latitude, longitude: start.longitude },
          type: known.type ?? (first ? 'depart' : undefined),
          modifier: known.modifier,
        });
      });

      // Google has no "arrive" step: close each leg with one, so the turn banner announces a
      // stop and then the destination the way the old routes did.
      const end = leg.endLocation?.latLng ?? toCoordFromPoint(points[legIndex + 1]);
      steps.push({
        instruction: legIndex === legs.length - 1 ? t('nav.arrived') : t('nav.arrivedStop'),
        distance: 0,
        location: { latitude: end.latitude, longitude: end.longitude },
        type: 'arrive',
      });
    });

    return {
      geometry: route.polyline ? decodePolyline(route.polyline.encodedPolyline) : [],
      distance: route.distanceMeters ?? 0,
      duration: parseFloat(route.duration ?? '0'),
      steps,
    };
  });
}

const toCoordFromPoint = (c: Coord) => ({ latitude: c.latitude, longitude: c.longitude });

export async function getRoute(from: Coord, to: Coord, profile: RouteProfile = 'DRIVE'): Promise<Route> {
  const [route] = await getRoutes([from, to], { profile });
  if (!route) throw new Error(t('err.noRoute'));
  return route;
}

/**
 * A route from `from` through `stops` to `destination`, with the stops recorded on it. Without
 * stops it can return alternatives (the recommended route first).
 */
export async function planRoutes(
  from: Coord,
  stops: Place[],
  destination: Place,
  options: { alternatives?: boolean } = {},
): Promise<Route[]> {
  const routes = await getRoutes([from, ...stops.map((s) => s.coord), destination.coord], {
    alternatives: options.alternatives,
  });
  return routes.map((route) => (stops.length > 0 ? { ...route, stops } : route));
}

type GeocodeResponse = {
  results?: { address_components: { long_name: string; types: string[] }[] }[];
};

const NAME_PRIORITY = ['point_of_interest', 'establishment', 'premise', 'route', 'neighborhood', 'sublocality_level_1', 'sublocality', 'locality'];
const AREA_TYPES = ['sublocality_level_1', 'sublocality', 'locality', 'administrative_area_level_1', 'country'];

/**
 * The place at a point on the map: a landmark or street with its area. Returns null when Google
 * knows nothing useful there (open water, a field) or when there is no key.
 */
export async function reversePlace(coord: Coord): Promise<{ name: string; subtitle?: string } | null> {
  if (!hasMaps) return null;
  const params = new URLSearchParams({
    latlng: `${coord.latitude},${coord.longitude}`,
    language: languageCode(),
    // Skip "plus code" and bare postcode results: they make poor place names.
    result_type: 'point_of_interest|premise|street_address|route|neighborhood|sublocality|locality',
    key: GOOGLE_MAPS_KEY,
  });
  try {
    const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params}`);
    if (!res.ok) return null;
    const json = (await res.json()) as GeocodeResponse;
    const components = json.results?.[0]?.address_components;
    if (!components?.length) return null;
    const named = NAME_PRIORITY.map((type) => components.find((c) => c.types.includes(type))).find(Boolean);
    const name = named?.long_name ?? components[0].long_name;
    const area = AREA_TYPES.map((type) => components.find((c) => c.types.includes(type))?.long_name).filter(
      (value, index, all): value is string => !!value && value !== name && all.indexOf(value) === index,
    );
    return { name, subtitle: area.slice(0, 3).join(', ') || undefined };
  } catch {
    return null;
  }
}

/** Demo fallback used when no Google key is configured: straight lines from point to point. */
function straightLineRoute(points: Coord[]): Route {
  const geometry: [number, number][] = [];
  const steps: Route['steps'] = [];
  let distance = 0;

  for (let leg = 0; leg < points.length - 1; leg += 1) {
    const from = points[leg];
    const to = points[leg + 1];
    const legDistance = distanceBetween(from, to);
    distance += legDistance;
    const segments = 40;
    for (let i = leg === 0 ? 0 : 1; i <= segments; i += 1) {
      const f = i / segments;
      geometry.push(
        toLngLat({
          latitude: from.latitude + (to.latitude - from.latitude) * f,
          longitude: from.longitude + (to.longitude - from.longitude) * f,
        }),
      );
    }
    steps.push({ instruction: t('nav.head'), distance: legDistance, location: from, type: leg === 0 ? 'depart' : 'turn' });
    steps.push({ instruction: t('nav.arrived'), distance: 0, location: to, type: 'arrive' });
  }

  return { geometry, distance, duration: distance / (60 / 3.6), steps };
}
