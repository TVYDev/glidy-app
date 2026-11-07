import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { backend } from '@/lib/backend';

/** Confirmation step shared by manual entry, QR scans and glidyapp://join/CODE links. */
export default function JoinCodeScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function join() {
    setLoading(true);
    setError(null);
    try {
      const session = await backend.sessions.join(code);
      router.replace({ pathname: '/session/[id]', params: { id: session.id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not join the group.');
      setLoading(false);
    }
  }

  return (
    <Screen edges={['left', 'right', 'bottom']} contentStyle={styles.content}>
      <View style={styles.hero}>
        <View style={[styles.icon, { backgroundColor: theme.accent }]}>
          <Icon sf="person.3.fill" md="groups" size={32} color="onAccent" />
        </View>
        <ThemedText type="subtitle">Join group {code}?</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.center}>
          Your name and live location will be visible to everyone in the group while you have it open. You can pause
          sharing or leave at any time.
        </ThemedText>
      </View>

      {error && (
        <ThemedText type="small" themeColor="danger" style={styles.center}>
          {error}
        </ThemedText>
      )}

      <View style={styles.actions}>
        <Button label="Join group" onPress={join} loading={loading} />
        <Button label="Cancel" variant="ghost" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, justifyContent: 'space-between', padding: Spacing.four },
  hero: { alignItems: 'center', gap: Spacing.three, paddingTop: Spacing.five },
  icon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  center: { textAlign: 'center' },
  actions: { gap: Spacing.two },
});
