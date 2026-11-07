import Mapbox, { Camera, LineLayer, MapView, MarkerView, ShapeSource } from '@rnmapbox/maps';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, useColorScheme, useWindowDimensions, View } from 'react-native';

import { SchematicMap } from '@/components/map/schematic-map';
import type { LiveMapProps } from '@/components/map/types';
import { Avatar } from '@/components/ui/avatar';
import { MapPin, Navigation2 } from 'lucide-react-native';

import { Icon } from '@/components/ui/icon';
import { useTheme } from '@/hooks/use-theme';
import { angleDelta, boundsOf, metersPerPoint, offsetAhead, toLngLat, zoomForSpeed } from '@/lib/geo';
import { MAPBOX_TOKEN, hasMapbox } from '@/lib/mapbox-api';

if (hasMapbox) {
  Mapbox.setAccessToken(MAPBOX_TOKEN);
}

/** Live Mapbox map. Falls back to the schematic view when no token is configured. */
export function LiveMap(props: LiveMapProps) {
  if (!hasMapbox) return <SchematicMap {...props} />;
  return <MapboxLiveMap {...props} />;
}

function MapboxLiveMap({
  route,
  destination,
  me,
  others,
  fitSignal,
  followMe,
  drive,
  routeSnap,
  insets,
}: LiveMapProps) {
  const theme = useTheme();
  const { height: screenHeight } = useWindowDimensions();
  const isDark = useColorScheme() === 'dark';
  const camera = useRef<Camera>(null);
  const handledFit = useRef<string | null>(null);
  // Which map style has finished loading. The map is remounted when the style changes, and each
  // fresh instance has to be fitted to the route again once it is ready.
  const styleKey = isDark ? 'dark' : 'light';
  const [readyFor, setReadyFor] = useState<string | null>(null);
  const mapReady = readyFor === styleKey;

  const points: [number, number][] = [
    ...(route?.geometry ?? []),
    ...(destination ? [toLngLat(destination.coord)] : []),
    ...(me ? [toLngLat(me.coord)] : []),
    ...others.map((o) => toLngLat(o.coord)),
  ];
  const bounds = boundsOf(points);

  // Fit once the map has loaded (Mapbox ignores camera moves before that), when data first
  // appears, and whenever the user asks to re-centre: but not on every location tick.
  const hasData = bounds !== null;
  const fitKey = `${styleKey}:${fitSignal}:${hasData}`;
  useEffect(() => {
    if (!mapReady || !bounds || !camera.current) return;
    if (handledFit.current === fitKey) return;
    handledFit.current = fitKey;
    // Fit the route and level the map (north up, no tilt) so a re-centre also undoes any rotation.
    // The margins go INSIDE `bounds`, which applies to this call only. The root `padding` option
    // is persistent and Mapbox adds the next fit's margins to it, so repeated fits would shrink the
    // usable area to nothing and the zoom would go haywire. The extra right margin keeps the route
    // clear of the floating map buttons.
    camera.current.setCamera({
      bounds: {
        ne: bounds.ne,
        sw: bounds.sw,
        paddingTop: insets.top + 24,
        paddingRight: 84,
        paddingBottom: insets.bottom + 24,
        paddingLeft: 40,
      },
      heading: 0,
      pitch: 0,
      animationDuration: 600,
      animationMode: 'easeTo',
    });
    // `bounds`/`insets` change on every location update and must not trigger a re-fit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, fitKey]);

  // Follow mode: keep the camera on my marker. The zoom is set once when following starts, so
  // pinching in or out is respected afterwards. No viewport padding is used here: it is persistent
  // in Mapbox and would be added to the margins of the next route fit.
  const meLat = me?.coord.latitude;
  const meLng = me?.coord.longitude;
  const wasFollowing = useRef(false);
  useEffect(() => {
    if (!followMe || meLat == null || meLng == null || !mapReady || !camera.current) {
      wasFollowing.current = false;
      return;
    }
    const engaging = !wasFollowing.current;
    wasFollowing.current = true;
    camera.current.setCamera({
      centerCoordinate: [meLng, meLat],
      ...(engaging ? { zoomLevel: 15.5, heading: 0, pitch: 0 } : null),
      animationDuration: engaging ? 700 : 1000,
      animationMode: 'easeTo',
    });
  }, [followMe, meLat, meLng, mapReady]);

  // Drive mode: look the way I am going, tilted, zoomed by speed. The camera is shifted ahead of me
  // so my arrow sits in the lower part of the visible area with the road ahead above it. Moves are
  // linear and last as long as one GPS interval, so the map glides instead of jumping.
  const driveLocked = drive?.locked ?? false;
  const driveHeading = drive?.heading ?? 0;
  const driveSpeed = drive?.speed ?? null;
  useEffect(() => {
    if (!driveLocked || meLat == null || meLng == null || !mapReady || !camera.current) return;
    const zoom = zoomForSpeed(driveSpeed);
    const visibleHeight = screenHeight - insets.top - insets.bottom;
    const targetY = insets.top + visibleHeight * 0.7;
    const shiftPoints = Math.max(0, targetY - screenHeight / 2);
    const centre = offsetAhead(
      { latitude: meLat, longitude: meLng },
      driveHeading,
      shiftPoints * metersPerPoint(zoom, meLat),
    );
    camera.current.setCamera({
      centerCoordinate: [centre.longitude, centre.latitude],
      heading: driveHeading,
      pitch: 55,
      zoomLevel: zoom,
      animationDuration: 1000,
      animationMode: 'linearTo',
    });
    // Insets change as overlays resize; that alone must not move the camera.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driveLocked, meLat, meLng, driveHeading, driveSpeed, mapReady]);

  // The heading the camera really has, so the arrow can point the right way when the map is
  // unlocked and rotated. Only updated for changes bigger than a few degrees.
  const [cameraHeading, setCameraHeading] = useState(0);
  const arrowRotation = drive?.heading != null ? angleDelta(cameraHeading, drive.heading) : 0;

  // With my position on the route, the part behind me is drawn grey and only what is left is bright.
  const split = route && routeSnap ? routeSnap : null;
  const remaining = route
    ? split
      ? [split.point, ...route.geometry.slice(split.index + 1)]
      : route.geometry
    : null;
  const passed = route && split ? [...route.geometry.slice(0, split.index + 1), split.point] : null;
  const line = lineOf(remaining);
  const passedLine = lineOf(passed);

  return (
    <MapView
      // Remount when the style changes (system light/dark switch): layers must be re-added to the new style.
      key={styleKey}
      style={styles.fill}
      styleURL={isDark ? Mapbox.StyleURL.Dark : Mapbox.StyleURL.Street}
      logoEnabled={false}
      scaleBarEnabled={false}
      attributionPosition={{ bottom: insets.bottom + 8, left: 8 }}
      onDidFinishLoadingMap={() => setReadyFor(styleKey)}
      // Full gesture set: pan, pinch to zoom, two-finger rotate and tilt. The compass resets north.
      scrollEnabled
      zoomEnabled
      rotateEnabled
      pitchEnabled
      onCameraChanged={drive ? (state) => setCameraHeading((previous) => (Math.abs(angleDelta(previous, state.properties.heading)) > 4 ? state.properties.heading : previous)) : undefined}
      compassEnabled
      compassPosition={{ top: insets.top + 56, left: 12 }}>
      <Camera ref={camera} defaultSettings={{ centerCoordinate: [0, 20], zoomLevel: 1 }} />

      {passedLine && (
        <ShapeSource id="route-passed" shape={passedLine}>
          <LineLayer
            id="route-passed-line"
            style={{ lineColor: theme.textSecondary, lineOpacity: 0.55, lineWidth: 5, lineCap: 'round', lineJoin: 'round' }}
          />
        </ShapeSource>
      )}

      {line && (
        <ShapeSource id="route" shape={line}>
          <LineLayer id="route-casing" style={{ lineColor: '#FFFFFF', lineWidth: 9, lineCap: 'round', lineJoin: 'round' }} />
          <LineLayer id="route-line" style={{ lineColor: theme.primaryDark, lineWidth: 5, lineCap: 'round', lineJoin: 'round' }} />
        </ShapeSource>
      )}

      {destination && (
        <MarkerView coordinate={toLngLat(destination.coord)} anchor={{ x: 0.5, y: 1 }}>
          <View>
            <Icon icon={MapPin} size={38} color="ink" fill="#EFB708" />
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
          {drive ? (
            <View
              style={[
                styles.arrow,
                { backgroundColor: theme.primary, borderColor: '#FFFFFF', transform: [{ rotate: `${arrowRotation}deg` }] },
              ]}>
              <Icon icon={Navigation2} size={26} color="ink" fill={theme.ink} strokeWidth={2} />
            </View>
          ) : (
            <Avatar userId={me.userId} name={me.displayName} size={42} ring={theme.primary} />
          )}
        </MarkerView>
      )}
    </MapView>
  );
}

function lineOf(coordinates: [number, number][] | null): GeoJSON.Feature<GeoJSON.LineString> | null {
  if (!coordinates || coordinates.length < 2) return null;
  return { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates } };
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  arrow: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
});
