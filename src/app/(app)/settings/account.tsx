import { Camera, Image as ImageIcon, UserRound } from 'lucide-react-native';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { AVATAR_COLORS, AVATAR_EMOJIS, sameAvatar } from '@/lib/avatar';
import { pickAvatarPhoto } from '@/lib/avatar-photo';
import type { Avatar as AvatarData } from '@/lib/types';
import { useAuth, useProfile } from '@/providers/auth-provider';

const COLUMNS = 8;
const GAP = Spacing.two;
const DEFAULT_COLOR = AVATAR_COLORS[0];
const DEFAULT_EMOJI = AVATAR_EMOJIS[0];

/** Edit the name and the picture (photo, emoji on a colour, or initials) your group sees. */
export default function AccountScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const { width } = useWindowDimensions();
  const me = useProfile();
  const { updateDisplayName, updateAvatar } = useAuth();

  const [name, setName] = useState(me.displayName);
  const [avatar, setAvatar] = useState<AvatarData | null>(me.avatar ?? null);
  const [saving, setSaving] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [cameraDenied, setCameraDenied] = useState(false);

  const nameChanged = name.trim().length > 0 && name.trim() !== me.displayName;
  const avatarChanged = !sameAvatar(avatar, me.avatar);
  const dirty = nameChanged || avatarChanged;

  // The picked colour carries over when switching emoji, and the emoji when switching colour.
  const color = avatar?.kind === 'emoji' ? avatar.color : DEFAULT_COLOR;
  const emoji = avatar?.kind === 'emoji' ? avatar.emoji : DEFAULT_EMOJI;

  const cell = Math.floor((width - Spacing.three * 2 - GAP * (COLUMNS - 1)) / COLUMNS);

  async function choosePhoto(source: 'library' | 'camera') {
    setMessage(null);
    setCameraDenied(false);
    setPreparing(true);
    try {
      const result = await pickAvatarPhoto(source);
      if (result.status === 'ok') setAvatar(result.avatar);
      else if (result.status === 'denied') setCameraDenied(true);
      else if (result.status === 'unavailable') setMessage({ text: t('avatar.cameraUnavailable'), error: true });
    } catch {
      setMessage({ text: t('err.avatarPick'), error: true });
    } finally {
      setPreparing(false);
    }
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      if (nameChanged) await updateDisplayName(name);
      if (avatarChanged) await updateAvatar(avatar);
      setMessage({ text: t('profile.saved'), error: false });
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : t('profile.saveError'), error: true });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen scroll edges={['left', 'right', 'bottom']} contentStyle={styles.content}>
      <View style={styles.preview}>
        <Avatar userId={me.id} name={name.trim() || me.displayName} avatar={avatar} size={112} ring={theme.primary} />
      </View>

      <View style={styles.row}>
        <Button
          label={t('avatar.choosePhoto')}
          variant="secondary"
          compact
          icon={ImageIcon}
          onPress={() => void choosePhoto('library')}
          disabled={preparing}
          style={styles.flex}
        />
        <Button
          label={t('avatar.takePhoto')}
          variant="secondary"
          compact
          icon={Camera}
          onPress={() => void choosePhoto('camera')}
          disabled={preparing}
          style={styles.flex}
        />
      </View>
      {preparing && (
        <ThemedText type="small" themeColor="textSecondary">
          {t('avatar.preparing')}
        </ThemedText>
      )}
      {cameraDenied && (
        <Pressable onPress={() => void Linking.openSettings()}>
          <ThemedText type="small" themeColor="danger">
            {t('avatar.cameraDenied')}
          </ThemedText>
        </Pressable>
      )}

      <View style={styles.section}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          {t('avatar.emoji')}
        </ThemedText>
        <View style={styles.grid}>
          {AVATAR_EMOJIS.map((e) => {
            const selected = avatar?.kind === 'emoji' && avatar.emoji === e;
            return (
              <Pressable
                key={e}
                accessibilityRole="button"
                accessibilityLabel={e}
                accessibilityState={{ selected }}
                onPress={() => setAvatar({ kind: 'emoji', emoji: e, color })}
                style={[
                  styles.cell,
                  { width: cell, height: cell, backgroundColor: theme.backgroundElement, borderColor: theme.border },
                  selected && { backgroundColor: theme.accent, borderColor: theme.primary, borderWidth: 2 },
                ]}>
                <Text style={{ fontSize: cell * 0.55 }}>{e}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          {t('avatar.color')}
        </ThemedText>
        <View style={styles.swatches}>
          {AVATAR_COLORS.map((c) => {
            const selected = avatar?.kind === 'emoji' && avatar.color === c;
            return (
              <Pressable
                key={c}
                accessibilityRole="button"
                accessibilityLabel={c}
                accessibilityState={{ selected }}
                onPress={() => setAvatar({ kind: 'emoji', emoji, color: c })}
                style={[
                  styles.swatch,
                  { backgroundColor: c, borderColor: selected ? theme.text : 'transparent' },
                ]}
              />
            );
          })}
        </View>
      </View>

      {avatar && (
        <Button
          label={t('avatar.useInitials')}
          variant="ghost"
          compact
          icon={UserRound}
          onPress={() => setAvatar(null)}
        />
      )}

      <TextField label={t('profile.displayName')} value={name} onChangeText={setName} />

      {message && (
        <ThemedText type="small" themeColor={message.error ? 'danger' : 'textSecondary'}>
          {message.text}
        </ThemedText>
      )}
      <Button label={t('profile.save')} onPress={save} loading={saving} disabled={!dirty || preparing} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: Spacing.three },
  preview: { alignItems: 'center', paddingVertical: Spacing.three },
  row: { flexDirection: 'row', gap: Spacing.two },
  flex: { flex: 1 },
  section: { gap: Spacing.two },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  cell: { borderRadius: Radius.sm, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  // 8 swatches of 40 plus 7 gaps of 12 fit a 408 pt row; wrapping stays as a fallback for small screens.
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  swatch: { width: 40, height: 40, borderRadius: 20, borderWidth: 3 },
});
