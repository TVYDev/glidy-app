import { Appearance } from 'react-native';
import { useSyncExternalStore } from 'react';

import { storage } from '@/lib/storage';

export type TextSize = 'default' | 'large' | 'xlarge';
export type ThemePreference = 'system' | 'light' | 'dark';

export type Settings = {
  /** How much bigger than normal all text is drawn. */
  textSize: TextSize;
  /** Follow the phone, or force light or dark. */
  theme: ThemePreference;
};

export const TEXT_SCALE: Record<TextSize, number> = { default: 1, large: 1.15, xlarge: 1.3 };

const KEY = 'glidy.settings.v1';
const DEFAULTS: Settings = { textSize: 'default', theme: 'system' };

const isTextSize = (v: unknown): v is TextSize => v === 'default' || v === 'large' || v === 'xlarge';
const isTheme = (v: unknown): v is ThemePreference => v === 'system' || v === 'light' || v === 'dark';

function load(): Settings {
  const stored = storage.get<Partial<Settings>>(KEY, {});
  return {
    textSize: isTextSize(stored.textSize) ? stored.textSize : DEFAULTS.textSize,
    theme: isTheme(stored.theme) ? stored.theme : DEFAULTS.theme,
  };
}

/**
 * Forces the app's colour scheme. Done through React Native's Appearance, so every
 * `useColorScheme()` consumer, the navigation headers, alerts and the liquid glass all follow it
 * without each one knowing about the setting.
 */
function applyTheme(theme: ThemePreference) {
  try {
    // 'auto' removes the override and follows the system again (this React Native version).
    Appearance.setColorScheme(theme === 'system' ? 'auto' : theme);
  } catch {
    // A failure here only means the override does not apply; the app keeps following the system.
  }
}

let current: Settings = load();
applyTheme(current.theme);
const listeners = new Set<() => void>();

export function setSettings(patch: Partial<Settings>) {
  const next = { ...current, ...patch };
  if (next.textSize === current.textSize && next.theme === current.theme) return;
  if (next.theme !== current.theme) applyTheme(next.theme);
  current = next;
  storage.set(KEY, current);
  listeners.forEach((l) => l());
}

export function useSettings(): Settings {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    () => current,
    () => current,
  );
}

/** The multiplier for the chosen text size (1 = normal). */
export function useTextScale(): number {
  return TEXT_SCALE[useSettings().textSize];
}
