import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';

export default function AppLayout() {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        headerTintColor: theme.primary,
        headerTitleStyle: { color: theme.text },
        headerStyle: { backgroundColor: theme.background },
        headerShadowVisible: false,
        // Avoid showing the "(tabs)" route-group name as the back button label.
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: theme.background },
      }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="session/create" options={{ title: 'New group', presentation: 'modal' }} />
      <Stack.Screen name="session/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="session/invite" options={{ title: 'Invite friends', presentation: 'modal' }} />
      <Stack.Screen name="join/index" options={{ title: 'Join a group', presentation: 'modal' }} />
      <Stack.Screen name="join/[code]" options={{ title: 'Join group', presentation: 'modal' }} />
      <Stack.Screen name="routes/new" options={{ title: 'Plan a route', presentation: 'modal' }} />
      <Stack.Screen name="routes/[id]" options={{ title: 'Route' }} />
    </Stack>
  );
}
