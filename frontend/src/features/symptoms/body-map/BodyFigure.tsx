import { useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { REGIONS } from './regions';
import type { FigureView, RegionId } from './regions';
import { OUTLINE, REGION_PATHS } from './paths';
import './BodyFigure.css';

export type { FigureView, RegionId } from './regions';
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
  const instanceId = useId();
  const patternId = `body-hatch-${instanceId.replace(/:/g, '')}`;
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
        <svg
          className="body-figure__svg"
          viewBox="0 0 320 640"
          width={figureHeight / 2}
          height={figureHeight}
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            <pattern
              id={patternId}
              patternUnits="userSpaceOnUse"
              width="6"
              height="6"
              patternTransform="rotate(45)"
            >
              <path className="body-figure__hatch" d="M0 0 H6" />
            </pattern>
          </defs>
          <path className="body-figure__silhouette" d={OUTLINE[view]} />
          {visible.map((region) => {
            const active = activeRegion === region.id;
            return (
              <g
                key={region.id}
                className="body-figure__region"
                data-active={active ? 'true' : 'false'}
                onClick={() => select(region.id)}
              >
                <path className="body-figure__hit" d={REGION_PATHS[view][region.id]} />
                {active && (
                  <path
                    className="body-figure__selection"
                    d={REGION_PATHS[view][region.id]}
                    fill={`url(#${patternId})`}
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
        </svg>
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
