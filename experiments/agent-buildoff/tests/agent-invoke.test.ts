import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { runAgent } from '../harness/agent-invoke.js';

const here = dirname(fileURLToPath(import.meta.url));
const fakeCli = join(here, 'fake-claude.mjs');

describe('runAgent (parses headless claude stream-json)', () => {
  it('extracts token usage, cost, and files read from the ndjson stream', async () => {
    const res = await runAgent({
      prompt: 'build f1',
      cwd: here,
      command: process.execPath,        // node
      baseArgs: [fakeCli, 'happy'],     // fake CLI scenario "happy"
    });
    expect(res.ok).toBe(true);
    expect(res.inputTokens).toBe(1000);
    expect(res.outputTokens).toBe(50);
    expect(res.costUsd).toBeCloseTo(0.25, 5);
    expect(res.numTurns).toBe(2);
    expect(res.sessionId).toBe('sess-123');
    expect(res.filesRead.sort()).toEqual(['a.ts', 'b.ts', 'c.ts']);
    expect(res.readToolCalls).toBe(5);
  });

  it('marks ok=false when no result envelope is emitted', async () => {
    const res = await runAgent({
      prompt: 'x', cwd: here, command: process.execPath, baseArgs: [fakeCli, 'noresult'],
    });
    expect(res.ok).toBe(false);
  });

  it('marks ok=false when the process exits non-zero', async () => {
    const res = await runAgent({
      prompt: 'x', cwd: here, command: process.execPath, baseArgs: [fakeCli, 'crash'],
    });
    expect(res.ok).toBe(false);
  });

  it('tolerates non-JSON noise lines without throwing', async () => {
    const res = await runAgent({
      prompt: 'x', cwd: here, command: process.execPath, baseArgs: [fakeCli, 'noisy'],
    });
    expect(res.ok).toBe(true);
    expect(res.inputTokens).toBe(1000);
  });

  it('kills a hung build on timeout and returns ok=false', async () => {
    const t0 = Date.now();
    const res = await runAgent({
      prompt: 'x', cwd: here, command: process.execPath, baseArgs: [fakeCli, 'hang'],
      timeoutMs: 400,
    });
    const elapsed = Date.now() - t0;
    expect(res.ok).toBe(false);            // never saw a result envelope
    expect(elapsed).toBeLessThan(4000);    // resolved promptly via the timeout, not the 60s hang
  });
});
