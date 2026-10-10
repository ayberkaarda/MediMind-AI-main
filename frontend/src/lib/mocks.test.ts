import { describe, expect, it } from 'vitest';
import { shouldEnableMocks } from './mocks';

describe('shouldEnableMocks', () => {
  it('rejects production even when the mock flag is true', () => {
    expect(shouldEnableMocks({ DEV: false, VITE_MOCK_API: 'true' })).toBe(false);
  });

  it('requires both development mode and the explicit flag', () => {
    expect(shouldEnableMocks({ DEV: true, VITE_MOCK_API: 'true' })).toBe(true);
    expect(shouldEnableMocks({ DEV: true, VITE_MOCK_API: 'false' })).toBe(false);
    expect(shouldEnableMocks({ DEV: true })).toBe(false);
  });
});
