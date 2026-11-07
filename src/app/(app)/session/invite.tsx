import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Share, StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { backend } from '@/lib/backend';
import type { Session } from '@/lib/types';

export default function InviteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    backend.sessions
      .get(id)
      .then(setSession)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not load the invite.'));
  }, [id]);

  if (!session) {
    return (
      <Screen>
        {error ? (
          <ThemedText themeColor="danger">{error}</ThemedText>
        ) : (
          <ActivityIndicator color={theme.primary} />
        )}
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
    await Share.share({
      message: `Join my Glidy group "${session!.name}". Open this link on a phone with Glidy: ${link}\nOr enter the code ${session!.code} in the app.`,
    });
  }

  return (
    <Screen scroll edges={['left', 'right', 'bottom']} contentStyle={styles.content}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
        Friends can scan this QR code, open the link, or type the code to join {session.name}.
      </ThemedText>

      <View style={[styles.qr, { backgroundColor: '#FFFFFF' }]}>
        <QRCode value={link} size={220} color="#10201A" backgroundColor="#FFFFFF" />
      </View>

      <View style={[styles.codeBox, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <ThemedText type="small" themeColor="textSecondary">
          GROUP CODE
        </ThemedText>
        <ThemedText type="title" style={styles.code}>
          {session.code}
        </ThemedText>
      </View>

      <View style={styles.actions}>
        <Button
          label={copied ? 'Copied' : 'Copy code'}
          variant="secondary"
          icon={{ sf: 'doc.on.doc', md: 'content_copy' }}
          onPress={copy}
          style={styles.flex}
        />
        <Button
          label="Share link"
          icon={{ sf: 'square.and.arrow.up', md: 'share' }}
          onPress={share}
          style={styles.flex}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: 'stretch', padding: Spacing.four },
  center: { textAlign: 'center' },
  qr: { alignSelf: 'center', padding: Spacing.three, borderRadius: Radius.md },
  codeBox: { alignItems: 'center', padding: Spacing.three, borderRadius: Radius.md, borderWidth: 1 },
  code: { letterSpacing: 6, fontSize: 40, lineHeight: 48 },
  actions: { flexDirection: 'row', gap: Spacing.two },
  flex: { flex: 1 },
});
