import clsx from 'clsx';
import type { ThemePreference } from '../lib/theme';
import { useTheme } from '../lib/theme';

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'light', label: 'Açık' },
  { value: 'dark', label: 'Koyu' },
  { value: 'system', label: 'Sistem' },
];

export function ThemeToggle() {
  const { preference, setPreference } = useTheme();
  return (
    <div
      role="group"
      aria-label="Tema"
      className="flex rounded-full border border-line-strong bg-surface p-0.5"
    >
      {OPTIONS.map((option) => {
        const pressed = preference === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={pressed}
            onClick={() => setPreference(option.value)}
            className={clsx(
              'min-h-9 rounded-full px-1.5 text-sm transition-colors duration-hatch sm:px-2.5',
              pressed ? 'bg-accent font-semibold text-on-accent' : 'text-ink-muted hover:text-ink',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
