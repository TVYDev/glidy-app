import {
  ArrowUp,
  ArrowUpLeft,
  ArrowUpRight,
  CornerDownLeft,
  CornerDownRight,
  CornerUpLeft,
  CornerUpRight,
  Flag,
  Merge,
  Navigation2,
  RotateCw,
  Undo2,
  type LucideIcon,
} from 'lucide-react-native';

import type { RouteStep } from '@/lib/types';

/**
 * Icon for a turn. Uses the manoeuvre type and modifier when the route has them (routes
 * saved earlier do not, and fall back to the first words of the instruction).
 */
export function maneuverIcon(step: Pick<RouteStep, 'type' | 'modifier' | 'instruction'>): LucideIcon {
  const type = step.type ?? '';
  const modifier = step.modifier ?? inferModifier(step.instruction);

  if (type === 'arrive') return Flag;
  if (type === 'depart') return Navigation2;
  if (type === 'roundabout' || type === 'rotary' || type === 'roundabout turn') return RotateCw;
  if (type === 'merge') return Merge;

  switch (modifier) {
    case 'uturn':
      return Undo2;
    case 'sharp left':
      return CornerDownLeft;
    case 'sharp right':
      return CornerDownRight;
    case 'left':
      return CornerUpLeft;
    case 'right':
      return CornerUpRight;
    case 'slight left':
      return ArrowUpLeft;
    case 'slight right':
      return ArrowUpRight;
    default:
      return ArrowUp;
  }
}

function inferModifier(instruction: string): string | undefined {
  const text = instruction.toLowerCase();
  if (text.includes('u-turn')) return 'uturn';
  if (text.includes('sharp left')) return 'sharp left';
  if (text.includes('sharp right')) return 'sharp right';
  if (text.includes('slight left')) return 'slight left';
  if (text.includes('slight right')) return 'slight right';
  if (text.includes('left')) return 'left';
  if (text.includes('right')) return 'right';
  return undefined;
}
