import * as WebBrowser from 'expo-web-browser';
import { FileText } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { MenuGroup, MenuRow } from '@/components/ui/menu-row';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { PRIVACY_POLICY_URL } from '@/constants/links';
import { setPrivacy, usePrivacy } from '@/hooks/use-privacy';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';

/** What Glidy shares and when, the precise-location switch, and the full privacy policy. */
export default function PrivacyScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const { preciseLocation } = usePrivacy();
  const [error, setError] = useState<string | null>(null);

  async function openPolicy() {
    setError(null);
    try {
      await WebBrowser.openBrowserAsync(PRIVACY_POLICY_URL, { controlsColor: theme.primaryDark });
    } catch {
      setError(t('privacy.openError'));
    }
  }

  return (
    <Screen scroll edges={['left', 'right', 'bottom']} contentStyle={styles.content}>
      <Card style={styles.card}>
        <ThemedText type="small">{t('profile.privacyText')}</ThemedText>
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <ThemedText type="smallBold">{t('profile.precise')}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {t('profile.preciseHelp')}
            </ThemedText>
          </View>
          <Switch
            value={preciseLocation}
            onValueChange={(value) => setPrivacy({ preciseLocation: value })}
            trackColor={{ true: theme.primary, false: theme.border }}
            thumbColor="#FFFFFF"
          />
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          {t('profile.pauseHint')}
        </ThemedText>
      </Card>

      <View style={styles.section}>
        <MenuGroup>
          <MenuRow icon={FileText} label={t('privacy.policy')} external onPress={openPolicy} />
        </MenuGroup>
        <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
          {t('privacy.policySub')}
        </ThemedText>
        {error && (
          <ThemedText type="small" themeColor="danger" style={styles.hint}>
            {error}
          </ThemedText>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: Spacing.four },
  card: { gap: Spacing.three },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  switchText: { flex: 1 },
  section: { gap: Spacing.two },
  hint: { paddingHorizontal: Spacing.one },
});
