import { useId, useMemo } from 'react';
import clsx from 'clsx';
import { Icon } from '../../components/ui/Icon';
import type { SymptomCatalog } from './catalog';

interface SymptomListProps {
  catalog: SymptomCatalog;
  selected: readonly string[];
  region: string | null;
  onToggle: (id: string) => void;
  limitReached: boolean;
  className?: string;
}

const collator = new Intl.Collator('tr');

/** Every symptom, or those of the chosen region, as a scrollable list of toggle rows. */
export function SymptomList({
  catalog,
  selected,
  region,
  onToggle,
  limitReached,
  className,
}: SymptomListProps) {
  const headingId = useId();
  const selectedSet = new Set(selected);
  const items = useMemo(
    () =>
      catalog.symptoms
        .filter((symptom) => region === null || symptom.region === region)
        .sort((a, b) => collator.compare(a.label, b.label)),
    [catalog.symptoms, region],
  );

  return (
    <section aria-labelledby={headingId} className={clsx('flex flex-col gap-3', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={headingId} className="type-heading">
          {region ? `${catalog.regionLabel(region)} bölgesindeki belirtiler` : 'Tüm belirtiler'}
        </h2>
        <p className="tabular shrink-0 text-sm text-ink-muted">{items.length} belirti</p>
      </div>
      <ul className="max-h-[60vh] overflow-y-auto rounded border border-line bg-surface">
        {items.map((symptom) => {
          const checked = selectedSet.has(symptom.id);
          return (
            <li key={symptom.id} className="border-b border-line last:border-b-0">
              <button
                type="button"
                aria-pressed={checked}
                disabled={!checked && limitReached}
                onClick={() => onToggle(symptom.id)}
                className={clsx(
                  'flex min-h-row w-full items-center gap-3 px-4 py-2 text-left text-base transition-colors duration-tap disabled:cursor-not-allowed disabled:opacity-50',
                  checked ? 'bg-block font-semibold' : 'hover:bg-surface-muted',
                )}
              >
                <span
                  aria-hidden="true"
                  className={clsx(
                    'grid h-5 w-5 shrink-0 place-items-center rounded-sm border',
                    checked ? 'border-accent bg-accent text-on-accent' : 'border-line-strong',
                  )}
                >
                  {checked ? <Icon name="check" size={14} strokeWidth={2.5} /> : null}
                </span>
                <span className="min-w-0 flex-1">{symptom.label}</span>
                {region === null ? (
                  <span aria-hidden="true" className="shrink-0 text-xs font-normal text-ink-muted">
                    {catalog.regionLabel(symptom.region)}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
