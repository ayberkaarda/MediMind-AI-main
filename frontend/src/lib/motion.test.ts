import { describe, expect, it } from 'vitest';
import { CLIP, STAGGER, STAGGER_CAP, UNCLIPPED, shutter, staggerDelay } from './motion';

describe('motion tokens', () => {
  it('drops every animation for reduced motion', () => {
    expect(shutter('none')).toEqual({});
  });

  it('falls back to a short fade on low-power devices', () => {
    const props = shutter('lite', 'fromLeft', 0.4);
    expect(props.initial).toEqual({ opacity: 0 });
    expect(props.animate).toEqual({ opacity: 1 });
  });

  it('wipes with clip-path and removes the clip when finished', () => {
    const props = shutter('full', 'fromBottom');
    expect(props.initial).toEqual({ clipPath: CLIP.fromBottom });
    expect(props.animate).toBe(UNCLIPPED);
    expect(UNCLIPPED.transitionEnd.clipPath).toBe('none');
  });

  it('caps staggered delays so long lists never wait', () => {
    expect(staggerDelay(2, 0.1)).toBeCloseTo(0.1 + 2 * STAGGER);
    expect(staggerDelay(500)).toBeCloseTo(STAGGER_CAP * STAGGER);
  });
});
