import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';
import { apiRequest } from './client';
import type { ApiError } from './client';
import {
  HistoryListResponseSchema,
  PredictResponseSchema,
  SymptomsResponseSchema,
} from './schemas';
import type { HistoryListResponse, PredictResponse, SymptomsResponse } from './schemas';

export const queryKeys = {
  symptoms: ['symptoms'] as const,
  history: ['history'] as const,
};

export function useSymptoms() {
  return useQuery<SymptomsResponse, ApiError>({
    queryKey: queryKeys.symptoms,
    queryFn: async ({ signal }) =>
      (await apiRequest('/symptoms', { schema: SymptomsResponseSchema, signal })).data,
    staleTime: 60 * 60 * 1000,
    gcTime: Infinity,
  });
}

export interface PredictVariables {
  symptoms: string[];
}

export function usePredict() {
  const queryClient = useQueryClient();
  return useMutation<PredictResponse, ApiError, PredictVariables>({
    mutationFn: async ({ symptoms }) =>
      (
        await apiRequest('/predict', {
          method: 'POST',
          body: { symptoms },
          schema: PredictResponseSchema,
        })
      ).data,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.history });
    },
  });
}

export function useHistory(enabled = true) {
  return useInfiniteQuery<HistoryListResponse, ApiError>({
    queryKey: queryKeys.history,
    initialPageParam: 0,
    queryFn: async ({ signal, pageParam }) =>
      (
        await apiRequest(`/history?limit=50&offset=${String(pageParam)}`, {
          schema: HistoryListResponseSchema,
          signal,
        })
      ).data,
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((sum, page) => sum + page.items.length, 0);
      return lastPage.items.length > 0 && loaded < lastPage.total ? loaded : undefined;
    },
    enabled,
  });
}

export function useDeleteHistoryItem() {
  const queryClient = useQueryClient();
  return useMutation<null, ApiError, string>({
    mutationFn: async (id) =>
      (await apiRequest(`/history/${encodeURIComponent(id)}`, { method: 'DELETE' })).data,
    onSuccess: (_data, id) => {
      queryClient.setQueryData<InfiniteData<HistoryListResponse>>(queryKeys.history, (current) =>
        current
          ? {
              ...current,
              pages: current.pages.map((page) => ({
                items: page.items.filter((item) => item.id !== id),
                total: Math.max(0, page.total - 1),
              })),
            }
          : current,
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.history });
    },
  });
}

export function useClearHistory() {
  const queryClient = useQueryClient();
  return useMutation<null, ApiError, void>({
    mutationFn: async () => (await apiRequest('/history', { method: 'DELETE' })).data,
    onSuccess: () => {
      queryClient.setQueryData<InfiniteData<HistoryListResponse>>(queryKeys.history, {
        pages: [{ items: [], total: 0 }],
        pageParams: [0],
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.history });
    },
  });
}
