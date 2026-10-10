import * as m from 'motion/react-m';
import { AnimatePresence } from 'motion/react';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { Ref, RefObject } from 'react';
import { Icon } from '../../components/ui/Icon';
import { enter, useMotionLevel } from '../../lib/motion';
import type { SymptomCatalog } from '../symptoms/catalog';
import { symptomLabel } from '../symptoms/catalog';

interface SelectionSummaryProps {
  catalog: SymptomCatalog | null;
  selected: readonly string[];
  onRemove: (id: string) => void;
  onClear: () => void;
  headingRef?: Ref<HTMLHeadingElement>;
  pending?: boolean;
  onEvaluate?: () => void;
}

interface Group {
  id: string;
  label: string;
  order: number;
  items: { id: string; label: string }[];
}

function groupByRegion(catalog: SymptomCatalog | null, selected: readonly string[]): Group[] {
  const groups = new Map<string, Group>();
  const collator = new Intl.Collator('tr');
  for (const id of selected) {
    const regionId = catalog?.byId.get(id)?.region ?? 'general';
    let group = groups.get(regionId);
    if (!group) {
      const region = catalog?.regions.find((r) => r.id === regionId);
      group = {
        id: regionId,
        label: region?.label ?? regionId,
        order: region?.order ?? Number.MAX_SAFE_INTEGER,
        items: [],
      };
      groups.set(regionId, group);
    }
    group.items.push({ id, label: symptomLabel(catalog, id) });
  }
  const list = [...groups.values()].sort((a, b) => a.order - b.order);
  for (const group of list) group.items.sort((a, b) => collator.compare(a.label, b.label));
  return list;
}

/** Width of the chip area, so the two-row cut is measured again after a resize. */
function useWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof ResizeObserver !== 'function') return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.round(entry.contentRect.width));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

/**
 * "Seçilenler (n)": the chosen symptoms as removable chips grouped by region, cut after two
 * rows with "+n daha · Tümünü göster", followed in the flow by the "Değerlendir" button.
 */
export function SelectionSummary({
  catalog,
  selected,
  onRemove,
  onClear,
  headingRef,
  pending = false,
  onEvaluate,
}: SelectionSummaryProps) {
  const headingId = useId();
  const level = useMotionLevel();
  const groups = groupByRegion(catalog, selected);
  const chipsRef = useRef<HTMLDivElement>(null);
  const width = useWidth(chipsRef);
  const [expanded, setExpanded] = useState(false);
  const measureKey = `${selected.join(',')}|${width}`;
  const [cut, setCut] = useState<{ key: string; count: number | null }>({
    key: '',
    count: null,
  });
  const measuring = !expanded && cut.key !== measureKey;
  const limit = expanded || measuring ? null : cut.count;

  // Measure with every chip rendered, then keep only the first two rows.
  useLayoutEffect(() => {
    if (!measuring) return;
    const chips = Array.from(chipsRef.current?.querySelectorAll<HTMLElement>('[data-chip]') ?? []);
    const rows = [...new Set(chips.map((chip) => chip.offsetTop))].sort((a, b) => a - b);
    let count: number | null = null;
    const thirdRow = rows[2];
    if (thirdRow !== undefined) {
      const firstHidden = chips.findIndex((chip) => chip.offsetTop >= thirdRow);
      // One chip gives way so the "Tümünü göster" button still fits on the second row.
      count = Math.max(1, firstHidden - 1);
    }
    setCut({ key: measureKey, count });
  }, [measuring, measureKey]);

  // Chips past the cut stay mounted but hidden, so truncation never plays exit animations.
  let position = 0;
  const indexed = groups.map((group) => ({
    ...group,
    items: group.items.map((item) => ({ ...item, index: position++ })),
  }));
  const isHidden = (index: number) => limit !== null && index >= limit;
  const hiddenCount = limit === null ? 0 : Math.max(0, selected.length - limit);

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-4 rounded border border-line bg-surface p-4 sm:p-5"
    >
      <div className="flex min-h-9 flex-wrap items-center justify-between gap-2">
        <h2 id={headingId} ref={headingRef} tabIndex={-1} className="type-heading">
          Seçilenler <span className="tabular text-ink-muted">({selected.length})</span>
        </h2>
        {selected.length > 0 ? (
          <button type="button" onClick={onClear} className="btn-quiet min-h-9 text-sm">
            Tümünü kaldır
          </button>
        ) : null}
      </div>

      {groups.length === 0 ? (
        <p className="text-sm text-ink-muted">
          Henüz belirti seçmediniz. Aramaya yazın, bir bölge seçin ya da listeden işaretleyin.
        </p>
      ) : null}
      <div
        ref={chipsRef}
        hidden={groups.length === 0}
        className="flex flex-wrap items-center gap-2"
      >
        {indexed.map((group) => (
          <div key={group.id} role="group" aria-label={group.label} className="contents">
            <span
              aria-hidden="true"
              hidden={group.items.every((item) => isHidden(item.index))}
              className="pl-1 pr-0.5 text-xs text-ink-muted"
            >
              {group.label}
            </span>
            <ul className="contents">
              <AnimatePresence initial={false}>
                {group.items.map((item) => (
                  <m.li
                    key={item.id}
                    data-chip=""
                    hidden={isHidden(item.index)}
                    {...enter(level)}
                    className="flex min-h-9 min-w-0 max-w-full items-center gap-1 rounded-full bg-block py-0.5 pl-3 pr-1"
                  >
                    <span className="min-w-0 truncate text-sm font-semibold">{item.label}</span>
                    <button
                      type="button"
                      onClick={() => onRemove(item.id)}
                      aria-label={`${item.label} belirtisini kaldır`}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-muted transition-colors duration-tap hover:bg-surface hover:text-ink"
                    >
                      <Icon name="close" size={16} />
                    </button>
                  </m.li>
                ))}
              </AnimatePresence>
            </ul>
          </div>
        ))}
        {hiddenCount > 0 ? (
          <button
            type="button"
            className="link min-h-9 px-1 text-sm"
            onClick={() => setExpanded(true)}
          >
            +{hiddenCount} daha · Tümünü göster
          </button>
        ) : null}
        {expanded && cut.count !== null ? (
          <button
            type="button"
            className="link min-h-9 px-1 text-sm"
            onClick={() => setExpanded(false)}
          >
            Daha az göster
          </button>
        ) : null}
      </div>

      {onEvaluate ? (
        <button
          type="button"
          className="btn-primary w-full sm:w-auto sm:self-start"
          onClick={onEvaluate}
          disabled={selected.length === 0 || pending}
        >
          <span>{pending ? 'Değerlendiriliyor…' : 'Değerlendir'}</span>{' '}
          {!pending && selected.length > 0 ? (
            <span className="tabular font-normal">· {selected.length} belirti</span>
          ) : null}
        </button>
      ) : null}
    </section>
  );
}
