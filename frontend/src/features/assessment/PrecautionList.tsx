import { useId } from 'react';
import { Icon } from '../../components/ui/Icon';

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
      <h3 id={headingId} className="font-serif text-lg font-medium">
        Önlemler
      </h3>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-ink-muted">Bu sonuç için kayıtlı önlem yok.</p>
      ) : (
        <ul className="mt-2 max-w-prose">
          {items.map((item) => (
            <li key={item} className="flex gap-3 border-b border-line py-4 last:border-b-0">
              <Icon name="leaf" className="mt-1 shrink-0 text-accent" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
