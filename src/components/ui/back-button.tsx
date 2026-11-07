import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { Pressable, StyleSheet } from 'react-native';

import { Glass } from '@/components/ui/glass';
import { Icon } from '@/components/ui/icon';
import { useI18n } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';

/** Round back button (liquid glass on iOS 26) for screens that hide the native header. */
export function BackButton() {
  const theme = useTheme();
  const { t } = useI18n();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('session.back')}
      onPress={() => router.back()}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, alignSelf: 'flex-start' })}>
      <Glass
        style={styles.button}
        fallbackColor={theme.backgroundElement}
        fallbackBorderColor={theme.border}
        interactive>
        <Icon icon={ArrowLeft} size={20} />
      </Glass>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
