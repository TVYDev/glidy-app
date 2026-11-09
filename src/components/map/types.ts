import type { Avatar, MemberLocation, Place, Route } from '@/lib/types';

export type LiveMapProps = {
  route: Route | null;
  /** Other ways to go, drawn faintly under the chosen route while the leader compares them. */
  alternatives?: Route[];
  destination: Place | null;
  me: MemberLocation | null;
  others: MemberLocation[];
  /** Pictures by user id (mine included). Anyone missing is drawn with their initials. */
  avatars?: Record<string, Avatar | null | undefined>;
  /** Who leads the group: their avatar wears a crown. */
  leaderId?: string;
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
  /** Called with the point the user tapped on the map. Absent means taps do nothing. */
  onMapPress?: (coord: import('@/lib/types').Coord) => void;
  /** A temporary pin for a tapped point that has not been chosen yet. */
  tappedPin?: import('@/lib/types').Coord | null;
  /** Space the overlays take, so the camera keeps points clear of them. */
  insets: { top: number; bottom: number };
};
