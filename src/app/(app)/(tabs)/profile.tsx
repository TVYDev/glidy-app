import { LogOut } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LanguageToggle } from '@/components/ui/language-toggle';
import { TextField } from '@/components/ui/text-field';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { setPrivacy, usePrivacy } from '@/hooks/use-privacy';
import { useI18n } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';
import { hasMapbox } from '@/lib/mapbox-api';
import { useAuth, useProfile } from '@/providers/auth-provider';

export default function ProfileScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const me = useProfile();
  const { signOut, updateDisplayName, isMock } = useAuth();
  const { preciseLocation } = usePrivacy();
  const [name, setName] = useState(me.displayName);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const dirty = name.trim().length > 0 && name.trim() !== me.displayName;

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      await updateDisplayName(name);
      setMessage(t('profile.saved'));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : t('profile.saveError'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.fill, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.identity}>
          <Avatar userId={me.id} name={me.displayName} size={84} ring={theme.primary} />
          <ThemedText type="subtitle">{me.displayName}</ThemedText>
        </View>

        <TextField label={t('profile.displayName')} value={name} onChangeText={setName} />
        {message && (
          <ThemedText type="small" themeColor="textSecondary">
            {message}
          </ThemedText>
        )}
        <Button label={t('profile.saveName')} variant="secondary" onPress={save} loading={saving} disabled={!dirty} />

        <ThemedText type="smallBold" style={styles.sectionTitle}>
          {t('profile.language')}
        </ThemedText>
        <LanguageToggle />

        <ThemedText type="smallBold" style={styles.sectionTitle}>
          {t('profile.privacy')}
        </ThemedText>
        <Card style={styles.card}>
          <ThemedText type="small">{t('profile.privacyText')}</ThemedText>
          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <ThemedText type="smallBold">{t('profile.precise')}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {t('profile.preciseHelp')}
              </ThemedText>
            </View>
            <Switch
              value={preciseLocation}
              onValueChange={(value) => setPrivacy({ preciseLocation: value })}
              trackColor={{ true: theme.primary, false: theme.border }}
              thumbColor="#FFFFFF"
            />
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            {t('profile.pauseHint')}
          </ThemedText>
        </Card>

        <ThemedText type="smallBold" style={styles.sectionTitle}>
          {t('profile.about')}
        </ThemedText>
        <Card>
          <ThemedText type="small">
            {t('profile.backend')}: {isMock ? t('profile.backendDemo') : t('profile.backendSupabase')}
            {'\n'}
            {t('profile.maps')}: {hasMapbox ? t('profile.mapsMapbox') : t('profile.mapsSchematic')}
          </ThemedText>
        </Card>

        <Button label={t('profile.logout')} variant="danger" icon={LogOut} onPress={signOut} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: BottomTabInset + Spacing.four },
  identity: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.three },
  sectionTitle: { marginTop: Spacing.two, fontSize: 18, lineHeight: 24 },
  card: { gap: Spacing.three },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  switchText: { flex: 1 },
});
