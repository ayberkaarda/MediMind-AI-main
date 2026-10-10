import type { ReactNode } from 'react';
import { domAnimation, domMax, LazyMotion, MotionConfig } from 'motion/react';

const badgeFeatures = { renderer: domAnimation.renderer, layout: domMax.layout };

export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation}>
      <LazyMotion features={badgeFeatures}>
        <MotionConfig reducedMotion="user">{children}</MotionConfig>
      </LazyMotion>
    </LazyMotion>
  );
}
