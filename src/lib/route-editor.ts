import { router } from 'expo-router';

import { openForResult } from '@/lib/screen-results';
import type { Coord, Place, Route } from '@/lib/types';

export const EDIT_ROUTE_KEY = 'edit-route';

export type EditRoutePayload = {
  destination: Place;
  /** Stops already on the route, in order. */
  stops: Place[];
  /** Where the route starts. When null the editor uses the phone's position. */
  origin: Coord | null;
};

export type EditRouteResult = { destination: Place; route: Route };

/** Opens the route editor and resolves with the new destination and route, or null if dismissed. */
export function editRoute(payload: EditRoutePayload): Promise<EditRouteResult | null> {
  return openForResult<EditRouteResult, EditRoutePayload>(EDIT_ROUTE_KEY, payload, () => router.push('/route/edit'));
}
