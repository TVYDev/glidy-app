import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
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
});
