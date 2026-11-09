import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Segmented } from '@/components/ui/segmented';
import { Spacing } from '@/constants/theme';
import { setSettings, useSettings, type TextSize, type ThemePreference } from '@/hooks/use-settings';
import { useI18n } from '@/i18n';

/** Light or dark appearance and how large the text is, with a live preview of the text. */
export default function DisplayScreen() {
  const { t } = useI18n();
  const settings = useSettings();

  const themes: { value: ThemePreference; label: string }[] = [
    { value: 'system', label: t('display.system') },
    { value: 'light', label: t('display.light') },
    { value: 'dark', label: t('display.dark') },
  ];
  const sizes: { value: TextSize; label: string }[] = [
    { value: 'default', label: t('display.sizeDefault') },
    { value: 'large', label: t('display.sizeLarge') },
    { value: 'xlarge', label: t('display.sizeXLarge') },
  ];

  return (
    <Screen scroll edges={['left', 'right', 'bottom']} contentStyle={styles.content}>
      <View style={styles.section}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          {t('display.appearance')}
        </ThemedText>
        <Segmented options={themes} value={settings.theme} onChange={(theme) => setSettings({ theme })} />
      </View>

      <View style={styles.section}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          {t('display.textSize')}
        </ThemedText>
        <Segmented options={sizes} value={settings.textSize} onChange={(textSize) => setSettings({ textSize })} />
        <ThemedText type="small" themeColor="textSecondary">
          {t('display.textSizeHelp')}
        </ThemedText>
      </View>

      <View style={styles.section}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          {t('display.preview')}
        </ThemedText>
        <Card style={styles.preview}>
          <ThemedText type="smallBold" style={styles.previewTitle}>
            {t('display.previewTitle')}
          </ThemedText>
          <ThemedText>{t('display.previewBody')}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            124 km · 2 h 35 min
          </ThemedText>
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: Spacing.four },
  section: { gap: Spacing.two },
  preview: { gap: Spacing.two },
  previewTitle: { fontSize: 18, lineHeight: 24 },
});
