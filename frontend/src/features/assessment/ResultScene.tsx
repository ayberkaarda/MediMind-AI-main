import type { ReactNode } from 'react';
import * as m from 'motion/react-m';
import { DUR, EASE, useMotionLevel } from '../../lib/motion';

/** Result scene frame: a heavy rule opens the report below the search. */
export function ResultScene({ report }: { report: ReactNode }) {
  return <div className="border-t-4 border-ink pt-8">{report}</div>;
}

/**
 * Selection-to-result transition: a saffron curtain covers the new report and
 * withdraws to the right, uncovering it in reading order. Low-power devices
 * get a short fade; reduced motion shows the report at once.
 */
export function ReportReveal({ children }: { children: ReactNode }) {
  const level = useMotionLevel();
  return (
    <div className="relative">
      {level === 'full' ? (
        <m.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 origin-right bg-accent"
          initial={{ scaleX: 1 }}
          animate={{ scaleX: 0 }}
          transition={{ duration: DUR.scene, ease: EASE.shutter, delay: 0.05 }}
        />
      ) : null}
      <m.div
        className="flex flex-col gap-10"
        initial={level === 'lite' ? { opacity: 0 } : false}
        animate={{ opacity: 1 }}
        transition={{ duration: DUR.fast }}
      >
        {children}
      </m.div>
    </div>
  );
}
