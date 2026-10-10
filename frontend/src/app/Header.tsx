import { Icon } from '../components/ui/Icon';
import { ThemeToggle } from './ThemeToggle';

interface HeaderProps {
  onOpenHistory: () => void;
}

/** A quiet top line: the wordmark, the history drawer and the theme choice. */
export function Header({ onOpenHistory }: HeaderProps) {
  return (
    <header className="screen-only border-b border-line">
      <div className="mx-auto flex h-16 w-full max-w-shell items-center justify-between gap-3 px-4 md:px-8">
        <a href="/" className="inline-flex shrink-0 items-center gap-2.5 rounded text-ink">
          <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true" focusable="false">
            <rect
              x="1"
              y="1"
              width="24"
              height="24"
              rx="8"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-accent"
            />
            <circle cx="13" cy="13" r="3.5" className="fill-accent" />
          </svg>
          <span className="font-serif text-lg font-semibold sm:text-xl">MediMind</span>
        </a>
        <div className="flex items-center gap-0.5 sm:gap-3">
          <button
            type="button"
            className="btn-quiet min-w-10 px-2 text-sm sm:px-3"
            onClick={onOpenHistory}
          >
            <Icon name="history" size={18} />
            <span className="sr-only sm:not-sr-only">Geçmiş</span>
          </button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
