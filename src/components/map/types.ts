import type { MemberLocation, Place, Route } from '@/lib/types';

export type LiveMapProps = {
  route: Route | null;
  destination: Place | null;
  me: MemberLocation | null;
  others: MemberLocation[];
  /** Increment to re-fit the camera to the route and everyone on it. */
  fitSignal: number;
  /** Space the overlays take, so the camera keeps points clear of them. */
  insets: { top: number; bottom: number };
};
