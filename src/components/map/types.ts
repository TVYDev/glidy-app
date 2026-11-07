import type { MemberLocation, Place, Route } from '@/lib/types';

export type LiveMapProps = {
  route: Route | null;
  destination: Place | null;
  me: MemberLocation | null;
  others: MemberLocation[];
  /** Increment to re-fit the camera to the route and everyone on it. */
  fitSignal: number;
  /** Keeps the camera on my own position as it moves. Ignored by the schematic map. */
  followMe?: boolean;
  /** Drive mode: heading-up tilted camera and an arrow instead of an avatar. Absent when not driving. */
  drive?: {
    /** The camera is locked onto me. False after the user drags the map. */
    locked: boolean;
    /** Direction of travel in degrees, or null before it is known. */
    heading: number | null;
    /** Speed in m/s, or null. */
    speed: number | null;
  };
  /** Where I am on the route: the part behind me is drawn grey. */
  routeSnap?: { index: number; point: [number, number] } | null;
  /** Space the overlays take, so the camera keeps points clear of them. */
  insets: { top: number; bottom: number };
};
