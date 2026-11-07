import type { LucideIcon } from 'lucide-react-native';

import type { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type IconProps = {
  /** A Lucide icon component, e.g. `MapPin`. */
  icon: LucideIcon;
  size?: number;
  /** A theme colour token or any colour string. */
  color?: ThemeColor | (string & {});
  strokeWidth?: number;
  fill?: string;
};

/** Lucide icon that follows the theme. Same glyphs on iOS, Android and web. */
export function Icon({ icon: Glyph, size = 22, color = 'text', strokeWidth = 2, fill }: IconProps) {
  const theme = useTheme();
  const resolved = color in theme ? theme[color as ThemeColor] : color;
  return <Glyph size={size} color={resolved} strokeWidth={strokeWidth} fill={fill ?? 'none'} />;
}
