import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SelectedSymptomList } from './SelectedSymptomList';
import { testCatalog } from '../../test/utils';

describe('SelectedSymptomList', () => {
  it('keeps remove controls inside their rows without negative right margins', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    const { container } = render(
      <SelectedSymptomList
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
    const heading = screen.getByRole('heading', { name: /Seçili belirtiler/ });
    expect(heading).toHaveAttribute('tabindex', '-1');
    await user.click(button);
    expect(onRemove).toHaveBeenCalledWith('headache');
  });
});
