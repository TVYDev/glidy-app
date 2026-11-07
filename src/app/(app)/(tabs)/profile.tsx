import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { BottomTabInset, Radius, Spacing } from '@/constants/theme';
import { setPrivacy, usePrivacy } from '@/hooks/use-privacy';
import { useTheme } from '@/hooks/use-theme';
import { hasMapbox } from '@/lib/mapbox-api';
import { useAuth, useProfile } from '@/providers/auth-provider';

export default function ProfileScreen() {
  const theme = useTheme();
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
      setMessage('Saved.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.fill, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.identity}>
          <Avatar userId={me.id} name={me.displayName} size={72} />
          <ThemedText type="subtitle">{me.displayName}</ThemedText>
        </View>

        <TextField label="Display name" value={name} onChangeText={setName} />
        {message && (
          <ThemedText type="small" themeColor="textSecondary">
            {message}
          </ThemedText>
        )}
        <Button label="Save name" variant="secondary" onPress={save} loading={saving} disabled={!dirty} />

        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
          PRIVACY
        </ThemedText>
        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <ThemedText type="small">
            Glidy only reads and shares your location while you have a group open on screen. It stops the moment you
            leave the map.
          </ThemedText>
          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <ThemedText type="smallBold">Share precise location</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Turn off to share an approximate position (about 100 m) with your group.
              </ThemedText>
            </View>
            <Switch
              value={preciseLocation}
              onValueChange={(value) => setPrivacy({ preciseLocation: value })}
              trackColor={{ true: theme.primary }}
            />
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            You can also pause sharing at any time from the group map.
          </ThemedText>
        </View>

        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
          ABOUT
        </ThemedText>
        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <ThemedText type="small">
            Backend: {isMock ? 'demo (this device only)' : 'Supabase'}
            {'\n'}Maps: {hasMapbox ? 'Mapbox' : 'schematic (no Mapbox token)'}
          </ThemedText>
        </View>

        <Button label="Log out" variant="danger" onPress={signOut} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: BottomTabInset + Spacing.five },
  identity: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.three },
  sectionTitle: { marginTop: Spacing.two },
  card: { padding: Spacing.three, borderRadius: Radius.md, borderWidth: 1, gap: Spacing.three },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  switchText: { flex: 1 },
});
