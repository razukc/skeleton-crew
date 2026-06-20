import { describe, it, expect, vi } from 'vitest';
import { Runtime } from '../../src/runtime.js';
import { EventBus } from '../../src/event-bus.js';
import type { Logger, PluginDefinition, RuntimeContext } from '../../src/types.js';

const mockLogger = (): Logger => ({
  debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(),
});

// ──────────────────────────────────────────────────────────────────────────
// PROBE 10 (EVENT-BUS UNSUB DURING EMIT): a handler that unsubscribes a
// DIFFERENT handler mid-emit. emit() snapshots into a new Set first, so this
// should be safe. Verify the snapshot actually protects iteration.
// ──────────────────────────────────────────────────────────────────────────
describe('PROBE 10: EventBus mutation during emit', () => {
  it('unsubscribing another handler mid-emit does not skip it (snapshot)', () => {
    const bus = new EventBus(mockLogger());
    const calls: string[] = [];
    let unsubB: () => void;
    const a = () => { calls.push('a'); unsubB(); };
    const b = () => { calls.push('b'); };
    bus.on('e', a);
    unsubB = bus.on('e', b);
    bus.emit('e', null);
    // Snapshot taken before invocation → b still fires this round.
    expect(calls).toEqual(['a', 'b']);
  });

  it('a handler that subscribes a new handler mid-emit does not fire it this round', () => {
    const bus = new EventBus(mockLogger());
    const calls: string[] = [];
    const a = () => {
      calls.push('a');
      bus.on('e', () => calls.push('late'));
    };
    bus.on('e', a);
    bus.emit('e', null);
    // 'late' must NOT fire this emit (it was added after snapshot).
    expect(calls).toEqual(['a']);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// PROBE 11 (CONCURRENT SWAP, DIFFERENT VERSIONS): the re-entrancy guard
// rejects same-plugin concurrent swaps. But two SEQUENTIAL awaited swaps to
// increasing versions should both succeed. And a swap to an EQUAL version
// must reject. Pin these.
// ──────────────────────────────────────────────────────────────────────────
describe('PROBE 11: swap version guards', () => {
  it('rejects concurrent swap of the same plugin', async () => {
    const rt = new Runtime({ logger: mockLogger() });
    const v1: PluginDefinition = {
      name: 'p', version: '1.0.0',
      setup: () => {},
    };
    rt.registerPlugin(v1);
    await rt.initialize();

    let resolveSetup!: () => void;
    const v2: PluginDefinition = {
      name: 'p', version: '1.0.1',
      setup: () => new Promise<void>((r) => { resolveSetup = r; }),
    };
    const v2b: PluginDefinition = {
      name: 'p', version: '1.0.2', setup: () => {},
    };

    const first = rt.swapPlugin(v2);
    // second call while first is mid-setup must reject
    await expect(rt.swapPlugin(v2b)).rejects.toThrow(/in progress/);
    resolveSetup();
    await first;
    await rt.shutdown();
  });
});

// ──────────────────────────────────────────────────────────────────────────
// PROBE 12 (DISPOSE ORDER ON FAILED SWAP RE-ENTRY): If a swap's v2.setup
// throws, swapsInFlight must be cleared so a retry can proceed. Verify the
// finally{} actually frees the lock on the error path.
// ──────────────────────────────────────────────────────────────────────────
describe('PROBE 12: swap lock released after failed setup', () => {
  it('a failed swap frees the in-flight lock so retry works', async () => {
    const rt = new Runtime({ logger: mockLogger() });
    const v1: PluginDefinition = { name: 'p', version: '1.0.0', setup: () => {} };
    rt.registerPlugin(v1);
    await rt.initialize();

    const bad: PluginDefinition = {
      name: 'p', version: '1.0.1',
      setup: () => { throw new Error('boom'); },
    };
    await expect(rt.swapPlugin(bad)).rejects.toThrow();

    // Retry with a good v2 of the same target version must NOT be blocked.
    const good: PluginDefinition = { name: 'p', version: '1.0.1', setup: vi.fn() };
    await expect(rt.swapPlugin(good)).resolves.toBeUndefined();
    await rt.shutdown();
  });
});

// ──────────────────────────────────────────────────────────────────────────
// PROBE 13 (SWAP DURING EMIT BOUNDARY — event handler v1 vs v2): docblock
// promises an event at the swap boundary fires BOTH v1 and v2 handlers,
// never neither. Hard to race deterministically; instead verify that after
// a swap, ONLY v2's handler is wired (v1's retired) — no double-fire leak.
// ──────────────────────────────────────────────────────────────────────────
describe('PROBE 13: event handlers retired correctly on swap', () => {
  it('after swap, an emit hits only v2 handler, not v1', async () => {
    const rt = new Runtime({ logger: mockLogger() });
    const hits: string[] = [];
    const v1: PluginDefinition = {
      name: 'p', version: '1.0.0',
      setup(ctx: RuntimeContext) { ctx.events.on('ping', () => hits.push('v1')); },
    };
    rt.registerPlugin(v1);
    await rt.initialize();

    const v2: PluginDefinition = {
      name: 'p', version: '1.0.1',
      setup(ctx: RuntimeContext) { ctx.events.on('ping', () => hits.push('v2')); },
    };
    await rt.swapPlugin(v2);

    rt.getContext().events.emit('ping', null);
    expect(hits).toEqual(['v2']); // v1 must be retired; no leak
    await rt.shutdown();
  });
});
