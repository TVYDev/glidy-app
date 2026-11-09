import Svg, { Defs, Ellipse, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';

/**
 * The traveller's arrow in drive mode, drawn top-down for a flat marker: lying on the road it is
 * tilted with the map, so it reads as a 3D object. A soft ground shadow, a lit left face and a darker
 * right face give it a faceted look, and the tip is the direction of travel (marker rotation).
 */
export function DriveArrow({ size = 64 }: { size?: number }) {
  const theme = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <RadialGradient id="shadow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#000" stopOpacity="0.38" />
          <Stop offset="1" stopColor="#000" stopOpacity="0" />
        </RadialGradient>
        <LinearGradient id="lit" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFD84D" />
          <Stop offset="1" stopColor={theme.primary} />
        </LinearGradient>
      </Defs>
      {/* Soft shadow on the road under the arrow. */}
      <Ellipse cx="32" cy="36" rx="26" ry="26" fill="url(#shadow)" />
      {/* White rim so it stands out on any road colour. */}
      <Path
        d="M32 5 L53 54 L32 43 L11 54 Z"
        fill="#FFFFFF"
        stroke="#FFFFFF"
        strokeWidth={6}
        strokeLinejoin="round"
      />
      {/* Left (lit) and right (shaded) faces meet along the spine. */}
      <Path d="M32 5 L32 43 L11 54 Z" fill="url(#lit)" />
      <Path d="M32 5 L53 54 L32 43 Z" fill={theme.primaryDark} />
      {/* A thin highlight along the spine. */}
      <Path d="M32 8 L32 41" stroke="#FFFFFF" strokeOpacity={0.55} strokeWidth={1.2} strokeLinecap="round" />
    </Svg>
  );
}
