import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { distanceBetween, formatDistance } from '@/lib/geo';
import type { Coord, Member, MemberLocation } from '@/lib/types';

type MemberStripProps = {
  members: Member[];
  meId: string;
  leaderId: string;
  /** Latest known position per member id (including me). */
  locations: Record<string, MemberLocation | undefined>;
  destination: Coord | null;
};

/** Horizontal list of travellers with who is leading and how far each has to go. */
export function MemberStrip({ members, meId, leaderId, locations, destination }: MemberStripProps) {
  const theme = useTheme();

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {members.map((member) => {
        const location = locations[member.userId];
        const isMe = member.userId === meId;
        const subtitle = !location
          ? 'Waiting for location'
          : destination
            ? `${formatDistance(distanceBetween(location.coord, destination))} to go`
            : 'Sharing live';
        return (
          <View
            key={member.userId}
            style={[styles.card, { backgroundColor: theme.backgroundSelected, opacity: location ? 1 : 0.6 }]}>
            <Avatar userId={member.userId} name={member.displayName} size={36} />
            <View>
              <ThemedText type="smallBold" numberOfLines={1} style={styles.name}>
                {isMe ? 'You' : member.displayName}
                {member.userId === leaderId ? ' · Leader' : ''}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {subtitle}
              </ThemedText>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: Spacing.two, paddingRight: Spacing.three },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
  },
  name: { maxWidth: 150 },
});
