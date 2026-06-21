import { describe, it, expect } from 'vitest';
import { SwapTimeline } from '../src/swap-timeline.js';

describe('SwapTimeline', () => {
  it('records marks with monotonic offsets and classifies phases', () => {
    const tl = new SwapTimeline();
    tl.mark('swap:start');
    const tMid = tl.now();
    tl.mark('commit');
    tl.mark('dispose-done');

    // A timestamp taken between swap:start and commit is the "mid" window.
    expect(tl.phaseAt(tMid)).toBe('mid');
    // Before any mark → pre; after dispose-done → post.
    expect(tl.phaseAt(tl.startedAt() - 1)).toBe('pre');
    expect(tl.phaseAt(tl.now() + 1000)).toBe('post');
    expect(tl.marks().map((m) => m.label)).toEqual(['swap:start', 'commit', 'dispose-done']);
  });
});
