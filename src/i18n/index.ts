import { useMemo, useSyncExternalStore } from 'react';

import type { Language } from '@/constants/theme';
import { en, type TranslationKey } from '@/i18n/en';
import { km } from '@/i18n/km';
import { storage } from '@/lib/storage';

const KEY = 'glidy.language.v1';
const dictionaries: Record<Language, Record<TranslationKey, string>> = { en, km };

function deviceLanguage(): Language {
  try {
    // Loaded lazily: a dev build made before expo-localization was added has no native module
    // for it. In that case, fall back to English instead of crashing at startup.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getLocales } = require('expo-localization') as typeof import('expo-localization');
    return getLocales()[0]?.languageCode === 'km' ? 'km' : 'en';
  } catch {
    return 'en';
  }
}

function isLanguage(value: unknown): value is Language {
  return value === 'en' || value === 'km';
}

// An explicit choice wins; otherwise follow the device language.
const stored = storage.get<unknown>(KEY, null);
let current: Language = isLanguage(stored) ? stored : deviceLanguage();
const listeners = new Set<() => void>();

export function getLanguage(): Language {
  return current;
}

export function setLanguage(language: Language) {
  if (language === current) return;
  current = language;
  storage.set(KEY, language);
  listeners.forEach((l) => l());
}

type Params = Record<string, string | number>;

function translate(language: Language, key: TranslationKey, params?: Params): string {
  let text = dictionaries[language][key] ?? en[key];
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.split(`{${name}}`).join(String(value));
    }
  }
  return text;
}

/** Translate outside React (data layer, formatters). UI should use `useI18n().t` so it re-renders. */
export function t(key: TranslationKey, params?: Params): string {
  return translate(current, key, params);
}

/**
 * Subscribes the component to language changes and returns the translator. `t` is a new function
 * for each language, so memoised output (React Compiler, `useMemo`) is recomputed on a switch.
 */
export function useI18n() {
  const language = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    () => current,
    () => current,
  );
  const bound = useMemo(
    () => (key: TranslationKey, params?: Params) => translate(language, key, params),
    [language],
  );
  return { language, t: bound, setLanguage };
}

export type { TranslationKey };
