import type { Symptom } from '../../lib/api/schemas';

const COMBINING_MARKS = /[̀-ͯ]/g;

/**
 * Accent-insensitive Turkish folding: "Baş Ağrısı" and "bas agrisi" both become "bas agrisi".
 * Dotless ı does not decompose under NFD, so it is mapped explicitly.
 */
export function foldTurkish(value: string): string {
  return value
    .toLocaleLowerCase('tr')
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

interface Indexed {
  symptom: Symptom;
  label: string;
  english: string;
}

export function buildIndex(symptoms: Symptom[]): Indexed[] {
  return symptoms.map((symptom) => ({
    symptom,
    label: foldTurkish(symptom.label),
    english: foldTurkish(symptom.label_en),
  }));
}

function rank(entry: Indexed, query: string): number {
  if (entry.label.startsWith(query)) return 0;
  if (entry.label.includes(` ${query}`)) return 1;
  if (entry.label.includes(query)) return 2;
  if (entry.english.includes(query)) return 3;
  return -1;
}

const collator = new Intl.Collator('tr');

export function searchSymptoms(
  index: Indexed[],
  rawQuery: string,
  options: { region?: string | null; exclude?: ReadonlySet<string> } = {},
): Symptom[] {
  const query = foldTurkish(rawQuery);
  const { region = null, exclude } = options;
  const results: { symptom: Symptom; score: number }[] = [];
  for (const entry of index) {
    if (region && entry.symptom.region !== region) continue;
    if (exclude?.has(entry.symptom.id)) continue;
    const score = query ? rank(entry, query) : 0;
    if (score >= 0) results.push({ symptom: entry.symptom, score });
  }
  results.sort((a, b) => a.score - b.score || collator.compare(a.symptom.label, b.symptom.label));
  return results.map((r) => r.symptom);
}
