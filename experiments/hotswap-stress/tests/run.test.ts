import { describe, it, expect } from 'vitest';
import { renderResults } from '../harness/run.js';
import type { ScenarioResult } from '../harness/scenarios.js';

describe('renderResults', () => {
  it('renders a markdown ledger with a row per scenario', () => {
    const results: ScenarioResult[] = [
      {
        id: 1, name: 'Clean swap',
        verdicts: [{ pass: true, detail: '0 server errors' }, { pass: true, detail: 'all whole' }],
        totalSamples: 1234, serverErrors: 0, p99LatencyMs: 12.5,
      },
      {
        id: 2, name: 'Throwing swap',
        verdicts: [{ pass: false, detail: '3 server-error samples' }],
        totalSamples: 1000, serverErrors: 3, p99LatencyMs: 40,
      },
    ];
    const md = renderResults(results);
    expect(md).toContain('# Hot-Swap Stress — Results');
    expect(md).toContain('Clean swap');
    expect(md).toContain('✅');
    expect(md).toContain('❌');
    expect(md).toContain('3 server-error samples');
  });

  it('reports a clean sweep with no findings', () => {
    const results: ScenarioResult[] = [
      { id: 1, name: 'Clean swap', verdicts: [{ pass: true, detail: 'ok' }], totalSamples: 10, serverErrors: 0, p99LatencyMs: 5 },
    ];
    const md = renderResults(results);
    expect(md).toContain('No new findings');
  });
});
