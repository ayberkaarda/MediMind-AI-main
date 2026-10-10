import { MotionProvider } from '../app/MotionProvider';
import type { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import symptomsFixture from './fixtures/symptoms.json';
import predictFixture from './fixtures/predict.json';
import { buildCatalog } from '../features/symptoms/catalog';
import { PredictResponseSchema, SymptomsResponseSchema } from '../lib/api/schemas';

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  });
}

export function renderWithClient(ui: ReactElement, client = createTestQueryClient()) {
  const user = userEvent.setup();
  const result = render(
    <MotionProvider>
      <QueryClientProvider client={client}>{ui}</QueryClientProvider>
    </MotionProvider>,
  );
  return { ...result, user, client };
}

export const testCatalog = buildCatalog(SymptomsResponseSchema.parse(symptomsFixture));
export const testPrediction = PredictResponseSchema.parse(predictFixture);
