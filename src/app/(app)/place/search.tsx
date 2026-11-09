import { router } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PlaceSearchPanel } from '@/components/session/place-search-panel';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { SEARCH_PLACE_KEY, type SearchPlacePayload } from '@/lib/place-picker';
import { finish, payloadOf } from '@/lib/screen-results';

/**
 * Search on a screen of its own: the input is pinned to the top and the results fill the rest, so the
 * keyboard (which rises from the bottom) never covers them. Dragging the list hides the keyboard.
 */
export default function SearchPlaceScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const payload = payloadOf<SearchPlacePayload>(SEARCH_PLACE_KEY);

  // Whatever way this screen closes, the caller's promise must settle.
  useEffect(() => () => finish(SEARCH_PLACE_KEY, null), []);
  useEffect(() => {
    if (!payload) router.back();
  }, [payload]);
  if (!payload) return null;

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + Spacing.two, paddingBottom: insets.bottom + Spacing.four },
      ]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      automaticallyAdjustKeyboardInsets
    >
      <PlaceSearchPanel
        autoFocus
        near={payload.near}
        mapPick={payload.mapPick}
        placeholder={payload.placeholder}
        onBack={() => router.back()}
        onSelect={(place) => {
          finish(SEARCH_PLACE_KEY, place);
          router.back();
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.three },
});
