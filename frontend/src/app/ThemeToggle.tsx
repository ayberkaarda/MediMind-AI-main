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
    <div role="group" aria-label="Tema" className="flex rounded border border-line p-0.5">
      {OPTIONS.map((option) => {
        const pressed = preference === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={pressed}
            onClick={() => setPreference(option.value)}
            className={clsx(
              'min-h-9 rounded-sm px-2 text-sm transition-colors duration-hatch sm:px-2.5',
              pressed ? 'bg-surface-muted font-medium text-ink' : 'text-ink-muted hover:text-ink',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
