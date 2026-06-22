import { describe, it, expect } from 'vitest';
import { chooseLanding, classifyParallel } from '../harness/phases.js';
import type { FeatureRunMetrics } from '../harness/types.js';

function run(partial: Partial<FeatureRunMetrics>): FeatureRunMetrics {
  return {
    feature: 'f1', arm: 'scr', repeat: 0,
    agent: { ok: true, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0, costUsd: 0, numTurns: 0, filesRead: [], sessionId: '' },
    filesTouched: [], oracleResults: [], featureOraclePass: false, foreignBreakage: 0, ...partial,
  };
}

describe('phases pure decisions', () => {
  it('chooseLanding picks the first run whose feature oracles pass', () => {
    const runs = [run({ repeat: 0, featureOraclePass: false }), run({ repeat: 1, featureOraclePass: true }), run({ repeat: 2, featureOraclePass: true })];
    expect(chooseLanding(runs)?.repeat).toBe(1);
  });

  it('chooseLanding returns null when no run passed (flagged by caller)', () => {
    const runs = [run({ featureOraclePass: false }), run({ featureOraclePass: false })];
    expect(chooseLanding(runs)).toBeNull();
  });

  it('classifyParallel: a duplicate-registration error is loud-and-local', () => {
    const c = classifyParallel({ bothApplied: true, errorName: 'DuplicateRegistrationError', behaviorLost: false });
    expect(c.cls).toBe('loud-and-local');
  });

  it('classifyParallel: lost behavior with no error is silent', () => {
    const c = classifyParallel({ bothApplied: true, errorName: '', behaviorLost: true });
    expect(c.cls).toBe('silent');
  });

  it('classifyParallel: clean compose is loud-and-local (no loss, no error)', () => {
    const c = classifyParallel({ bothApplied: true, errorName: '', behaviorLost: false });
    expect(c.cls).toBe('loud-and-local');
  });
});
