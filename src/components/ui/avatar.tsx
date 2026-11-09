import { Image } from 'expo-image';
import { Crown } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { fontFamilyFor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { colorFor, initials } from '@/lib/geo';
import type { Avatar as AvatarData } from '@/lib/types';

type AvatarProps = {
  userId: string;
  name: string;
  /** The person's picture. Without one, their initials are shown. */
  avatar?: AvatarData | null;
  size?: number;
  ring?: string;
  /** Draws the group-leader crown on the corner. */
  leader?: boolean;
};

const KHMER = /[ក-៿]/;

/**
 * A person's picture: their photo, an emoji on a coloured circle, or their initials on a colour
 * derived from their id. Used in lists, on the map and in the menu. Sized in points and not
 * affected by the text-size setting, because it is a graphic and has to fit its circle.
 */
export function Avatar({ leader, ...props }: AvatarProps) {
  if (!leader) return <AvatarFace {...props} />;
  const badge = Math.max(14, Math.round((props.size ?? 40) * 0.42));
  return (
    <View>
      <AvatarFace {...props} />
      <View style={[styles.crown, { width: badge, height: badge, borderRadius: badge / 2, right: -badge * 0.25, top: -badge * 0.3 }]}>
        <Crown size={badge * 0.62} color="#212121" fill="#212121" strokeWidth={1.5} />
      </View>
    </View>
  );
}

function AvatarFace({ userId, name, avatar, size = 40, ring }: Omit<AvatarProps, 'leader'>) {
  const shape = {
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: ring ? 3 : 0,
    borderColor: ring,
  };

  if (avatar?.kind === 'photo') {
    return (
      <Image
        source={{ uri: avatar.uri }}
        accessibilityLabel={name}
        contentFit="cover"
        style={[shape, styles.photo]}
        // The data URI is tiny and static: no caching or transition is needed.
        cachePolicy="memory"
        transition={0}
      />
    );
  }

  if (avatar?.kind === 'emoji') {
    return (
      <View style={[styles.circle, shape, { backgroundColor: avatar.color }]} accessibilityLabel={name}>
        {/* A bare Text: the app fonts have no emoji glyphs, so the system emoji font must be used. */}
        <Text style={{ fontSize: size * 0.5, lineHeight: size * 0.62, textAlign: 'center' }}>{avatar.emoji}</Text>
      </View>
    );
  }

  const letters = initials(name);
  return (
    <View style={[styles.circle, shape, { backgroundColor: colorFor(userId) }]} accessibilityLabel={name}>
      <Text
        style={{
          color: '#FFFFFF',
          fontFamily: fontFamilyFor(KHMER.test(letters) ? 'km' : 'en', 700),
          fontSize: Math.max(11, size * 0.36),
          lineHeight: size * (KHMER.test(letters) ? 0.7 : 0.5),
        }}>
        {letters}
      </Text>
    </View>
  );
}

type StackMember = { userId: string; displayName: string; avatar?: AvatarData | null };

/** Overlapping avatars with a "+n" overflow chip. */
export function AvatarStack({ members, max = 3, size = 32 }: { members: StackMember[]; max?: number; size?: number }) {
  const theme = useTheme();
  const shown = members.slice(0, max);
  const extra = members.length - shown.length;
  return (
    <View style={styles.stack}>
      {shown.map((m, i) => (
        <View key={m.userId} style={{ marginLeft: i === 0 ? 0 : -size * 0.3 }}>
          <Avatar userId={m.userId} name={m.displayName} avatar={m.avatar} size={size} ring={theme.background} />
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
          <Text style={{ fontFamily: fontFamilyFor('en', 700), fontSize: 12, color: theme.text }}>+{extra}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
  crown: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFB708',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  photo: { backgroundColor: '#D5DAD4' },
  stack: { flexDirection: 'row', alignItems: 'center' },
  more: { alignItems: 'center', justifyContent: 'center', borderWidth: 3 },
});
