import { useEffect, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const SPRING = { damping: 26, stiffness: 260, mass: 0.9 };

type BottomSheetProps = {
  /** Visible heights in points, ascending: e.g. [peek, half, full]. */
  snaps: number[];
  /** Index into `snaps`. Controlled: update it from `onIndexChange`. */
  index: number;
  onIndexChange: (index: number) => void;
  /** Slides the sheet fully off-screen (immersive map). */
  hidden?: boolean;
  /** Always-visible, draggable top area (grabber included). */
  header: ReactNode;
  /** Scrolls, and only while the sheet is fully open. */
  children: ReactNode;
  /** Floating controls that ride just above the sheet's top edge. */
  floating?: ReactNode;
  /** Lowest point (distance from the bottom) the floating controls may sit at when the sheet is hidden. */
  floatingMinBottom?: number;
  bottomInset: number;
};

/**
 * Map-style bottom sheet. Drag the header to move between snap points; a fling jumps to the
 * next one. The body scrolls only at the top snap, so scrolling never fights the drag.
 */
export function BottomSheet({
  snaps,
  index,
  onIndexChange,
  hidden = false,
  header,
  children,
  floating,
  floatingMinBottom = 0,
  bottomInset,
}: BottomSheetProps) {
  const theme = useTheme();
  const top = snaps.length - 1;
  const maxHeight = snaps[top];
  const target = hidden ? 0 : snaps[index];

  // Currently visible height of the sheet, animated on the UI thread.
  const visible = useSharedValue(target);
  const startVisible = useSharedValue(target);

  // Programmatic moves (header tap, a new destination, immersive mode).
  useEffect(() => {
    visible.set(withSpring(target, SPRING));
  }, [target, visible]);

  const pan = usePanGesture({
    activeOffsetY: [-8, 8],
    failOffsetX: [-40, 40],
    onBegin: () => {
      startVisible.set(visible.get());
    },
    onUpdate: (e) => {
      const next = startVisible.get() - e.translationY;
      visible.set(Math.min(maxHeight, Math.max(snaps[0], next)));
    },
    onDeactivate: (e) => {
      // Project where the sheet would coast to, then settle on the closest snap point.
      const projected = visible.get() - e.velocityY * 0.18;
      let best = 0;
      let bestDistance = Infinity;
      for (let i = 0; i < snaps.length; i += 1) {
        const distance = Math.abs(snaps[i] - projected);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = i;
        }
      }
      visible.set(withSpring(snaps[best], SPRING));
      scheduleOnRN(onIndexChange, best);
    },
  });

  // The body fades out over the first stretch above the peek, so only the header shows when the
  // sheet is collapsed (the peek is a little taller than the header because of the safe area).
  const bodyStyle = useAnimatedStyle(() => ({
    opacity: interpolate(visible.get(), [snaps[0], snaps[0] + 56], [0, 1], Extrapolation.CLAMP),
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: maxHeight - visible.get() }],
  }));

  // The controls ride the sheet up, then fade out over the last stretch to the top snap so they
  // never end up on top of the header or the turn banner.
  const fadeFrom = snaps[Math.max(0, top - 1)];
  const floatingStyle = useAnimatedStyle(() => ({
    bottom: Math.max(visible.get(), floatingMinBottom) + Spacing.three,
    opacity: top > 0 ? interpolate(visible.get(), [fadeFrom, maxHeight], [1, 0], Extrapolation.CLAMP) : 1,
  }));

  return (
    <>
      {floating ? (
        <Animated.View
          pointerEvents={index === top && !hidden && top > 0 ? 'none' : 'box-none'}
          style={[styles.floating, floatingStyle]}>
          {floating}
        </Animated.View>
      ) : null}

      <Animated.View
        pointerEvents={hidden ? 'none' : 'auto'}
        style={[
          styles.sheet,
          { height: maxHeight, backgroundColor: theme.background, borderColor: theme.border },
          sheetStyle,
        ]}>
        <GestureDetector gesture={pan}>
          <View collapsable={false}>{header}</View>
        </GestureDetector>

        <Animated.View
          pointerEvents={index === 0 || hidden ? 'none' : 'auto'}
          style={[styles.bodyWrap, bodyStyle]}>
          <ScrollView
            scrollEnabled={index === top}
            nestedScrollEnabled
            bounces={false}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
            contentContainerStyle={[styles.body, { paddingBottom: bottomInset + Spacing.four }]}>
            {children}
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  floating: {
    position: 'absolute',
    right: Spacing.three,
    alignItems: 'flex-end',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  bodyWrap: { flex: 1 },
  body: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
  },
});
