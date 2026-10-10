import { useReducedMotion } from 'motion/react';
import { useLowPower } from './useLowPower';

/**
 * One motion vocabulary for the whole interface: the "shutter".
 * Content is revealed by a clip-path wipe, panels slide on a firm spring,
 * and nothing counts up or pretends to make progress.
 * CSS-only transitions read the mirrored --ease-* / --dur-* tokens in tokens.css.
 */
export const EASE = {
  /** Arrivals: fast start, long settle. */
  out: [0.22, 1, 0.36, 1],
  /** Wipes, curtains and scene changes: symmetric and decisive. */
  shutter: [0.76, 0, 0.24, 1],
  /** Exits: leave quickly without a tail. */
  in: [0.55, 0, 1, 0.45],
} as const;

export const DUR = {
  tap: 0.12,
  fast: 0.2,
  base: 0.4,
  scene: 0.72,
} as const;

/** Delay between siblings in a staggered entrance. */
export const STAGGER = 0.045;
/** Staggers stop growing after this many items so long lists never wait. */
export const STAGGER_CAP = 8;

export const SPRING_PANEL = { type: 'spring', stiffness: 420, damping: 42, mass: 0.9 } as const;
export const SPRING_POP = { type: 'spring', stiffness: 600, damping: 26 } as const;

/**
 * full: clip-path wipes, transforms and springs.
 * lite: low-power devices get short opacity fades only.
 * none: reduced-motion preference; every change is immediate.
 */
export type MotionLevel = 'full' | 'lite' | 'none';

export function useMotionLevel(): MotionLevel {
  const reduced = useReducedMotion();
  const lowPower = useLowPower();
  if (reduced) return 'none';
  return lowPower ? 'lite' : 'full';
}

export function staggerDelay(index: number, base = 0): number {
  return base + Math.min(index, STAGGER_CAP) * STAGGER;
}

/*
 * Clip rectangles overshoot by 6% so focus outlines and descenders are
 * never cut once the wipe has finished.
 */
export const CLIP = {
  shown: 'inset(-6% -6% -6% -6%)',
  /** Hidden below its top edge; reveals downward like a dropped shutter. */
  fromTop: 'inset(-6% -6% 106% -6%)',
  /** Hidden above its bottom edge; reveals upward. */
  fromBottom: 'inset(106% -6% -6% -6%)',
  /** Hidden right of its left edge; wipes in left to right. */
  fromLeft: 'inset(-6% 106% -6% -6%)',
} as const;

/** Target for a finished wipe; the clip is removed afterwards so nothing stays clipped. */
export const UNCLIPPED = { clipPath: CLIP.shown, transitionEnd: { clipPath: 'none' } } as const;

type Direction = Exclude<keyof typeof CLIP, 'shown'>;

/** Motion props for a single shutter reveal, already adapted to the motion level. */
export function shutter(level: MotionLevel, from: Direction = 'fromTop', delay = 0) {
  if (level === 'none') return {};
  if (level === 'lite') {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      transition: { duration: DUR.fast, delay: delay / 2 },
    };
  }
  return {
    initial: { clipPath: CLIP[from] },
    animate: UNCLIPPED,
    transition: { duration: DUR.base, ease: EASE.shutter, delay },
  };
}
