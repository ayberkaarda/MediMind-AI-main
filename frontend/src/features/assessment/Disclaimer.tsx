import clsx from 'clsx';
import { Icon } from '../../components/ui/Icon';

export const DISCLAIMER_TEXT =
  "Bu sonuç bir teşhis değildir, bir makine öğrenmesi modelinin çıktısıdır; sağlık sorununuz için hekime başvurun, acil durumda 112'yi arayın.";

/** Always static: rendered outside every animated layer so it is readable from the first frame. */
export function Disclaimer({ className }: { className?: string }) {
  return (
    <div className={clsx('flex gap-3 rounded bg-surface-muted p-4 text-sm text-ink', className)}>
      <Icon name="info" className="mt-0.5 shrink-0 text-ink-muted" />
      <p>{DISCLAIMER_TEXT}</p>
    </div>
  );
}
