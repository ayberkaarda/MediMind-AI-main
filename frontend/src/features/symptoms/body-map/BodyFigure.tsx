import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import * as m from 'motion/react-m';
import { AnimatePresence } from 'motion/react';
import { CLIP, UNCLIPPED, DUR, EASE, SPRING_POP, useMotionLevel } from '../../../lib/motion';
import { REGIONS } from './regions';
import type { FigureView, RegionId } from './regions';
import { OUTLINE, REGION_PATHS } from './paths';
import './BodyFigure.css';

export type { FigureView, RegionId } from './regions';

/** The figure rises in once per page load; later mounts appear immediately. */
let figureShown = false;

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
  const level = useMotionLevel();
  const [rise] = useState(() => !figureShown);
  useEffect(() => {
    figureShown = true;
  }, []);
  const [origin, setOrigin] = useState({ x: 160, y: 320 });
  const [focusedRegion, setFocusedRegion] = useState<RegionId>('head_neck');
  /** Region under the pointer or keyboard focus; the index and the figure mirror each other. */
  const [hovered, setHovered] = useState<RegionId | null>(null);
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

  // Front/back switch: the figure turns edge-on and back, like a card being flipped.
  const turn =
    level === 'full'
      ? {
          initial: { scaleX: 0, opacity: 0 },
          animate: { scaleX: 1, opacity: 1 },
          exit: { scaleX: 0, opacity: 0 },
          transition: { duration: DUR.fast, ease: EASE.shutter },
        }
      : level === 'lite'
        ? {
            initial: { opacity: 0 },
            animate: { opacity: 1 },
            exit: { opacity: 0 },
            transition: { duration: DUR.fast },
          }
        : {};

  // First load: the figure is uncovered from the feet up.
  const entrance =
    rise && level === 'full'
      ? {
          initial: { clipPath: CLIP.fromBottom },
          animate: UNCLIPPED,
          transition: { duration: DUR.scene, ease: EASE.shutter, delay: 0.3 },
        }
      : rise && level === 'lite'
        ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: DUR.fast } }
        : {};

  const selectionTransition = {
    duration: level === 'full' ? DUR.base : level === 'lite' ? DUR.fast : 0,
    ease: EASE.shutter,
  };

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
        <m.div
          className="body-figure__canvas"
          style={{ width: figureHeight / 2, height: figureHeight }}
          {...entrance}
        >
          <svg
            className="body-figure__svg"
            viewBox="0 0 320 640"
            width={figureHeight / 2}
            height={figureHeight}
            aria-hidden="true"
            focusable="false"
          >
            <AnimatePresence mode="wait" initial={false}>
              <m.g key={view} {...turn}>
                <path className="body-figure__silhouette" d={OUTLINE[view]} />
                {visible.map((region) => {
                  const active = activeRegion === region.id;
                  return (
                    <g
                      key={region.id}
                      className="body-figure__region"
                      data-active={active ? 'true' : 'false'}
                      data-hover={hovered === region.id ? 'true' : 'false'}
                      onPointerEnter={() => setHovered(region.id)}
                      onPointerLeave={() => setHovered(null)}
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
                      <path className="body-figure__hover" d={REGION_PATHS[view][region.id]} />
                      {active && (
                        <m.path
                          initial={
                            level === 'full'
                              ? { clipPath: `circle(0px at ${origin.x}px ${origin.y}px)` }
                              : { opacity: level === 'none' ? 1 : 0 }
                          }
                          animate={
                            level === 'full'
                              ? { clipPath: `circle(720px at ${origin.x}px ${origin.y}px)` }
                              : { opacity: 1 }
                          }
                          transition={selectionTransition}
                          className="body-figure__selection"
                          d={REGION_PATHS[view][region.id]}
                        />
                      )}
                    </g>
                  );
                })}
                <path className="body-figure__contour" d={OUTLINE[view]} />
                {visible.map((region) => {
                  const count = counts[region.id];
                  const anchor = region.labelAnchor[view];
                  if (!anchor || count === undefined || !Number.isFinite(count) || count <= 0)
                    return null;
                  return (
                    <g key={region.id} transform={`translate(${anchor.x} ${anchor.y})`}>
                      <m.g
                        key={count}
                        className="body-figure__badge"
                        initial={level === 'full' ? { scale: 0.4, opacity: 0 } : false}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={SPRING_POP}
                      >
                        <rect x={-14} y={-14} width={28} height={28} />
                        <text textAnchor="middle" dominantBaseline="central">
                          {count}
                        </text>
                      </m.g>
                    </g>
                  );
                })}
              </m.g>
            </AnimatePresence>
          </svg>
        </m.div>
        <div
          className="body-figure__regions"
          role="group"
          aria-label="Bölge seçimi"
          onPointerLeave={() => setHovered(null)}
        >
          {visible.map((region) => {
            const count = counts[region.id];
            const showCount = count !== undefined && Number.isFinite(count) && count > 0;
            return (
              <button
                key={region.id}
                type="button"
                className="wipe-hover"
                aria-pressed={activeRegion === region.id}
                tabIndex={tabStop === region.id ? 0 : -1}
                ref={(node) => {
                  buttonRefs.current[region.id] = node;
                }}
                onPointerEnter={() => setHovered(region.id)}
                onFocus={() => {
                  setFocusedRegion(region.id);
                  setHovered(region.id);
                }}
                onBlur={() => setHovered(null)}
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
