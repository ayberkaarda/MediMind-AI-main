import clsx from 'clsx';
import * as m from 'motion/react-m';
import { DUR, EASE, staggerDelay, useMotionLevel } from '../../lib/motion';
import type { Prediction } from '../../lib/api/schemas';
import { formatScore, scoreToWidth } from '../../lib/format';

export const RULER_NOTE = 'Bu değer, hastalığa sahip olma olasılığınız olarak yorumlanmamalıdır.';

const TICKS = [0, 25, 50, 75, 100] as const;

interface ScoreListProps {
  predictions: Prediction[];
  limit?: number;
  /** Outlined variant used by the printed note. */
  variant?: 'screen' | 'print';
  className?: string;
}

function Track({
  probability,
  variant,
  index = 0,
}: {
  probability: number;
  variant: 'screen' | 'print';
  index?: number;
}) {
  const level = useMotionLevel();
  const width = scoreToWidth(probability);
  const print = variant === 'print';
  return (
    <svg
      viewBox="0 0 100 12"
      preserveAspectRatio="none"
      className={clsx('block h-3 w-full overflow-visible', !print && 'text-accent')}
      aria-hidden="true"
      focusable="false"
    >
      <rect
        x={0}
        y={0}
        width={100}
        height={12}
        fill={print ? 'none' : 'currentColor'}
        fillOpacity={print ? undefined : 0.14}
        stroke={print ? 'currentColor' : 'none'}
        strokeOpacity={0.4}
        strokeWidth={0.75}
        vectorEffect="non-scaling-stroke"
      />
      <m.rect
        data-testid="ruler-bar"
        x={0}
        y={0}
        height={12}
        width={width}
        fill={print ? 'none' : 'currentColor'}
        stroke={print ? 'currentColor' : 'none'}
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
        style={{ transformOrigin: '0px 6px' }}
        initial={print || level === 'reduced' ? false : { scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: DUR.bars, delay: staggerDelay(index), ease: EASE.out }}
      />
    </svg>
  );
}

/**
 * Model scores on one shared 0–100 axis. Bars are never normalised to the top result and all
 * share one colour. Bars fill in; the numbers are printed in full from the first frame.
 */
export function ScoreList({
  predictions,
  limit = 5,
  variant = 'screen',
  className,
}: ScoreListProps) {
  const rows = predictions.slice(0, limit);
  if (variant === 'print') {
    return (
      <div className={className}>
        <ol className="print-report__ruler">
          {rows.map((row) => (
            <li key={row.disease_id}>
              <span>{row.name}</span>
              <Track probability={row.probability} variant="print" />
              <span className="print-report__value">{formatScore(row.probability)}</span>
            </li>
          ))}
        </ol>
        <div className="print-report__axis" aria-hidden="true">
          <span />
          <span className="print-report__axis-labels">
            {TICKS.map((tick) => (
              <span key={tick}>{tick}</span>
            ))}
          </span>
          <span />
        </div>
      </div>
    );
  }

  return (
    <div className={className} aria-live="polite" aria-atomic="true" aria-label="Model skoru">
      <ol className="flex flex-col gap-3">
        {rows.map((row, index) => (
          <li
            key={row.disease_id}
            className="grid grid-cols-[minmax(0,1fr)_3.5rem] items-center gap-x-4 gap-y-1.5 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_3.5rem]"
          >
            <span className="col-span-2 text-base sm:col-span-1">
              <span className="sr-only">
                {row.name}, model skoru {formatScore(row.probability)}
              </span>
              <span aria-hidden="true">{row.name}</span>
            </span>
            <Track probability={row.probability} variant="screen" index={index} />
            <span className="tabular text-right text-base font-semibold" aria-hidden="true">
              {formatScore(row.probability)}
            </span>
          </li>
        ))}
      </ol>
      <div
        aria-hidden="true"
        className="mt-2 grid grid-cols-[minmax(0,1fr)_3.5rem] gap-x-4 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_3.5rem]"
      >
        <span className="hidden sm:block" />
        <span className="tabular relative h-5 text-xs text-ink-muted">
          {TICKS.map((tick) => (
            <span
              key={tick}
              className={clsx(
                'absolute top-0',
                tick === 0 ? 'left-0' : tick === 100 ? 'right-0' : '-translate-x-1/2',
              )}
              style={tick > 0 && tick < 100 ? { left: `${tick}%` } : undefined}
            >
              {tick}
            </span>
          ))}
        </span>
        <span />
      </div>
    </div>
  );
}
