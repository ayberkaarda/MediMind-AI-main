import * as m from 'motion/react-m';
import { shutter, useMotionLevel } from '../../lib/motion';

export const STALE_MESSAGE = 'Belirtiler değişti — sonuç güncel değil';

interface StaleBannerProps {
  onReassess: () => void;
  pending: boolean;
  disabled?: boolean;
}

export function StaleBanner({ onReassess, pending, disabled = false }: StaleBannerProps) {
  const level = useMotionLevel();
  return (
    <m.div
      {...shutter(level, 'fromTop')}
      role="status"
      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-2 border-ink bg-surface p-4"
    >
      <p className="text-base font-semibold">{STALE_MESSAGE}</p>
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
