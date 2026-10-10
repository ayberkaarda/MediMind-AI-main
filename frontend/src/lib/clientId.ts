import { readStorage, writeStorage } from './storage';

export const CLIENT_ID_KEY = 'medimind.clientId';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let memoryId: string | null = null;

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

function randomUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Anonymous, browser-scoped identifier that keys the server-side history. */
export function getClientId(): string {
  const stored = readStorage(CLIENT_ID_KEY);
  if (stored && isUuid(stored)) return stored;
  if (memoryId) return memoryId;
  const id = randomUuid();
  memoryId = id;
  writeStorage(CLIENT_ID_KEY, id);
  return id;
}

/** Test helper: forget the in-memory fallback. */
export function resetClientIdCache(): void {
  memoryId = null;
}
