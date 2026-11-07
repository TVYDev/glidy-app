import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { colorFor, initials } from '@/lib/geo';

type AvatarProps = { userId: string; name: string; size?: number; ring?: string };

/** Initials on a colour derived from the member id; used in lists and on the map. */
export function Avatar({ userId, name, size = 40, ring }: AvatarProps) {
  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colorFor(userId),
          borderWidth: ring ? 3 : 0,
          borderColor: ring,
        },
      ]}>
      <ThemedText
        type="smallBold"
        style={{ color: '#FFFFFF', fontSize: Math.max(11, size * 0.36), lineHeight: size * 0.5 }}>
        {initials(name)}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
  stack: { flexDirection: 'row', alignItems: 'center' },
  more: { alignItems: 'center', justifyContent: 'center', borderWidth: 3 },
});

type StackMember = { userId: string; displayName: string };

/** Overlapping avatars with a "+n" overflow chip. */
export function AvatarStack({ members, max = 3, size = 32 }: { members: StackMember[]; max?: number; size?: number }) {
  const theme = useTheme();
  const shown = members.slice(0, max);
  const extra = members.length - shown.length;
  return (
    <View style={styles.stack}>
      {shown.map((m, i) => (
        <View key={m.userId} style={{ marginLeft: i === 0 ? 0 : -size * 0.3 }}>
          <Avatar userId={m.userId} name={m.displayName} size={size} ring={theme.background} />
        </View>
      ))}
      {extra > 0 && (
        <View
          style={[
            styles.more,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              marginLeft: -size * 0.3,
              backgroundColor: theme.backgroundSelected,
              borderColor: theme.background,
            },
          ]}>
          <ThemedText type="caption" style={{ fontWeight: 700 }}>
            +{extra}
          </ThemedText>
        </View>
      )}
    </View>
  );
}
