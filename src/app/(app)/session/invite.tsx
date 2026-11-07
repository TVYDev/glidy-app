import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams } from 'expo-router';
import { Copy, Share2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Share, StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Radius, Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';
import { backend } from '@/lib/backend';
import type { Session } from '@/lib/types';

export default function InviteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { t } = useI18n();
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    backend.sessions
      .get(id)
      .then(setSession)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : t('invite.loadError')));
  }, [id, t]);

  if (!session) {
    return (
      <Screen>
        {error ? <ThemedText themeColor="danger">{error}</ThemedText> : <ActivityIndicator color={theme.primaryDark} />}
      </Screen>
    );
  }

  const link = `glidyapp://join/${session.code}`;

  async function copy() {
    await Clipboard.setStringAsync(session!.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function share() {
    await Share.share({ message: t('invite.shareMessage', { name: session!.name, link, code: session!.code }) });
  }

  return (
    <Screen scroll edges={['left', 'right', 'bottom']} contentStyle={styles.content}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
        {t('invite.intro', { name: session.name })}
      </ThemedText>

      <View style={[styles.qr, { backgroundColor: '#FFFFFF', borderColor: theme.border }]}>
        <QRCode value={link} size={220} color="#212121" backgroundColor="#FFFFFF" />
      </View>

      <Card style={styles.codeBox}>
        <ThemedText type="caption" themeColor="textSecondary">
          {t('invite.code')}
        </ThemedText>
        <ThemedText type="title" style={styles.code}>
          {session.code}
        </ThemedText>
      </Card>

      <View style={styles.actions}>
        <Button
          label={copied ? t('invite.copied') : t('invite.copy')}
          variant="secondary"
          icon={Copy}
          onPress={copy}
          style={styles.flex}
        />
        <Button label={t('invite.share')} icon={Share2} onPress={share} style={styles.flex} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: 'stretch', padding: Spacing.four },
  center: { textAlign: 'center' },
  qr: { alignSelf: 'center', padding: Spacing.three, borderRadius: Radius.lg, borderWidth: 1 },
  codeBox: { alignItems: 'center', gap: Spacing.one },
  code: { letterSpacing: 6, fontSize: 40, lineHeight: 48, fontWeight: 800 },
  actions: { flexDirection: 'row', gap: Spacing.two },
  flex: { flex: 1 },
});
