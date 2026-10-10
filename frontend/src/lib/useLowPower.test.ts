import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useLowPower } from './useLowPower';

afterEach(() => vi.restoreAllMocks());

describe('useLowPower', () => {
  it('skips expensive motion on devices with four or fewer cores', () => {
    vi.spyOn(navigator, 'hardwareConcurrency', 'get').mockReturnValue(4);
    expect(renderHook(useLowPower).result.current).toBe(true);
  });

  it('honours the data saving preference', () => {
    vi.spyOn(navigator, 'hardwareConcurrency', 'get').mockReturnValue(8);
    const descriptor = Object.getOwnPropertyDescriptor(navigator, 'connection');
    Object.defineProperty(navigator, 'connection', {
      configurable: true,
      value: { saveData: true },
    });
    try {
      expect(renderHook(useLowPower).result.current).toBe(true);
    } finally {
      if (descriptor) Object.defineProperty(navigator, 'connection', descriptor);
      else Reflect.deleteProperty(navigator, 'connection');
    }
  });

  it('allows motion on devices with more than four cores', () => {
    vi.spyOn(navigator, 'hardwareConcurrency', 'get').mockReturnValue(8);
    expect(renderHook(useLowPower).result.current).toBe(false);
  });
});
