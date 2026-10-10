import clsx from 'clsx';

export const DISCLAIMER_TEXT =
  "Bu sonuç bir teşhis değildir, bir makine öğrenmesi modelinin çıktısıdır; sağlık sorununuz için hekime başvurun, acil durumda 112'yi arayın.";

export function Disclaimer({ className }: { className?: string }) {
  return (
    <p className={clsx('max-w-prose border-l-2 border-ink-muted pl-4 text-sm text-ink', className)}>
      {DISCLAIMER_TEXT}
    </p>
  );
}
