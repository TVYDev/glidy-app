import { Stack } from 'expo-router';

import { fontFamilyFor } from '@/constants/theme';
import { useI18n } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';

export default function AppLayout() {
  const theme = useTheme();
  const { t, language } = useI18n();
  return (
    <Stack
      screenOptions={{
        headerTintColor: theme.text,
        headerTitleStyle: { color: theme.text, fontFamily: fontFamilyFor(language, 700) },
        headerStyle: { backgroundColor: theme.background },
        headerShadowVisible: false,
        // Avoid showing the "(tabs)" route-group name as the back button label.
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: theme.background },
      }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="session/create" options={{ title: t('create.title'), presentation: 'modal' }} />
      <Stack.Screen name="session/[id]" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="session/invite" options={{ title: t('invite.title'), presentation: 'modal' }} />
      <Stack.Screen name="join/index" options={{ title: t('join.title'), presentation: 'modal' }} />
      <Stack.Screen name="join/[code]" options={{ title: t('join.confirmHeader'), presentation: 'modal' }} />
      <Stack.Screen name="routes/new" options={{ title: t('routeNew.title'), presentation: 'modal' }} />
      <Stack.Screen name="routes/[id]" options={{ title: t('route.title') }} />
      <Stack.Screen name="route/edit" options={{ title: t('routeEdit.title'), presentation: 'modal' }} />
      <Stack.Screen name="place/search" options={{ headerShown: false, presentation: 'fullScreenModal', animation: 'fade' }} />
      <Stack.Screen name="place/pick" options={{ headerShown: false, presentation: 'fullScreenModal', gestureEnabled: false }} />
      <Stack.Screen name="routes/map" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
      <Stack.Screen name="settings/account" options={{ title: t('menu.account') }} />
      <Stack.Screen name="settings/display" options={{ title: t('display.title') }} />
      <Stack.Screen name="settings/language" options={{ title: t('profile.language') }} />
      <Stack.Screen name="settings/privacy" options={{ title: t('profile.privacy') }} />
      <Stack.Screen name="settings/about" options={{ title: t('profile.about') }} />
      <Stack.Screen name="settings/contact" options={{ title: t('menu.contact') }} />
    </Stack>
  );
}
