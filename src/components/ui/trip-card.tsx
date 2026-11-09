import { Flag } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { RouteThumb } from '@/components/ui/brand-art';
import { ArrowButton, IconBadge } from '@/components/ui/card';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type TripCardProps = {
  title: string;
  subtitle: string;
  /** The trip's route; its real shape is drawn as the thumbnail. Without one a flag is shown. */
  geometry?: [number, number][] | null;
  onPress: () => void;
};

/** A group or saved route as a card: the shape of the trip, its name, and where it goes. */
export function TripCard({ title, subtitle, geometry, onPress }: TripCardProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border, opacity: pressed ? 0.85 : 1 },
      ]}>
      {geometry && geometry.length > 1 ? <RouteThumb geometry={geometry} size={60} /> : <IconBadge icon={Flag} size={60} />}
      <View style={styles.text}>
        <ThemedText type="smallBold" numberOfLines={2} style={styles.title}>
          {title}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
          {subtitle}
        </ThemedText>
      </View>
      <ArrowButton />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  text: { flex: 1 },
  title: { fontSize: 17, lineHeight: 23 },
});
