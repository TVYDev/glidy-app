import { useEffect, useState } from 'react';
import { Marker, type MapMarkerProps } from 'react-native-maps';

type Props = MapMarkerProps & {
  /** Changes whenever what the marker shows changes (a picture arrived, a number changed). */
  contentKey: string;
};

/**
 * A marker with a custom view. react-native-maps draws such a view to a bitmap, so it has to keep
 * watching the view while it changes (an avatar image loading) and can stop afterwards, which
 * keeps many markers cheap.
 */
export function TrackedMarker({ contentKey, children, ...rest }: Props) {
  // The key whose content has had time to settle; while it differs, the view is still tracked.
  const [settled, setSettled] = useState<string | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(contentKey), 1200);
    return () => clearTimeout(timer);
  }, [contentKey]);

  return (
    <Marker {...rest} tracksViewChanges={settled !== contentKey}>
      {children}
    </Marker>
  );
}
