import Mapbox, { Camera, LineLayer, MapView, MarkerView, ShapeSource } from '@rnmapbox/maps';
import { useEffect, useRef } from 'react';
import { StyleSheet, useColorScheme, View } from 'react-native';

import { SchematicMap } from '@/components/map/schematic-map';
import type { LiveMapProps } from '@/components/map/types';
import { Avatar } from '@/components/ui/avatar';
import { Icon } from '@/components/ui/icon';
import { useTheme } from '@/hooks/use-theme';
import { boundsOf, toLngLat } from '@/lib/geo';
import { MAPBOX_TOKEN, hasMapbox } from '@/lib/mapbox-api';

if (hasMapbox) {
  Mapbox.setAccessToken(MAPBOX_TOKEN);
}

/** Live Mapbox map. Falls back to the schematic view when no token is configured. */
export function LiveMap(props: LiveMapProps) {
  if (!hasMapbox) return <SchematicMap {...props} />;
  return <MapboxLiveMap {...props} />;
}

function MapboxLiveMap({ route, destination, me, others, fitSignal, insets }: LiveMapProps) {
  const theme = useTheme();
  const isDark = useColorScheme() === 'dark';
  const camera = useRef<Camera>(null);
  const fitted = useRef(false);

  const points: [number, number][] = [
    ...(route?.geometry ?? []),
    ...(destination ? [toLngLat(destination.coord)] : []),
    ...(me ? [toLngLat(me.coord)] : []),
    ...others.map((o) => toLngLat(o.coord)),
  ];
  const bounds = boundsOf(points);

  // Fit when the first data arrives and whenever the user asks to re-centre.
  const hasData = bounds !== null;
  useEffect(() => {
    if (!bounds || !camera.current) return;
    if (fitted.current && fitSignal === 0) return;
    fitted.current = true;
    camera.current.fitBounds(bounds.ne, bounds.sw, [insets.top + 24, 40, insets.bottom + 24, 40], 600);
    // Re-fit only when asked, or once data first appears: not on every location tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitSignal, hasData]);

  const line: GeoJSON.Feature<GeoJSON.LineString> | null = route
    ? { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: route.geometry } }
    : null;

  return (
    <MapView
      style={styles.fill}
      styleURL={isDark ? Mapbox.StyleURL.Dark : Mapbox.StyleURL.Street}
      logoEnabled={false}
      scaleBarEnabled={false}
      attributionPosition={{ bottom: insets.bottom + 8, left: 8 }}
      compassEnabled
      compassPosition={{ top: insets.top + 56, right: 12 }}>
      <Camera ref={camera} defaultSettings={{ centerCoordinate: [0, 20], zoomLevel: 1 }} />

      {line && (
        <ShapeSource id="route" shape={line}>
          <LineLayer id="route-casing" style={{ lineColor: '#FFFFFF', lineWidth: 9, lineCap: 'round', lineJoin: 'round' }} />
          <LineLayer id="route-line" style={{ lineColor: theme.primary, lineWidth: 5, lineCap: 'round', lineJoin: 'round' }} />
        </ShapeSource>
      )}

      {destination && (
        <MarkerView coordinate={toLngLat(destination.coord)} anchor={{ x: 0.5, y: 1 }}>
          <View>
            <Icon sf="mappin.circle.fill" md="location_on" size={34} color="#E0551E" />
          </View>
        </MarkerView>
      )}

      {others.map((o) => (
        <MarkerView key={o.userId} coordinate={toLngLat(o.coord)}>
          <Avatar userId={o.userId} name={o.displayName} size={36} ring="#FFFFFF" />
        </MarkerView>
      ))}

      {me && (
        <MarkerView coordinate={toLngLat(me.coord)}>
          <Avatar userId={me.userId} name={me.displayName} size={42} ring={theme.accent} />
        </MarkerView>
      )}
    </MapView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
