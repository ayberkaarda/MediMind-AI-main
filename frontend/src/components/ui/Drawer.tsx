import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import * as m from 'motion/react-m';
import { AnimatePresence } from 'motion/react';
import { DUR, EASE, SPRING_PANEL, useMotionLevel } from '../../lib/motion';
import { Icon } from './Icon';

interface DrawerProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  placement?: 'side' | 'bottom';
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Modal side panel: traps focus, closes on Escape, restores focus to the opener. */
export function Drawer({
  open,
  title,
  onClose,
  children,
  footer,
  placement = 'side',
}: DrawerProps) {
  const titleId = useId();
  const level = useMotionLevel();
  const offscreen = placement === 'bottom' ? { y: '100%' } : { x: '100%' };
  const panelHidden = level === 'full' ? offscreen : { opacity: 0 };
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      opener?.focus();
    };
  }, [open]);

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const panel = panelRef.current;
    if (!open || !panel) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const nodes = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    panel.addEventListener('keydown', onKeyDown);
    return () => panel.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return createPortal(
    <AnimatePresence>
      {open ? (
        <m.div
          className="screen-only fixed inset-0 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: level === 'full' ? DUR.fast : DUR.tap, ease: EASE.out }}
        >
          <div className="absolute inset-0 bg-scrim/40" aria-hidden="true" onClick={onClose} />
          <m.div
            initial={panelHidden}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={panelHidden}
            transition={level === 'full' ? SPRING_PANEL : { duration: DUR.tap }}
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={
              placement === 'bottom'
                ? 'absolute inset-x-0 bottom-0 flex h-[70vh] flex-col rounded-t-frame bg-surface shadow-pop'
                : 'absolute inset-y-0 right-0 flex w-full max-w-[28rem] flex-col bg-surface shadow-pop'
            }
          >
            <div className="flex items-center justify-between gap-4 border-b border-line px-6 py-4">
              <h2 id={titleId} className="type-heading">
                {title}
              </h2>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                className="btn-quiet min-w-row px-0"
                aria-label="Kapat"
              >
                <Icon name="close" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>
            {footer ? (
              <div className="safe-bottom border-t border-line px-6 pt-3">{footer}</div>
            ) : null}
          </m.div>
        </m.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
