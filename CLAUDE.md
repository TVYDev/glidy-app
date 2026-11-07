# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Read `AGENTS.md` first: it holds the project rules (Expo docs-first policy, Expo Router conventions, EAS usage, CNG rules) and is authoritative. This file adds commands and architecture notes on top of it.

## Product

Glidy is a group-travel app (site: glidy.app, owned by the user): a leader creates a session, invites friends by link/QR/code, sets a destination, and everyone sees each other's live location plus a shared turn-by-turn route. Routes can be saved, reversed for the trip home, and shared. Location is only read/shared while a session screen is open; users can pause sharing or blur their position. Visual style references the green/yellow "waypath" mock (soft cards, pill buttons, black pill tab bar).

## Stack

Expo SDK 58 / React Native 0.88 / React 19.3 / TypeScript 6 (strict), Expo Router with typed routes, React Compiler enabled (its ESLint rules are on: no `setState` inside effects, derive state instead). Native-only features (Mapbox, camera, background-capable location) need a **development build**, not Expo Go.

## Commands

The lockfile is `pnpm-lock.yaml`, so use `pnpm`. Add Expo/native packages with `npx expo install <pkg>`.

```bash
pnpm start              # Metro dev server (open the installed dev build)
pnpm ios | android      # expo run:* : build + install a dev build (needed after native deps/app.json changes)
pnpm lint               # expo lint
npx tsc --noEmit        # typecheck
```

There is no test framework. `ios/` and `android/` are generated (CNG, gitignored): after adding a native module or editing `app.json`, run `npx expo prebuild --clean` then `pnpm ios`/`pnpm android`.

Environment quirks on this machine:
- CocoaPods crashes with `ASCII-8BIT` unless `LANG=en_US.UTF-8` is exported.
- The system JDK is 23; Android builds need Android Studio's JDK: `JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"`.
- After restarting an Android emulator, re-run `adb reverse tcp:8081 tcp:8081`.
- Two iOS simulators share the name "iPhone 18 Pro Max"; pass the UDID to `--device`.

`pnpm reset-project` is the starter template's destructive reset (moves/deletes `src/`); never run it.

## Configuration (demo mode vs real)

Copy `.env.example` to `.env.local` (gitignored); restart Metro after changes. All values are `EXPO_PUBLIC_*`.
- `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: real backend. Run `supabase/schema.sql` in the Supabase SQL editor first, and turn **off** "Allow public access" in Realtime settings (live locations use private broadcast channels).
- `EXPO_PUBLIC_MAPBOX_TOKEN` (public `pk.` token): map tiles, Directions, Geocoding.
- Without them the app runs in **demo mode**: on-device mock backend with two simulated travellers, a built-in list of demo places, straight-line routes, and a tile-free schematic map. Check `backend.isMock` / `hasMapbox` rather than assuming real services.

## Architecture

- **Routing** (`src/app/`): root `_layout.tsx` wraps `AuthProvider` and uses `Stack.Protected` to switch between `(auth)` (welcome/login/sign-up) and `(app)`. `(app)/(tabs)` is a `NativeTabs` layout (Home, Routes, Profile); `(app)/session/*`, `join/*`, `routes/*` are pushed screens/modals declared in `(app)/_layout.tsx`. Deep links: `glidyapp://join/CODE`, `glidyapp://routes/ID` (a link opened while logged out is not preserved).
- **Backend abstraction** (`src/lib/backend/`): everything goes through the `Backend` interface in `src/lib/types.ts` (auth, sessions, routes, realtime channel). `index.ts` picks `supabase-backend.ts` when Supabase env vars exist, else `mock-backend.ts` (state in the expo-sqlite localStorage polyfill via `src/lib/storage.ts`). Add new data operations to the interface and both implementations. Row-level security, the `join_session` RPC, and realtime channel policies live in `supabase/schema.sql`; keep it in sync with `supabase-backend.ts`.
- **Live sessions**: `hooks/use-session-live.ts` is the core hook for the map screen: loads session/members, opens the realtime channel (`session:<id>` broadcast: `location`, `session`, `members` events; locations are never stored), watches the user's position with `expo-location` (foreground only, throttled to one broadcast per 3 s, blurred if the privacy pref is off, skipped while paused) and exposes leader actions. Background location is not implemented.
- **Maps** (`src/components/map/`): `live-map.tsx` uses `@rnmapbox/maps` (no secret download token needed with the current plugin) and falls back to `schematic-map.tsx` when no token; `live-map.web.tsx` always uses the schematic one. Routing/geocoding is plain `fetch` to Mapbox in `src/lib/mapbox-api.ts` (with demo fallbacks). `src/lib/geo.ts` holds distance/bounds/next-step helpers.
- **UI/theming**: `src/constants/theme.ts` is the single token source. The palette is copied from the Glidy web project (amber `#EFB708` on warm cream `#F9F6F0`, warm dark mode); semantic names are `primary` (amber), `primaryDark`, `accent` (soft amber tint), `backgroundElement` (cards), `backgroundSelected`, `ink`/`onInk` (the black pill tab bar and ink tiles), plus `Spacing` and `Radius`. Use `useTheme()` and the primitives in `src/components/ui/` (`Button`, `Card`/`IconBadge`/`ListRow`, `Screen`, `TextField`, `Icon`, `Avatar`, `Logo`, `LanguageToggle`). Visual reference is the "waypath" mock: rounded cards, round amber icon badges, outlined arrow buttons, floating black tab pill.
- **Icons**: Lucide only (`lucide-react-native`). `Icon` takes a Lucide component (`<Icon icon={MapPin} />`); there are no SF Symbols or Material names anymore.
- **Fonts**: Exo 2 for English and Kantumruy Pro for Khmer (same pairing as the web project), loaded in the root layout with `useFonts` from `@expo-google-fonts/*`. Native fonts have one family per weight, so never set `fontWeight` on text yourself: `ThemedText` (and `TextField`) map `fontWeight` to the right family via `fontFamilyFor(language, weight)` and add extra line height for Khmer. Use `ThemedText`, not bare `Text`.
- **Tabs and liquid glass**: `(app)/(tabs)/_layout.tsx` is a custom floating pill built on `expo-router/ui` (`Tabs`/`TabList`/`TabTrigger`), not `NativeTabs`, so it can use Lucide icons. The pill, the round buttons and the title pill over the map use `<Glass>` (`src/components/ui/glass.tsx`), a wrapper around `expo-glass-effect`'s `GlassView`: real iOS 26 liquid glass where `hasLiquidGlass` is true, a solid surface (`fallbackColor`, black `ink` for the tab bar) on Android and older iOS. Icon colours on glass use the theme `text` colour; on the fallback they use `onInk`. A new tab needs a screen file and a `TabTrigger` there. Native Stack headers on modals already get the system glass on iOS 26.
- **Route map**: the saved-route page embeds the map in a scrolling page; a finger on the map freezes the page scroll (`Screen scrollEnabled`) so drags pan the map, and a glass maximize button opens `routes/map` (full-screen modal, `?id=`) where every gesture works: pan, pinch zoom, two-finger rotate and tilt (all enabled explicitly on `MapView`). Re-centre (`setCamera` with bounds, heading 0, pitch 0) refits the route and levels the map north-up.
- **Live session screen** (`session/[id].tsx`): the map fills the screen; `ui/bottom-sheet.tsx` is a draggable three-snap sheet (peek / half / full) built on RNGH 3 `usePanGesture` + Reanimated (UI-thread shared values; `scheduleOnRN` reports the settled snap back to React). Only the header drags; the body scrolls only at the full snap. A glass "full screen" button hides the sheet and the top bar (immersive: map + turn banner only). Floating map buttons ride on top of the sheet and fade out at the full snap. "Follow me" re-centres on every GPS update and switches off when the user touches the map. ETA and distance-left come from `routeProgress`/`distanceLeft` in `lib/geo.ts` (measured along the route, not as the crow flies). The map's top margin is the measured height of the top overlay (`onLayout`), because the turn banner grows when an instruction wraps.
- **Drive mode** (`session/[id].tsx` + `hooks/use-drive-navigation.ts`, `use-heading.ts`): "Start driving" turns the screen into a navigation view: heading-up camera tilted 55° and zoomed by speed (`zoomForSpeed`), shifted ahead of the arrow so it sits in the lower third (computed in `live-map.tsx` with `offsetAhead`/`metersPerPoint`, not with Mapbox padding); the sheet and top bar are hidden, a large turn banner (`nav-banner.tsx`, icon from `lib/maneuver.ts`) and a `DriveBar` (arrival, remaining, km/h, End) take over; the screen stays awake (`expo-keep-awake`, tag `glidy-drive`). Touching the map releases the camera until Re-centre. Route maths lives in `lib/geo.ts`: `snapToRoute` (per segment), `nextTurn` (distance measured *along* the route to the next manoeuvre, from `stepAnchors`), `routeProgress`. The part of the route behind you is drawn grey (`routeSnap`). Leaving the route by more than 60 m for 4 s triggers a **personal** reroute from the traveller's position (`getRoute`); it never changes the group's route and is dropped when the leader changes it. Mapbox starts the new route at the nearest road, so `startingFrom` prepends a connector from the traveller's position; without it they would stay "off route" and be rerouted forever. Arrival (< 40 m left) shows an alert and leaves drive mode. Only foreground location exists, so the screen must stay on; background location is not implemented.
- **State updated while rendering must be idempotent**: `useHeading` and the old nav banner set state during render. Key such updates on the identity of the new input (a new GPS fix), never on "the smoothed value differs": smoothing again on every render never settles and crashes with "Too many re-renders".
- **Testing a drive in the iOS simulator**: `xcrun simctl location <udid> start --speed=20 lat,lng lat,lng …` plays waypoints at a speed (feed it points from a Mapbox route); `set lat,lng` jumps. A Fast Refresh resets screen state, so re-enter drive mode after editing code.
- **Mapbox camera padding gotcha**: the root `padding` option of `setCamera` is persistent, and the margins of a later bounds fit are added to it, so using it for follow mode made later route fits zoom out to the whole world. Put fit margins inside `bounds` (`paddingTop` etc.), which applies to that call only, and never set root `padding`.
- **Map style changes**: `live-map.tsx` remounts the Mapbox `MapView` when the system theme flips (Street/Dark style) and refits the camera once the new style has loaded; layers cannot be updated across a style swap.
- **i18n (English + Khmer)**: `src/i18n/en.ts` defines every key; `km.ts` is typed `Record<TranslationKey, string>`, so a missing Khmer string fails `tsc`. In components use `const { t } = useI18n()` (never import the bare `t` in UI: `useI18n().t` changes identity per language, which is what makes React Compiler-memoised text update on a switch). The bare `t` from `@/i18n` is for the data layer and formatters (`formatDistance`/`formatDuration`). The language is stored under `glidy.language.v1`, defaulting to the device language (`expo-localization`, loaded lazily so an older dev build without the native module falls back to English). Mapbox turn instructions and place names are not translated (Mapbox has no Khmer).
- **Imports**: `@/*` → `src/*`; `@/assets/*` → root `assets/`.
