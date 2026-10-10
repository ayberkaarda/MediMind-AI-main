import { afterEach, describe, expect, it, vi } from 'vitest';
import { CLIENT_ID_KEY, getClientId, isUuid, resetClientIdCache } from './clientId';
import { cleanupLegacyStorage } from './storage';

afterEach(() => resetClientIdCache());

describe('getClientId', () => {
  it('creates a UUID once and keeps returning it', () => {
    const first = getClientId();
    expect(isUuid(first)).toBe(true);
    expect(window.localStorage.getItem(CLIENT_ID_KEY)).toBe(first);
    resetClientIdCache();
    expect(getClientId()).toBe(first);
  });

  it('replaces a corrupted stored value', () => {
    window.localStorage.setItem(CLIENT_ID_KEY, 'not-a-uuid');
    const id = getClientId();
    expect(isUuid(id)).toBe(true);
    expect(window.localStorage.getItem(CLIENT_ID_KEY)).toBe(id);
  });

  it('stays stable for the session when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const id = getClientId();
    expect(isUuid(id)).toBe(true);
    expect(getClientId()).toBe(id);
  });
});

describe('cleanupLegacyStorage', () => {
  it('removes keys written by the previous client', () => {
    window.localStorage.setItem('predictionHistory', '[]');
    window.localStorage.setItem('theme', 'dark');
    window.localStorage.setItem(CLIENT_ID_KEY, '11111111-1111-4111-8111-111111111111');
    cleanupLegacyStorage();
    expect(window.localStorage.getItem('predictionHistory')).toBeNull();
    expect(window.localStorage.getItem('theme')).toBeNull();
    expect(window.localStorage.getItem(CLIENT_ID_KEY)).not.toBeNull();
  });
});
