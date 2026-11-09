import { Check } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { Radius, Spacing, type Language } from '@/constants/theme';
import { useI18n } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';

const OPTIONS: { value: Language; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'km', label: 'ខ្មែរ' },
];

/** Choose the app language. Each name is written in its own language and its own font. */
export default function LanguageScreen() {
  const theme = useTheme();
  const { t, language, setLanguage } = useI18n();

  return (
    <Screen scroll edges={['left', 'right', 'bottom']}>
      <ThemedText type="small" themeColor="textSecondary">
        {t('language.help')}
      </ThemedText>

      <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        {OPTIONS.map((option, index) => {
          const selected = option.value === language;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setLanguage(option.value)}
              style={({ pressed }) => [
                styles.row,
                index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border },
                { opacity: pressed ? 0.7 : 1 },
              ]}>
              <ThemedText type="smallBold" fontLanguage={option.value} style={styles.label}>
                {option.label}
              </ThemedText>
              {selected && (
                <View style={[styles.check, { backgroundColor: theme.primary }]}>
                  <Icon icon={Check} size={16} color="onPrimary" strokeWidth={3} />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.lg, borderWidth: 1, paddingHorizontal: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 64, paddingVertical: Spacing.two },
  label: { flex: 1, fontSize: 17 },
  check: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
