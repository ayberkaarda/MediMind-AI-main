import { setupServer } from 'msw/node';
import { createHandlers } from './handlers';

export const server = setupServer(...createHandlers());

/** Fresh handlers per test so the in-memory history never leaks between tests. */
export function resetMockServer(): void {
  server.resetHandlers(...createHandlers());
}
