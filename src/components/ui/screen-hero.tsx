import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { RouteMotif } from '@/components/ui/brand-art';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ScreenHeroProps = {
  title: string;
  body?: string;
  /** Something above the headline, such as a profile picture. */
  leading?: ReactNode;
  /** Extra content under the text, such as a row of faces. */
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * The amber header card at the top of a screen: a `display` headline over a faint copy of the
 * Glidy route. It is how every screen gets the brand without each one inventing its own hero.
 * Home is the one screen that makes a bigger moment of it, so use this on the quieter ones.
 */
export function ScreenHero({ title, body, leading, children, style }: ScreenHeroProps) {
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.primary }, style]}>
      <View style={styles.motif} pointerEvents="none">
        <RouteMotif width={210} height={98} color={theme.ink} />
      </View>
      {leading}
      <ThemedText type="display" themeColor="onPrimary">
        {title}
      </ThemedText>
      {body ? (
        <ThemedText themeColor="onPrimary" style={styles.body}>
          {body}
        </ThemedText>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.xl, padding: Spacing.four, gap: Spacing.two, overflow: 'hidden' },
  motif: { position: 'absolute', right: -34, bottom: -22, opacity: 0.22 },
  body: { opacity: 0.92 },
});
