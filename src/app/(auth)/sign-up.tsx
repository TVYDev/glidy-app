import { Link, Stack } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/providers/auth-provider';

export default function SignUpScreen() {
  const { signUp, isMock } = useAuth();
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
      setError(e instanceof Error ? e.message : 'Could not create your account.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll edges={['left', 'right', 'bottom']}>
      <Stack.Screen options={{ headerShown: true, title: 'Sign up', headerBackTitle: 'Back', headerShadowVisible: false }} />
      <ThemedText type="subtitle">Create your account</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Your name is what your group sees on the map.
        {isMock ? ' Demo mode: accounts are stored on this device only.' : ''}
      </ThemedText>
      <View style={styles.form}>
        <TextField label="Name" value={name} onChangeText={setName} autoComplete="name" textContentType="name" />
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
        />
        <TextField
          label="Password (6+ characters)"
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
        <Button label="Sign up" onPress={submit} loading={loading} disabled={!valid} />
      </View>
      <Link href="/login" replace>
        <ThemedText type="link" themeColor="primary">
          Already have an account? Login
        </ThemedText>
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.three },
});
