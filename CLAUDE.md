# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Read `AGENTS.md` first: it holds the project rules (Expo docs-first policy, Expo Router conventions, EAS usage, CNG rules) and is authoritative. This file adds commands and architecture notes on top of it.

## Stack

Expo SDK 58 / React Native 0.88 / React 19.3 / TypeScript 6 (strict), Expo Router with typed routes, React Compiler enabled (`app.json` → `experiments`). Targets iOS, Android and web (`web.output: "server"`, so web uses server rendering). The project was bootstrapped from `create-expo-app` and is still mostly starter code (Home/Explore screens, "Expo Starter" branding).

## Commands

The lockfile is `pnpm-lock.yaml`, so use `pnpm`/`pnpm dlx` (not `bunx`) for scripts. Always add native/Expo packages with `npx expo install <pkg>` so versions match the SDK.

```bash
pnpm start              # expo start (dev server)
pnpm ios | android | web
pnpm lint               # expo lint
npx tsc --noEmit        # typecheck
npx expo-doctor         # dependency/config diagnostics
```

There is no test framework configured and no ESLint config checked in yet (`expo lint` will offer to set it up on first run). `ios/` and `android/` do not exist and must not be hand-created (Continuous Native Generation); configure native behavior in `app.json`/config plugins. Native-module additions need a development build, not Expo Go.

`pnpm reset-project` (`scripts/reset-project.js`) is the starter template's destructive reset: it moves or deletes `src/` and `scripts/` and scaffolds a blank `src/app`. Don't run it.

## Architecture

- **Routing** — file-based under `src/app/`. `_layout.tsx` wraps the app in a React Navigation `ThemeProvider` (from `expo-router`, switched by `useColorScheme`), mounts `AnimatedSplashOverlay`, and renders `AppTabs`. Screens: `index.tsx` (Home), `explore.tsx`. A new tab needs a screen file **and** a trigger in both tab components below.
- **Platform-split tab navigation** — `src/components/app-tabs.tsx` uses native tabs (`expo-router/native-tabs`, `NativeTabs.Trigger` names must match route filenames, e.g. `index`, `explore`). `app-tabs.web.tsx` is a separate custom top-bar implementation built on `expo-router/ui` (`Tabs`/`TabList`/`TabTrigger`, where `name` is arbitrary and `href` points at the route). Metro resolves the `.web.tsx` file on web, so the two must be kept in sync by hand.
- **Same `.web` pattern elsewhere** — `animated-icon.tsx`/`animated-icon.web.tsx` (the web one uses `animated-icon.module.css`) and `hooks/use-color-scheme.ts`/`.web.ts`. When changing one variant, check its sibling.
- **Theming** — `src/constants/theme.ts` is the single source for `Colors` (light/dark), `Fonts` (platform-selected; web uses CSS vars from `src/global.css`), `Spacing` (named scale: `half`…`six`), `BottomTabInset`, `MaxContentWidth`. Consume via `useTheme()` (`src/hooks/use-theme.ts`) or the `ThemedText`/`ThemedView` components, which take a `type`/`themeColor` key from `Colors` rather than raw colors. `theme.ts` imports `@/global.css` for its side effect.
- **Imports** — use the `@/*` alias (→ `src/*`); `@/assets/*` maps to the root `assets/` directory (note: `assets/` is outside `src/`).
- **Components** — shared UI in `src/components/` (`ui/` for generic primitives like `Collapsible`). Keep non-route code out of `src/app/`.
