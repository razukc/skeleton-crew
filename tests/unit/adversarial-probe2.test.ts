import { describe, it, expect, vi } from 'vitest';
import { Runtime } from '../../src/runtime.js';
import type { Logger, PluginDefinition, RuntimeContext } from '../../src/types.js';

const mockLogger = (): Logger => ({
  debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(),
});

// ──────────────────────────────────────────────────────────────────────────
// PROBE 6 (ATOMICITY HOLE): v1.dispose runs AFTER commit. If v1.dispose
// unregisters a service id that v2 re-registered (same id, kept across the
// swap), it nukes v2's freshly-committed live service. The swap is supposed
// to be atomic — v2 should be fully and solely live after commit.
// ──────────────────────────────────────────────────────────────────────────
describe('PROBE 6: v1.dispose can delete v2 service after commit', () => {
  it('service kept across swap survives v1.dispose', async () => {
    const rt = new Runtime({ logger: mockLogger() });
    const v1: PluginDefinition = {
      name: 'svc', version: '1.0.0',
      setup(ctx: RuntimeContext) { ctx.services.register('shared', { v: 1 }); },
      // A perfectly ordinary dispose: v1 cleans up the service it registered.
      dispose(ctx: RuntimeContext) { ctx.services.unregister('shared'); },
    };
    rt.registerPlugin(v1);
    await rt.initialize();

    const v2: PluginDefinition = {
      name: 'svc', version: '1.0.1',
      setup(ctx: RuntimeContext) { ctx.services.register('shared', { v: 2 }); },
    };
    await rt.swapPlugin(v2);

    const ctx = rt.getContext();
    // After an atomic swap to v2, the v2 service must be live.
    expect(ctx.services.has('shared')).toBe(true); // BUG: v1.dispose deleted it
    expect(ctx.services.get<{ v: number }>('shared').v).toBe(2);
    await rt.shutdown();
  });

  it('action kept across swap survives v1.dispose unregister', async () => {
    const rt = new Runtime({ logger: mockLogger() });
    let v1Unregister: (() => void) | undefined;
    const v1: PluginDefinition = {
      name: 'act', version: '1.0.0',
      setup(ctx: RuntimeContext) {
        v1Unregister = ctx.actions.registerAction({ id: 'act:do', handler: () => 1 });
      },
      dispose() { v1Unregister?.(); }, // v1 holds its own unregister closure
    };
    rt.registerPlugin(v1);
    await rt.initialize();

    const v2: PluginDefinition = {
      name: 'act', version: '1.0.1',
      setup(ctx: RuntimeContext) {
        ctx.actions.registerAction({ id: 'act:do', handler: () => 2 });
      },
    };
    await rt.swapPlugin(v2);

    const ctx = rt.getContext();
    expect(ctx.actions.hasAction('act:do')).toBe(true); // BUG: v1's closure killed v2's action
    await rt.shutdown();
  });
});

// ──────────────────────────────────────────────────────────────────────────
// PROBE 7 (FREEZE GUARANTEE) — Finding 4, now DOCUMENTED behavior.
// ctx.host is SHALLOW-frozen: the top-level mapping is immutable, but nested
// host values stay mutable BY DESIGN (they're live shared services). These
// tests pin the corrected contract from the runtime-context.ts docblock so a
// future change to the freeze depth is a conscious one.
// ──────────────────────────────────────────────────────────────────────────
describe('PROBE 7: host context shallow-freeze contract', () => {
  it('top-level host keys cannot be reassigned or added by a plugin', async () => {
    const rt = new Runtime({ logger: mockLogger(), hostContext: { api: { token: 'secret' } } });
    let topLevelReassign = false;
    let topLevelAdd = false;
    const p: PluginDefinition = {
      name: 'p', version: '1.0.0',
      setup(ctx: RuntimeContext) {
        try { (ctx.host as any).api = { token: 'hijacked' }; topLevelReassign = true; } catch { topLevelReassign = false; }
        try { (ctx.host as any).injected = 1; topLevelAdd = true; } catch { topLevelAdd = false; }
      },
    };
    rt.registerPlugin(p);
    await rt.initialize();
    expect(topLevelReassign).toBe(false); // top level is frozen
    expect(topLevelAdd).toBe(false);
    expect((rt.getContext().host as any).injected).toBeUndefined();
    await rt.shutdown();
  });

  it('nested host values ARE mutable by design (shared live services)', async () => {
    const sharedHostObj = { token: 'secret', nested: { count: 0 } };
    const rt = new Runtime({ logger: mockLogger(), hostContext: { api: sharedHostObj } });
    const p: PluginDefinition = {
      name: 'p', version: '1.0.0',
      setup(ctx: RuntimeContext) {
        (ctx.host.api as typeof sharedHostObj).nested.count = 999;
      },
    };
    rt.registerPlugin(p);
    await rt.initialize();
    // Documented: nested mutation succeeds and is visible to the host. Hosts
    // that need immutability must freeze the value before injecting it.
    expect(sharedHostObj.nested.count).toBe(999);
    await rt.shutdown();
  });
});

// ──────────────────────────────────────────────────────────────────────────
// PROBE 8 (SWAP ROLLBACK COMPLETENESS): if v2.setup registers a service then
// throws, the buffer is dropped and v1 stays live. Verify v2's partial
// service registration did NOT leak into the live registry.
// ──────────────────────────────────────────────────────────────────────────
describe('PROBE 8: failed v2.setup leaks nothing into live', () => {
  it('a service registered before v2.setup throws does not appear live', async () => {
    const rt = new Runtime({ logger: mockLogger() });
    const v1: PluginDefinition = {
      name: 'p', version: '1.0.0',
      setup(ctx: RuntimeContext) { ctx.services.register('v1svc', 'A'); },
    };
    rt.registerPlugin(v1);
    await rt.initialize();

    const v2: PluginDefinition = {
      name: 'p', version: '1.0.1',
      setup(ctx: RuntimeContext) {
        ctx.services.register('leaked', 'B');
        throw new Error('v2 boom');
      },
    };
    await expect(rt.swapPlugin(v2)).rejects.toThrow();

    const ctx = rt.getContext();
    expect(ctx.services.has('leaked')).toBe(false); // must not leak
    expect(ctx.services.get('v1svc')).toBe('A');     // v1 untouched
    await rt.shutdown();
  });
});

// ──────────────────────────────────────────────────────────────────────────
// PROBE 9 (CONFIG IMMUTABILITY): updateConfig merges + freezes, but the merge
// is shallow. A nested config object handed to plugins can be mutated.
// Also: getConfig returns the frozen object; verify updateConfig after a
// nested freeze doesn't throw on frozen nested values.
// ──────────────────────────────────────────────────────────────────────────
describe('PROBE 9: updateConfig shallow merge / freeze', () => {
  it('updateConfig replaces top-level keys and stays frozen', () => {
    const rt = new Runtime<{ a: number; b: number }>({
      logger: mockLogger(), config: { a: 1, b: 2 },
    });
    rt.updateConfig({ a: 10 });
    const cfg = rt.getConfig();
    expect(cfg.a).toBe(10);
    expect(cfg.b).toBe(2);
    expect(Object.isFrozen(cfg)).toBe(true);
    // Mutating the frozen config silently no-ops (strict mode would throw).
    expect(() => { (cfg as any).a = 99; }).toThrow();
  });
});
