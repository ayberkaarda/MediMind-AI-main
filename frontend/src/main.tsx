import './styles/tokens.css';
import './styles/base.css';
import './styles/print.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { ApiError } from './lib/api/client';
import { cleanupLegacyStorage } from './lib/storage';
import { shouldEnableMocks } from './lib/mocks';

cleanupLegacyStorage();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (failureCount, error) =>
        failureCount < 2 &&
        !(error instanceof ApiError && error.status >= 400 && error.status < 500),
    },
  },
});

async function enableMocking(): Promise<void> {
  if (!(import.meta.env.DEV && shouldEnableMocks(import.meta.env))) return;
  const { worker } = await import('./test/msw/browser');
  await worker.start({ onUnhandledRequest: 'bypass', quiet: true });
}

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root is missing');

void enableMocking().then(() => {
  createRoot(container).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </StrictMode>,
  );
});
