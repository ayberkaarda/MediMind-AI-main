import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import * as m from 'motion/react-m';
import { useReducedMotion } from 'motion/react';
import { useLowPower } from '../../../lib/useLowPower';
import { REGIONS } from './regions';
import type { FigureView, RegionId } from './regions';
import { OUTLINE, REGION_PATHS } from './paths';
import './BodyFigure.css';

export type { FigureView, RegionId } from './regions';
let contourShown = false;
export interface BodyFigureProps {
  view: FigureView;
  onViewChange?: (view: FigureView) => void;
  activeRegion: RegionId | null;
  counts: Partial<Record<RegionId, number>>;
  onRegionSelect: (region: RegionId | null) => void;
  height?: number;
  className?: string;
}

export function BodyFigure({
  view,
  onViewChange,
  activeRegion,
  counts,
  onRegionSelect,
  height = 420,
  className,
}: BodyFigureProps) {
  const reduced = useReducedMotion();
  const lowPower = useLowPower();
  const [drawContour] = useState(() => !contourShown);
  useEffect(() => {
    contourShown = true;
  }, []);
  const [origin, setOrigin] = useState({ x: 160, y: 320 });
  const [focusedRegion, setFocusedRegion] = useState<RegionId>('head_neck');
  const buttonRefs = useRef<Partial<Record<RegionId, HTMLButtonElement | null>>>({});
  const visible = REGIONS.filter((region) => region.views.includes(view));
  const tabStop = visible.some((region) => region.id === focusedRegion)
    ? focusedRegion
    : (visible[0]?.id ?? 'head_neck');
  const figureHeight = Number.isFinite(height) && height > 0 ? height : 420;

  function select(region: RegionId) {
    onRegionSelect(activeRegion === region ? null : region);
  }

  function moveFocus(event: KeyboardEvent<HTMLButtonElement>, region: RegionId) {
    const index = visible.findIndex((item) => item.id === region);
    let next: number;
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        next = (index + 1) % visible.length;
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        next = (index + visible.length - 1) % visible.length;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = visible.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    const target = visible[next];
    if (target) {
      setFocusedRegion(target.id);
      buttonRefs.current[target.id]?.focus();
    }
  }

  return (
    <section
      className={['body-figure', className].filter(Boolean).join(' ')}
      aria-label="Vücut bölgeleri"
    >
      {onViewChange && (
        <div className="body-figure__views" role="group" aria-label="Vücut görünümü">
          {(['front', 'back'] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={view === option}
              onClick={() => onViewChange(option)}
            >
              {option === 'front' ? 'Ön' : 'Arka'}
            </button>
          ))}
        </div>
      )}
      <div className="body-figure__layout">
        <div
          className="body-figure__canvas"
          style={{ width: figureHeight / 2, height: figureHeight }}
        >
          <m.svg
            className="body-figure__svg"
            viewBox="0 0 320 640"
            width={210}
            height={420}
            initial={{ scale: figureHeight / 420, x: 0 }}
            animate={{ scale: figureHeight / 420, x: figureHeight === 160 ? 16 : 0 }}
            style={{ transformOrigin: 'center top' }}
            transition={{
              duration: reduced ? 0 : figureHeight === 160 ? 0.52 : 0.46,
              ease: [0.22, 1, 0.36, 1],
            }}
            aria-hidden="true"
            focusable="false"
          >
            <path className="body-figure__silhouette" d={OUTLINE[view]} />
            {visible.map((region) => {
              const active = activeRegion === region.id;
              return (
                <g
                  key={region.id}
                  className="body-figure__region"
                  data-active={active ? 'true' : 'false'}
                  onClick={(event) => {
                    const svg = event.currentTarget.ownerSVGElement;
                    const matrix = svg?.getScreenCTM();
                    if (svg && matrix) {
                      const point = svg.createSVGPoint();
                      point.x = event.clientX;
                      point.y = event.clientY;
                      const local = point.matrixTransform(matrix.inverse());
                      setOrigin({ x: local.x, y: local.y });
                    }
                    select(region.id);
                  }}
                >
                  <path className="body-figure__hit" d={REGION_PATHS[view][region.id]} />
                  {active && (
                    <m.path
                      initial={
                        reduced || lowPower
                          ? { opacity: 0 }
                          : { clipPath: `circle(0px at ${origin.x}px ${origin.y}px)` }
                      }
                      animate={
                        reduced || lowPower
                          ? { opacity: 0.2 }
                          : { clipPath: `circle(720px at ${origin.x}px ${origin.y}px)` }
                      }
                      transition={{ duration: reduced || lowPower ? 0.12 : 0.28 }}
                      className="body-figure__selection"
                      d={REGION_PATHS[view][region.id]}
                      fill="var(--color-accent)"
                    />
                  )}
                </g>
              );
            })}
            <m.path
              className="body-figure__contour"
              d={OUTLINE[view]}
              pathLength="1"
              strokeDasharray="1"
              initial={{ strokeDashoffset: reduced || lowPower || !drawContour ? 0 : 1 }}
              animate={{ strokeDashoffset: 0 }}
              transition={{ duration: reduced || lowPower ? 0 : 0.9, ease: 'easeOut' }}
            />
            {visible.map((region) => {
              const count = counts[region.id];
              const anchor = region.labelAnchor[view];
              if (!anchor || count === undefined || !Number.isFinite(count) || count <= 0)
                return null;
              return (
                <g
                  key={region.id}
                  className="body-figure__badge"
                  transform={`translate(${anchor.x} ${anchor.y})`}
                >
                  <circle r="14" />
                  <text textAnchor="middle" dominantBaseline="central">
                    {count}
                  </text>
                </g>
              );
            })}
          </m.svg>
        </div>
        <div className="body-figure__regions" role="group" aria-label="Bölge seçimi">
          {visible.map((region) => {
            const count = counts[region.id];
            const showCount = count !== undefined && Number.isFinite(count) && count > 0;
            return (
              <button
                key={region.id}
                type="button"
                aria-pressed={activeRegion === region.id}
                tabIndex={tabStop === region.id ? 0 : -1}
                ref={(node) => {
                  buttonRefs.current[region.id] = node;
                }}
                onFocus={() => setFocusedRegion(region.id)}
                onKeyDown={(event) => moveFocus(event, region.id)}
                onClick={() => select(region.id)}
              >
                <span>{region.label}</span>
                {showCount && (
                  <>
                    <span className="body-figure__button-count" aria-hidden="true">
                      {count}
                    </span>
                    <span className="body-figure__sr-only">, {count} seçili belirti</span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default BodyFigure;
