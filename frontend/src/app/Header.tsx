import * as m from 'motion/react-m';
import { Icon } from '../components/ui/Icon';
import { DUR, EASE, useMotionLevel } from '../lib/motion';
import { ThemeToggle } from './ThemeToggle';

interface HeaderProps {
  onOpenHistory: () => void;
}

export function Header({ onOpenHistory }: HeaderProps) {
  const level = useMotionLevel();
  return (
    <header className="screen-only border-b-2 border-ink bg-canvas">
      <div className="mx-auto flex h-16 w-full max-w-shell items-center justify-between gap-2 px-4 md:px-8">
        <a
          href="/"
          className="inline-flex shrink-0 items-center gap-2 text-base text-ink sm:text-lg"
        >
          <m.span
            aria-hidden="true"
            className="block h-4 w-4 origin-bottom bg-accent outline outline-2 outline-ink sm:h-5 sm:w-5"
            initial={level === 'full' ? { scaleY: 0 } : false}
            animate={{ scaleY: 1 }}
            transition={{ duration: DUR.base, ease: EASE.shutter }}
          />
          <span className="type-wide">MediMind</span>
        </a>
        <div className="flex items-center gap-1 sm:gap-3">
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
