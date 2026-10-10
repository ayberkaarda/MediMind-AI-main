import { Icon } from '../components/ui/Icon';
import { ThemeToggle } from './ThemeToggle';

interface HeaderProps {
  onOpenHistory: () => void;
}

export function Header({ onOpenHistory }: HeaderProps) {
  return (
    <header className="screen-only border-b border-line bg-canvas/80">
      <div className="mx-auto flex h-20 w-full max-w-shell items-center justify-between gap-2 px-4 md:px-6">
        <a
          href="/"
          className="wordmark inline-flex shrink-0 items-center gap-2 font-serif font-semibold text-ink"
        >
          <Icon name="leaf" size={26} className="text-accent" />
          MediMind
        </a>
        <div className="flex items-center gap-1 rounded-full bg-surface-muted p-1 sm:gap-2">
          <button
            type="button"
            className="btn-quiet min-w-row px-0 text-sm sm:px-3"
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
