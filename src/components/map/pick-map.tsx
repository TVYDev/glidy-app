import type { PickMapProps } from '@/components/map/pick-map-types';
import { hasMaps } from '@/lib/maps-api';

type GoogleModule = typeof import('@/components/map/google-pick-map');

let google: GoogleModule | null | undefined;

/** Loaded on first use; null when this build has no native map (see live-map.tsx). */
function loadGoogleMap(): GoogleModule | null {
  if (google === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const loaded = require('@/components/map/google-pick-map') as GoogleModule | undefined;
      google = loaded?.PickMap ? loaded : null;
    } catch (e) {
      if (__DEV__) console.warn('[map] Google map unavailable in this build:', e instanceof Error ? e.message : e);
      google = null;
    }
  }
  return google;
}

/** The map for choosing a point. Renders nothing in demo mode or in a build without the native map. */
export function PickMap(props: PickMapProps) {
  const module = hasMaps ? loadGoogleMap() : null;
  if (!module) return null;
  return <module.PickMap {...props} />;
}
