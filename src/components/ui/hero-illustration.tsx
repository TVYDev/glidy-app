import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';

/**
 * Welcome-screen illustration drawn with SVG so it follows the theme: a sunny landscape
 * with a dashed shared route, a few travellers along it, and the destination pin.
 */
export function HeroIllustration({ height = 250 }: { height?: number }) {
  const theme = useTheme();
  const ink = theme.ink;
  const ring = theme.backgroundElement;

  return (
    <Svg width="100%" height={height} viewBox="0 0 320 250">
      <Rect x="0" y="0" width="320" height="250" rx="32" fill={theme.accent} />
      {/* sun */}
      <Circle cx="248" cy="68" r="34" fill={theme.primary} />
      <Circle cx="248" cy="68" r="48" fill={theme.primary} opacity={0.18} />
      {/* clouds */}
      <G fill={ring} opacity={0.9}>
        <Circle cx="64" cy="58" r="14" />
        <Circle cx="82" cy="52" r="18" />
        <Circle cx="102" cy="60" r="13" />
        <Rect x="52" y="58" width="62" height="14" rx="7" />
      </G>
      {/* hills */}
      <Path
        d="M0 190 C50 140 110 150 165 178 C215 202 270 158 320 142 L320 250 L0 250 Z"
        fill={theme.primaryDark}
        opacity={0.28}
      />
      <Path d="M0 214 C70 176 130 206 190 196 C245 187 285 174 320 182 L320 250 L0 250 Z" fill={theme.primary} opacity={0.7} />
      <Path d="M0 236 C80 216 150 238 220 228 C268 221 300 224 320 228 L320 250 L0 250 Z" fill={theme.primaryDark} opacity={0.55} />
      {/* shared route */}
      <Path
        d="M36 226 C84 190 118 224 168 190 S 246 128 266 98"
        stroke={ink}
        strokeWidth={3.5}
        strokeLinecap="round"
        strokeDasharray="1 9"
        fill="none"
      />
      {/* travellers */}
      <G>
        <Circle cx="64" cy="208" r="13" fill="#2D6CDF" stroke={ring} strokeWidth={3} />
        <Circle cx="132" cy="214" r="13" fill="#B23A8A" stroke={ring} strokeWidth={3} />
        <Circle cx="204" cy="168" r="13" fill="#0E8F8F" stroke={ring} strokeWidth={3} />
      </G>
      {/* destination pin */}
      <Path
        d="M266 62 C250 62 240 74 240 86 C240 104 266 128 266 128 C266 128 292 104 292 86 C292 74 282 62 266 62 Z"
        fill={ink}
      />
      <Circle cx="266" cy="85" r="9" fill={theme.primary} />
    </Svg>
  );
}
