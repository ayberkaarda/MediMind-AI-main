import type { Region } from '../../lib/api/schemas';

interface RegionChipsProps {
  regions: Region[];
  activeRegion: string | null;
  counts: Record<string, number>;
  onSelect: (region: string | null) => void;
  label: string;
  className?: string;
}

/** Text region selector: toggle chips equivalent to the figure, with the selection count. */
export function RegionChips({
  regions,
  activeRegion,
  counts,
  onSelect,
  label,
  className,
}: RegionChipsProps) {
  if (regions.length === 0) return null;
  return (
    <div
      role="group"
      aria-label={label}
      className={['flex flex-wrap gap-2', className].filter(Boolean).join(' ')}
    >
      {regions.map((region) => {
        const pressed = activeRegion === region.id;
        const count = counts[region.id] ?? 0;
        return (
          <button
            key={region.id}
            type="button"
            aria-pressed={pressed}
            onClick={() => onSelect(pressed ? null : region.id)}
            className="chip"
          >
            {region.label}
            {count > 0 ? (
              <>
                <span aria-hidden="true" className="count-badge">
                  {count}
                </span>
                <span className="sr-only">, {count} seçili belirti</span>
              </>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
