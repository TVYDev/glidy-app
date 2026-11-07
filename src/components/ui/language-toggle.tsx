import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { Language } from '@/constants/theme';
import { Radius, Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';

const OPTIONS: { value: Language; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'km', label: 'ខ្មែរ' },
];

/** Two-option language switch. Labels are always written in their own language. */
export function LanguageToggle({ compact }: { compact?: boolean }) {
  const theme = useTheme();
  const { language, setLanguage } = useI18n();

  return (
    <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
      {OPTIONS.map((option) => {
        const selected = option.value === language;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => setLanguage(option.value)}
            style={[
              styles.option,
              compact && styles.optionCompact,
              selected && { backgroundColor: theme.primary },
            ]}>
            <ThemedText
              type="smallBold"
              themeColor={selected ? 'onPrimary' : 'textSecondary'}
              style={compact ? styles.compactText : undefined}>
              {compact ? (option.value === 'en' ? 'EN' : 'ខ្មែរ') : option.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    padding: Spacing.one,
    borderRadius: Radius.pill,
  },
  option: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionCompact: { flex: 0, minHeight: 36, paddingHorizontal: Spacing.three },
  compactText: { fontSize: 13 },
});
