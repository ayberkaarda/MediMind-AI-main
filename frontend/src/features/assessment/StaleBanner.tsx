import { Icon } from '../../components/ui/Icon';

export const STALE_MESSAGE = 'Belirtiler değişti — sonuç güncel değil';

interface StaleBannerProps {
  onReassess: () => void;
  pending: boolean;
  disabled?: boolean;
}

export function StaleBanner({ onReassess, pending, disabled = false }: StaleBannerProps) {
  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded border border-line-strong bg-surface-muted p-4"
    >
      <p className="flex items-center gap-2 text-base font-semibold">
        <Icon name="refresh" className="shrink-0" />
        {STALE_MESSAGE}
      </p>
      <button
        type="button"
        className="btn-secondary"
        onClick={onReassess}
        disabled={pending || disabled}
      >
        {pending ? 'Değerlendiriliyor…' : 'Yeniden değerlendir'}
      </button>
    </div>
  );
}
