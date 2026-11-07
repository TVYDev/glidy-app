import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n';
import { useAuth } from '@/providers/auth-provider';

export default function LoginScreen() {
  const { signIn, isMock } = useAuth();
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('auth.errLogin'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll edges={['top', 'left', 'right', 'bottom']}>
      <BackButton />
      <ThemedText type="subtitle">{t('auth.welcomeBack')}</ThemedText>
      {isMock && (
        <ThemedText type="small" themeColor="textSecondary">
          {t('auth.demoNote')}
        </ThemedText>
      )}
      <View style={styles.form}>
        <TextField
          label={t('auth.email')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
        />
        <TextField
          label={t('auth.password')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
          onSubmitEditing={submit}
        />
        {error && (
          <ThemedText type="small" themeColor="danger">
            {error}
          </ThemedText>
        )}
        <Button label={t('auth.login')} onPress={submit} loading={loading} disabled={!email || !password} />
      </View>
      <Link href="/sign-up" replace>
        <ThemedText type="linkPrimary">{t('auth.newHere')}</ThemedText>
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.three },
});
