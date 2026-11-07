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
- **UI/theming**: `src/constants/theme.ts` is the single token source (`Colors` light/dark incl. `primary`/`accent`/`tabBar`, `Spacing`, `Radius`). Use `useTheme()` and the primitives in `src/components/ui/` (`Button`, `Screen`, `TextField`, `Icon`, `Avatar`); `Icon` takes both an SF Symbol name (`sf`) and a Material name (`md`). `.web.ts(x)` variants are Metro platform splits.
- **Imports**: `@/*` → `src/*`; `@/assets/*` → root `assets/`.
