import type { Coord } from '@/lib/types';

export type PickMapProps = {
  /** Where the map starts. */
  initial: Coord;
  /** Moves the map to a place; a new `key` is a new request. */
  focus?: { key: number; coord: Coord } | null;
  /** True while a finger is moving the map. */
  onMoving: (moving: boolean) => void;
  /** The map came to rest with this point at its centre. */
  onSettled: (centre: Coord) => void;
};
