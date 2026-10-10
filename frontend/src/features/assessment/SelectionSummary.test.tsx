import type { ReactElement } from 'react';
import { MotionProvider } from '../../app/MotionProvider';
import { render as renderUi, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SelectionSummary } from './SelectionSummary';
import { testCatalog } from '../../test/utils';

function render(ui: ReactElement) {
  return renderUi(ui, { wrapper: MotionProvider });
}

describe('SelectionSummary', () => {
  it('shows the pending label and disables evaluation', async () => {
    render(
      <SelectionSummary
        catalog={testCatalog}
        selected={['headache']}
        onRemove={() => {}}
        onClear={() => {}}
        onEvaluate={() => {}}
        pending
      />,
    );
    expect(await screen.findByRole('button', { name: 'Değerlendiriliyor…' })).toBeDisabled();
  });

  it('keeps remove controls inside their rows without negative right margins', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    const { container } = render(
      <SelectionSummary
        catalog={testCatalog}
        selected={['headache']}
        onRemove={onRemove}
        onClear={() => {}}
      />,
    );
    const row = screen.getByRole('listitem');
    const button = within(row).getByRole('button', { name: 'Baş Ağrısı belirtisini kaldır' });
    expect(button.parentElement).toBe(row);
    expect(row).toHaveClass('flex');
    expect(button).toHaveClass('shrink-0');
    for (const element of container.querySelectorAll('[class]')) {
      expect([...element.classList].some((name) => name.includes('-mr-'))).toBe(false);
    }
    const heading = screen.getByRole('heading', { name: /Seçilenler/ });
    expect(heading).toHaveAttribute('tabindex', '-1');
    await user.click(button);
    expect(onRemove).toHaveBeenCalledWith('headache');
  });
});
