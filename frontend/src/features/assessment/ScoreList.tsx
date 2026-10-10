import clsx from 'clsx';
import * as m from 'motion/react-m';
import { DUR, EASE, staggerDelay, useMotionLevel } from '../../lib/motion';
import type { Prediction } from '../../lib/api/schemas';
import { formatScore, scoreToWidth } from '../../lib/format';

export const RULER_NOTE = 'Bu değer, hastalığa sahip olma olasılığınız olarak yorumlanmamalıdır.';

const TICKS = [0, 25, 50, 75, 100] as const;
/** Bars start once the report's opening wipe has passed. */
const BAR_DELAY = 0.45;

interface ScoreListProps {
  predictions: Prediction[];
  limit?: number;
  /** Monochrome variant used by the printed note. */
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
  return (
    <svg
      viewBox="0 0 100 16"
      preserveAspectRatio="none"
      className={clsx('block h-4 w-full overflow-visible', variant === 'screen' && 'text-ink')}
      aria-hidden="true"
      focusable="false"
    >
      {TICKS.map((tick) => (
        <line
          key={tick}
          x1={tick}
          x2={tick}
          y1={0}
          y2={16}
          stroke="currentColor"
          strokeOpacity={variant === 'screen' ? 0.35 : 0.5}
          strokeWidth={variant === 'screen' ? 0.5 : 1}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      <line
        x1={0}
        x2={100}
        y1={8}
        y2={8}
        stroke="currentColor"
        strokeOpacity={variant === 'screen' ? 0.35 : 0.5}
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
      <m.rect
        data-testid="ruler-bar"
        x={0}
        y={3}
        height={10}
        width={width}
        rx={0}
        fill="currentColor"
        style={{ transformOrigin: '0px 8px' }}
        initial={
          variant === 'print' || level === 'none'
            ? false
            : level === 'lite'
              ? { opacity: 0 }
              : { scaleX: 0 }
        }
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{
          duration: level === 'full' ? DUR.scene : DUR.fast,
          delay: level === 'full' ? staggerDelay(index, BAR_DELAY) : 0,
          ease: EASE.shutter,
        }}
      />
    </svg>
  );
}

/**
 * Model scores on one shared 0–100 axis. Bars are never normalised to the top result and
 * all share the ink colour. Bars grow in; the numbers are printed in full from the first frame.
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
      <ol className="flex flex-col border-t-2 border-ink">
        {rows.map((row, index) => (
          <li
            key={row.disease_id}
            className="grid grid-cols-[minmax(0,1fr)_4.5rem] items-center gap-x-4 gap-y-1 border-b border-line py-3 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_4.5rem]"
          >
            <span className="col-span-2 text-base font-semibold md:col-span-1">
              <span className="sr-only">
                {row.name}, model skoru {formatScore(row.probability)}
              </span>
              <span aria-hidden="true">{row.name}</span>
            </span>
            <Track probability={row.probability} variant="screen" index={index} />
            <span className="type-display text-right text-xl tabular-nums" aria-hidden="true">
              {formatScore(row.probability)}
            </span>
          </li>
        ))}
      </ol>
      <div
        aria-hidden="true"
        className="mt-1 grid grid-cols-[minmax(0,1fr)_4.5rem] gap-x-4 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_4.5rem]"
      >
        <span className="hidden md:block" />
        <span className="relative h-5 text-xs text-ink-muted">
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
