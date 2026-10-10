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
      className="enter-fade flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-l-2 border-accent bg-surface-muted py-2 pl-4 pr-2"
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
    </div>
  );
}
