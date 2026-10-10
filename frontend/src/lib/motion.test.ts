import { describe, expect, it } from 'vitest';
import { STAGGER, STAGGER_CAP, enter, reveal, staggerDelay } from './motion';

describe('motion tokens', () => {
  it('shows the result at once on the reduced path', () => {
    expect(reveal('reduced')).toEqual({});
  });

  it('animates opacity only on the reduced path', () => {
    const props = enter('reduced');
    expect(props.initial).toEqual({ opacity: 0 });
    expect(props.animate).toEqual({ opacity: 1 });
    expect(props.exit).toEqual({ opacity: 0 });
  });

  it('moves chips by four pixels at full motion', () => {
    const props = enter('full');
    expect(props.initial).toEqual({ opacity: 0, y: 4 });
    expect(props.animate).toEqual({ opacity: 1, y: 0 });
  });

  it('caps staggered delays so long lists never wait', () => {
    expect(staggerDelay(2, 0.1)).toBeCloseTo(0.1 + 2 * STAGGER);
    expect(staggerDelay(500)).toBeCloseTo(STAGGER_CAP * STAGGER);
  });
});
