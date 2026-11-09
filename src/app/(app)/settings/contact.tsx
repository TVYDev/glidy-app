import { Mail, Send, ThumbsUp } from 'lucide-react-native';
import { Linking, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useDialog } from '@/components/ui/dialog';
import { MenuGroup, MenuRow } from '@/components/ui/menu-row';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { CONTACT } from '@/constants/links';
import { useI18n } from '@/i18n';

/** Ways to reach the Glidy team. The values come from constants/links.ts (currently placeholders). */
export default function ContactScreen() {
  const { t } = useI18n();
  const dialog = useDialog();

  async function open(url: string) {
    try {
      await Linking.openURL(url);
    } catch {
      await dialog.confirm({ title: t('contact.openError'), cancelLabel: null });
    }
  }

  return (
    <Screen scroll edges={['left', 'right', 'bottom']} contentStyle={styles.content}>
      <ThemedText type="small" themeColor="textSecondary">
        {t('contact.intro')}
      </ThemedText>

      <MenuGroup>
        <MenuRow
          icon={Mail}
          label={t('contact.email')}
          value={CONTACT.email}
          external
          onPress={() => void open(`mailto:${CONTACT.email}`)}
        />
        <MenuRow
          icon={Send}
          label={t('contact.telegram')}
          value={CONTACT.telegramHandle}
          external
          onPress={() => void open(CONTACT.telegramUrl)}
        />
        <MenuRow
          icon={ThumbsUp}
          label={t('contact.facebook')}
          value={CONTACT.facebookName}
          external
          onPress={() => void open(CONTACT.facebookUrl)}
        />
      </MenuGroup>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: Spacing.three },
});
