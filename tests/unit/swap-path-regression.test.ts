import { describe, it, expect, vi } from 'vitest';
import { Runtime } from '../../src/runtime.js';
import { PluginSwapError } from '../../src/types.js';
import { createFeatureFlagPlugin, FEATURE_FLAG_SERVICE } from '../../src/plugins/FeatureFlagPlugin.js';
import type { Logger, PluginDefinition, RuntimeContext } from '../../src/types.js';

// Regression suite for the 0.6.1 hot-swap fixes. Each `describe` cites the
// adversarial finding it locks down. Root cause across all three: the swap
// tracked resource ownership by id without verifying owner identity.

const mockLogger = (): Logger => ({
  debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(),
});

// ── Finding 1: v1.dispose must not delete v2's committed resources ──────────
describe('Finding 1 — dispose-after-commit does not clobber v2', () => {
  it('a service v2 re-registered survives v1.dispose unregistering the same name', async () => {
    const rt = new Runtime({ logger: mockLogger() });
    const v1: PluginDefinition = {
      name: 'svc', version: '1.0.0',
      setup(ctx: RuntimeContext) { ctx.services.register('shared', { v: 1 }); },
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
    expect(ctx.services.has('shared')).toBe(true);
    expect(ctx.services.get<{ v: number }>('shared').v).toBe(2);
    await rt.shutdown();
  });

  it('an action v2 re-registered survives a stale v1 unregister closure', async () => {
    const rt = new Runtime({ logger: mockLogger() });
    let v1Unregister: (() => void) | undefined;
    const v1: PluginDefinition = {
      name: 'act', version: '1.0.0',
      setup(ctx: RuntimeContext) {
        v1Unregister = ctx.actions.registerAction({ id: 'act:do', handler: () => 1 });
      },
      dispose() { v1Unregister?.(); },
    };
    rt.registerPlugin(v1);
    await rt.initialize();

    const v2: PluginDefinition = {
      name: 'act', version: '1.0.1',
      setup(ctx: RuntimeContext) { ctx.actions.registerAction({ id: 'act:do', handler: () => 2 }); },
    };
    await rt.swapPlugin(v2);

    const ctx = rt.getContext();
    expect(ctx.actions.hasAction('act:do')).toBe(true);
    await expect(ctx.actions.runAction('act:do')).resolves.toBe(2);
    await rt.shutdown();
  });

  it('a v1.dispose unregistering a name v2 did NOT touch still works', async () => {
    // The guard must only protect v2-owned names; a genuinely v1-only service
    // must still be torn down by v1.dispose.
    const rt = new Runtime({ logger: mockLogger() });
    const v1: PluginDefinition = {
      name: 'svc', version: '1.0.0',
      setup(ctx: RuntimeContext) {
        ctx.services.register('kept', { v: 1 });
        ctx.services.register('v1only', { gone: true });
      },
      dispose(ctx: RuntimeContext) { ctx.services.unregister('v1only'); },
    };
    rt.registerPlugin(v1);
    await rt.initialize();

    const v2: PluginDefinition = {
      name: 'svc', version: '1.0.1',
      setup(ctx: RuntimeContext) { ctx.services.register('kept', { v: 2 }); },
    };
    await rt.swapPlugin(v2);

    const ctx = rt.getContext();
    expect(ctx.services.has('kept')).toBe(true);
    // 'v1only' was not re-registered by v2 → orphan-retired at commit anyway,
    // and v1.dispose's unregister of it is a harmless no-op.
    expect(ctx.services.has('v1only')).toBe(false);
    await rt.shutdown();
  });

  it('hot-swapping the bundled FeatureFlagPlugin keeps its service live', async () => {
    const rt = new Runtime({ logger: mockLogger() });
    const v1 = createFeatureFlagPlugin({ flags: [{ key: 'x', type: 'boolean', defaultValue: true }] });
    rt.registerPlugin(v1);
    await rt.initialize();
    expect(rt.getContext().services.has(FEATURE_FLAG_SERVICE)).toBe(true);

    const v2 = { ...createFeatureFlagPlugin({ flags: [{ key: 'x', type: 'boolean', defaultValue: false }] }), version: '3.0.1' } as PluginDefinition;
    await rt.swapPlugin(v2);
    expect(rt.getContext().services.has(FEATURE_FLAG_SERVICE)).toBe(true);
    await rt.shutdown();
  });
});

// ── Finding 8: a swap must not hijack another plugin's resources ────────────
describe('Finding 8 — cross-plugin resource hijack is rejected', () => {
  async function bootAB(): Promise<Runtime> {
    const rt = new Runtime({ logger: mockLogger() });
    const a: PluginDefinition = {
      name: 'A', version: '1.0.0',
      setup(ctx: RuntimeContext) {
        ctx.actions.registerAction({ id: 'a:act', handler: () => 'A1' });
        ctx.services.register('a:svc', { who: 'A' });
        ctx.screens.registerScreen({ id: 'a:s', title: 'A', component: 'A' });
      },
    };
    const b: PluginDefinition = {
      name: 'B', version: '1.0.0',
      setup(ctx: RuntimeContext) {
        ctx.actions.registerAction({ id: 'b:act', handler: () => 'B' });
        ctx.services.register('b:svc', { who: 'B' });
        ctx.screens.registerScreen({ id: 'b:s', title: 'B', component: 'B' });
      },
    };
    rt.registerPlugin(a);
    rt.registerPlugin(b);
    await rt.initialize();
    return rt;
  }

  it('rejects a swap of A that tries to register an action B owns', async () => {
    const rt = await bootAB();
    const a2: PluginDefinition = {
      name: 'A', version: '1.0.1',
      setup(ctx: RuntimeContext) {
        ctx.actions.registerAction({ id: 'a:act', handler: () => 'A2' });
        ctx.actions.registerAction({ id: 'b:act', handler: () => 'HIJACK' });
      },
    };
    await expect(rt.swapPlugin(a2)).rejects.toBeInstanceOf(PluginSwapError);
    // B is untouched; A is untouched (atomic rollback).
    const ctx = rt.getContext();
    await expect(ctx.actions.runAction('b:act')).resolves.toBe('B');
    await expect(ctx.actions.runAction('a:act')).resolves.toBe('A1');
    await rt.shutdown();
  });

  it('rejects a swap of A that tries to register a service B owns', async () => {
    const rt = await bootAB();
    const a2: PluginDefinition = {
      name: 'A', version: '1.0.1',
      setup(ctx: RuntimeContext) { ctx.services.register('b:svc', { who: 'HIJACK' }); },
    };
    await expect(rt.swapPlugin(a2)).rejects.toBeInstanceOf(PluginSwapError);
    expect(rt.getContext().services.get<{ who: string }>('b:svc').who).toBe('B');
    await rt.shutdown();
  });

  it('rejects a swap of A that tries to register a screen B owns', async () => {
    const rt = await bootAB();
    const a2: PluginDefinition = {
      name: 'A', version: '1.0.1',
      setup(ctx: RuntimeContext) { ctx.screens.registerScreen({ id: 'b:s', title: 'HIJACK', component: 'X' }); },
    };
    await expect(rt.swapPlugin(a2)).rejects.toBeInstanceOf(PluginSwapError);
    expect(rt.getContext().screens.getScreen('b:s')?.title).toBe('B');
    await rt.shutdown();
  });

  it('still allows a swap of A to re-register A’s OWN ids (no false positive)', async () => {
    const rt = await bootAB();
    const a2: PluginDefinition = {
      name: 'A', version: '1.0.1',
      setup(ctx: RuntimeContext) {
        ctx.actions.registerAction({ id: 'a:act', handler: () => 'A2' });
        ctx.services.register('a:svc', { who: 'A2' });
        ctx.screens.registerScreen({ id: 'a:s', title: 'A2', component: 'A2' });
      },
    };
    await rt.swapPlugin(a2);
    const ctx = rt.getContext();
    await expect(ctx.actions.runAction('a:act')).resolves.toBe('A2');
    expect(ctx.services.get<{ who: string }>('a:svc').who).toBe('A2');
    expect(ctx.screens.getScreen('a:s')?.title).toBe('A2');
    await rt.shutdown();
  });
});

// ── Finding 9: validateConfig and v2.setup observe the same config ──────────
describe('Finding 9 — config snapshot is stable across a swap', () => {
  it('updateConfig during an awaited swap does not skew v2.setup vs validate', async () => {
    const rt = new Runtime<{ mode: string }>({ logger: mockLogger(), config: { mode: 'a' } });
    let validatedMode: string | undefined;
    let setupMode: string | undefined;
    const v1: PluginDefinition<{ mode: string }> = { name: 'p', version: '1.0.0', setup: () => {} };
    rt.registerPlugin(v1 as any);
    await rt.initialize();

    let releaseSetup: (() => void) | undefined;
    const v2: PluginDefinition<{ mode: string }> = {
      name: 'p', version: '1.0.1',
      validateConfig: (cfg) => { validatedMode = cfg.mode; return true; },
      setup: async (ctx) => {
        await new Promise<void>((r) => { releaseSetup = r; });
        setupMode = (ctx.config as { mode: string }).mode;
      },
    };
    const swapDone = rt.swapPlugin(v2 as any);
    while (!releaseSetup) await new Promise((r) => setTimeout(r, 0));
    rt.updateConfig({ mode: 'b' }); // host mutates config mid-swap
    releaseSetup!();
    await swapDone;

    expect(validatedMode).toBe('a');
    expect(setupMode).toBe('a'); // pinned snapshot, not the post-update 'b'
    // The live runtime config still reflects the host's update afterward.
    expect(rt.getConfig().mode).toBe('b');
    await rt.shutdown();
  });
});
