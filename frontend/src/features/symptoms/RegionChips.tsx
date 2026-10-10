import type { Region } from '../../lib/api/schemas';

interface RegionChipsProps {
  regions: Region[];
  activeRegion: string | null;
  counts: Record<string, number>;
  onSelect: (region: string | null) => void;
}

/** Regions without a place on the figure (skin, general) as toggle buttons. */
export function RegionChips({ regions, activeRegion, counts, onSelect }: RegionChipsProps) {
  if (regions.length === 0) return null;
  return (
    <div
      role="group"
      aria-label="Bölgesiz belirtiler"
      className="flex flex-wrap items-center gap-2"
    >
      <span className="mr-1 text-sm font-semibold">Bölgesiz:</span>
      {regions.map((region) => {
        const pressed = activeRegion === region.id;
        const count = counts[region.id] ?? 0;
        return (
          <button
            key={region.id}
            type="button"
            aria-pressed={pressed}
            onClick={() => onSelect(pressed ? null : region.id)}
            className="wipe-hover inline-flex min-h-row items-center gap-2 border-2 border-ink px-4 text-sm font-semibold text-ink"
          >
            {region.label}
            {count > 0 ? (
              <>
                <span
                  aria-hidden="true"
                  className="inline-grid h-5 min-w-5 place-items-center bg-ink px-1 text-xs font-bold text-canvas"
                >
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
