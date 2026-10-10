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
    <div role="group" aria-label="Tema" className="segmented">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={preference === option.value}
          onClick={() => setPreference(option.value)}
          className="px-2 text-xs sm:px-3 sm:text-sm"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
