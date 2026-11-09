/**
 * Lets a screen hand a value back to the code that opened it, as a promise:
 *
 *   const place = await pickPlaceOnMap(near);   // opens a modal, resolves when it closes
 *
 * Expo Router params cannot carry objects, so the input travels in a payload kept here and the
 * answer comes back through `finish`. A modal that is dismissed by swiping calls `finish(key, null)`
 * from its unmount, so the promise always settles.
 */
type Pending = { resolve: (value: unknown) => void; payload: unknown };

const pending = new Map<string, Pending>();

export function openForResult<T, P = undefined>(key: string, payload: P, open: () => void): Promise<T | null> {
  // A second open of the same screen replaces the first, which settles as cancelled.
  pending.get(key)?.resolve(null);
  return new Promise<T | null>((resolve) => {
    pending.set(key, { resolve: resolve as (value: unknown) => void, payload });
    open();
  });
}

/** The input given to `openForResult`, read by the screen that was opened. */
export function payloadOf<P>(key: string): P | undefined {
  return pending.get(key)?.payload as P | undefined;
}

/** Settles the promise. The first call wins; later ones (such as the unmount) do nothing. */
export function finish(key: string, value: unknown): void {
  const entry = pending.get(key);
  if (!entry) return;
  pending.delete(key);
  entry.resolve(value);
}
