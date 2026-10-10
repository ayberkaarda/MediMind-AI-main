import * as m from 'motion/react-m';
import { AnimatePresence } from 'motion/react';
import { useId } from 'react';
import type { Ref } from 'react';
import { Icon } from '../../components/ui/Icon';
import { CLIP, DUR, EASE, UNCLIPPED, useMotionLevel } from '../../lib/motion';
import type { SymptomCatalog } from '../symptoms/catalog';
import { symptomLabel } from '../symptoms/catalog';

interface SelectionTrayProps {
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

/**
 * The selection dock: an inverted strip fixed to the bottom of the viewport.
 * Added symptoms are stamped in with a left-to-right wipe; removed ones drop out.
 * No layout animation, so neighbours simply reflow.
 */
export function SelectionTray({
  catalog,
  selected,
  onRemove,
  onClear,
  headingRef,
  pending = false,
  onEvaluate,
}: SelectionTrayProps) {
  const headingId = useId();
  const level = useMotionLevel();
  const groups = groupByRegion(catalog, selected);

  const stamp =
    level === 'full'
      ? {
          initial: { clipPath: CLIP.fromLeft },
          animate: UNCLIPPED,
          exit: { opacity: 0, y: 8, transition: { duration: DUR.fast, ease: EASE.in } },
          transition: { duration: DUR.base, ease: EASE.shutter },
        }
      : level === 'lite'
        ? {
            initial: { opacity: 0 },
            animate: { opacity: 1 },
            exit: { opacity: 0 },
            transition: { duration: DUR.fast },
          }
        : {};

  return (
    <section
      aria-labelledby={headingId}
      className="selection-tray dock screen-only safe-bottom fixed inset-x-0 bottom-0 z-40 border-t-2 border-ink"
    >
      <div className="mx-auto flex w-full max-w-shell flex-col gap-3 px-4 pt-3 md:px-8 lg:flex-row lg:items-end lg:gap-8">
        <div className="min-w-0 flex-1">
          <div className="flex min-h-row flex-wrap items-center justify-between gap-2">
            <h2 id={headingId} ref={headingRef} tabIndex={-1} className="type-section">
              Seçili belirtiler <span className="text-canvas/80">({selected.length})</span>
            </h2>
            {selected.length > 0 ? (
              <button type="button" onClick={onClear} className="btn-dock px-3 text-sm underline">
                Tümünü kaldır
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-1">
            {groups.length === 0 ? (
              <p className="pb-2 text-sm text-canvas/80">
                Henüz belirti seçmediniz. Aramaya yazın ya da vücut haritasından bir bölge seçin.
              </p>
            ) : null}
            <AnimatePresence initial={false}>
              {groups.map((group) => (
                <m.div
                  key={group.id}
                  role="group"
                  aria-label={group.label}
                  className="min-w-0 max-w-full"
                  exit={level === 'none' ? undefined : { opacity: 0 }}
                  transition={{ duration: level === 'none' ? 0 : DUR.fast }}
                >
                  <p className="pb-1 text-xs font-semibold text-canvas/80" aria-hidden="true">
                    {group.label}
                  </p>
                  <ul className="flex flex-wrap gap-2 pb-2">
                    <AnimatePresence initial={false}>
                      {group.items.map((item) => (
                        <m.li
                          key={item.id}
                          {...stamp}
                          className="flex min-h-row min-w-0 max-w-full items-center justify-between gap-1 border-2 border-canvas pl-3"
                        >
                          <span className="min-w-0 truncate font-semibold">{item.label}</span>
                          <button
                            type="button"
                            onClick={() => onRemove(item.id)}
                            aria-label={`${item.label} belirtisini kaldır`}
                            className="btn-dock min-w-row shrink-0"
                          >
                            <Icon name="close" size={18} />
                          </button>
                        </m.li>
                      ))}
                    </AnimatePresence>
                  </ul>
                </m.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
        {onEvaluate ? (
          <m.button
            type="button"
            className="btn-primary mb-1 w-full lg:mb-3 lg:w-auto lg:min-w-[16rem]"
            onClick={onEvaluate}
            disabled={selected.length === 0 || pending}
            whileTap={level === 'full' ? { scale: 0.97 } : undefined}
            transition={{ duration: DUR.tap }}
          >
            <span>{pending ? 'Değerlendiriliyor…' : 'Değerlendir'}</span>{' '}
            {!pending && selected.length > 0 ? <span>· {selected.length} belirti</span> : null}
            {pending && level !== 'none' ? (
              <m.span
                aria-hidden="true"
                className="h-2.5 w-2.5 bg-on-accent"
                animate={{ opacity: [0.25, 1, 0.25] }}
                transition={{ duration: 0.9, repeat: Infinity }}
              />
            ) : null}
          </m.button>
        ) : null}
      </div>
    </section>
  );
}
