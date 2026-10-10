import clsx from 'clsx';

export const DISCLAIMER_TEXT =
  "Bu sonuç bir teşhis değildir, bir makine öğrenmesi modelinin çıktısıdır; sağlık sorununuz için hekime başvurun, acil durumda 112'yi arayın.";

/** Always static: rendered outside every reveal so it is readable from the first frame. */
export function Disclaimer({ className }: { className?: string }) {
  return (
    <p
      className={clsx(
        'max-w-prose border-l-4 border-uncertainty bg-surface py-3 pl-4 pr-4 text-sm font-medium text-ink',
        className,
      )}
    >
      {DISCLAIMER_TEXT}
    </p>
  );
}
