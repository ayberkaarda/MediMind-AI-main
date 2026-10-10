import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import clsx from 'clsx';
import * as m from 'motion/react-m';
import { Icon } from './Icon';
import { shutter, useMotionLevel } from '../../lib/motion';

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
  const level = useMotionLevel();

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
          'type-section flex min-h-row w-full items-center justify-between gap-3 text-left text-ink',
          buttonClassName,
        )}
      >
        <span>{summary}</span>
        <Icon
          name="chevronDown"
          className={clsx(
            'shrink-0 transition-transform duration-base ease-shutter',
            open && 'rotate-180',
          )}
        />
      </button>
      <div id={contentId} hidden={!open}>
        {open ? <m.div {...shutter(level, 'fromTop')}>{children}</m.div> : null}
      </div>
    </div>
  );
}
