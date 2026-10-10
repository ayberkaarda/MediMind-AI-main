import type { ReactNode } from 'react';
import { domMax, LazyMotion, MotionConfig } from 'motion/react';

/** domMax carries the layout features the shared focus window needs. */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domMax} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
