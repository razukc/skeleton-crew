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
});
