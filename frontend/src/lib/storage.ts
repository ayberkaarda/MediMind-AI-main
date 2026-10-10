// localStorage can throw (private mode, blocked site data); every access is guarded.
export function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore: the value simply will not persist.
  }
}

export function removeStorage(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore.
  }
}

const LEGACY_KEYS = ['predictionHistory', 'theme'] as const;

/** Drops keys written by the previous client. History now lives on the server. */
export function cleanupLegacyStorage(): void {
  for (const key of LEGACY_KEYS) removeStorage(key);
}
