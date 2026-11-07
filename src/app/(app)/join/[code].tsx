import { router, useLocalSearchParams } from 'expo-router';
import { Users } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { IconBadge } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n';
import { backend } from '@/lib/backend';

/** Confirmation step shared by manual entry, QR scans and glidyapp://join/CODE links. */
export default function JoinCodeScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function join() {
    setLoading(true);
    setError(null);
    try {
      const session = await backend.sessions.join(code);
      router.replace({ pathname: '/session/[id]', params: { id: session.id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : t('join.error'));
      setLoading(false);
    }
  }

  return (
    <Screen edges={['left', 'right', 'bottom']} contentStyle={styles.content}>
      <View style={styles.hero}>
        <IconBadge icon={Users} size={80} />
        <ThemedText type="subtitle" style={styles.center}>
          {t('join.confirmTitle', { code })}
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.center}>
          {t('join.confirmBody')}
        </ThemedText>
      </View>

      {error && (
        <ThemedText type="small" themeColor="danger" style={styles.center}>
          {error}
        </ThemedText>
      )}

      <View style={styles.actions}>
        <Button label={t('join.joinGroup')} onPress={join} loading={loading} />
        <Button label={t('common.cancel')} variant="ghost" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, justifyContent: 'space-between', padding: Spacing.four },
  hero: { alignItems: 'center', gap: Spacing.three, paddingTop: Spacing.five },
  center: { textAlign: 'center' },
  actions: { gap: Spacing.two },
});
