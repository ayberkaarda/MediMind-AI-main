interface MockEnvironment {
  DEV: boolean;
  VITE_MOCK_API?: string;
}

export function shouldEnableMocks(env: MockEnvironment): boolean {
  return env.DEV && env.VITE_MOCK_API === 'true';
}
