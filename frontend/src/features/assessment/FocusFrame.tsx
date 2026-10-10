import clsx from 'clsx';
import * as m from 'motion/react-m';
import { DUR, SPRING_FRAME, SPRING_RESULT, useMotionLevel } from '../../lib/motion';

/** Shared between the figure and the result heading, so one window travels between them. */
export const FOCUS_FRAME_ID = 'focus-frame';

interface FocusFrameProps {
  /** Pixel rectangle inside a positioned parent; without it the frame fills its parent. */
  box?: { left: number; top: number; width: number; height: number };
  /** A region or filter is chosen, or the frame holds the result heading. */
  active?: boolean;
  place: 'figure' | 'result';
  className?: string;
}

/**
 * The focus window: a soft 20px frame. It glides and scales to the chosen region and, after
 * "Değerlendir", travels down to become the frame of the result heading. The line is drawn
 * as an inset ring because the layout animation corrects ring width and corner radius while
 * it scales; a plain border would thicken mid-flight. On the reduced path the frame jumps
 * and only fades in over 120ms.
 */
export function FocusFrame({ box, active = true, place, className }: FocusFrameProps) {
  const level = useMotionLevel();
  const style = {
    borderRadius: 20,
    boxShadow: active
      ? 'inset 0 0 0 2px var(--color-accent)'
      : 'inset 0 0 0 1.5px var(--color-border-strong)',
    ...box,
  };
  const classes = clsx('focus-frame pointer-events-none absolute', !box && 'inset-0', className);

  if (level === 'full') {
    return (
      <m.div
        aria-hidden="true"
        data-testid="focus-frame"
        layoutId={FOCUS_FRAME_ID}
        className={classes}
        style={style}
        transition={{ layout: place === 'result' ? SPRING_RESULT : SPRING_FRAME }}
      />
    );
  }

  const key = box ? `${box.left}:${box.top}:${box.width}:${box.height}` : place;
  return (
    <m.div
      key={key}
      aria-hidden="true"
      data-testid="focus-frame"
      className={classes}
      style={style}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: DUR.tap }}
    />
  );
}
