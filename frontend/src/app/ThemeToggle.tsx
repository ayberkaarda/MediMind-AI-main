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
    <div role="group" aria-label="Tema" className="flex border-2 border-ink">
      {OPTIONS.map((option) => {
        const pressed = preference === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={pressed}
            onClick={() => setPreference(option.value)}
            className={clsx(
              'min-h-9 px-1.5 text-sm transition-colors duration-tap sm:px-2.5',
              pressed ? 'bg-ink font-bold text-canvas' : 'text-ink hover:bg-surface-muted',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
