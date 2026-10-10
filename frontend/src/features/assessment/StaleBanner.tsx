import * as m from 'motion/react-m';
import { useReducedMotion } from 'motion/react';

export const STALE_MESSAGE = 'Belirtiler değişti — sonuç güncel değil';

interface StaleBannerProps {
  onReassess: () => void;
  pending: boolean;
  disabled?: boolean;
}

export function StaleBanner({ onReassess, pending, disabled = false }: StaleBannerProps) {
  const reduced = useReducedMotion();
  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduced ? 0.12 : 0.15 }}
      role="status"
      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded border border-accent bg-surface-muted p-3"
    >
      <p className="text-base font-medium">{STALE_MESSAGE}</p>
      <button
        type="button"
        className="btn-secondary"
        onClick={onReassess}
        disabled={pending || disabled}
      >
        {pending ? 'Değerlendiriliyor…' : 'Yeniden değerlendir'}
      </button>
    </m.div>
  );
}
