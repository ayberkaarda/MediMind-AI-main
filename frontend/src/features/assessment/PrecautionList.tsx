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
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h3 id={headingId} className="type-heading">
        Önlemler
      </h3>
      {items.length === 0 ? (
        <p className="text-sm text-ink-muted">Bu sonuç için kayıtlı önlem yok.</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {items.map((item) => (
            <li key={item} className="flex gap-3 text-base">
              <span
                aria-hidden="true"
                className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
