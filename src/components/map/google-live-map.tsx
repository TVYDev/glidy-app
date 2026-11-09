import { MapPin } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, useColorScheme, useWindowDimensions, View } from 'react-native';
import MapView, { Polyline, PROVIDER_GOOGLE, type LatLng } from 'react-native-maps';

import { DriveArrow } from '@/components/map/drive-arrow';
import { GOOGLE_DARK_STYLE } from '@/components/map/google-dark-style';
import { StopBadge } from '@/components/map/stop-badge';
import { TrackedMarker } from '@/components/map/tracked-marker';
import type { LiveMapProps } from '@/components/map/types';
import { Avatar } from '@/components/ui/avatar';
import { Icon } from '@/components/ui/icon';
import { useTheme } from '@/hooks/use-theme';
import { metersPerPoint, offsetAhead, zoomForSpeed } from '@/lib/geo';

/** The drive and follow zooms below are tuned in 512 px tile zoom; Google counts one level lower. */
const toGoogleZoom = (zoom: number) => zoom + 1;

const toLatLng = ([longitude, latitude]: [number, number]): LatLng => ({ latitude, longitude });

/** At most `max` points, always keeping the last, for fitting the camera to a long route. */
function sample(points: LatLng[], max = 200): LatLng[] {
  if (points.length <= max) return points;
  const step = Math.ceil(points.length / max);
  const out = points.filter((_, i) => i % step === 0);
  out.push(points[points.length - 1]);
  return out;
}

/** The live Google map. Loaded only when a key is configured (see live-map.tsx). */
export function GoogleLiveMap({
  route,
  alternatives,
  destination,
  me,
  others,
  avatars,
  leaderId,
  fitSignal,
  followMe,
  drive,
  routeSnap,
  insets,
  onMapPress,
  tappedPin,
}: LiveMapProps) {
  const theme = useTheme();
  const { height: screenHeight } = useWindowDimensions();
  const isDark = useColorScheme() === 'dark';
  const map = useRef<MapView>(null);
  const handledFit = useRef<string | null>(null);
  const [ready, setReady] = useState(false);

  const routePoints = route ? route.geometry.map(toLatLng) : [];
  const fitPoints: LatLng[] = [
    ...sample(routePoints),
    ...(route?.stops ?? []).map((s) => s.coord),
    ...(destination ? [destination.coord] : []),
    ...(me ? [me.coord] : []),
    ...others.map((o) => o.coord),
  ];
  const hasData = fitPoints.length > 0;

  // Fit once the map is ready, when data first appears, and whenever the user asks to re-centre,
  // but not on every location tick. The overlays are handled by `mapPadding` below, so the fit
  // only needs a small margin; the right one keeps the route clear of the floating buttons.
  const fitKey = `${fitSignal}:${hasData}`;
  useEffect(() => {
    if (!ready || !hasData || !map.current) return;
    if (handledFit.current === fitKey) return;
    handledFit.current = fitKey;
    // Level the map first (north up, no tilt) so a re-centre also undoes any rotation or tilt.
    map.current.animateCamera({ heading: 0, pitch: 0 }, { duration: 0 });
    map.current.fitToCoordinates(fitPoints.length === 1 ? [fitPoints[0], fitPoints[0]] : fitPoints, {
      edgePadding: { top: 24, right: 84, bottom: 24, left: 40 },
      animated: true,
    });
    // `fitPoints` changes on every location update and must not trigger a re-fit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, fitKey]);

  // Follow mode: keep the camera on my marker. The zoom is set once when following starts, so
  // pinching in or out is respected afterwards.
  const meLat = me?.coord.latitude;
  const meLng = me?.coord.longitude;
  const wasFollowing = useRef(false);
  useEffect(() => {
    if (!followMe || meLat == null || meLng == null || !ready || !map.current) {
      wasFollowing.current = false;
      return;
    }
    const engaging = !wasFollowing.current;
    wasFollowing.current = true;
    map.current.animateCamera(
      {
        center: { latitude: meLat, longitude: meLng },
        ...(engaging ? { zoom: toGoogleZoom(15.5), heading: 0, pitch: 0 } : null),
      },
      { duration: engaging ? 700 : 1000 },
    );
  }, [followMe, meLat, meLng, ready]);

  // Drive mode: look the way I am going, tilted, zoomed by speed. `mapPadding` makes the middle of
  // the camera the middle of the area between the overlays, so shifting the centre ahead of me by a
  // fifth of that area puts my arrow in its lower part with the road ahead above it.
  const driveLocked = drive?.locked ?? false;
  const driveHeading = drive?.heading ?? 0;
  const driveSpeed = drive?.speed ?? null;
  useEffect(() => {
    if (!driveLocked || meLat == null || meLng == null || !ready || !map.current) return;
    const zoom = zoomForSpeed(driveSpeed);
    const visibleHeight = screenHeight - insets.top - insets.bottom;
    const centre = offsetAhead(
      { latitude: meLat, longitude: meLng },
      driveHeading,
      visibleHeight * 0.2 * metersPerPoint(zoom, meLat),
    );
    map.current.animateCamera(
      { center: centre, heading: driveHeading, pitch: 55, zoom: toGoogleZoom(zoom) },
      { duration: 1000 },
    );
    // Insets change as overlays resize; that alone must not move the camera.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driveLocked, meLat, meLng, driveHeading, driveSpeed, ready]);

  // With my position on the route, the part behind me is drawn grey and only what is left is bright.
  const split = route && routeSnap ? routeSnap : null;
  const remaining = route
    ? (split ? [split.point, ...route.geometry.slice(split.index + 1)] : route.geometry).map(toLatLng)
    : null;
  const passed = route && split ? [...route.geometry.slice(0, split.index + 1), split.point].map(toLatLng) : null;

  return (
    <MapView
      ref={map}
      style={styles.fill}
      provider={PROVIDER_GOOGLE}
      customMapStyle={isDark ? GOOGLE_DARK_STYLE : undefined}
      userInterfaceStyle={isDark ? 'dark' : 'light'}
      // The padding keeps the Google logo and the camera's middle clear of the sheet and the top bar.
      mapPadding={{ top: insets.top, bottom: insets.bottom, left: 0, right: 0 }}
      onMapReady={() => setReady(true)}
      onPress={onMapPress ? (event) => onMapPress(event.nativeEvent.coordinate) : undefined}
      onPoiClick={onMapPress ? (event) => onMapPress(event.nativeEvent.coordinate) : undefined}
      // Full gesture set: pan, pinch to zoom, two-finger rotate and tilt.
      scrollEnabled
      zoomEnabled
      rotateEnabled
      pitchEnabled
      showsCompass
      showsMyLocationButton={false}
      toolbarEnabled={false}
      initialCamera={{ center: { latitude: 11.5564, longitude: 104.9282 }, zoom: 3, heading: 0, pitch: 0 }}>
      {(alternatives ?? []).map((alternative, index) => (
        <Polyline
          key={`alt-${index}`}
          coordinates={alternative.geometry.map(toLatLng)}
          strokeColor={theme.textSecondary}
          strokeWidth={5}
          lineCap="round"
          lineJoin="round"
          zIndex={1}
        />
      ))}

      {passed && (
        <Polyline coordinates={passed} strokeColor={theme.textSecondary} strokeWidth={5} lineCap="round" lineJoin="round" zIndex={2} />
      )}

      {remaining && remaining.length > 1 && (
        <>
          <Polyline coordinates={remaining} strokeColor="#FFFFFF" strokeWidth={9} lineCap="round" lineJoin="round" zIndex={3} />
          <Polyline coordinates={remaining} strokeColor={theme.primaryDark} strokeWidth={5} lineCap="round" lineJoin="round" zIndex={4} />
        </>
      )}

      {tappedPin && (
        <TrackedMarker contentKey="tapped" coordinate={tappedPin} anchor={{ x: 0.5, y: 1 }} zIndex={20}>
          <Icon icon={MapPin} size={38} color="ink" fill={theme.ink} />
        </TrackedMarker>
      )}

      {(route?.stops ?? []).map((stop, index) => (
        <TrackedMarker key={`stop-${index}-${stop.coord.latitude}`} contentKey={`stop-${index}`} coordinate={stop.coord} zIndex={10}>
          <StopBadge number={index + 1} />
        </TrackedMarker>
      ))}

      {destination && (
        <TrackedMarker contentKey="destination" coordinate={destination.coord} anchor={{ x: 0.5, y: 1 }} zIndex={11}>
          <View>
            <Icon icon={MapPin} size={38} color="ink" fill="#EFB708" />
          </View>
        </TrackedMarker>
      )}

      {others.map((o) => (
        <TrackedMarker
          key={o.userId}
          contentKey={`${o.userId}:${avatarKey(avatars?.[o.userId])}:${o.userId === leaderId}`}
          coordinate={o.coord}
          zIndex={o.userId === leaderId ? 14 : 12}>
          {/* Padding keeps the crown inside the marker's bitmap, centred on the avatar. */}
          <View style={styles.markerPad}>
            <Avatar userId={o.userId} name={o.displayName} avatar={avatars?.[o.userId]} size={36} ring="#FFFFFF" leader={o.userId === leaderId} />
          </View>
        </TrackedMarker>
      ))}

      {me && drive && (
        <TrackedMarker
          contentKey="me:drive-arrow"
          coordinate={me.coord}
          // Flat: lies on the road and turns with the map, so a heading-up camera shows it tilted in 3D.
          flat
          rotation={drive.heading ?? 0}
          anchor={{ x: 0.5, y: 0.5 }}
          zIndex={13}>
          <DriveArrow size={64} />
        </TrackedMarker>
      )}

      {me && !drive && (
        <TrackedMarker contentKey={`me:${avatarKey(avatars?.[me.userId])}:${me.userId === leaderId}`} coordinate={me.coord} zIndex={15}>
          <View style={styles.markerPad}>
            <Avatar userId={me.userId} name={me.displayName} avatar={avatars?.[me.userId]} size={42} ring={theme.primary} leader={me.userId === leaderId} />
          </View>
        </TrackedMarker>
      )}
    </MapView>
  );
}

/** A short fingerprint of a picture, so a marker redraws when someone changes theirs. */
function avatarKey(avatar: LiveMapProps['avatars'] extends infer A ? (A extends Record<string, infer V> ? V : never) : never): string {
  if (!avatar) return 'none';
  return avatar.kind === 'emoji' ? `${avatar.emoji}${avatar.color}` : `photo${avatar.uri.length}`;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  markerPad: { padding: 10 },
});
