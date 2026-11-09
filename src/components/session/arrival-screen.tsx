import { Bookmark, Check } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Vibration, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  type SharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { StatStrip } from '@/components/ui/stat-strip';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { formatDistance, formatDuration } from '@/lib/geo';
import type { Avatar as AvatarData } from '@/lib/types';

export type ArrivalMember = { id: string; name: string; avatar?: AvatarData | null; arrived: boolean };

type ArrivalScreenProps = {
  place: string;
  /** Length of the trip in metres. */
  distance: number;
  /** Epoch ms when driving began; the trip time is measured to the moment this screen opens. */
  startedAt: number;
  members: ArrivalMember[];
  /** Offered to the leader, who owns the route. Omit to hide the button. */
  onSave?: () => Promise<void>;
  saved?: boolean;
  onDone: () => void;
};

const CONFETTI = 44;
// The avatar palette plus the brand inks, so the pieces read on the amber background.
const CONFETTI_COLORS = ['#212121', '#FFFFFF', '#F9F6F0', '#2D6CDF', '#B23A8A', '#0E8F8F', '#E07A1F'];

/** Deterministic pseudo-random in [0, 1): keeps the confetti stable across renders. */
function rand(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Shown when a traveller reaches the destination in drive mode: confetti over the brand amber, a pin
 * that drops onto the end of the route, the trip in numbers, and who in the group is already there.
 */
export function ArrivalScreen({ place, distance, startedAt, members, onSave, saved, onDone }: ArrivalScreenProps) {
  const theme = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  // The trip's length of time is fixed when the screen opens, not while the user reads it.
  const [saving, setSaving] = useState(false);
  const [duration] = useState(() => Math.max(0, Date.now() - startedAt) / 1000);

  useEffect(() => {
    if (!reduceMotion) Vibration.vibrate([0, 40, 70, 40, 70, 90]);
    return () => Vibration.cancel();
  }, [reduceMotion]);

  async function save() {
    setSaving(true);
    try {
      await onSave?.();
    } finally {
      setSaving(false);
    }
  }

  const here = members.filter((m) => m.arrived).length;

  return (
    <Animated.View
      entering={FadeIn.duration(280)}
      style={[StyleSheet.absoluteFill, styles.root, { backgroundColor: theme.primary }]}>
      {!reduceMotion && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {Array.from({ length: CONFETTI }, (_, i) => (
            <Piece key={i} index={i} />
          ))}
        </View>
      )}

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + Spacing.four, paddingBottom: Math.max(insets.bottom, Spacing.three) + Spacing.three },
        ]}
        showsVerticalScrollIndicator={false}>
        <PinDrop reduceMotion={reduceMotion} />

        <Animated.View entering={FadeInDown.delay(450).springify()} style={styles.headlineBlock}>
          <ThemedText type="smallBold" themeColor="onPrimary" style={styles.eyebrow}>
            {t('arrive.eyebrow')}
          </ThemedText>
          <ThemedText type="display" themeColor="onPrimary" style={styles.center}>
            {t('arrive.headline')}
          </ThemedText>
          <ThemedText type="subtitle" themeColor="onPrimary" numberOfLines={3} style={[styles.center, styles.place]}>
            {place}
          </ThemedText>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(650).springify()}>
          <StatStrip
            stats={[
              { value: formatDistance(distance), label: t('arrive.distance') },
              { value: formatDuration(duration), label: t('arrive.time') },
            ]}
          />
        </Animated.View>

        {members.length > 1 && (
          <Animated.View entering={FadeInDown.delay(850).springify()} style={styles.group}>
            <View style={styles.faces}>
              {members.slice(0, 7).map((m) => (
                <View key={m.id} style={[styles.face, !m.arrived && styles.faceWaiting]}>
                  <Avatar userId={m.id} name={m.name} avatar={m.avatar} size={44} ring={theme.primary} />
                  {m.arrived && (
                    <View style={[styles.check, { backgroundColor: theme.ink, borderColor: theme.primary }]}>
                      <Check size={11} color={theme.primary} strokeWidth={3.5} />
                    </View>
                  )}
                </View>
              ))}
            </View>
            <ThemedText type="smallBold" themeColor="onPrimary" style={styles.center}>
              {t('arrive.group', { here, total: members.length })}
            </ThemedText>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(1000).springify()} style={styles.actions}>
          {onSave && !saved && (
            <Button label={t('session.saveRoute')} icon={Bookmark} variant="secondary" loading={saving} onPress={save} />
          )}
          {saved && (
            <ThemedText type="smallBold" themeColor="onPrimary" style={styles.center}>
              {t('arrive.saved')}
            </ThemedText>
          )}
          <Button label={t('arrive.done')} variant="ink" onPress={onDone} />
        </Animated.View>
      </ScrollView>
    </Animated.View>
  );
}

/** The pin falls onto the end of a short dotted route, bounces, and sends out rings. */
function PinDrop({ reduceMotion }: { reduceMotion: boolean }) {
  const theme = useTheme();
  const drop = useSharedValue(reduceMotion ? 0 : -150);
  const squash = useSharedValue(1);
  const ring = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    drop.value = withDelay(150, withSpring(0, { damping: 9, stiffness: 140, mass: 0.9 }));
    squash.value = withDelay(
      330,
      withSequence(withTiming(0.82, { duration: 90 }), withSpring(1, { damping: 6, stiffness: 220 })),
    );
    ring.value = withDelay(
      420,
      withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }), -1, false),
    );
  }, [reduceMotion, drop, squash, ring]);

  const pinStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: drop.value }, { scaleY: squash.value }],
    opacity: drop.value < -120 ? 0 : 1,
  }));
  return (
    <View style={styles.scene}>
      <Ring progress={ring} offset={0} color={theme.ink} />
      <Ring progress={ring} offset={0.5} color={theme.ink} />
      <Svg width={240} height={60} viewBox="0 0 240 60" style={styles.trail}>
        <Path
          d="M10 46 C 60 54, 90 14, 140 30 S 200 44, 222 22"
          stroke={theme.ink}
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray="1 11"
          fill="none"
          opacity={0.7}
        />
        <Circle cx="10" cy="46" r="7" fill={theme.ink} />
      </Svg>
      <Animated.View style={[styles.pin, pinStyle]}>
        <Svg width={92} height={116} viewBox="0 0 92 116">
          <Path
            d="M46 4 C 22 4 6 22 6 44 C 6 74 46 112 46 112 C 46 112 86 74 86 44 C 86 22 70 4 46 4 Z"
            fill={theme.ink}
          />
          <Circle cx="46" cy="44" r="17" fill={theme.primary} />
        </Svg>
      </Animated.View>
    </View>
  );
}

/** A ring that grows and fades from the pin; two of them, half a cycle apart, make a pulse. */
function Ring({ progress, offset, color }: { progress: SharedValue<number>; offset: number; color: string }) {
  const style = useAnimatedStyle(() => {
    const p = (progress.value + offset) % 1;
    return { opacity: progress.value === 0 ? 0 : (1 - p) * 0.55, transform: [{ scale: 0.3 + p * 1.6 }] };
  });
  return <Animated.View style={[styles.ring, { borderColor: color }, style]} />;
}

/** One piece of confetti: falls from above the screen, sways, spins, and comes round again. */
function Piece({ index }: { index: number }) {
  const { width, height } = useWindowDimensions();
  const fall = useSharedValue(0);
  const sway = useSharedValue(0);

  const left = rand(index + 1) * width;
  const size = 8 + rand(index + 50) * 9;
  const round = rand(index + 90) > 0.65;
  const color = CONFETTI_COLORS[Math.floor(rand(index + 130) * CONFETTI_COLORS.length)];
  const delay = rand(index + 170) * 1400;
  const duration = 2800 + rand(index + 210) * 2200;
  const swing = 14 + rand(index + 250) * 26;
  const spins = 1 + Math.floor(rand(index + 290) * 3);

  useEffect(() => {
    // Three passes, then it settles off-screen so a long stay on this screen costs no frames.
    fall.value = withDelay(delay, withRepeat(withTiming(1, { duration, easing: Easing.in(Easing.quad) }), 3, false));
    sway.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: 900 + rand(index + 330) * 700, easing: Easing.inOut(Easing.sin) }), -1, true),
    );
  }, [delay, duration, fall, sway, index]);

  const style = useAnimatedStyle(() => ({
    opacity: fall.value === 0 ? 0 : 1,
    transform: [
      { translateY: -40 + fall.value * (height + 80) },
      { translateX: (sway.value - 0.5) * 2 * swing },
      { rotate: `${fall.value * 360 * spins}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.piece,
        { left, width: size, height: round ? size : size * 1.7, borderRadius: round ? size / 2 : 2, backgroundColor: color },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  root: { zIndex: 20 },
  content: { flexGrow: 1, justifyContent: 'center', alignItems: 'stretch', paddingHorizontal: Spacing.four, gap: Spacing.four },
  scene: { alignSelf: 'center', width: 240, height: 150, alignItems: 'center', justifyContent: 'flex-end' },
  trail: { position: 'absolute', bottom: 0 },
  pin: { position: 'absolute', right: 40, bottom: 20 },
  // A flat ellipse on the ground where the pin lands (its tip is 86 pt from the right, 20 pt up).
  ring: { position: 'absolute', right: 36, bottom: 3, width: 100, height: 34, borderRadius: '50%', borderWidth: 3 },
  headlineBlock: { alignItems: 'center', gap: Spacing.two },
  eyebrow: { textTransform: 'uppercase', letterSpacing: 1.4, opacity: 0.8 },
  center: { textAlign: 'center' },
  place: { marginTop: Spacing.one },
  group: { alignItems: 'center', gap: Spacing.two },
  faces: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.two },
  face: {},
  faceWaiting: { opacity: 0.45 },
  check: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: { gap: Spacing.two },
  piece: { position: 'absolute', top: 0 },
});
