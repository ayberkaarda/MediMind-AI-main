import { useId } from 'react';
import * as m from 'motion/react-m';
import clsx from 'clsx';
import { BodyFigure } from './body-map/BodyFigure';
import type { FigureView } from './body-map/regions';
import { RegionChips } from './RegionChips';
import type { SymptomCatalog } from './catalog';
import { countByRegion, isFigureRegion } from './catalog';
import { Icon } from '../../components/ui/Icon';
import {
  CLIP,
  UNCLIPPED,
  DUR,
  EASE,
  SPRING_POP,
  staggerDelay,
  useMotionLevel,
} from '../../lib/motion';

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
  /** Desktop lays figure, index and list out as one horizontal band; compact stacks them. */
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
  const level = useMotionLevel();
  const counts = countByRegion(catalog, selected);
  const selectedSet = new Set(selected);
  const regionSymptoms = region ? catalog.symptoms.filter((s) => s.region === region) : [];

  // Each row of a newly chosen region wipes in from the left, a few milliseconds apart.
  const rowMotion = (index: number) =>
    level === 'full'
      ? {
          initial: { clipPath: CLIP.fromLeft },
          animate: UNCLIPPED,
          transition: { duration: DUR.base, ease: EASE.shutter, delay: staggerDelay(index) },
        }
      : level === 'lite'
        ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: DUR.fast } }
        : {};

  return (
    <div className={clsx('flex gap-8', layout === 'wide' ? 'flex-row items-start' : 'flex-col')}>
      <div className={clsx('flex flex-col gap-6', layout === 'wide' && 'w-[26rem] shrink-0')}>
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

      <section aria-labelledby={listHeadingId} className="min-w-0 flex-1">
        <h3 id={listHeadingId} className="type-title border-b-2 border-ink pb-3">
          {region
            ? `${catalog.regionLabel(region)} bölgesindeki belirtiler`
            : 'Bölgedeki belirtiler'}
        </h3>
        {region ? (
          <ul
            key={region}
            className={clsx(
              'grid gap-x-6',
              layout === 'wide' ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2',
            )}
          >
            {regionSymptoms.map((symptom, index) => {
              const checked = selectedSet.has(symptom.id);
              return (
                <m.li key={symptom.id} className="border-b border-line" {...rowMotion(index)}>
                  <button
                    type="button"
                    aria-pressed={checked}
                    disabled={!checked && limitReached}
                    onClick={() => onToggleSymptom(symptom.id)}
                    className="group flex min-h-row w-full items-center gap-3 py-2 text-left text-base disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span
                      aria-hidden="true"
                      className={clsx(
                        'grid h-5 w-5 shrink-0 place-items-center border-2 border-ink',
                        checked ? 'bg-accent text-on-accent' : 'bg-transparent',
                      )}
                    >
                      {checked ? (
                        <m.span
                          className="grid place-items-center"
                          initial={level === 'full' ? { scale: 0 } : false}
                          animate={{ scale: 1 }}
                          transition={SPRING_POP}
                        >
                          <Icon name="check" size={14} strokeWidth={3} />
                        </m.span>
                      ) : null}
                    </span>
                    <span className={clsx(checked && 'font-semibold')}>{symptom.label}</span>
                  </button>
                </m.li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-3 max-w-prose text-sm text-ink-muted">
            Figürden ya da yukarıdaki düğmelerden bir bölge seçin; o bölgedeki belirtiler burada
            listelenir ve arama da o bölgeyle sınırlanır.
          </p>
        )}
      </section>
    </div>
  );
}
