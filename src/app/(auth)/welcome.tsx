import { Link } from 'expo-router';
import { Lock, MapPin, Route } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { RouteMotif } from '@/components/ui/brand-art';
import { Button } from '@/components/ui/button';
import { IconBadge } from '@/components/ui/card';
import { LanguageToggle } from '@/components/ui/language-toggle';
import { Logo } from '@/components/ui/logo';
import { Screen } from '@/components/ui/screen';
import { Radius, Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';

// The route motif is drawn at 300 x 140 from a 320 x 150 design, so points are scaled by this much.
// The travellers sit on points of the motif's curve (t = 0.3 and 0.75 of its first segment, 0.45 of its second).
const SCALE = 300 / 320;
const TRAVELLERS = [
  { id: 'a', name: 'A', emoji: '🦊', color: '#E07A1F', x: 52 * SCALE, y: 112 * SCALE },
  { id: 'b', name: 'B', emoji: '🚙', color: '#2D6CDF', x: 94 * SCALE, y: 69 * SCALE },
  { id: 'c', name: 'C', emoji: '🐼', color: '#0E8F8F', x: 189 * SCALE, y: 84 * SCALE },
] as const;

export default function WelcomeScreen() {
  const theme = useTheme();
  const { t } = useI18n();

  const points = [
    { icon: MapPin, text: t('welcome.point1') },
    { icon: Route, text: t('welcome.point2') },
    { icon: Lock, text: t('welcome.point3') },
  ];

  return (
    <Screen scroll edges={['top', 'bottom', 'left', 'right']} contentStyle={styles.content}>
      <View style={styles.header}>
        <Logo />
        <LanguageToggle compact />
      </View>

      {/* Hero: the headline over the shared route, with the group walking it. */}
      <View style={[styles.hero, { backgroundColor: theme.primary }]}>
        <ThemedText type="display" themeColor="onPrimary">
          {t('welcome.headline')}
        </ThemedText>
        <View style={styles.scene}>
          <RouteMotif width={300} height={140} color={theme.ink} />
          {TRAVELLERS.map((p) => (
            <View key={p.id} style={[styles.traveller, { left: p.x - 19, top: p.y - 19 }]} pointerEvents="none">
              <Avatar
                userId={p.id}
                name={p.name}
                avatar={{ kind: 'emoji', emoji: p.emoji, color: p.color }}
                size={38}
                ring={theme.primary}
              />
            </View>
          ))}
        </View>
        <ThemedText themeColor="onPrimary" style={styles.tagline}>
          {t('welcome.tagline')}
        </ThemedText>
      </View>

      <View style={styles.points}>
        {points.map((p) => (
          <View key={p.text} style={styles.point}>
            <IconBadge icon={p.icon} size={40} tone="soft" />
            <ThemedText type="small" style={styles.pointText}>
              {p.text}
            </ThemedText>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <Link href="/sign-up" asChild>
          <Button label={t('auth.signUp')} variant="ink" />
        </Link>
        <Link href="/login" asChild>
          <Button label={t('auth.login')} variant="secondary" />
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, gap: Spacing.three },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hero: { borderRadius: Radius.xl, padding: Spacing.four, gap: Spacing.two, overflow: 'hidden' },
  scene: { alignSelf: 'center', width: 300, height: 140, marginVertical: Spacing.two },
  traveller: { position: 'absolute' },
  tagline: { opacity: 0.9 },
  points: { gap: Spacing.three, paddingHorizontal: Spacing.one },
  point: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  pointText: { flex: 1 },
  actions: { gap: Spacing.two },
});
