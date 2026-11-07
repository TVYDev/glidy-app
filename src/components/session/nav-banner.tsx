import { RefreshCw } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { Radius, Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';
import { formatDistance, type NextTurn } from '@/lib/geo';
import { maneuverIcon } from '@/lib/maneuver';

type NavBannerProps = {
  turn: NextTurn;
  /** Metres still to drive; the final instruction is held back while it is far away. */
  remainingDistance: number;
  /** Larger type for while driving. */
  large?: boolean;
  /** The traveller left the route and a new one is being calculated. */
  rerouting?: boolean;
};

/** Turn-by-turn banner: the next manoeuvre as an icon, the distance to it, and the instruction. */
export function NavBanner({ turn, remainingDistance, large, rerouting }: NavBannerProps) {
  const theme = useTheme();
  const { t } = useI18n();

  // "You have arrived" is the last step: do not say it while the destination is still far away.
  const farFromArrival = turn.isArrival && remainingDistance > 100;
  const instruction = rerouting
    ? t('drive.rerouting')
    : farFromArrival
      ? t('nav.continue')
      : turn.step.instruction;
  const icon = rerouting ? RefreshCw : maneuverIcon(turn.step);
  const iconSize = large ? 34 : 24;

  return (
    <View style={[styles.banner, large && styles.bannerLarge, { backgroundColor: theme.ink }]}>
      <View style={[styles.badge, large && styles.badgeLarge, { backgroundColor: theme.primary }]}>
        <Icon icon={icon} size={iconSize} color="onPrimary" strokeWidth={2.6} />
      </View>
      <View style={styles.text}>
        {!rerouting && (
          <ThemedText style={[styles.distance, large && styles.distanceLarge, { color: theme.primary }]}>
            {formatDistance(farFromArrival ? remainingDistance : turn.distance)}
          </ThemedText>
        )}
        <ThemedText type="smallBold" themeColor="onInk" style={large ? styles.instructionLarge : styles.instruction} numberOfLines={2}>
          {instruction}
        </ThemedText>
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
    borderRadius: Radius.lg,
  },
  bannerLarge: { paddingVertical: Spacing.three + Spacing.one },
  badge: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  badgeLarge: { width: 64, height: 64, borderRadius: 32 },
  text: { flex: 1 },
  distance: { fontSize: 18, lineHeight: 22, fontWeight: 800 },
  distanceLarge: { fontSize: 28, lineHeight: 34 },
  instruction: { fontSize: 15, lineHeight: 20 },
  instructionLarge: { fontSize: 17, lineHeight: 23 },
});
