import { useId } from 'react';

export function sentenceCase(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toLocaleUpperCase('tr') + trimmed.slice(1);
}

export function PrecautionList({ precautions }: { precautions: string[] }) {
  const headingId = useId();
  const items = precautions.map(sentenceCase).filter(Boolean);
  return (
    <section aria-labelledby={headingId}>
      <h3 id={headingId} className="type-section border-b-2 border-ink pb-2">
        Önlemler
      </h3>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-ink-muted">Bu sonuç için kayıtlı önlem yok.</p>
      ) : (
        <ul className="max-w-prose">
          {items.map((item) => (
            <li key={item} className="flex gap-3 border-b border-line py-3 last:border-b-0">
              <span aria-hidden="true" className="mt-2 h-2 w-2 shrink-0 bg-accent-text" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
