import { Crown } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { Icon } from '@/components/ui/icon';
import { Radius, Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';
import { formatDistance } from '@/lib/geo';
import type { Coord, Member, MemberLocation } from '@/lib/types';

type MemberStripProps = {
  members: Member[];
  meId: string;
  leaderId: string;
  /** Latest known position per member id (including me). */
  locations: Record<string, MemberLocation | undefined>;
  /** Metres left for a traveller at a position, or null when there is no destination. */
  distanceLeft: (position: Coord) => number | null;
  /** Leader only: hand the group to this member. Shows a "Make leader" action on each other member. */
  onMakeLeader?: (member: Member) => void;
};

/** Horizontal list of travellers with who is leading and how far each has to go. */
export function MemberStrip({ members, meId, leaderId, locations, distanceLeft }: MemberStripProps) {
  const theme = useTheme();
  const { t } = useI18n();

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {members.map((member) => {
        const location = locations[member.userId];
        const isMe = member.userId === meId;
        const left = location ? distanceLeft(location.coord) : null;
        const subtitle = !location
          ? t('members.waiting')
          : left != null
            ? t('members.toGo', { distance: formatDistance(left) })
            : t('members.sharing');
        return (
          <View
            key={member.userId}
            style={[styles.card, { backgroundColor: theme.backgroundSelected, opacity: location ? 1 : 0.65 }]}>
            <Avatar userId={member.userId} name={member.displayName} avatar={member.avatar} size={40} leader={member.userId === leaderId} />
            <View>
              <ThemedText type="smallBold" numberOfLines={1} style={styles.name}>
                {isMe ? t('members.you') : member.displayName}
                {member.userId === leaderId ? ` · ${t('members.leader')}` : ''}
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
    borderRadius: Radius.lg,
  },
  name: { maxWidth: 160 },
});

/** Full-width rows for the expanded sheet: who is where, and how far each has to go. */
export function MemberList({ members, meId, leaderId, locations, distanceLeft, onMakeLeader }: MemberStripProps) {
  const theme = useTheme();
  const { t } = useI18n();

  return (
    <View style={[listStyles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      {members.map((member, index) => {
        const location = locations[member.userId];
        const left = location ? distanceLeft(location.coord) : null;
        const isMe = member.userId === meId;
        return (
          <View
            key={member.userId}
            style={[
              listStyles.row,
              index < members.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
            ]}>
            <Avatar userId={member.userId} name={member.displayName} avatar={member.avatar} size={40} leader={member.userId === leaderId} />
            <View style={listStyles.text}>
              <ThemedText type="smallBold" numberOfLines={1}>
                {isMe ? t('members.you') : member.displayName}
              </ThemedText>
              <View style={listStyles.roleRow}>
                <ThemedText type="small" themeColor="textSecondary">
                  {member.userId === leaderId ? t('members.leader') : t('members.member')}
                </ThemedText>
                {onMakeLeader && member.userId !== leaderId && !isMe && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('leader.makeLeader')}
                    hitSlop={8}
                    onPress={() => onMakeLeader(member)}
                    style={({ pressed }) => [listStyles.makeLeader, { backgroundColor: theme.accent, opacity: pressed ? 0.7 : 1 }]}>
                    <Icon icon={Crown} size={13} color="primaryDark" />
                    <ThemedText type="caption" style={{ color: theme.primaryDark }}>
                      {t('leader.makeLeader')}
                    </ThemedText>
                  </Pressable>
                )}
              </View>
            </View>
            <View style={listStyles.right}>
              <ThemedText type="smallBold">
                {!location ? '–' : left != null ? formatDistance(left) : t('members.sharing')}
              </ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                {!location ? t('members.waiting') : left != null ? t('members.leftLabel') : ''}
              </ThemedText>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const listStyles = StyleSheet.create({
  card: { borderRadius: Radius.lg, borderWidth: 1, paddingHorizontal: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.two + Spacing.one },
  text: { flex: 1 },
  roleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.two },
  makeLeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, paddingHorizontal: Spacing.two, paddingVertical: Spacing.half + 1, borderRadius: Radius.pill },
  right: { alignItems: 'flex-end' },
});
