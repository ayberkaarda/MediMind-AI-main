import { useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { FocusFrame } from '../../assessment/FocusFrame';
import { FRAME_BOXES, REGIONS, WHOLE_FIGURE_BOX } from './regions';
import type { FigureView, RegionId } from './regions';
import { OUTLINE, REGION_PATHS } from './paths';
import './BodyFigure.css';

export type { FigureView, RegionId } from './regions';

const VIEWBOX_HEIGHT = 640;

export interface BodyFigureProps {
  view: FigureView;
  onViewChange?: (view: FigureView) => void;
  activeRegion: RegionId | null;
  /** A filter without a place on the figure (skin, general) is active. */
  wholeBodyFilter?: boolean;
  counts: Partial<Record<RegionId, number>>;
  onRegionSelect: (region: RegionId | null) => void;
  height?: number;
  /** Whether the focus window currently rests on this figure. */
  showFrame?: boolean;
  className?: string;
}

/**
 * Line figure: one 1.5px contour, no fill. Each region is a button with aria-pressed; region
 * names are read from the text chips outside the figure, which offer the same choice.
 */
export function BodyFigure({
  view,
  onViewChange,
  activeRegion,
  wholeBodyFilter = false,
  counts,
  onRegionSelect,
  height = 420,
  showFrame = false,
  className,
}: BodyFigureProps) {
  const [focusedRegion, setFocusedRegion] = useState<RegionId>('head_neck');
  const regionRefs = useRef<Partial<Record<RegionId, SVGGElement | null>>>({});
  const visible = REGIONS.filter((region) => region.views.includes(view));
  const tabStop = visible.some((region) => region.id === focusedRegion)
    ? focusedRegion
    : (visible[0]?.id ?? 'head_neck');
  const figureHeight = Number.isFinite(height) && height > 0 ? height : 420;
  const scale = figureHeight / VIEWBOX_HEIGHT;

  const framedRegion =
    activeRegion && visible.some((region) => region.id === activeRegion) ? activeRegion : null;
  const frameBox = framedRegion ? FRAME_BOXES[framedRegion] : WHOLE_FIGURE_BOX;
  const box = {
    left: Math.round(frameBox.x * scale),
    top: Math.round(frameBox.y * scale),
    width: Math.round(frameBox.width * scale),
    height: Math.round(frameBox.height * scale),
  };

  function select(region: RegionId) {
    onRegionSelect(activeRegion === region ? null : region);
  }

  function onKeyDown(event: KeyboardEvent<SVGGElement>, region: RegionId) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      select(region);
      return;
    }
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
      regionRefs.current[target.id]?.focus();
    }
  }

  return (
    <div className={['body-figure', className].filter(Boolean).join(' ')}>
      {onViewChange ? (
        <div className="segmented" role="group" aria-label="Vücut görünümü">
          {(['front', 'back'] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={view === option}
              onClick={() => onViewChange(option)}
              className="px-4"
            >
              {option === 'front' ? 'Ön' : 'Arka'}
            </button>
          ))}
        </div>
      ) : null}
      <div
        className="body-figure__canvas"
        style={{ width: figureHeight / 2, height: figureHeight }}
      >
        <svg
          className="body-figure__svg"
          viewBox="0 0 320 640"
          width={figureHeight / 2}
          height={figureHeight}
          role="group"
          aria-label="Vücut haritası"
        >
          <path className="body-figure__contour" d={OUTLINE[view]} aria-hidden="true" />
          {visible.map((region) => {
            const count = counts[region.id];
            const showCount = count !== undefined && Number.isFinite(count) && count > 0;
            const d = REGION_PATHS[view][region.id];
            return (
              <g
                key={region.id}
                ref={(node) => {
                  regionRefs.current[region.id] = node;
                }}
                role="button"
                className="body-figure__region"
                aria-pressed={activeRegion === region.id}
                aria-label={`${region.label} bölgesi${showCount ? `, ${count} seçili belirti` : ''}`}
                tabIndex={tabStop === region.id ? 0 : -1}
                onFocus={() => setFocusedRegion(region.id)}
                onKeyDown={(event) => onKeyDown(event, region.id)}
                onClick={() => select(region.id)}
              >
                <path className="body-figure__shape" d={d} />
                <path className="body-figure__focus" d={d} />
              </g>
            );
          })}
          {visible.map((region) => {
            const count = counts[region.id];
            const anchor = region.labelAnchor[view];
            if (!anchor || count === undefined || !Number.isFinite(count) || count <= 0)
              return null;
            return (
              <g
                key={`badge-${region.id}`}
                className="body-figure__badge"
                transform={`translate(${anchor.x} ${anchor.y})`}
                aria-hidden="true"
              >
                <circle r={21} />
                <text textAnchor="middle" dominantBaseline="central">
                  {count}
                </text>
              </g>
            );
          })}
        </svg>
        {showFrame ? (
          <FocusFrame box={box} active={framedRegion !== null || wholeBodyFilter} place="figure" />
        ) : null}
      </div>
    </div>
  );
}

export default BodyFigure;
