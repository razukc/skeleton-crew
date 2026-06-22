import { describe, it, expect } from 'vitest';
import { renderResults, type ExperimentResults } from '../harness/report.js';

const sample: ExperimentResults = {
  model: 'claude-opus-4-8',
  repeats: 3,
  perFeature: [
    { feature: 'f1', scrTokensMedian: 1200, monoTokensMedian: 900, scrSurface: 3, monoSurface: 5, scrForeignBreak: 0, monoForeignBreak: 0 },
    { feature: 'f2', scrTokensMedian: 1100, monoTokensMedian: 1300, scrSurface: 3, monoSurface: 7, scrForeignBreak: 0, monoForeignBreak: 1 },
  ],
  crossoverIndex: 2, // in the registered f3–f6 window → renders a sustained "Crossover"
  modification: { scrFilesOutsideTarget: 0, monoFilesOutsideTarget: 4, scrForeignBreak: 0, monoForeignBreak: 2 },
  parallel: { scrClass: 'loud-and-local', monoClass: 'silent', scrError: 'DuplicateRegistrationError', monoError: '' },
  faults: { collidingRejected: true, throwContained: true },
  predictions: [
    { claim: 'SCR cheaper by f8', predicted: 'yes', observed: 'yes', hit: true },
    { claim: 'mono blast radius grows', predicted: 'yes', observed: 'yes', hit: true },
  ],
};

describe('renderResults', () => {
  it('renders the headline sections', () => {
    const md = renderResults(sample);
    expect(md).toContain('# Agent Build-Off — Results');
    expect(md).toContain('| f1 |');
    expect(md).toContain('Crossover');
    expect(md).toContain('loud-and-local');
    expect(md).toContain('Predictions');
  });

  it('notes when there is no crossover', () => {
    const md = renderResults({ ...sample, crossoverIndex: -1 });
    expect(md).toContain('no crossover');
  });

  it('marks an out-of-window crossover as transient, not a confirmed amortization', () => {
    const md = renderResults({ ...sample, crossoverIndex: 1 }); // f2 — outside f3–f6
    expect(md).toContain('Transient crossover');
    expect(md).toContain('OUTSIDE the pre-registered f3–f6 window');
  });
});
