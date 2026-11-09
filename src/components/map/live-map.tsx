import { SchematicMap } from '@/components/map/schematic-map';
import type { LiveMapProps } from '@/components/map/types';
import { hasMaps } from '@/lib/maps-api';

type GoogleModule = typeof import('@/components/map/google-live-map');

let google: GoogleModule | null | undefined;

/**
 * The Google map is loaded on first use, not at startup, so demo mode never touches the native map
 * module. If it cannot be loaded (a dev build made before react-native-maps was added has no native
 * code for it) the app falls back to the schematic map instead of crashing the screen.
 */
function loadGoogleMap(): GoogleModule | null {
  if (google === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const loaded = require('@/components/map/google-live-map') as GoogleModule | undefined;
      google = loaded?.GoogleLiveMap ? loaded : null;
    } catch (e) {
      if (__DEV__) console.warn('[map] Google map unavailable in this build:', e instanceof Error ? e.message : e);
      google = null;
    }
  }
  return google;
}

/** Live Google map, or the schematic view when there is no key or this build cannot draw it. */
export function LiveMap(props: LiveMapProps) {
  const module = hasMaps ? loadGoogleMap() : null;
  if (!module) return <SchematicMap {...props} />;
  return <module.GoogleLiveMap {...props} />;
}
