import { useState } from 'react';

import { bearingBetween, distanceBetween, lerpAngle } from '@/lib/geo';
import type { Coord, MemberLocation } from '@/lib/types';

type State = {
  /** The position object last processed. A new object means a new GPS fix. */
  seen: Coord | null;
  /** The fix the next bearing is measured from; only advances after real movement. */
  reference: Coord | null;
  heading: number | null;
};

/** Below this speed the compass heading from GPS is noise, so keep the last good one. */
const MIN_SPEED = 1.5;
/** Minimum movement before a bearing between two fixes is trusted. */
const MIN_MOVE_METRES = 8;

/**
 * The direction of travel, smoothed. Uses the GPS heading when moving at speed, otherwise the
 * bearing between two recent fixes, and holds the last value when standing still so the map does
 * not spin at a red light.
 *
 * The state is updated while rendering (no effect), which React allows only if the update is
 * idempotent. So it runs once per GPS fix, keyed on the identity of the position object, and never
 * on a plain re-render: smoothing again on every render would never settle and loop forever.
 */
export function useHeading(position: MemberLocation | null): number | null {
  const [state, setState] = useState<State>({ seen: null, reference: null, heading: null });

  if (position && position.coord !== state.seen) {
    const gpsHeading =
      position.heading != null && position.heading >= 0 && (position.speed ?? 0) > MIN_SPEED ? position.heading : null;
    const moved = state.reference ? distanceBetween(state.reference, position.coord) : Infinity;

    let raw: number | null = null;
    let reference = state.reference;
    if (gpsHeading != null) {
      raw = gpsHeading;
      reference = position.coord;
    } else if (state.reference && moved > MIN_MOVE_METRES) {
      raw = bearingBetween(state.reference, position.coord);
      reference = position.coord;
    } else if (!state.reference) {
      reference = position.coord;
    }

    const heading = raw == null ? state.heading : state.heading == null ? raw : lerpAngle(state.heading, raw, 0.6);
    setState({ seen: position.coord, reference, heading });
  }

  return state.heading;
}
