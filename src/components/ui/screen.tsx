import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ScreenProps = {
  children: React.ReactNode;
  scroll?: boolean;
  /** Which safe-area edges to pad. Screens under a native header/tab bar pass fewer. */
  edges?: Edge[];
  contentStyle?: StyleProp<ViewStyle>;
  /** Set false to freeze the page scroll, e.g. while the user drags an embedded map. */
  scrollEnabled?: boolean;
};

/** Themed full-screen container with consistent gutters. */
export function Screen({
  children,
  scroll,
  edges = ['top', 'left', 'right'],
  contentStyle,
  scrollEnabled = true,
}: ScreenProps) {
  const theme = useTheme();
  return (
    <SafeAreaView edges={edges} style={[styles.fill, { backgroundColor: theme.background }]}>
      {scroll ? (
        <ScrollView
          scrollEnabled={scrollEnabled}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.content, contentStyle]}>
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.fill, styles.content, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three },
});
