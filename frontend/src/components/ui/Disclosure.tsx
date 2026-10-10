import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import clsx from 'clsx';
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
          'flex min-h-row w-full items-center justify-between gap-3 rounded text-left text-base font-semibold text-ink',
          buttonClassName,
        )}
      >
        <span>{summary}</span>
        <Icon
          name="chevronDown"
          className={clsx(
            'shrink-0 transition-transform duration-fast ease-out',
            open && 'rotate-180',
          )}
        />
      </button>
      <div id={contentId} hidden={!open}>
        {open ? children : null}
      </div>
    </div>
  );
}
