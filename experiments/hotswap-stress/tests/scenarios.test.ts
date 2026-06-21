import { describe, it, expect } from 'vitest';
import { SCENARIOS } from '../harness/scenarios.js';

describe('scenario catalogue', () => {
  it('defines all six scenarios with unique ids', () => {
    expect(SCENARIOS).toHaveLength(6);
    const ids = SCENARIOS.map((s) => s.id);
    expect(new Set(ids).size).toBe(6);
    expect(ids).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('each scenario has a name, verifyPath, and run function', () => {
    for (const s of SCENARIOS) {
      expect(typeof s.name).toBe('string');
      expect(s.verifyPath.startsWith('/')).toBe(true);
      expect(typeof s.run).toBe('function');
    }
  });
});
