import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const POINTS = [
  { sf: 'location.fill', md: 'my_location', text: 'See everyone on the map, live' },
  { sf: 'point.topleft.down.to.point.bottomright.curvepath.fill', md: 'route', text: 'Follow one shared route together' },
  { sf: 'lock.fill', md: 'lock', text: 'Location shared only while you are in a group' },
] as const;

export default function WelcomeScreen() {
  const theme = useTheme();
  return (
    <Screen edges={['top', 'bottom', 'left', 'right']} contentStyle={styles.content}>
      <View style={styles.hero}>
        <View style={[styles.logo, { backgroundColor: theme.primary }]}>
          <Icon sf="paperplane.fill" md="near_me" size={44} color="onPrimary" />
        </View>
        <ThemedText type="title" style={styles.title}>
          Welcome to{'\n'}
          <ThemedText type="title" style={[styles.brand, { backgroundColor: theme.primary, color: theme.onPrimary }]}>
            {' glidy '}
          </ThemedText>
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.tagline}>
          Travel in group together. Share live routes so nobody gets left behind.
        </ThemedText>
      </View>

      <View style={styles.points}>
        {POINTS.map((p) => (
          <View key={p.text} style={styles.point}>
            <View style={[styles.pointIcon, { backgroundColor: theme.accent }]}>
              <Icon sf={p.sf} md={p.md} size={18} color="onAccent" />
            </View>
            <ThemedText type="small">{p.text}</ThemedText>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <Link href="/login" asChild>
          <Button label="Login" />
        </Link>
        <Link href="/sign-up" asChild>
          <Button label="Sign up" variant="secondary" />
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, justifyContent: 'space-between', padding: Spacing.four },
  hero: { alignItems: 'center', gap: Spacing.three, paddingTop: Spacing.five },
  logo: { width: 96, height: 96, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
  title: { textAlign: 'center', fontSize: 40, lineHeight: 52 },
  brand: { fontSize: 40, lineHeight: 52, overflow: 'hidden' },
  tagline: { textAlign: 'center', maxWidth: 320 },
  points: { gap: Spacing.three },
  point: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  pointIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  actions: { gap: Spacing.two },
});
