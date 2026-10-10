import type { ReactNode } from 'react';
import clsx from 'clsx';

interface StatusMessageProps {
  tone?: 'neutral' | 'error';
  children?: ReactNode;
  className?: string;
}

/** Persistent live region: keep it mounted and swap its content so announcements fire. */
export function StatusMessage({ tone = 'neutral', children, className }: StatusMessageProps) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      aria-live={tone === 'error' ? 'assertive' : 'polite'}
      className={clsx('text-sm', tone === 'error' ? 'text-error' : 'text-ink-muted', className)}
    >
      {children}
    </div>
  );
}
