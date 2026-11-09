import { router } from 'expo-router';
import { Info, Languages, LogOut, MessageCircle, Palette, ShieldCheck, UserPen } from 'lucide-react-native';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MenuGroup, MenuRow } from '@/components/ui/menu-row';
import { ScreenHero } from '@/components/ui/screen-hero';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useSettings } from '@/hooks/use-settings';
import { useTheme } from '@/hooks/use-theme';
import { useI18n, type TranslationKey } from '@/i18n';
import { useAuth, useProfile } from '@/providers/auth-provider';

const THEME_LABEL: Record<'system' | 'light' | 'dark', TranslationKey> = {
  system: 'display.system',
  light: 'display.light',
  dark: 'display.dark',
};

/** The Menu tab: who you are, then the settings and info screens, then log out. */
export default function MenuScreen() {
  const theme = useTheme();
  const { t, language } = useI18n();
  const me = useProfile();
  const { signOut } = useAuth();
  const settings = useSettings();

  return (
    <SafeAreaView edges={['top']} style={[styles.fill, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHero
          title={me.displayName}
          leading={<Avatar userId={me.id} name={me.displayName} avatar={me.avatar} size={72} ring={theme.ink} />}
        />

        <MenuGroup title={t('menu.settings')}>
          <MenuRow icon={UserPen} label={t('menu.account')} onPress={() => router.push('/settings/account')} />
          <MenuRow
            icon={Palette}
            label={t('display.title')}
            value={t(THEME_LABEL[settings.theme])}
            onPress={() => router.push('/settings/display')}
          />
          <MenuRow
            icon={Languages}
            label={t('profile.language')}
            value={language === 'km' ? 'ខ្មែរ' : 'English'}
            onPress={() => router.push('/settings/language')}
          />
          <MenuRow icon={ShieldCheck} label={t('profile.privacy')} onPress={() => router.push('/settings/privacy')} />
        </MenuGroup>

        <MenuGroup title={t('menu.help')}>
          <MenuRow icon={Info} label={t('profile.about')} onPress={() => router.push('/settings/about')} />
          <MenuRow icon={MessageCircle} label={t('menu.contact')} onPress={() => router.push('/settings/contact')} />
        </MenuGroup>

        <Button label={t('profile.logout')} variant="danger" icon={LogOut} onPress={signOut} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.four, paddingBottom: BottomTabInset + Spacing.four },
});
