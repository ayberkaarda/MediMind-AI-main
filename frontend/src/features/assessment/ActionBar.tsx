import { symptomCountLabel } from '../../lib/format';

interface ActionBarProps {
  count: number;
  pending: boolean;
  onEvaluate: () => void;
}

/** Fixed bottom bar for the single-column layout. */
export function ActionBar({ count, pending, onEvaluate }: ActionBarProps) {
  return (
    <div className="screen-only safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface px-4 pt-3">
      <button
        type="button"
        className="btn-primary w-full"
        onClick={onEvaluate}
        disabled={count === 0 || pending}
      >
        {pending
          ? 'Değerlendiriliyor…'
          : count > 0
            ? `Değerlendir · ${symptomCountLabel(count)}`
            : 'Değerlendir'}
      </button>
    </div>
  );
}
