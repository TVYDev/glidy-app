import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { ScreenHero } from '@/components/ui/screen-hero';
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
      <ScreenHero title={t('join.confirmTitle', { code })} body={t('join.confirmBody')} />

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
  content: { flex: 1, justifyContent: 'space-between', padding: Spacing.three },
  center: { textAlign: 'center' },
  actions: { gap: Spacing.two },
});
