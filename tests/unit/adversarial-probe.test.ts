import { describe, it, expect, vi } from 'vitest';
import { ServiceRegistry } from '../../src/service-registry.js';
import { runValidateConfig } from '../../src/plugin-registry.js';
import { Runtime } from '../../src/runtime.js';
import { EventBus } from '../../src/event-bus.js';
import { ActionEngine } from '../../src/action-engine.js';
import type { Logger, PluginDefinition, RuntimeContext } from '../../src/types.js';

const mockLogger = (): Logger => ({
  debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(),
});

// ──────────────────────────────────────────────────────────────────────────
// PROBE 1: ServiceRegistry.get() uses a falsy check, so a service registered
// with a falsy-but-valid value (0, false, "", NaN) is reported present by
// has() but throws "not found" on get(). Classic falsy-guard bug.
// ──────────────────────────────────────────────────────────────────────────
describe('PROBE 1: ServiceRegistry falsy service values', () => {
  it('get() should return a service registered with value 0', () => {
    const reg = new ServiceRegistry(mockLogger());
    reg.register('count', 0);
    expect(reg.has('count')).toBe(true);
    expect(reg.get('count')).toBe(0); // BUG: throws "not found"
  });

  it('get() should return a service registered with value false', () => {
    const reg = new ServiceRegistry(mockLogger());
    reg.register('flag', false);
    expect(reg.has('flag')).toBe(true);
    expect(reg.get('flag')).toBe(false); // BUG: throws "not found"
  });

  it('get() should return a service registered with empty string', () => {
    const reg = new ServiceRegistry(mockLogger());
    reg.register('label', '');
    expect(reg.get('label')).toBe(''); // BUG: throws "not found"
  });
});

// ──────────────────────────────────────────────────────────────────────────
// PROBE 2: runValidateConfig docblock claims "The helper never throws."
// But it only wraps the await in try/catch; the result.valid access is
// outside. A JS plugin whose validateConfig returns undefined / null / a
// primitive crashes with a raw TypeError instead of a clean rejection.
// ──────────────────────────────────────────────────────────────────────────
describe('PROBE 2: runValidateConfig contract — never throws', () => {
  it('handles validateConfig returning undefined without throwing', async () => {
    const plugin = {
      name: 'p', version: '1.0.0', setup: () => {},
      validateConfig: () => undefined as any,
    } as unknown as PluginDefinition;
    // Should resolve to an ok:false rejection, never throw.
    await expect(runValidateConfig(plugin, {})).resolves.toMatchObject({ ok: false });
  });

  it('handles validateConfig returning null without throwing', async () => {
    const plugin = {
      name: 'p', version: '1.0.0', setup: () => {},
      validateConfig: () => null as any,
    } as unknown as PluginDefinition;
    await expect(runValidateConfig(plugin, {})).resolves.toMatchObject({ ok: false });
  });
});

// ──────────────────────────────────────────────────────────────────────────
// PROBE 3: Combine 1+2 at the runtime level. A plugin that registers a
// service with a falsy value during setup, then a peer reads it, breaks.
// ──────────────────────────────────────────────────────────────────────────
describe('PROBE 3: falsy service across plugins at runtime', () => {
  it('peer plugin can read a service registered as 0', async () => {
    const rt = new Runtime({ logger: mockLogger() });
    let readBack: unknown = 'unset';
    const provider: PluginDefinition = {
      name: 'provider', version: '1.0.0',
      setup(ctx: RuntimeContext) { ctx.services.register('zero', 0); },
    };
    const consumer: PluginDefinition = {
      name: 'consumer', version: '1.0.0', dependencies: ['provider'],
      setup(ctx: RuntimeContext) { readBack = ctx.services.get('zero'); },
    };
    rt.registerPlugin(provider);
    rt.registerPlugin(consumer);
    await rt.initialize(); // BUG: consumer.setup throws → init rolls back
    expect(readBack).toBe(0);
    await rt.shutdown();
  });
});

// ──────────────────────────────────────────────────────────────────────────
// PROBE 4: EventBus wildcard matching. Pattern 'foo*' (no colon) should
// match 'foobar'. But does a one-handler-fires-once guarantee hold when a
// handler matches BOTH an exact subscription and a wildcard? (dedup check)
// ──────────────────────────────────────────────────────────────────────────
describe('PROBE 4: EventBus wildcard + exact dedup', () => {
  it('a handler subscribed to both exact and wildcard fires once per emit', () => {
    const bus = new EventBus(mockLogger());
    const handler = vi.fn();
    bus.on('foo:bar', handler);
    bus.on('foo:*', handler);
    bus.emit('foo:bar', null);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// PROBE 5: ActionEngine timeout=0 is treated as "no timeout" because of a
// truthy check. Documented? A handler that hangs with timeout:0 should
// arguably still be bounded, but at minimum verify current behavior.
// ──────────────────────────────────────────────────────────────────────────
describe('PROBE 5: ActionEngine unhandled rejection after timeout', () => {
  it('a handler that rejects AFTER the timeout does not crash the process', async () => {
    const engine = new ActionEngine(mockLogger());
    engine.setContext({} as RuntimeContext);
    let rejectLate!: (e: Error) => void;
    engine.registerAction({
      id: 'slow',
      timeout: 20,
      handler: () => new Promise((_, reject) => { rejectLate = reject; }),
    });
    const caught: unknown[] = [];
    const onUnhandled = (e: unknown) => caught.push(e);
    process.on('unhandledRejection', onUnhandled);
    await expect(engine.runAction('slow')).rejects.toBeDefined();
    // Now trigger the late rejection that the timeout abandoned.
    rejectLate(new Error('late boom'));
    await new Promise((r) => setTimeout(r, 50));
    process.off('unhandledRejection', onUnhandled);
    expect(caught).toEqual([]); // BUG if an unhandledRejection leaked
  });
});
