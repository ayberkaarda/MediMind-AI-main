import * as m from 'motion/react-m';
import { AnimatePresence, useReducedMotion } from 'motion/react';
import { useId } from 'react';
import type { Ref } from 'react';
import { Icon } from '../../components/ui/Icon';
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
  const reduced = useReducedMotion();
  const groups = groupByRegion(catalog, selected);

  return (
    <section
      aria-labelledby={headingId}
      className="selection-tray screen-only safe-bottom sticky bottom-0 z-40 mt-8 rounded-md border border-line bg-surface p-4 shadow-drawer"
    >
      <div className="flex min-h-row items-center justify-between gap-4 border-b border-line">
        <h2 id={headingId} ref={headingRef} tabIndex={-1} className="text-base font-medium">
          Seçili belirtiler <span className="text-ink-muted">({selected.length})</span>
        </h2>
        {selected.length > 0 ? (
          <button type="button" onClick={onClear} className="btn-quiet text-sm">
            Tümünü kaldır
          </button>
        ) : null}
      </div>

      <div>
        {groups.length === 0 ? (
          <p className="py-4 text-sm text-ink-muted">
            Henüz belirti seçmediniz. Aramaya yazın ya da vücut haritasından bir bölge seçin.
          </p>
        ) : null}
        <AnimatePresence initial={false}>
          {groups.map((group) => (
            <m.div
              key={group.id}
              role="group"
              aria-label={group.label}
              exit={reduced ? undefined : { opacity: 0 }}
              transition={{ duration: reduced ? 0 : 0.16 }}
            >
              <p className="pb-1 pt-4 text-sm text-ink-muted" aria-hidden="true">
                {group.label}
              </p>
              <ul className="flex flex-wrap gap-2">
                <AnimatePresence>
                  {group.items.map((item) => (
                    <m.li
                      key={item.id}
                      layoutId={reduced ? undefined : `symptom-${item.id}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={reduced ? undefined : { opacity: 0, scale: 0.98 }}
                      transition={{
                        duration: reduced ? 0 : 0.16,
                        layout: { type: 'spring', bounce: 0.1, duration: reduced ? 0 : 0.38 },
                        opacity: { duration: reduced ? 0.12 : 0.16 },
                      }}
                      className="flex min-h-row items-center justify-between gap-3 rounded bg-surface-muted pl-3"
                    >
                      <span className="min-w-0 truncate">{item.label}</span>
                      <button
                        type="button"
                        onClick={() => onRemove(item.id)}
                        aria-label={`${item.label} belirtisini kaldır`}
                        className="btn-quiet min-w-row shrink-0 px-0"
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
      {onEvaluate ? (
        <m.button
          type="button"
          className="btn-primary mt-4 w-full"
          onClick={onEvaluate}
          disabled={selected.length === 0 || pending}
          whileTap={reduced ? undefined : { scale: 0.98 }}
          transition={{ duration: 0.1 }}
        >
          <span>{pending ? 'Değerlendiriliyor…' : 'Değerlendir'}</span>{' '}
          {!pending && selected.length > 0 ? <span>· {selected.length} belirti</span> : null}
          {pending && !reduced ? (
            <m.span
              aria-hidden="true"
              className="h-2 w-2 rounded-full bg-on-accent"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
          ) : null}
        </m.button>
      ) : null}
    </section>
  );
}
