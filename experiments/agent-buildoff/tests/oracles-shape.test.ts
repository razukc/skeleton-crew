import { describe, it, expect } from 'vitest';
import { ALL_ORACLES } from '../harness/oracles/index.js';
import { runOracles } from '../harness/oracle-runner.js';
import { baselineOracles } from '../harness/oracles/baseline.oracle.js';
import { buildMonoServer } from '../mono-app/src/server.js';
import { resetStore } from '../mono-app/src/store.js';

describe('frozen oracle suite shape', () => {
  it('covers every baseline and backlog feature', () => {
    const features = new Set(ALL_ORACLES.map((o) => o.feature));
    for (const f of ['members', 'tasks', 'activity', 'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8']) {
      expect(features.has(f)).toBe(true);
    }
  });

  it('every oracle has a feature, name, and run fn', () => {
    for (const o of ALL_ORACLES) {
      expect(typeof o.feature).toBe('string');
      expect(typeof o.name).toBe('string');
      expect(typeof o.run).toBe('function');
    }
  });
});

describe('baseline oracles against the live mono arm', () => {
  it('all baseline oracles pass on the seeded monolith', async () => {
    resetStore();
    const app = buildMonoServer();
    const base = await app.listen({ port: 0, host: '127.0.0.1' });
    const results = await runOracles(base, baselineOracles);
    await app.close();
    expect(results.every((r) => r.pass)).toBe(true);
  });
});
