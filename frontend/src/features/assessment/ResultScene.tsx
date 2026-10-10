import type { ReactNode } from 'react';
import * as m from 'motion/react-m';
import { useReducedMotion } from 'motion/react';
import { useLowPower } from '../../lib/useLowPower';

export function ResultScene({ report }: { report: ReactNode }) {
  return <div className="mt-4 rounded-md bg-surface p-6 md:p-8">{report}</div>;
}

export function ReportReveal({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const lowPower = useLowPower();
  return (
    <m.div
      className="flex flex-col gap-8"
      initial={reduced || lowPower ? { opacity: 0 } : { clipPath: 'inset(0 0 100% 0)' }}
      animate={reduced || lowPower ? { opacity: 1 } : { clipPath: 'inset(0 0 0% 0)' }}
      transition={{ duration: reduced ? 0.15 : 0.48 }}
    >
      {children}
    </m.div>
  );
}
