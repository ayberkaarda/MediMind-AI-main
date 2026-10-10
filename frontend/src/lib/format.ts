const numberTr = new Intl.NumberFormat('tr-TR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const dateTimeTr = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const dateShortTr = new Intl.DateTimeFormat('tr-TR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/** Model score as a whole percentage in Turkish order: "%42", or "<%1" below one percent. */
export function formatScore(probability: number): string {
  if (!Number.isFinite(probability) || probability < 0.01) return '<%1';
  const pct = Math.min(100, Math.round(probability * 100));
  return `%${pct}`;
}

/** Width of a ruler bar on the shared 0–100 axis; never normalised to the top result. */
export function scoreToWidth(probability: number): number {
  if (!Number.isFinite(probability)) return 0;
  return Math.min(100, Math.max(0, probability * 100));
}

export function formatDecimal(value: number): string {
  return numberTr.format(value);
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : dateTimeTr.format(date);
}

export function formatDateShort(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : dateShortTr.format(date);
}

export function symptomCountLabel(count: number): string {
  return `${count} belirti`;
}
