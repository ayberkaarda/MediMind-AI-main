import { useId } from 'react';
import * as m from 'motion/react-m';
import { useReducedMotion } from 'motion/react';
import clsx from 'clsx';
import { BodyFigure } from './body-map/BodyFigure';
import type { FigureView } from './body-map/regions';
import { RegionChips } from './RegionChips';
import type { SymptomCatalog } from './catalog';
import { countByRegion, isFigureRegion } from './catalog';
import { Icon } from '../../components/ui/Icon';

interface RegionPickerProps {
  catalog: SymptomCatalog;
  selected: readonly string[];
  region: string | null;
  onRegionChange: (region: string | null) => void;
  figureView: FigureView;
  onFigureViewChange: (view: FigureView) => void;
  onToggleSymptom: (id: string) => void;
  limitReached: boolean;
  figureHeight: number;
  /** Desktop places the region list beside the figure; compact stacks it. */
  layout: 'wide' | 'compact';
}

export function RegionPicker({
  catalog,
  selected,
  region,
  onRegionChange,
  figureView,
  onFigureViewChange,
  onToggleSymptom,
  limitReached,
  figureHeight,
  layout,
}: RegionPickerProps) {
  const listHeadingId = useId();
  const reduced = useReducedMotion();
  const counts = countByRegion(catalog, selected);
  const selectedSet = new Set(selected);
  const regionSymptoms = region ? catalog.symptoms.filter((s) => s.region === region) : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <BodyFigure
          view={figureView}
          onViewChange={onFigureViewChange}
          activeRegion={isFigureRegion(region) ? region : null}
          counts={counts}
          onRegionSelect={onRegionChange}
          height={figureHeight}
        />
        <RegionChips
          regions={catalog.chipRegions}
          activeRegion={region}
          counts={counts}
          onSelect={onRegionChange}
        />
      </div>

      <m.section
        key={region}
        initial={{ opacity: 0, y: reduced ? 0 : 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduced ? 0.12 : 0.24 }}
        aria-labelledby={listHeadingId}
        className="border-t border-line pt-4"
      >
        <h3 id={listHeadingId} className="text-base font-medium">
          {region
            ? `${catalog.regionLabel(region)} bölgesindeki belirtiler`
            : 'Bölgedeki belirtiler'}
        </h3>
        {region ? (
          <ul
            className={clsx(
              'mt-2 grid gap-x-6',
              layout === 'wide' ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2',
            )}
          >
            {regionSymptoms.map((symptom) => {
              const checked = selectedSet.has(symptom.id);
              return (
                <li key={symptom.id} className="border-b border-line">
                  <button
                    type="button"
                    aria-pressed={checked}
                    disabled={!checked && limitReached}
                    onClick={() => onToggleSymptom(symptom.id)}
                    className="flex min-h-row w-full items-center gap-3 py-2 text-left text-base disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span
                      aria-hidden="true"
                      className={clsx(
                        'grid h-5 w-5 shrink-0 place-items-center rounded-sm border transition-colors duration-hatch',
                        checked
                          ? 'border-accent bg-accent text-on-accent'
                          : 'border-ink-muted bg-surface',
                      )}
                    >
                      {checked ? <Icon name="check" size={14} strokeWidth={2.25} /> : null}
                    </span>
                    <m.span layoutId={checked || reduced ? undefined : `symptom-${symptom.id}`}>
                      {symptom.label}
                    </m.span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-2 max-w-prose text-sm text-ink-muted">
            Figürden ya da yukarıdaki düğmelerden bir bölge seçin; o bölgedeki belirtiler burada
            listelenir ve arama da o bölgeyle sınırlanır.
          </p>
        )}
      </m.section>
    </div>
  );
}
