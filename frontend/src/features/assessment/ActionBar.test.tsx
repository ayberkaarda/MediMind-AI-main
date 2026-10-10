import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ActionBar } from './ActionBar';

describe('ActionBar', () => {
  it('keeps the action and count in separate elements without live announcements', () => {
    const { rerender } = render(<ActionBar count={2} pending={false} onEvaluate={() => {}} />);
    const button = screen.getByRole('button', { name: 'Değerlendir · 2 belirti' });
    const label = within(button).getByText('Değerlendir');
    const count = within(button).getByText('· 2 belirti');
    expect(label.tagName).toBe('SPAN');
    expect(count.tagName).toBe('SPAN');
    expect(label).not.toBe(count);
    expect(button.querySelector('[aria-live]')).toBeNull();
    rerender(<ActionBar count={2} pending onEvaluate={() => {}} />);
    expect(within(button).getByText('Değerlendir')).toBeInTheDocument();
    expect(button).toBeDisabled();
  });
});
