import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ThemeToggle } from './ThemeToggle';
import { THEME_KEY } from '../lib/theme';

describe('ThemeToggle', () => {
  it('defaults to the system preference and persists explicit choices', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    expect(screen.getByRole('button', { name: 'Sistem' })).toHaveAttribute('aria-pressed', 'true');
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');

    await user.click(screen.getByRole('button', { name: 'Koyu' }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(window.localStorage.getItem(THEME_KEY)).toBe('dark');

    await user.click(screen.getByRole('button', { name: 'Açık' }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    expect(window.localStorage.getItem(THEME_KEY)).toBe('light');
  });
});
