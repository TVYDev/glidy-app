import { useSyncExternalStore } from 'react';

import { storage } from '@/lib/storage';

export type PrivacySettings = {
  /** When false, the position shared with the group is rounded to roughly 110 m. */
  preciseLocation: boolean;
};

const KEY = 'glidy.privacy.v1';
const DEFAULTS: PrivacySettings = { preciseLocation: true };

let current: PrivacySettings = { ...DEFAULTS, ...storage.get<Partial<PrivacySettings>>(KEY, {}) };
const listeners = new Set<() => void>();

export function setPrivacy(patch: Partial<PrivacySettings>) {
  current = { ...current, ...patch };
  storage.set(KEY, current);
  listeners.forEach((l) => l());
}

export function usePrivacy(): PrivacySettings {
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
