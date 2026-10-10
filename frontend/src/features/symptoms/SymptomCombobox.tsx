import { forwardRef, useId, useMemo, useState } from 'react';
import { useCombobox } from 'downshift';
import clsx from 'clsx';
import type { Symptom } from '../../lib/api/schemas';
import { Icon } from '../../components/ui/Icon';
import type { SymptomCatalog } from './catalog';
import { searchSymptoms } from './search';

const MAX_VISIBLE = 60;

interface SymptomComboboxProps {
  catalog: SymptomCatalog;
  selected: readonly string[];
  region: string | null;
  onAdd: (id: string) => void;
  onClearRegion: () => void;
  disabled?: boolean;
  limitReached?: boolean;
}

export const SymptomCombobox = forwardRef<HTMLInputElement, SymptomComboboxProps>(
  function SymptomCombobox(
    { catalog, selected, region, onAdd, onClearRegion, disabled = false, limitReached = false },
    inputRef,
  ) {
    const [inputValue, setInputValue] = useState('');
    const inputId = useId();
    const exclude = useMemo(() => new Set(selected), [selected]);
    const matches = useMemo(
      () => searchSymptoms(catalog.index, inputValue, { region, exclude }),
      [catalog.index, inputValue, region, exclude],
    );
    const items = matches.slice(0, MAX_VISIBLE);

    const { isOpen, highlightedIndex, getLabelProps, getInputProps, getMenuProps, getItemProps } =
      useCombobox<Symptom>({
        items,
        inputId,
        inputValue,
        selectedItem: null,
        itemToString: (item) => item?.label ?? '',
        itemToKey: (item) => item?.id,
        onInputValueChange: ({ inputValue: next }) => setInputValue(next ?? ''),
        onSelectedItemChange: ({ selectedItem }) => {
          if (selectedItem && !limitReached) onAdd(selectedItem.id);
        },
        stateReducer: (state, { type, changes }) => {
          switch (type) {
            case useCombobox.stateChangeTypes.InputKeyDownEnter:
            case useCombobox.stateChangeTypes.ItemClick:
              return {
                ...changes,
                isOpen: true,
                inputValue: '',
                highlightedIndex: state.highlightedIndex,
              };
            default:
              return changes;
          }
        },
      });

    const regionName = region ? catalog.regionLabel(region) : null;
    const trimmed = inputValue.trim();
    let status = '';
    if (limitReached) status = 'En fazla 17 belirti seçebilirsiniz.';
    else if (isOpen && items.length === 0) {
      status = trimmed
        ? `“${trimmed}” ile eşleşen belirti yok${regionName ? ` (${regionName} bölgesinde)` : ''}.`
        : 'Bu bölgedeki tüm belirtileri seçtiniz.';
    } else if (isOpen && trimmed) {
      status = `${matches.length} sonuç`;
    }

    return (
      <div className="relative">
        <label
          {...getLabelProps()}
          htmlFor={inputId}
          className="mb-2 block text-sm font-medium text-ink"
        >
          Belirti ara
        </label>
        <div className="relative">
          <Icon
            name="search"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
          />
          <input
            {...getInputProps({
              ref: inputRef,
              disabled: disabled || limitReached,
            })}
            type="text"
            autoComplete="off"
            spellCheck={false}
            placeholder={regionName ? `${regionName} bölgesinde ara` : 'Örneğin baş ağrısı'}
            className="field pl-10"
          />
        </div>

        {regionName ? (
          <p className="mt-2 flex flex-wrap items-center gap-x-3 text-sm text-ink-muted">
            <span>
              Liste <span className="font-medium text-ink">{regionName}</span> bölgesiyle sınırlı.
            </span>
            <button type="button" className="link text-sm" onClick={onClearRegion}>
              Tüm belirtileri göster
            </button>
          </p>
        ) : null}

        <ul
          {...getMenuProps()}
          className={clsx(
            'absolute inset-x-0 z-30 mt-1 max-h-80 overflow-y-auto rounded border border-line bg-surface py-1 shadow-drawer',
            !(isOpen && items.length > 0) && 'hidden',
          )}
        >
          {isOpen
            ? items.map((item, index) => (
                <li
                  key={item.id}
                  {...getItemProps({ item, index })}
                  className={clsx(
                    'flex min-h-row cursor-pointer items-center justify-between gap-4 px-3 text-base',
                    highlightedIndex === index && 'bg-surface-muted',
                  )}
                >
                  <span>{item.label}</span>
                  {!region ? (
                    <span className="shrink-0 text-sm text-ink-muted">
                      {catalog.regionLabel(item.region)}
                    </span>
                  ) : null}
                </li>
              ))
            : null}
          {isOpen && matches.length > MAX_VISIBLE ? (
            <li role="presentation" className="px-3 py-2 text-sm text-ink-muted">
              {matches.length - MAX_VISIBLE} sonuç daha var; aramayı daraltın.
            </li>
          ) : null}
        </ul>

        <div role="status" aria-live="polite" className="mt-2 min-h-5 text-sm text-ink-muted">
          {status}
        </div>
      </div>
    );
  },
);
