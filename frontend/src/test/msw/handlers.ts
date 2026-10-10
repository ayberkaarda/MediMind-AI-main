import { delay, http, HttpResponse } from 'msw';
import symptomsFixture from '../fixtures/symptoms.json';
import predictFixture from '../fixtures/predict.json';
import historyFixture from '../fixtures/history.json';
import diseasesFixture from '../fixtures/diseases.json';
import type { HistoryItem, PredictResponse } from '../../lib/api/schemas';

const API = '*/api/v1';

interface MockOptions {
  /** Vary predictions by input (browser preview); tests use the fixed fixture. */
  dynamic?: boolean;
  latencyMs?: number;
  seedHistory?: boolean;
}

const knownSymptoms = new Map(symptomsFixture.symptoms.map((s) => [s.id, s]));

function problem(status: number, code: string, detail: string, requestId: string) {
  return HttpResponse.json(
    { type: 'about:blank', title: code, status, detail, code, request_id: requestId, errors: [] },
    {
      status,
      headers: { 'Content-Type': 'application/problem+json', 'X-Request-ID': requestId },
    },
  );
}

function newId(): string {
  return crypto.randomUUID();
}

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function severityLevel(mean: number): string {
  if (mean >= 5) return 'high';
  if (mean >= 3.5) return 'moderate';
  return 'low';
}

function dynamicPrediction(
  symptoms: string[],
): Pick<PredictResponse, 'top_prediction' | 'predictions'> {
  const seed = hash([...symptoms].sort().join('|'));
  const picks: typeof diseasesFixture = [];
  for (let i = 0; picks.length < 5; i += 1) {
    const disease = diseasesFixture[(seed + i * 7) % diseasesFixture.length];
    if (disease && !picks.includes(disease)) picks.push(disease);
  }
  const weights = [0.32 + (seed % 40) / 100, 0.14, 0.07, 0.025, 0.004];
  const predictions = picks.map((d, i) => ({
    disease_id: d.disease_id,
    name: d.name,
    probability: weights[i] ?? 0,
  }));
  const [first] = predictions;
  const [top] = picks;
  if (!first || !top) throw new Error('mock disease table is empty');
  return {
    top_prediction: { ...first, description: top.description, precautions: top.precautions },
    predictions,
  };
}

export function createHandlers({
  dynamic = false,
  latencyMs = 0,
  seedHistory = true,
}: MockOptions = {}) {
  const histories = new Map<string, HistoryItem[]>();

  const historyFor = (clientId: string) => {
    let list = histories.get(clientId);
    if (!list) {
      list = seedHistory ? historyFixture.items.map((item) => ({ ...item })) : [];
      histories.set(clientId, list);
    }
    return list;
  };

  return [
    http.get(`${API}/symptoms`, async () => {
      if (latencyMs) await delay(latencyMs);
      return HttpResponse.json(symptomsFixture, { headers: { 'X-Request-ID': newId() } });
    }),

    http.post(`${API}/predict`, async ({ request }) => {
      const requestId = newId();
      if (latencyMs) await delay(latencyMs);
      const body = (await request.json()) as { symptoms?: unknown };
      const symptoms = Array.isArray(body.symptoms) ? body.symptoms.map(String) : [];
      if (symptoms.length === 0) {
        return problem(422, 'validation_error', 'En az bir belirti seçilmelidir.', requestId);
      }
      const unknown = symptoms.find((s) => !knownSymptoms.has(s));
      if (unknown) {
        return problem(422, 'unknown_symptom', `Bilinmeyen belirti: ${unknown}`, requestId);
      }
      const analysisId = newId();
      const createdAt = new Date().toISOString();
      const result = dynamic
        ? dynamicPrediction(symptoms)
        : {
            top_prediction: predictFixture.top_prediction,
            predictions: predictFixture.predictions,
          };
      const weights = symptoms.map((s) => knownSymptoms.get(s)?.severity ?? 0);
      const score = weights.reduce((a, b) => a + b, 0);
      const mean = score / symptoms.length;
      const response: PredictResponse = {
        ...predictFixture,
        ...result,
        request_id: requestId,
        analysis_id: analysisId,
        input: { symptoms, count: symptoms.length },
        severity: {
          score,
          max_possible: symptoms.length * 7,
          mean_weight: mean,
          level: severityLevel(mean),
        },
        created_at: createdAt,
      };
      const clientId = request.headers.get('x-client-id');
      if (clientId) {
        historyFor(clientId).unshift({
          id: analysisId,
          created_at: createdAt,
          symptoms,
          top_disease_id: response.top_prediction.disease_id,
          top_disease_name: response.top_prediction.name,
          probability: response.top_prediction.probability,
          severity_level: response.severity.level,
          model_version: response.model_version,
        });
      }
      return HttpResponse.json(response, { headers: { 'X-Request-ID': requestId } });
    }),

    http.get(`${API}/history`, async ({ request }) => {
      const requestId = newId();
      const clientId = request.headers.get('x-client-id');
      if (!clientId) {
        return problem(400, 'missing_client_id', 'X-Client-Id başlığı gerekli.', requestId);
      }
      if (latencyMs) await delay(latencyMs);
      const items = historyFor(clientId);
      return HttpResponse.json(
        { items, total: items.length },
        { headers: { 'X-Request-ID': requestId } },
      );
    }),

    http.delete(`${API}/history`, ({ request }) => {
      const clientId = request.headers.get('x-client-id') ?? '';
      histories.set(clientId, []);
      return new HttpResponse(null, { status: 204, headers: { 'X-Request-ID': newId() } });
    }),

    http.delete(`${API}/history/:id`, ({ request, params }) => {
      const requestId = newId();
      const clientId = request.headers.get('x-client-id') ?? '';
      const list = historyFor(clientId);
      const index = list.findIndex((item) => item.id === params.id);
      if (index === -1) return problem(404, 'history_not_found', 'Kayıt bulunamadı.', requestId);
      list.splice(index, 1);
      return new HttpResponse(null, { status: 204, headers: { 'X-Request-ID': requestId } });
    }),
  ];
}
