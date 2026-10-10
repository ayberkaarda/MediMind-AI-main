import { useReducedMotion } from 'motion/react';
import { useLowPower } from './useLowPower';

/**
 * One motion vocabulary for the whole interface: the focus window.
 * Only the frame travels (a spring); everything else answers a person's action with a short
 * fade or a few pixels of travel. Nothing loops, counts up or moves on its own.
 * CSS-only transitions read the mirrored --ease-* / --dur-* tokens in tokens.css.
 */
export const EASE = {
  /** Arrivals and fills: quick start, soft settle. */
  out: [0.2, 0, 0, 1],
} as const;

export const DUR = {
  /** The reduced path: a single short opacity change. */
  tap: 0.12,
  fast: 0.18,
  base: 0.3,
  bars: 0.6,
} as const;

/** Delay between score bars. */
export const STAGGER = 0.06;
/** Staggers stop growing after this many items so long lists never wait. */
export const STAGGER_CAP = 8;

/** The focus window gliding between figure regions. */
export const SPRING_FRAME = { type: 'spring', stiffness: 260, damping: 30 } as const;
/** The focus window travelling down to become the frame of the result heading. */
export const SPRING_RESULT = { type: 'spring', visualDuration: 0.5, bounce: 0.12 } as const;
/** Drawers and sheets. */
export const SPRING_PANEL = { type: 'spring', stiffness: 380, damping: 38 } as const;

/**
 * full: springs and short transforms.
 * reduced: reduced-motion preference, and low-power devices (data saver or four cores or
 * fewer); positions change at once and only opacity is animated.
 */
export type MotionLevel = 'full' | 'reduced';

export function useMotionLevel(): MotionLevel {
  const reduced = useReducedMotion();
  const lowPower = useLowPower();
  return reduced || lowPower ? 'reduced' : 'full';
}

export function staggerDelay(index: number, base = 0): number {
  return base + Math.min(index, STAGGER_CAP) * STAGGER;
}

/** Small items such as selection chips: 4px of travel, or opacity alone on the reduced path. */
export function enter(level: MotionLevel) {
  if (level === 'reduced') {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: DUR.tap },
    };
  }
  return {
    initial: { opacity: 0, y: 4 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 4 },
    transition: { duration: DUR.fast, ease: EASE.out },
  };
}

/**
 * The result body opening. Opacity only, so nothing shifts under the focus window while it
 * lands; the reduced path shows it at once.
 */
export function reveal(level: MotionLevel) {
  if (level === 'reduced') return {};
  return {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: DUR.base, ease: EASE.out },
  };
}
