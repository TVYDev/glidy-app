import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { distanceBetween, formatDistance, nextStepIndex } from '@/lib/geo';
import type { Coord, Route } from '@/lib/types';

type NavBannerProps = { route: Route; position: Coord | null };

/** Turn-by-turn banner: the next manoeuvre and how far away it is. */
export function NavBanner({ route, position }: NavBannerProps) {
  const theme = useTheme();
  const [progress, setProgress] = useState({ route, index: 0 });

  // Advance as the traveller passes each manoeuvre. A new route starts again from step 0.
  // Derived during render (not in an effect) so there is no extra render with a stale step.
  const previous = progress.route === route ? progress.index : 0;
  const index = nextStepIndex(route, position, previous);
  if (progress.route !== route || progress.index !== index) {
    setProgress({ route, index });
  }

  const step = route.steps[Math.min(index, route.steps.length - 1)];
  if (!step) return null;
  const away = position ? distanceBetween(position, step.location) : null;
  // The final step is "You have arrived": do not say that while the destination is still far away.
  const isFinal = index >= route.steps.length - 1;
  const instruction = isFinal && away != null && away > 100 ? 'Continue to your destination' : step.instruction;

  return (
    <View style={[styles.banner, { backgroundColor: theme.primaryDark }]}>
      <Icon sf="arrow.triangle.turn.up.right.diamond.fill" md="turn_right" size={30} color="#FFFFFF" />
      <View style={styles.text}>
        <ThemedText type="smallBold" style={styles.instruction} numberOfLines={2}>
          {instruction}
        </ThemedText>
        {away != null && (
          <ThemedText type="small" style={styles.distance}>
            in {formatDistance(away)}
          </ThemedText>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.md,
  },
  text: { flex: 1 },
  instruction: { color: '#FFFFFF', fontSize: 16, lineHeight: 22 },
  distance: { color: '#D6EBDD' },
});
