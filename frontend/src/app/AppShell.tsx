import type { ReactNode } from 'react';
import { Header } from './Header';

interface AppShellProps {
  onOpenHistory: () => void;
  children: ReactNode;
}

export function AppShell({ onOpenHistory, children }: AppShellProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only-focusable screen-only fixed left-4 top-2 z-50 rounded bg-accent px-3 py-2 text-sm font-semibold text-on-accent"
      >
        Ana içeriğe geç
      </a>
      <Header onOpenHistory={onOpenHistory} />
      {children}
    </div>
  );
}
