import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import clsx from 'clsx';
import * as m from 'motion/react-m';
import { useReducedMotion } from 'motion/react';
import { Icon } from './Icon';

interface DisclosureProps {
  summary: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  buttonClassName?: string;
}

export function Disclosure({
  summary,
  children,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  className,
  buttonClassName,
}: DisclosureProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const open = controlledOpen ?? uncontrolledOpen;
  const contentId = useId();
  const reduced = useReducedMotion();

  const toggle = () => {
    const next = !open;
    if (controlledOpen === undefined) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };

  return (
    <div className={className}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={toggle}
        className={clsx(
          'flex min-h-row w-full items-center justify-between gap-3 text-left text-base font-medium text-ink',
          buttonClassName,
        )}
      >
        <span>{summary}</span>
        <Icon
          name="chevronDown"
          className={clsx(
            'shrink-0 text-ink-muted transition-transform duration-disclosure',
            open && 'rotate-180',
          )}
        />
      </button>
      <m.div
        id={contentId}
        hidden={!open}
        initial={false}
        animate={{ opacity: open ? 1 : 0 }}
        transition={{ duration: reduced ? 0.12 : 0.24 }}
      >
        {open ? children : null}
      </m.div>
    </div>
  );
}
