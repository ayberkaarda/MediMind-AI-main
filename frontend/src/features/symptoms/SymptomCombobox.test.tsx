import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SymptomCombobox } from './SymptomCombobox';
import { foldTurkish, searchSymptoms } from './search';
import { testCatalog } from '../../test/utils';

function Harness({
  region = null,
  onAdd = () => {},
}: {
  region?: string | null;
  onAdd?: (id: string) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  return (
    <>
      <SymptomCombobox
        catalog={testCatalog}
        selected={selected}
        region={region}
        onAdd={(id) => {
          onAdd(id);
          setSelected((s) => [...s, id]);
        }}
        onClearRegion={() => {}}
      />
      <output data-testid="selected">{selected.join(',')}</output>
    </>
  );
}

describe('foldTurkish', () => {
  it('folds Turkish letters and case', () => {
    expect(foldTurkish('Baş Ağrısı')).toBe('bas agrisi');
    expect(foldTurkish('BAŞ AĞRISI')).toBe('bas agrisi');
    expect(foldTurkish('İshal')).toBe('ishal');
    expect(foldTurkish('Göğüs Ağrısı')).toBe('gogus agrisi');
    expect(foldTurkish('Yanan Işeme')).toBe('yanan iseme');
  });

  it('ranks prefix matches first', () => {
    const results = searchSymptoms(testCatalog.index, 'agri');
    expect(results[0]?.label.startsWith('Ağrı')).toBe(true);
  });
});

describe('SymptomCombobox', () => {
  it('keeps every keystroke and clears a selected query', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByRole('combobox', { name: 'Belirti ara' });
    await user.type(input, 'karin');
    expect(input).toHaveValue('karin');
    await user.keyboard('{Control>}a{/Control}{Backspace}');
    expect(input).toHaveValue('');
  });

  it('closes on Escape without restoring an older query', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByRole('combobox', { name: 'Belirti ara' });
    await user.type(input, 'karin');
    await user.keyboard('{Escape}');
    expect(input).toHaveValue('karin');
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });

  it('finds "Baş Ağrısı" from an unaccented query and selects it', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<Harness onAdd={onAdd} />);

    const input = screen.getByRole('combobox', { name: 'Belirti ara' });
    await user.type(input, 'bas agrisi');

    const listbox = screen.getByRole('listbox');
    const option = within(listbox).getByRole('option', { name: /Baş Ağrısı/ });
    await user.click(option);

    expect(onAdd).toHaveBeenCalledWith('headache');
    expect(screen.getByTestId('selected')).toHaveTextContent('headache');
    expect(input).toHaveValue('');
  });

  it('uses aria-activedescendant for keyboard highlighting and Enter selects', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<Harness onAdd={onAdd} />);

    const input = screen.getByRole('combobox', { name: 'Belirti ara' });
    await user.type(input, 'kasinti');
    await user.keyboard('{ArrowDown}');

    const activeId = input.getAttribute('aria-activedescendant');
    expect(activeId).toBeTruthy();
    expect(document.getElementById(activeId ?? '')).toHaveTextContent('Kaşıntı');

    await user.keyboard('{Enter}');
    expect(onAdd).toHaveBeenCalledWith('itching');
    expect(input).toHaveValue('');
    const selectedActiveId = input.getAttribute('aria-activedescendant');
    if (selectedActiveId) expect(document.getElementById(selectedActiveId)).not.toBeNull();
  });

  it('removes already selected symptoms from the results', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByRole('combobox', { name: 'Belirti ara' });
    await user.type(input, 'kasinti');
    await user.click(screen.getByRole('option', { name: /^Kaşıntı/ }));
    await user.type(input, 'kasinti');
    expect(screen.queryByRole('option', { name: /^Kaşıntı/ })).not.toBeInTheDocument();
  });

  it('limits results to the active region', async () => {
    const user = userEvent.setup();
    render(<Harness region="chest" />);
    const input = screen.getByRole('combobox', { name: 'Belirti ara' });
    await user.click(input);

    const options = within(screen.getByRole('listbox')).getAllByRole('option');
    const chestIds = new Set(
      testCatalog.symptoms.filter((s) => s.region === 'chest').map((s) => s.label),
    );
    expect(options).toHaveLength(chestIds.size);
    for (const option of options) expect(chestIds.has(option.textContent ?? '')).toBe(true);
    expect(screen.getByText(/bölgesiyle sınırlı/)).toBeInTheDocument();
  });

  it('announces an empty result', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(screen.getByRole('combobox', { name: 'Belirti ara' }), 'zzzz');
    expect(screen.getByText('“zzzz” ile eşleşen belirti yok.')).toBeInTheDocument();
  });
});
