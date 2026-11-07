import { Link } from 'expo-router';
import { Lock, MapPin, Route } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card, IconBadge } from '@/components/ui/card';
import { HeroIllustration } from '@/components/ui/hero-illustration';
import { LanguageToggle } from '@/components/ui/language-toggle';
import { Logo } from '@/components/ui/logo';
import { Screen } from '@/components/ui/screen';
import { Radius, Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';

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

      <HeroIllustration />

      <View style={styles.titleBlock}>
        <ThemedText type="title" style={styles.center}>
          {t('welcome.title')}
        </ThemedText>
        <View style={[styles.brand, { backgroundColor: theme.primary }]}>
          <ThemedText type="title" themeColor="onPrimary">
            glidy
          </ThemedText>
        </View>
        <ThemedText themeColor="textSecondary" style={styles.center}>
          {t('welcome.tagline')}
        </ThemedText>
      </View>

      <Card style={styles.points}>
        {points.map((p) => (
          <View key={p.text} style={styles.point}>
            <IconBadge icon={p.icon} size={36} tone="soft" />
            <ThemedText type="small" style={styles.pointText}>
              {p.text}
            </ThemedText>
          </View>
        ))}
      </Card>

      <View style={styles.actions}>
        <Link href="/login" asChild>
          <Button label={t('auth.login')} />
        </Link>
        <Link href="/sign-up" asChild>
          <Button label={t('auth.signUp')} variant="secondary" />
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.four, gap: Spacing.four },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleBlock: { alignItems: 'center', gap: Spacing.two },
  center: { textAlign: 'center' },
  brand: {
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.sm,
    transform: [{ rotate: '-2deg' }],
  },
  points: { gap: Spacing.three },
  point: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  pointText: { flex: 1 },
  actions: { gap: Spacing.two },
});
