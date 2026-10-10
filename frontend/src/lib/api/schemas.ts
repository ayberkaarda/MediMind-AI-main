import { z } from 'zod';

const id = z.union([z.string(), z.number()]).transform((value) => String(value));

export const SymptomSchema = z.object({
  id: z.string(),
  label: z.string(),
  label_en: z.string().default(''),
  region: z.string(),
  severity: z.number().nullable().default(null),
});

export const RegionSchema = z.object({
  id: z.string(),
  label: z.string(),
  order: z.number(),
});

export const SymptomsResponseSchema = z.object({
  symptoms: z.array(SymptomSchema),
  regions: z.array(RegionSchema),
});

export const PredictionSchema = z.object({
  disease_id: z.string(),
  name: z.string(),
  probability: z.number(),
});

export const TopPredictionSchema = PredictionSchema.extend({
  description: z.string().nullable().default(null),
  precautions: z.array(z.string()).default([]),
});

export const SeveritySchema = z.object({
  score: z.number(),
  max_possible: z.number(),
  mean_weight: z.number(),
  level: z.string(),
});

export const PredictResponseSchema = z.object({
  request_id: z.string(),
  analysis_id: id.nullable(),
  model_version: z.string(),
  input: z.object({
    symptoms: z.array(z.string()),
    count: z.number(),
  }),
  top_prediction: TopPredictionSchema,
  predictions: z.array(PredictionSchema),
  severity: SeveritySchema,
  confidence_label: z.string().optional(),
  disclaimer: z.union([z.boolean(), z.string()]).optional(),
  created_at: z.string(),
});

export const HistoryItemSchema = z.object({
  id,
  created_at: z.string(),
  symptoms: z.array(z.string()),
  top_disease_id: z.string(),
  top_disease_name: z.string(),
  probability: z.number(),
  severity_level: z.string().nullable().default(null),
  model_version: z.string(),
});

export const HistoryListResponseSchema = z.object({
  items: z.array(HistoryItemSchema),
  total: z.number(),
});

export const ProblemDetailSchema = z.object({
  type: z.string().optional(),
  title: z.string().optional(),
  status: z.number().optional(),
  detail: z.string().nullable().optional(),
  code: z.string().optional(),
  request_id: z.string().optional(),
  errors: z.array(z.unknown()).optional(),
});

export type Symptom = z.infer<typeof SymptomSchema>;
export type Region = z.infer<typeof RegionSchema>;
export type SymptomsResponse = z.infer<typeof SymptomsResponseSchema>;
export type Prediction = z.infer<typeof PredictionSchema>;
export type PredictResponse = z.infer<typeof PredictResponseSchema>;
export type HistoryItem = z.infer<typeof HistoryItemSchema>;
export type HistoryListResponse = z.infer<typeof HistoryListResponseSchema>;
export type ProblemDetail = z.infer<typeof ProblemDetailSchema>;
