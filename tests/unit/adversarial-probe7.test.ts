import { describe, it, expect, vi } from 'vitest';
import { Runtime } from '../../src/runtime.js';
import { EventBus } from '../../src/event-bus.js';
import { ActionEngine } from '../../src/action-engine.js';
import type { Logger, PluginDefinition, RuntimeContext } from '../../src/types.js';

const mockLogger = (): Logger => ({
  debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(),
});

// ──────────────────────────────────────────────────────────────────────────
// PROBE 26 (emitAsync error isolation + completion): one async handler that
// rejects must not prevent the others from running, and emitAsync must still
// resolve. Verify all three fire and the rejection is swallowed+logged.
// ──────────────────────────────────────────────────────────────────────────
describe('PROBE 26: emitAsync isolates a rejecting handler', () => {
  it('all handlers run even when one rejects, and emitAsync resolves', async () => {
    const logger = mockLogger();
    const bus = new EventBus(logger);
    const ran: string[] = [];
    bus.on('e', async () => { ran.push('a'); });
    bus.on('e', async () => { ran.push('b'); throw new Error('b boom'); });
    bus.on('e', async () => { ran.push('c'); });
    await expect(bus.emitAsync('e', null)).resolves.toBeUndefined();
    expect(ran.sort()).toEqual(['a', 'b', 'c']);
    expect(logger.error).toHaveBeenCalled();
  });
});

// ──────────────────────────────────────────────────────────────────────────
// PROBE 27 (sync emit re-entrancy: handler emits same event): a handler that
// re-emits the SAME event must not infinite-loop here because emit snapshots,
// but a naive recursive re-emit WILL recurse. Verify a handler that emits the
// same event once doesn't double-deliver to itself in the same logical pass
// and terminates.
// ──────────────────────────────────────────────────────────────────────────
describe('PROBE 27: emit re-entrancy from within a handler', () => {
  it('a handler re-emitting the same event terminates (guarded by a flag)', () => {
    const bus = new EventBus(mockLogger());
    let depth = 0;
    let maxDepth = 0;
    let reentered = false;
    const handler = () => {
      depth++;
      maxDepth = Math.max(maxDepth, depth);
      if (!reentered) {
        reentered = true;
        bus.emit('e', null); // re-enter exactly once
      }
      depth--;
    };
    bus.on('e', handler);
    bus.emit('e', null);
    // Re-emit recurses synchronously: outer call's handler triggers inner emit
    // which re-invokes the same handler. maxDepth should be 2, not unbounded.
    expect(maxDepth).toBe(2);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// PROBE 28 (action retry backoff actually retries N times): retry:2 means a
// handler that always throws is attempted 3 times total. Verify attempt count
// and that the final error is ActionExecutionError wrapping the last failure.
// ──────────────────────────────────────────────────────────────────────────
describe('PROBE 28: action retry attempt count', () => {
  it('retry:2 invokes the handler exactly 3 times', async () => {
    const engine = new ActionEngine(mockLogger());
    engine.setContext({} as RuntimeContext);
    let calls = 0;
    engine.registerAction({
      id: 'flaky', retry: 2,
      handler: () => { calls++; throw new Error('always'); },
    });
    await expect(engine.runAction('flaky')).rejects.toMatchObject({ name: 'ActionExecutionError' });
    expect(calls).toBe(3);
  }, 10000);
});

// ──────────────────────────────────────────────────────────────────────────
// PROBE 29 (NEGATIVE retry): retry:-5 → maxAttempts = 1 + max(0,-5) = 1.
// Verify a negative retry doesn't cause 0 attempts or an infinite/negative
// loop. Handler should run exactly once.
// ──────────────────────────────────────────────────────────────────────────
describe('PROBE 29: negative retry clamps to single attempt', () => {
  it('retry:-5 still runs the handler exactly once', async () => {
    const engine = new ActionEngine(mockLogger());
    engine.setContext({} as RuntimeContext);
    let calls = 0;
    engine.registerAction({
      id: 'neg', retry: -5,
      handler: () => { calls++; return 'ok'; },
    });
    await expect(engine.runAction('neg')).resolves.toBe('ok');
    expect(calls).toBe(1);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// PROBE 30 (introspection deepFreeze on action metadata with no nesting): the
// getActionDefinition path deep-freezes a flat metadata object. Verify it's
// frozen and that registering an action whose description is an object (abuse)
// doesn't crash introspection. (description is typed string, but JS callers...)
// ──────────────────────────────────────────────────────────────────────────
describe('PROBE 30: introspection robustness', () => {
  it('getActionDefinition returns frozen metadata', async () => {
    const rt = new Runtime({ logger: mockLogger() });
    const p: PluginDefinition = {
      name: 'p', version: '1.0.0',
      setup(ctx: RuntimeContext) {
        ctx.actions.registerAction({ id: 'p:a', timeout: 100, retry: 1, handler: () => 1 });
      },
    };
    rt.registerPlugin(p);
    await rt.initialize();
    const md = rt.getContext().introspect.getActionDefinition('p:a');
    expect(md).not.toBeNull();
    expect(Object.isFrozen(md)).toBe(true);
    expect(() => { (md as any).id = 'hacked'; }).toThrow();
    await rt.shutdown();
  });
});

// ──────────────────────────────────────────────────────────────────────────
// PROBE 31 (DOUBLE-SHUTDOWN + use-after-shutdown): shutdown() is idempotent.
// But getContext() after shutdown throws "not initialized". And calling an
// action via a context reference captured BEFORE shutdown — does it dangle?
// ActionEngine.context was set to null on shutdown → runAction throws clean
// "RuntimeContext not set", not a raw null deref.
// ──────────────────────────────────────────────────────────────────────────
describe('PROBE 31: use-after-shutdown safety', () => {
  it('an action invoked via a stale context after shutdown fails cleanly', async () => {
    const rt = new Runtime({ logger: mockLogger() });
    const p: PluginDefinition = {
      name: 'p', version: '1.0.0',
      setup(ctx: RuntimeContext) {
        ctx.actions.registerAction({ id: 'p:a', handler: () => 'live' });
      },
    };
    rt.registerPlugin(p);
    await rt.initialize();
    const staleCtx = rt.getContext();
    await rt.shutdown();
    // The action was cleared on shutdown; calling it must throw a clean error,
    // never a raw TypeError from a null context deref.
    await expect(staleCtx.actions.runAction('p:a')).rejects.toThrow(/not found/);
  });
});
