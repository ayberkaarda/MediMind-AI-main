import type { z } from 'zod';
import { getClientId } from '../clientId';
import { ProblemDetailSchema } from './schemas';

const rawBase: unknown = import.meta.env.VITE_API_BASE_URL;
const API_ORIGIN = (typeof rawBase === 'string' ? rawBase : '').replace(/\/+$/, '');
export const API_BASE = `${API_ORIGIN}/api/v1`;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly detail: string;
  readonly requestId: string | null;
  readonly errors: unknown[];

  constructor(init: {
    status: number;
    code: string;
    detail: string;
    requestId?: string | null;
    errors?: unknown[];
  }) {
    super(init.detail);
    this.name = 'ApiError';
    this.status = init.status;
    this.code = init.code;
    this.detail = init.detail;
    this.requestId = init.requestId ?? null;
    this.errors = init.errors ?? [];
  }
}

export interface ApiResult<T> {
  data: T;
  requestId: string | null;
}

interface RequestOptions<S extends z.ZodType> {
  method?: 'GET' | 'POST' | 'DELETE';
  body?: unknown;
  schema?: S;
  signal?: AbortSignal;
}

const FALLBACK_DETAIL: Record<number, string> = {
  0: 'Sunucuya ulaşılamadı. Bağlantınızı kontrol edip yeniden deneyin.',
  404: 'İstenen kayıt bulunamadı.',
  422: 'Gönderilen belirtiler işlenemedi.',
  500: 'Sunucuda beklenmeyen bir hata oluştu. Biraz sonra yeniden deneyin.',
};

function fallbackDetail(status: number): string {
  return FALLBACK_DETAIL[status] ?? `İstek başarısız oldu (HTTP ${status}).`;
}

async function toApiError(response: Response, requestId: string | null): Promise<ApiError> {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('json')) {
    try {
      const parsed = ProblemDetailSchema.safeParse(await response.json());
      if (parsed.success) {
        const problem = parsed.data;
        return new ApiError({
          status: problem.status ?? response.status,
          code: problem.code ?? `http_${response.status}`,
          detail: problem.detail || problem.title || fallbackDetail(response.status),
          requestId: problem.request_id ?? requestId,
          errors: problem.errors ?? [],
        });
      }
    } catch {
      // Fall through to the generic error below.
    }
  }
  return new ApiError({
    status: response.status,
    code: `http_${response.status}`,
    detail: fallbackDetail(response.status),
    requestId,
  });
}

export async function apiRequest<S extends z.ZodType>(
  path: string,
  options: RequestOptions<S> & { schema: S },
): Promise<ApiResult<z.output<S>>>;
export async function apiRequest(
  path: string,
  options?: RequestOptions<z.ZodType>,
): Promise<ApiResult<null>>;
export async function apiRequest(
  path: string,
  { method = 'GET', body, schema, signal }: RequestOptions<z.ZodType> = {},
): Promise<ApiResult<unknown>> {
  const headers: Record<string, string> = {
    Accept: 'application/json, application/problem+json',
    'X-Client-Id': getClientId(),
  };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError({ status: 0, code: 'network_error', detail: fallbackDetail(0) });
  }

  const requestId = response.headers.get('x-request-id');
  if (!response.ok) throw await toApiError(response, requestId);
  if (!schema || response.status === 204) return { data: null, requestId };

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ApiError({
      status: response.status,
      code: 'invalid_response',
      detail: 'Sunucudan beklenmeyen bir yanıt geldi.',
      requestId,
    });
  }
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new ApiError({
      status: response.status,
      code: 'invalid_response',
      detail: 'Sunucudan beklenmeyen bir yanıt geldi.',
      requestId,
    });
  }
  return { data: parsed.data, requestId };
}

const CODE_MESSAGES: Record<string, string> = {
  network_error: FALLBACK_DETAIL[0] ?? '',
  unknown_symptom:
    'Seçilen belirtilerden biri sunucu tarafından tanınmadı. Listeyi yenileyip yeniden deneyin.',
  empty_symptoms: 'En az bir belirti seçin.',
  too_many_symptoms: 'En fazla 17 belirti seçebilirsiniz.',
  validation_error: 'Gönderilen belirtiler işlenemedi.',
  model_not_loaded: 'Model şu anda kullanılamıyor. Biraz sonra yeniden deneyin.',
  analysis_not_found: 'Kayıt bulunamadı; daha önce silinmiş olabilir.',
  not_found: 'İstenen kayıt bulunamadı.',
  missing_client_id: 'Tarayıcı kimliği gönderilemedi. Sayfayı yenileyin.',
  invalid_client_id: 'Tarayıcı kimliği geçersiz. Sayfayı yenileyin.',
  internal_error: FALLBACK_DETAIL[500] ?? '',
  invalid_response: 'Sunucudan beklenmeyen bir yanıt geldi.',
};

/** Turkish, user-facing text for an error; server details are English and stay in ApiError.detail. */
export function errorMessage(error: ApiError): string {
  return CODE_MESSAGES[error.code] || fallbackDetail(error.status);
}
