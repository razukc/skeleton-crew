import { describe, it, expect } from 'vitest';
import { median, spread, cumulative, crossoverIndex } from '../harness/metrics.js';

describe('metrics', () => {
  it('median of odd and even sets', () => {
    expect(median([5, 1, 3])).toBe(3);
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  it('spread is max minus min', () => {
    expect(spread([10, 4, 7])).toBe(6);
  });

  it('cumulative sums a series', () => {
    expect(cumulative([2, 3, 5])).toEqual([2, 5, 10]);
  });

  it('crossoverIndex is the first feature index where SCR cumulative < mono cumulative', () => {
    // SCR pricier early (ceremony), cheaper later (containment)
    const scr =  [100, 90, 80, 70];   // cumulative: 100,190,270,340
    const mono = [60, 80, 120, 200];  // cumulative: 60,140,260,460
    expect(crossoverIndex(scr, mono)).toBe(3); // at index 3, 340 < 460
  });

  it('crossoverIndex returns -1 when SCR never overtakes', () => {
    expect(crossoverIndex([100, 100], [10, 10])).toBe(-1);
  });

  it('crossoverIndex ignores a sentinel (<=0) row — a failed build is not a free build', () => {
    // SCR f2 "0" is a timed-out build, not a 0-cost one. Cumulative would dip
    // below mono at index 1, but that index rests on a non-build and must be
    // skipped — preventing the false f2 crossover artifact.
    const scr =  [800, 0, 850, 840];   // f2 failed → sentinel 0
    const mono = [795, 800, 810, 580];
    expect(crossoverIndex(scr, mono)).toBe(-1);
  });

  it('crossoverIndex still fires on a legit index once both arms have real builds', () => {
    const scr =  [100, 90, 80, 70];
    const mono = [60, 80, 120, 200];
    expect(crossoverIndex(scr, mono)).toBe(3);
  });
});
