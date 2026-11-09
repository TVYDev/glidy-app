import { router } from 'expo-router';

import { openForResult } from '@/lib/screen-results';
import type { Coord, Place } from '@/lib/types';

export const PICK_PLACE_KEY = 'pick-place';
export type PickPlacePayload = { near: Coord | null };

/** Opens the map picker and resolves with the chosen place, or null if it was dismissed. */
export function pickPlaceOnMap(near?: Coord | null): Promise<Place | null> {
  return openForResult<Place, PickPlacePayload>(PICK_PLACE_KEY, { near: near ?? null }, () =>
    router.push('/place/pick'),
  );
}

export const SEARCH_PLACE_KEY = 'search-place';
export type SearchPlacePayload = { near: Coord | null; mapPick: boolean; placeholder?: string };

/** Opens full-screen place search and resolves with the chosen place, or null if it was dismissed. */
export function searchPlaceFullScreen(payload: SearchPlacePayload): Promise<Place | null> {
  return openForResult<Place, SearchPlacePayload>(SEARCH_PLACE_KEY, payload, () => router.push('/place/search'));
}
