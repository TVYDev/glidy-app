import { router } from "expo-router";
import { LocateFixed, MapPin, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PickMap } from "@/components/map/pick-map";
import { ThemedText } from "@/components/themed-text";
import { Button } from "@/components/ui/button";
import { IconBadge } from "@/components/ui/card";
import { Glass } from "@/components/ui/glass";
import { Icon } from "@/components/ui/icon";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useI18n } from "@/i18n";
import { getOrigin } from "@/lib/location";
import { reversePlace } from "@/lib/maps-api";
import { PICK_PLACE_KEY, type PickPlacePayload } from "@/lib/place-picker";
import { finish, payloadOf } from "@/lib/screen-results";
import type { Coord, Place } from "@/lib/types";

const PIN = 46;

/** Pick a place by moving the map under a fixed pin, as in any ride or delivery app. */
export default function PickPlaceScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const near = payloadOf<PickPlacePayload>(PICK_PLACE_KEY)?.near ?? null;

  // Where the map opens: the hint from the caller, otherwise where I am.
  const [initial, setInitial] = useState<Coord | null>(near);
  const [here, setHere] = useState<Coord | null>(null);
  const [focus, setFocus] = useState<{ key: number; coord: Coord } | null>(
    null,
  );
  const [moving, setMoving] = useState(false);
  const [centre, setCentre] = useState<Coord | null>(null);
  // The answer for one centre, tagged with it so a stale answer is never shown for a newer point.
  const [lookup, setLookup] = useState<{
    key: string;
    place: { name: string; subtitle?: string } | null;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    getOrigin().then((origin) => {
      if (cancelled) return;
      setHere(origin.coord);
      setInitial((current) => current ?? origin.coord);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Whatever way this screen closes, the caller's promise must settle.
  useEffect(() => () => finish(PICK_PLACE_KEY, null), []);

  const key = centre
    ? `${centre.latitude.toFixed(5)},${centre.longitude.toFixed(5)}`
    : null;
  useEffect(() => {
    if (!centre || !key) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      reversePlace(centre).then((place) => {
        if (!cancelled) setLookup({ key, place });
      });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // `key` is `centre` rounded; the map reports the same centre again and again while it rests, and
    // that must not restart the lookup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const pinStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: withSpring(moving ? -14 : 0, {
          damping: 14,
          stiffness: 220,
        }),
      },
    ],
  }));

  if (!initial) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primaryDark} />
      </View>
    );
  }

  const answered = key != null && lookup?.key === key;
  const found = answered ? lookup.place : null;
  const fallbackSubtitle = centre
    ? `${centre.latitude.toFixed(4)}, ${centre.longitude.toFixed(4)}`
    : "";
  const name = found?.name ?? t("pick.droppedPin");
  const subtitle = found ? found.subtitle : fallbackSubtitle;

  function confirm() {
    if (!centre) return;
    const place: Place = {
      name,
      subtitle: subtitle || undefined,
      coord: centre,
    };
    finish(PICK_PLACE_KEY, place);
    router.back();
  }

  return (
    <View style={[styles.fill, { backgroundColor: theme.background }]}>
      {/* The map has its own box above the panel: its middle is where the pin is drawn, and the
          Google logo is never covered. */}
      <View style={styles.fill}>
        <PickMap
          initial={initial}
          focus={focus}
          onMoving={setMoving}
          onSettled={setCentre}
        />

        {/* The pin stays still at the centre; its tip is the exact point. */}
        <View style={styles.pinLayer} pointerEvents="none">
          <Animated.View style={[styles.pin, pinStyle]}>
            <Icon icon={MapPin} size={PIN} color="ink" fill="#EFB708" />
          </Animated.View>
          <View
            style={[
              styles.shadow,
              { backgroundColor: theme.ink, opacity: moving ? 0.12 : 0.28 },
            ]}
          />
        </View>

        <View
          style={[styles.top, { top: insets.top + Spacing.two }]}
          pointerEvents="box-none"
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("common.cancel")}
            onPress={() => router.back()}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <Glass
              style={styles.round}
              fallbackColor={theme.backgroundElement}
              fallbackBorderColor={theme.border}
              interactive
            >
              <Icon icon={X} size={20} />
            </Glass>
          </Pressable>
          <Glass
            style={styles.hint}
            fallbackColor={theme.backgroundElement}
            fallbackBorderColor={theme.border}
          >
            <ThemedText type="smallBold" numberOfLines={1}>
              {t("pick.hint")}
            </ThemedText>
          </Glass>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("pick.myLocation")}
          onPress={() =>
            here && setFocus((f) => ({ key: (f?.key ?? 0) + 1, coord: here }))
          }
          style={({ pressed }) => [
            styles.locate,
            { bottom: Spacing.three, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Glass
            style={styles.round}
            fallbackColor={theme.backgroundElement}
            fallbackBorderColor={theme.border}
            interactive
          >
            <Icon icon={LocateFixed} size={22} />
          </Glass>
        </Pressable>
      </View>

      <View
        style={[
          styles.panel,
          {
            paddingBottom: Math.max(insets.bottom, Spacing.three),
            backgroundColor: theme.background,
            borderColor: theme.border,
          },
        ]}
      >
        <View style={styles.place}>
          <IconBadge icon={MapPin} size={44} />
          <View style={styles.placeText}>
            <ThemedText
              type="smallBold"
              numberOfLines={2}
              style={styles.placeName}
            >
              {moving || !answered ? t("pick.finding") : name}
            </ThemedText>
            {!moving && answered && subtitle ? (
              <ThemedText
                type="small"
                themeColor="textSecondary"
                numberOfLines={1}
              >
                {subtitle}
              </ThemedText>
            ) : null}
          </View>
        </View>
        <Button
          label={t("pick.use")}
          onPress={confirm}
          disabled={!centre || moving || !answered}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  pinLayer: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  // Lifted by half its height so the tip, not the middle, is at the centre of the screen.
  pin: { marginTop: -PIN },
  shadow: { position: "absolute", width: 10, height: 4, borderRadius: 2 },
  top: {
    position: "absolute",
    left: Spacing.three,
    right: Spacing.three,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  round: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  hint: {
    flex: 1,
    height: 48,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    justifyContent: "center",
  },
  locate: { position: "absolute", right: Spacing.three },
  panel: {
    padding: Spacing.three,
    gap: Spacing.three,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderTopWidth: 1,
  },
  place: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    minHeight: 52,
  },
  placeText: { flex: 1 },
  placeName: { fontSize: 17, lineHeight: 24 },
});
