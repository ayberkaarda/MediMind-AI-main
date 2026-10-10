import { useId } from 'react';
import { Icon } from '../../components/ui/Icon';
import type { SymptomCatalog } from './catalog';
import { symptomLabel } from './catalog';

interface SelectedSymptomListProps {
  catalog: SymptomCatalog | null;
  selected: readonly string[];
  onRemove: (id: string) => void;
  onClear: () => void;
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

export function SelectedSymptomList({
  catalog,
  selected,
  onRemove,
  onClear,
}: SelectedSymptomListProps) {
  const headingId = useId();
  const groups = groupByRegion(catalog, selected);

  return (
    <section aria-labelledby={headingId}>
      <div className="flex min-h-row items-center justify-between gap-4 border-b border-line">
        <h2 id={headingId} className="text-base font-medium">
          Seçili belirtiler <span className="text-ink-muted">({selected.length})</span>
        </h2>
        {selected.length > 0 ? (
          <button type="button" onClick={onClear} className="btn-quiet -mr-3 text-sm">
            Tümünü kaldır
          </button>
        ) : null}
      </div>

      {groups.length === 0 ? (
        <p className="py-4 text-sm text-ink-muted">
          Henüz belirti seçmediniz. Aramaya yazın ya da vücut haritasından bir bölge seçin.
        </p>
      ) : (
        <div>
          {groups.map((group) => (
            <div key={group.id} role="group" aria-label={group.label}>
              <p className="pb-1 pt-4 text-sm text-ink-muted" aria-hidden="true">
                {group.label}
              </p>
              <ul>
                {group.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex h-row items-center justify-between gap-3 border-b border-line last:border-b-0"
                  >
                    <span className="min-w-0 truncate">{item.label}</span>
                    <button
                      type="button"
                      onClick={() => onRemove(item.id)}
                      aria-label={`${item.label} belirtisini kaldır`}
                      className="btn-quiet -mr-3 min-w-row shrink-0 px-0"
                    >
                      <Icon name="close" size={18} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
