import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { Globe } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Logo } from '@/components/ui/logo';
import { MenuGroup, MenuRow } from '@/components/ui/menu-row';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { WEBSITE_URL } from '@/constants/links';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { hasMaps } from '@/lib/maps-api';
import { useAuth } from '@/providers/auth-provider';

/** What Glidy is, which version this is, a link to the website, and a little technical info. */
export default function AboutScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const { isMock } = useAuth();
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <Screen scroll edges={['left', 'right', 'bottom']} contentStyle={styles.content}>
      <View style={styles.hero}>
        <Logo size={72} showWordmark={false} />
        <ThemedText type="subtitle">glidy</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {t('about.version', { version })}
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.tagline}>
          {t('welcome.tagline')}
        </ThemedText>
      </View>

      <MenuGroup>
        <MenuRow
          icon={Globe}
          label={t('about.website')}
          value="glidy.app"
          external
          onPress={() => void WebBrowser.openBrowserAsync(WEBSITE_URL, { controlsColor: theme.primaryDark })}
        />
      </MenuGroup>

      <View style={styles.section}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          {t('about.diagnostics')}
        </ThemedText>
        <Card>
          <ThemedText type="small">
            {t('profile.backend')}: {isMock ? t('profile.backendDemo') : t('profile.backendSupabase')}
            {'\n'}
            {t('profile.maps')}: {hasMaps ? t('profile.mapsGoogle') : t('profile.mapsSchematic')}
          </ThemedText>
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: Spacing.four },
  hero: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.three },
  tagline: { textAlign: 'center', maxWidth: 320, marginTop: Spacing.two },
  section: { gap: Spacing.two },
});
