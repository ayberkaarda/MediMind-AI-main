import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { API_BASE, ApiError, apiRequest } from './client';
import { SymptomsResponseSchema } from './schemas';
import { server } from '../../test/msw/server';
import { CLIENT_ID_KEY, isUuid } from '../clientId';

describe('apiRequest', () => {
  it('targets the versioned API on the same origin by default', () => {
    expect(API_BASE).toBe('/api/v1');
  });

  it('sends X-Client-Id and returns the X-Request-ID header', async () => {
    let seenClientId: string | null = null;
    server.use(
      http.get('*/api/v1/ping', ({ request }) => {
        seenClientId = request.headers.get('x-client-id');
        return HttpResponse.json({ ok: true }, { headers: { 'X-Request-ID': 'req-123' } });
      }),
    );
    const result = await apiRequest('/ping', { schema: z.object({ ok: z.boolean() }) });
    expect(result).toEqual({ data: { ok: true }, requestId: 'req-123' });
    expect(seenClientId).toBe(window.localStorage.getItem(CLIENT_ID_KEY));
    expect(isUuid(seenClientId ?? '')).toBe(true);
  });

  it('maps application/problem+json to ApiError', async () => {
    server.use(
      http.post('*/api/v1/predict', () =>
        HttpResponse.json(
          {
            type: 'https://medimind.local/problems/unknown_symptom',
            title: 'Unknown symptom',
            status: 422,
            detail: 'Bilinmeyen belirti: yok_boyle_bir_sey',
            code: 'unknown_symptom',
            request_id: 'req-422',
            errors: [{ loc: ['body', 'symptoms', 0] }],
          },
          {
            status: 422,
            headers: { 'Content-Type': 'application/problem+json', 'X-Request-ID': 'hdr-422' },
          },
        ),
      ),
    );

    const error = await apiRequest('/predict', {
      method: 'POST',
      body: { symptoms: ['yok_boyle_bir_sey'] },
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 422,
      code: 'unknown_symptom',
      detail: 'Bilinmeyen belirti: yok_boyle_bir_sey',
      requestId: 'req-422',
    });
    expect((error as ApiError).errors).toHaveLength(1);
  });

  it('falls back to the header request id and a generic message for non-JSON errors', async () => {
    server.use(
      http.get(
        '*/api/v1/symptoms',
        () =>
          new HttpResponse('Bad gateway', { status: 502, headers: { 'X-Request-ID': 'hdr-502' } }),
      ),
    );
    const error = await apiRequest('/symptoms', { schema: SymptomsResponseSchema }).catch(
      (e: unknown) => e,
    );
    expect(error).toMatchObject({ status: 502, code: 'http_502', requestId: 'hdr-502' });
  });

  it('reports network failures as status 0', async () => {
    server.use(http.get('*/api/v1/symptoms', () => HttpResponse.error()));
    const error = await apiRequest('/symptoms', { schema: SymptomsResponseSchema }).catch(
      (e: unknown) => e,
    );
    expect(error).toMatchObject({ status: 0, code: 'network_error' });
  });

  it('rejects responses that do not match the schema', async () => {
    server.use(http.get('*/api/v1/symptoms', () => HttpResponse.json({ symptoms: 'nope' })));
    const error = await apiRequest('/symptoms', { schema: SymptomsResponseSchema }).catch(
      (e: unknown) => e,
    );
    expect(error).toMatchObject({ code: 'invalid_response' });
  });

  it('resolves to null for 204 responses', async () => {
    const result = await apiRequest('/history', { method: 'DELETE' });
    expect(result.data).toBeNull();
  });
});
