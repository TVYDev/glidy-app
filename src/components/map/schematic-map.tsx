import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { MapPin } from 'lucide-react-native';

import { Icon } from '@/components/ui/icon';
import { Radius, Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';
import { boundsOf, toLngLat } from '@/lib/geo';
import type { LiveMapProps } from '@/components/map/types';

/**
 * Tile-free stand-in for the Mapbox map. It plots the route, destination and
 * travellers on a plain canvas, so the live flow works without a Mapbox token
 * (and on web, where the native map is unavailable).
 */
export function SchematicMap({ route, destination, me, others, insets }: LiveMapProps) {
  const theme = useTheme();
  const { t } = useI18n();
  const [size, setSize] = useState({ width: 0, height: 0 });

  const onLayout = (e: LayoutChangeEvent) => setSize(e.nativeEvent.layout);

  const points: [number, number][] = [
    ...(route?.geometry ?? []),
    ...(destination ? [toLngLat(destination.coord)] : []),
    ...(me ? [toLngLat(me.coord)] : []),
    ...others.map((o) => toLngLat(o.coord)),
  ];
  const bounds = boundsOf(points);

  const padding = 32;
  const top = insets.top + padding;
  const bottom = insets.bottom + padding;
  const innerW = Math.max(1, size.width - padding * 2);
  const innerH = Math.max(1, size.height - top - bottom);

  const project = ([lng, lat]: [number, number]) => {
    if (!bounds) return { x: size.width / 2, y: size.height / 2 };
    const fx = (lng - bounds.sw[0]) / (bounds.ne[0] - bounds.sw[0]);
    const fy = 1 - (lat - bounds.sw[1]) / (bounds.ne[1] - bounds.sw[1]);
    return { x: padding + fx * innerW, y: top + fy * innerH };
  };

  // Thin the route so we draw at most ~60 dots.
  const geometry = route?.geometry ?? [];
  const stride = Math.max(1, Math.ceil(geometry.length / 60));
  const dots = geometry.filter((_, i) => i % stride === 0);

  return (
    <View style={[styles.fill, { backgroundColor: theme.backgroundSelected }]} onLayout={onLayout}>
      {size.width > 0 && (
        <>
          {dots.map(([lng, lat], i) => {
            const p = project([lng, lat]);
            return <View key={i} style={[styles.dot, { left: p.x - 3, top: p.y - 3, backgroundColor: theme.ink }]} />;
          })}
          {destination && <Pin point={project(toLngLat(destination.coord))} />}
          {others.map((o) => {
            const p = project(toLngLat(o.coord));
            return (
              <View key={o.userId} style={[styles.marker, { left: p.x - 18, top: p.y - 18 }]}>
                <Avatar userId={o.userId} name={o.displayName} size={36} ring="#FFFFFF" />
              </View>
            );
          })}
          {me && (
            <View
              style={[
                styles.marker,
                { left: project(toLngLat(me.coord)).x - 20, top: project(toLngLat(me.coord)).y - 20 },
              ]}>
              <Avatar userId={me.userId} name={me.displayName} size={40} ring={theme.primary} />
            </View>
          )}
        </>
      )}
      {size.height > 400 && (
        <View style={[styles.notice, { backgroundColor: theme.backgroundElement, bottom: insets.bottom + Spacing.two }]}>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {t('map.schematic')}
          </ThemedText>
        </View>
      )}
    </View>
  );
}

function Pin({ point }: { point: { x: number; y: number } }) {
  return (
    <View style={[styles.marker, { left: point.x - 17, top: point.y - 34 }]}>
      <Icon icon={MapPin} size={34} color="ink" fill="#EFB708" />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  dot: { position: 'absolute', width: 6, height: 6, borderRadius: 3 },
  marker: { position: 'absolute' },
  notice: {
    position: 'absolute',
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
    opacity: 0.9,
  },
});
