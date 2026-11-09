import { useEffect, useRef } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';

import { GOOGLE_DARK_STYLE } from '@/components/map/google-dark-style';
import type { PickMapProps } from '@/components/map/pick-map-types';

/**
 * A plain map for choosing a point: the caller draws a pin over the centre and is told where the
 * centre is each time the map comes to rest. All gestures but rotate and tilt work; the pin does
 * not move, the map does. The map ends where the panel below begins, so its middle is where the
 * pin is drawn and the Google logo stays visible.
 */
export function PickMap({ initial, focus, onMoving, onSettled }: PickMapProps) {
  const isDark = useColorScheme() === 'dark';
  const map = useRef<MapView>(null);

  // Jump to a place on request (the "my location" button).
  const focusKey = focus?.key;
  const focusLat = focus?.coord.latitude;
  const focusLng = focus?.coord.longitude;
  useEffect(() => {
    if (focusKey == null || focusLat == null || focusLng == null) return;
    map.current?.animateCamera({ center: { latitude: focusLat, longitude: focusLng }, zoom: 17 }, { duration: 600 });
  }, [focusKey, focusLat, focusLng]);

  return (
    <MapView
      ref={map}
      style={styles.fill}
      provider={PROVIDER_GOOGLE}
      customMapStyle={isDark ? GOOGLE_DARK_STYLE : undefined}
      userInterfaceStyle={isDark ? 'dark' : 'light'}
      initialCamera={{ center: initial, zoom: 16, heading: 0, pitch: 0 }}
      rotateEnabled={false}
      pitchEnabled={false}
      showsCompass={false}
      showsMyLocationButton={false}
      toolbarEnabled={false}
      onRegionChange={() => onMoving(true)}
      onRegionChangeComplete={(region) => {
        onMoving(false);
        onSettled({ latitude: region.latitude, longitude: region.longitude });
      }}
    />
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
