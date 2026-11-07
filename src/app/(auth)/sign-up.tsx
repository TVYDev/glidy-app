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

export default function SignUpScreen() {
  const { signUp, isMock } = useAuth();
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const valid = name.trim().length > 0 && email.includes('@') && password.length >= 6;

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      await signUp(email, password, name);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('auth.errSignUp'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll edges={['top', 'left', 'right', 'bottom']}>
      <BackButton />
      <ThemedText type="subtitle">{t('auth.createAccount')}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {t('auth.nameHelp')}
        {isMock ? ` ${t('auth.demoNote')}` : ''}
      </ThemedText>
      <View style={styles.form}>
        <TextField
          label={t('auth.name')}
          value={name}
          onChangeText={setName}
          autoComplete="name"
          textContentType="name"
        />
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
          label={t('auth.passwordHint')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          onSubmitEditing={valid ? submit : undefined}
        />
        {error && (
          <ThemedText type="small" themeColor="danger">
            {error}
          </ThemedText>
        )}
        <Button label={t('auth.signUp')} onPress={submit} loading={loading} disabled={!valid} />
      </View>
      <Link href="/login" replace>
        <ThemedText type="linkPrimary">{t('auth.haveAccount')}</ThemedText>
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.three },
});
