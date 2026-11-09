import { Search } from 'lucide-react-native';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { searchPlaceFullScreen } from '@/lib/place-picker';
import type { Coord, Place } from '@/lib/types';

type PlaceSearchProps = {
  onSelect: (place: Place) => void;
  label?: string;
  placeholder?: string;
  /** Bias results towards this point and show how far each one is from it. */
  near?: Coord | null;
  /** Offer "Choose on map" in the list. */
  mapPick?: boolean;
  /** Open the search straight away instead of waiting for a tap. */
  autoFocus?: boolean;
};

/**
 * The destination field. Tapping it opens search on a screen of its own (see place/search.tsx), with
 * the input at the top and the whole screen for results, so the keyboard never covers them. The chosen
 * place comes back through `onSelect`.
 */
export function PlaceSearch({ onSelect, label, placeholder, near, mapPick, autoFocus }: PlaceSearchProps) {
  const theme = useTheme();
  const { t } = useI18n();

  async function open() {
    const place = await searchPlaceFullScreen({ near: near ?? null, mapPick: !!mapPick, placeholder });
    if (place) onSelect(place);
  }

  // Opened from a button that already said "search" (change destination, add a stop): go straight in.
  useEffect(() => {
    if (autoFocus) void open();
    // Only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.wrapper}>
      {label ? (
        <ThemedText type="smallBold" themeColor="textSecondary">
          {label}
        </ThemedText>
      ) : null}
      <Pressable
        accessibilityRole="search"
        accessibilityLabel={placeholder ?? t('search.placeholder')}
        onPress={open}
        style={({ pressed }) => [
          styles.bar,
          { backgroundColor: theme.backgroundElement, borderColor: theme.border, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Icon icon={Search} size={20} color="textSecondary" />
        <ThemedText themeColor="textSecondary" style={styles.placeholder}>
          {placeholder ?? t('search.placeholder')}
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: Spacing.two },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 56,
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
  },
  placeholder: { flex: 1 },
});
