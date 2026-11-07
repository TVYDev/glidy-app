import 'expo-sqlite/localStorage/install';

/**
 * Tiny wrapper over the synchronous localStorage polyfill from expo-sqlite.
 * Every access is guarded so a storage failure never crashes the app.
 */
export const storage = {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = globalThis.localStorage.getItem(key);
      return raw == null ? fallback : (JSON.parse(raw) as T);
    } catch {
      return fallback;
    }
  },
  set(key: string, value: unknown): void {
    try {
      globalThis.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore: preferences are a convenience, not critical state.
    }
  },
  remove(key: string): void {
    try {
      globalThis.localStorage.removeItem(key);
    } catch {
      // Ignore.
    }
  },
};
