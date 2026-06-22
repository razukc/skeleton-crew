import { describe, it, expect } from 'vitest';
import { runOracles, summarize, type Oracle } from '../harness/oracle-runner.js';

const oracles: Oracle[] = [
  { feature: 'tasks', name: 'list ok', run: async () => ({ pass: true, detail: 'ok' }) },
  { feature: 'f1', name: 'comment ok', run: async () => ({ pass: false, detail: 'boom' }) },
  { feature: 'f2', name: 'mention ok', run: async () => ({ pass: true, detail: 'ok' }) },
];

describe('oracle-runner', () => {
  it('runs every oracle and tags results with their feature', async () => {
    const results = await runOracles('http://x', oracles);
    expect(results).toHaveLength(3);
    expect(results.find((r) => r.feature === 'f1')!.pass).toBe(false);
  });

  it('summarize computes featureOraclePass and foreignBreakage for a target', async () => {
    const results = await runOracles('http://x', oracles);
    const s = summarize(results, 'tasks');
    expect(s.featureOraclePass).toBe(true);       // tasks' own oracle passed
    expect(s.foreignBreakage).toBe(1);            // f1 broke (foreign to tasks)
  });

  it('an oracle that throws is recorded as a failure, not a crash', async () => {
    const boom: Oracle[] = [{ feature: 'x', name: 'throws', run: async () => { throw new Error('nope'); } }];
    const results = await runOracles('http://x', boom);
    expect(results[0].pass).toBe(false);
    expect(results[0].detail).toContain('nope');
  });
});
