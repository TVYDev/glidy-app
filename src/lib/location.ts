import * as Location from 'expo-location';

import { DEFAULT_ORIGIN } from '@/lib/mapbox-api';
import type { Coord } from '@/lib/types';

/** Resolves to `null` if the promise has not settled within `ms` (it is not cancelled). */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

/**
 * Best-effort current position for planning a route. Falls back to a default
 * region (so the flow never hangs and demos still work) when permission is
 * denied, location services are off, or no fix arrives in time.
 */
export async function getOrigin(): Promise<{ coord: Coord; isFallback: boolean }> {
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) return { coord: DEFAULT_ORIGIN, isFallback: true };

    const last = await withTimeout(Location.getLastKnownPositionAsync(), 3000);
    if (last) return { coord: toCoord(last), isFallback: false };

    const current = await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      6000,
    );
    if (current) return { coord: toCoord(current), isFallback: false };
  } catch {
    // Fall through to the default origin.
  }
  return { coord: DEFAULT_ORIGIN, isFallback: true };
}

export function toCoord(location: Location.LocationObject): Coord {
  return { latitude: location.coords.latitude, longitude: location.coords.longitude };
}
