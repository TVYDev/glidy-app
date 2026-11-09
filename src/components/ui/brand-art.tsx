import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';

/**
 * Glidy's drawn identity: a route line that curves from a start dot to a pin. The same motif is
 * the logo, the hero-card decoration, the empty-state art and each trip's thumbnail, so the app
 * reads as one thing instead of generic cards and icons.
 */

/** App mark: an amber tile with a route curve ending in a pin. */
export function LogoMark({ size = 40 }: { size?: number }) {
  const theme = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Rect width="100" height="100" rx="30" fill={theme.primary} />
      <Path
        d="M26 74 C 24 46, 58 66, 62 36"
        stroke={theme.ink}
        strokeWidth={8}
        strokeLinecap="round"
        fill="none"
      />
      <Circle cx="26" cy="74" r="8" fill={theme.ink} />
      <Circle cx="63" cy="30" r="13" fill={theme.ink} />
      <Circle cx="63" cy="30" r="5" fill={theme.primary} />
    </Svg>
  );
}

/** Decorative route for the back of a hero card: dashed line, stops, and a pin. */
export function RouteMotif({ width = 320, height = 150, color }: { width?: number; height?: number; color: string }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 320 150">
      <Path
        d="M12 128 C 70 128, 70 54, 128 62 S 206 122, 252 52"
        stroke={color}
        strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray="1 11"
        fill="none"
      />
      <Circle cx="12" cy="128" r="8" fill={color} />
      <Circle cx="128" cy="62" r="6" fill={color} opacity={0.55} />
      <G>
        <Path
          d="M252 12 C 238 12 229 23 229 34 C 229 50 252 70 252 70 C 252 70 275 50 275 34 C 275 23 266 12 252 12 Z"
          fill={color}
        />
        <Circle cx="252" cy="33" r="8" fill="#FFFFFF" opacity={0.9} />
      </G>
    </Svg>
  );
}

type EmptyArtProps = { kind: 'groups' | 'routes'; size?: number };

/** Illustration for an empty list: friends on a road for groups, a folded map for routes. */
export function EmptyArt({ kind, size = 150 }: EmptyArtProps) {
  const theme = useTheme();
  const road = theme.backgroundSelected;
  const ink = theme.line;

  if (kind === 'groups') {
    return (
      <Svg width={size} height={size * 0.7} viewBox="0 0 200 140">
        <Rect x="0" y="0" width="200" height="140" rx="28" fill={theme.accent} />
        <Path d="M-10 118 C 50 70, 120 130, 210 62 L 210 100 C 120 170, 50 110, -10 158 Z" fill={road} />
        <Path
          d="M-6 138 C 52 92, 120 148, 206 82"
          stroke={theme.primaryDark}
          strokeWidth={3}
          strokeDasharray="1 9"
          strokeLinecap="round"
          fill="none"
        />
        <Circle cx="46" cy="104" r="15" fill="#2D6CDF" stroke={theme.backgroundElement} strokeWidth={4} />
        <Circle cx="88" cy="112" r="15" fill="#B23A8A" stroke={theme.backgroundElement} strokeWidth={4} />
        <Circle cx="132" cy="96" r="15" fill="#0E8F8F" stroke={theme.backgroundElement} strokeWidth={4} />
        <Path
          d="M168 28 C 158 28 151 36 151 44 C 151 56 168 70 168 70 C 168 70 185 56 185 44 C 185 36 178 28 168 28 Z"
          fill={ink}
        />
        <Circle cx="168" cy="43" r="6" fill={theme.accent} />
        <Circle cx="40" cy="34" r="22" fill={theme.primary} opacity={0.9} />
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size * 0.7} viewBox="0 0 200 140">
      <Rect x="0" y="0" width="200" height="140" rx="28" fill={theme.accent} />
      <Path d="M30 30 L 78 22 L 122 34 L 170 24 L 170 112 L 122 122 L 78 110 L 30 120 Z" fill={theme.backgroundElement} />
      <Path d="M78 22 L 78 110 M 122 34 L 122 122" stroke={road} strokeWidth={3} />
      <Path
        d="M44 98 C 70 100, 70 54, 100 62 S 134 90, 154 46"
        stroke={ink}
        strokeWidth={3.5}
        strokeDasharray="1 8"
        strokeLinecap="round"
        fill="none"
      />
      <Circle cx="44" cy="98" r="6" fill={ink} />
      <Circle cx="154" cy="42" r="10" fill={theme.primary} stroke={ink} strokeWidth={3} />
    </Svg>
  );
}

type ThumbProps = {
  /** Route geometry, [longitude, latitude] pairs. */
  geometry: [number, number][];
  size?: number;
};

/** The real shape of a trip as a small line drawing, with a start dot and an end pin. */
export function RouteThumb({ geometry, size = 56 }: ThumbProps) {
  const theme = useTheme();
  const pad = 9;
  const inner = size - pad * 2;

  const points = geometry.length > 80 ? geometry.filter((_, i) => i % Math.ceil(geometry.length / 80) === 0) : geometry;
  const last = geometry[geometry.length - 1];
  if (points.length < 2 || !last) return <ThumbPlaceholder size={size} color={theme.accent} />;
  points.push(last);

  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const [lng, lat] of points) {
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }
  // Keep the real proportions: a long thin route stays long and thin.
  const spanX = Math.max(maxLng - minLng, 1e-9);
  const spanY = Math.max(maxLat - minLat, 1e-9);
  const scale = inner / Math.max(spanX, spanY);
  const offsetX = pad + (inner - spanX * scale) / 2;
  const offsetY = pad + (inner - spanY * scale) / 2;
  const project = ([lng, lat]: [number, number]) => ({
    x: offsetX + (lng - minLng) * scale,
    y: offsetY + (maxLat - lat) * scale,
  });

  const projected = points.map(project);
  const d = projected.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const start = projected[0];
  const end = projected[projected.length - 1];

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Rect width={size} height={size} rx={size * 0.3} fill={theme.accent} />
      <Path d={d} stroke={theme.line} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Circle cx={start.x} cy={start.y} r={3.4} fill={theme.line} />
      <Circle cx={end.x} cy={end.y} r={5} fill={theme.primary} stroke={theme.line} strokeWidth={2} />
    </Svg>
  );
}

function ThumbPlaceholder({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 10 10">
      <Rect width="10" height="10" rx="3" fill={color} />
    </Svg>
  );
}
