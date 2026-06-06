import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Runtime } from '../../src/runtime.js';
import { PluginSwapError } from '../../src/types.js';
import type { PluginDefinition, RuntimeContext } from '../../src/types.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makePlugin(
  name: string,
  version: string,
  overrides: Partial<PluginDefinition> = {}
): PluginDefinition {
  return { name, version, setup: vi.fn(), ...overrides };
}

async function bootWithPlugin(plugin: PluginDefinition): Promise<Runtime> {
  const rt = new Runtime({ logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } });
  rt.registerPlugin(plugin);
  await rt.initialize();
  return rt;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('plugin hot-swap', () => {
  it('successfully swaps a plugin and calls setup on the new version', async () => {
    const v1 = makePlugin('my-plugin', '1.0.0');
    const rt = await bootWithPlugin(v1);

    const v2Setup = vi.fn();
    const v2 = makePlugin('my-plugin', '1.0.1', { setup: v2Setup });

    await rt.swapPlugin(v2);

    expect(v2Setup).toHaveBeenCalledOnce();
  });

  // Behavior change in 0.6.0: v1.dispose now runs AFTER v2.setup commits.
  // Atomic swap means v1 stays fully live during v2.setup; dispose is the
  // post-commit hook that lets v1 release external handles (db connections,
  // file watchers) once it's no longer serving. See swapPlugin docblock.
  it('calls dispose on the old plugin AFTER setting up the new one (0.6)', async () => {
    const order: string[] = [];
    const v1 = makePlugin('my-plugin', '1.0.0', {
      setup: vi.fn(),
      dispose: vi.fn(() => { order.push('dispose-v1'); })
    });
    const rt = await bootWithPlugin(v1);

    const v2 = makePlugin('my-plugin', '1.0.1', {
      setup: vi.fn(() => { order.push('setup-v2'); })
    });

    await rt.swapPlugin(v2);

    expect(order).toEqual(['setup-v2', 'dispose-v1']);
  });

  it('unregisters old plugin actions before new setup', async () => {
    const rt = new Runtime({ logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } });
    const v1 = makePlugin('my-plugin', '1.0.0', {
      setup(ctx: RuntimeContext) {
        ctx.actions.registerAction({ id: 'my-plugin:action', handler: () => 'v1' });
      }
    });
    rt.registerPlugin(v1);
    await rt.initialize();

    const ctx = rt.getContext();
    expect(ctx.actions.hasAction('my-plugin:action')).toBe(true);

    const v2 = makePlugin('my-plugin', '1.0.1', {
      setup(ctx: RuntimeContext) {
        ctx.actions.registerAction({ id: 'my-plugin:action', handler: () => 'v2' });
      }
    });

    await rt.swapPlugin(v2);

    // Action should still exist but now be the v2 handler
    expect(ctx.actions.hasAction('my-plugin:action')).toBe(true);
    const result = await ctx.actions.runAction('my-plugin:action');
    expect(result).toBe('v2');
  });

  it('unregisters old plugin services before new setup', async () => {
    const rt = new Runtime({ logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } });
    const v1 = makePlugin('my-plugin', '1.0.0', {
      setup(ctx: RuntimeContext) {
        ctx.services.register('my-svc', { version: 'v1' });
      }
    });
    rt.registerPlugin(v1);
    await rt.initialize();

    const v2 = makePlugin('my-plugin', '1.0.1', {
      setup(ctx: RuntimeContext) {
        ctx.services.register('my-svc', { version: 'v2' });
      }
    });

    await rt.swapPlugin(v2);

    const ctx = rt.getContext();
    expect(ctx.services.get<{ version: string }>('my-svc').version).toBe('v2');
  });

  it('throws PluginSwapError when runtime is not initialized', async () => {
    const rt = new Runtime();
    rt.registerPlugin(makePlugin('my-plugin', '1.0.0'));

    await expect(rt.swapPlugin(makePlugin('my-plugin', '1.0.1')))
      .rejects.toThrow(PluginSwapError);
  });

  it('throws PluginSwapError when plugin is not registered', async () => {
    const rt = new Runtime({ logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } });
    rt.registerPlugin(makePlugin('other-plugin', '1.0.0'));
    await rt.initialize();

    await expect(rt.swapPlugin(makePlugin('unknown-plugin', '1.0.1')))
      .rejects.toThrow(PluginSwapError);
  });

  it('throws PluginSwapError when new version is the same', async () => {
    const rt = await bootWithPlugin(makePlugin('my-plugin', '1.0.0'));

    await expect(rt.swapPlugin(makePlugin('my-plugin', '1.0.0')))
      .rejects.toThrow(PluginSwapError);
  });

  it('throws PluginSwapError when new version is a downgrade', async () => {
    const rt = await bootWithPlugin(makePlugin('my-plugin', '2.0.0'));

    await expect(rt.swapPlugin(makePlugin('my-plugin', '1.9.9')))
      .rejects.toThrow(PluginSwapError);
  });

  // Behavior change in 0.6.0: a failed v2.setup is a TRUE no-op. v1's
  // resources stay live because the buffered context never touched them.
  // (0.5.0 tore v1 down before attempting v2.setup, so this test asserted
  // 'gone' — the v1 action was a casualty of the residual window. With
  // true atomic swap, v1's action stays.)
  it('throws PluginSwapError and leaves v1 fully live when new plugin setup fails (0.6)', async () => {
    const rt = new Runtime({ logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } });
    const v1 = makePlugin('my-plugin', '1.0.0', {
      setup(ctx: RuntimeContext) {
        ctx.actions.registerAction({ id: 'my-plugin:stable', handler: () => 'stable' });
      }
    });
    rt.registerPlugin(v1);
    await rt.initialize();

    const v2 = makePlugin('my-plugin', '1.0.1', {
      setup: vi.fn(() => { throw new Error('setup exploded'); })
    });

    await expect(rt.swapPlugin(v2)).rejects.toThrow(PluginSwapError);

    // v1's action survives: atomicity guarantee.
    const ctx = rt.getContext();
    expect(ctx.actions.hasAction('my-plugin:stable')).toBe(true);
    expect(await ctx.actions.runAction('my-plugin:stable')).toBe('stable');
  });

  it('emits plugin:swapped event with correct payload', async () => {
    const rt = await bootWithPlugin(makePlugin('my-plugin', '1.0.0'));
    const ctx = rt.getContext();

    const swapEvents: unknown[] = [];
    ctx.events.on('plugin:swapped', (data) => swapEvents.push(data));

    await rt.swapPlugin(makePlugin('my-plugin', '2.0.0'));

    expect(swapEvents).toHaveLength(1);
    expect(swapEvents[0]).toEqual({
      name: 'my-plugin',
      previousVersion: '1.0.0',
      newVersion: '2.0.0'
    });
  });

  it('runs config validation on new plugin before setup', async () => {
    const rt = new Runtime<Record<string, unknown>>({
      config: { apiKey: 'valid-key' },
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }
    });
    rt.registerPlugin(makePlugin('my-plugin', '1.0.0'));
    await rt.initialize();

    const v2Setup = vi.fn();
    const v2: PluginDefinition = {
      name: 'my-plugin',
      version: '1.0.1',
      validateConfig: vi.fn(() => ({ valid: false, errors: ['apiKey is invalid'] })),
      setup: v2Setup
    };

    await expect(rt.swapPlugin(v2)).rejects.toThrow(PluginSwapError);
    expect(v2Setup).not.toHaveBeenCalled();
  });

  it('ctx.plugins.isInitialized() returns true after a successful swap', async () => {
    const rt = await bootWithPlugin(makePlugin('my-plugin', '1.0.0'));
    const ctx = rt.getContext();

    await rt.swapPlugin(makePlugin('my-plugin', '1.1.0'));

    expect(ctx.plugins.isInitialized('my-plugin')).toBe(true);
  });

  it('introspect.getPluginDefinition() returns new version after swap', async () => {
    const rt = await bootWithPlugin(makePlugin('my-plugin', '1.0.0'));
    const ctx = rt.getContext();

    await rt.swapPlugin(makePlugin('my-plugin', '3.0.0'));

    expect(ctx.introspect.getPluginDefinition('my-plugin')?.version).toBe('3.0.0');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Atomic swap (0.6.0): true atomicity around v2.setup. v1 stays fully live
// for the duration of v2.setup; failure of v2.setup is a no-op. On success,
// commitSwapBuffer flips the buffer to live in one synchronous batch,
// plugin:swapped fires, then v1.dispose runs.
// ─────────────────────────────────────────────────────────────────────────────
describe('atomic swap (0.6)', () => {
  // (1) v2.setup throws → v1's action, screen, service, and event handler
  // all still serve. This is the deferred reproducer scaled up.
  it('v2.setup throwing leaves all four v1 resource types intact', async () => {
    const tick = vi.fn();
    const rt = new Runtime({ logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } });
    rt.registerPlugin({
      name: 'p',
      version: '1.0.0',
      setup(ctx: RuntimeContext) {
        ctx.actions.registerAction({ id: 'p:hello', handler: () => 'v1' });
        ctx.screens.registerScreen({ id: 'p:home', title: 'home', component: 'Home' });
        ctx.services.register('p:svc', { tag: 'v1' });
        ctx.events.on('tick', tick);
      },
    });
    await rt.initialize();

    const v2: PluginDefinition = {
      name: 'p',
      version: '1.0.1',
      setup: () => { throw new Error('boom'); },
    };
    await expect(rt.swapPlugin(v2)).rejects.toThrow(PluginSwapError);

    const ctx = rt.getContext();
    expect(ctx.actions.hasAction('p:hello')).toBe(true);
    expect(await ctx.actions.runAction('p:hello')).toBe('v1');
    expect(ctx.screens.getScreen('p:home')?.title).toBe('home');
    expect(ctx.services.get<{ tag: string }>('p:svc').tag).toBe('v1');

    ctx.events.emit('tick');
    expect(tick).toHaveBeenCalledOnce();
  });

  // (2) v2.setup succeeds with the same id as v1 → live registry has v2's def.
  // Already covered by 'unregisters old plugin actions before new setup' above,
  // but re-asserted here with explicit replaceAtomic semantics.
  it('v2 re-registering an id v1 owned replaces it atomically', async () => {
    const rt = new Runtime({ logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } });
    rt.registerPlugin({
      name: 'p',
      version: '1.0.0',
      setup(ctx: RuntimeContext) {
        ctx.actions.registerAction({ id: 'p:greet', handler: () => 'v1' });
      },
    });
    await rt.initialize();

    await rt.swapPlugin({
      name: 'p',
      version: '1.0.1',
      setup(ctx: RuntimeContext) {
        ctx.actions.registerAction({ id: 'p:greet', handler: () => 'v2' });
      },
    });

    expect(await rt.getContext().actions.runAction('p:greet')).toBe('v2');
  });

  // (3) v2.setup omits an id v1 had → retired on commit (Q1).
  it('v2 omitting an id v1 had retires it on commit', async () => {
    const rt = new Runtime({ logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } });
    rt.registerPlugin({
      name: 'p',
      version: '1.0.0',
      setup(ctx: RuntimeContext) {
        ctx.actions.registerAction({ id: 'p:a', handler: () => 'a' });
        ctx.actions.registerAction({ id: 'p:b', handler: () => 'b' });
      },
    });
    await rt.initialize();

    await rt.swapPlugin({
      name: 'p',
      version: '1.0.1',
      setup(ctx: RuntimeContext) {
        ctx.actions.registerAction({ id: 'p:a', handler: () => 'a-v2' });
        // p:b omitted on purpose
      },
    });

    const ctx = rt.getContext();
    expect(ctx.actions.hasAction('p:a')).toBe(true);
    expect(ctx.actions.hasAction('p:b')).toBe(false);
  });

  // (4) v2.setup calls ctx.services.get('v1Svc') during setup → returns v1's.
  it('v2 reads a v1-owned service via live fallback', async () => {
    let seenFromV2: unknown;
    const rt = new Runtime({ logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } });
    rt.registerPlugin({
      name: 'p',
      version: '1.0.0',
      setup(ctx: RuntimeContext) {
        ctx.services.register('cfg', { from: 'v1' });
      },
    });
    await rt.initialize();

    await rt.swapPlugin({
      name: 'p',
      version: '1.0.1',
      setup(ctx: RuntimeContext) {
        seenFromV2 = ctx.services.get('cfg');
      },
    });

    expect(seenFromV2).toEqual({ from: 'v1' });
  });

  // (5) v2 buffer-first: v2 re-registers 'cfg' then reads it inside setup.
  it('v2 reading its own freshly-registered service sees the buffered value', async () => {
    let seen: unknown;
    const rt = new Runtime({ logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } });
    rt.registerPlugin({
      name: 'p',
      version: '1.0.0',
      setup(ctx: RuntimeContext) {
        ctx.services.register('cfg', { from: 'v1' });
      },
    });
    await rt.initialize();

    await rt.swapPlugin({
      name: 'p',
      version: '1.0.1',
      setup(ctx: RuntimeContext) {
        ctx.services.register('cfg', { from: 'v2' });
        seen = ctx.services.get('cfg');
      },
    });

    expect(seen).toEqual({ from: 'v2' });
  });

  // (6) Explicit buffered services.unregister: success commits the removal,
  // failure leaves v1's service in place.
  it('v2 explicit services.unregister commits on success, rolls back on failure', async () => {
    const baseV1 = (): PluginDefinition => ({
      name: 'p',
      version: '1.0.0',
      setup(ctx: RuntimeContext) {
        ctx.services.register('cfg', { from: 'v1' });
      },
    });

    // success: removal commits
    {
      const rt = new Runtime({ logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } });
      rt.registerPlugin(baseV1());
      await rt.initialize();
      await rt.swapPlugin({
        name: 'p',
        version: '1.0.1',
        setup(ctx: RuntimeContext) { ctx.services.unregister('cfg'); },
      });
      expect(rt.getContext().services.has('cfg')).toBe(false);
    }

    // failure: removal rolls back
    {
      const rt = new Runtime({ logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } });
      rt.registerPlugin(baseV1());
      await rt.initialize();
      await expect(rt.swapPlugin({
        name: 'p',
        version: '1.0.1',
        setup(ctx: RuntimeContext) {
          ctx.services.unregister('cfg');
          throw new Error('boom');
        },
      })).rejects.toThrow(PluginSwapError);
      expect(rt.getContext().services.has('cfg')).toBe(true);
      expect(rt.getContext().services.get<{ from: string }>('cfg').from).toBe('v1');
    }
  });

  // (7) Event emitted during v2.setup → v1's handler fires (Q4).
  it('events emitted during v2.setup are handled by v1', async () => {
    const v1Handler = vi.fn();
    const rt = new Runtime({ logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } });
    rt.registerPlugin({
      name: 'p',
      version: '1.0.0',
      setup(ctx: RuntimeContext) {
        ctx.events.on('tick', v1Handler);
      },
    });
    await rt.initialize();

    await rt.swapPlugin({
      name: 'p',
      version: '1.0.1',
      setup(ctx: RuntimeContext) {
        ctx.events.emit('tick', { from: 'v2-setup' });
      },
    });

    expect(v1Handler).toHaveBeenCalledOnce();
    expect(v1Handler).toHaveBeenCalledWith({ from: 'v2-setup' });
  });

  // (8) v2 subscribing to a topic during setup does NOT receive events
  // emitted in the same setup — subscriptions are buffered until commit.
  it("v2's own events.on doesn't activate until commit (subscription buffered)", async () => {
    const v2Handler = vi.fn();
    const rt = new Runtime({ logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } });
    rt.registerPlugin({ name: 'p', version: '1.0.0', setup: vi.fn() });
    await rt.initialize();

    await rt.swapPlugin({
      name: 'p',
      version: '1.0.1',
      setup(ctx: RuntimeContext) {
        ctx.events.on('tick', v2Handler);
        ctx.events.emit('tick', { phase: 'during-setup' });
      },
    });
    expect(v2Handler).not.toHaveBeenCalled();

    // After commit, v2's subscription is live.
    rt.getContext().events.emit('tick', { phase: 'post-commit' });
    expect(v2Handler).toHaveBeenCalledOnce();
    expect(v2Handler).toHaveBeenCalledWith({ phase: 'post-commit' });
  });

  // (9) v1.dispose runs AFTER plugin:swapped event (Q3 order).
  it('plugin:swapped fires before v1.dispose runs', async () => {
    const order: string[] = [];
    const rt = new Runtime({ logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } });
    rt.registerPlugin({
      name: 'p',
      version: '1.0.0',
      setup: vi.fn(),
      dispose: () => { order.push('dispose-v1'); },
    });
    await rt.initialize();
    rt.getContext().events.on('plugin:swapped', () => { order.push('swapped-event'); });

    await rt.swapPlugin({ name: 'p', version: '1.0.1', setup: vi.fn() });

    expect(order).toEqual(['swapped-event', 'dispose-v1']);
  });

  // (10) Concurrent swap of different plugins → both succeed without crossover.
  it('concurrent swaps of different plugins both commit without interference', async () => {
    const rt = new Runtime({ logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } });
    rt.registerPlugin({
      name: 'a',
      version: '1.0.0',
      setup(ctx: RuntimeContext) {
        ctx.actions.registerAction({ id: 'a:do', handler: () => 'a-v1' });
      },
    });
    rt.registerPlugin({
      name: 'b',
      version: '1.0.0',
      setup(ctx: RuntimeContext) {
        ctx.actions.registerAction({ id: 'b:do', handler: () => 'b-v1' });
      },
    });
    await rt.initialize();

    const yieldOnce = () => new Promise<void>(r => setTimeout(r, 5));
    const [resA, resB] = await Promise.allSettled([
      rt.swapPlugin({
        name: 'a',
        version: '1.0.1',
        async setup(ctx: RuntimeContext) {
          await yieldOnce();
          ctx.actions.registerAction({ id: 'a:do', handler: () => 'a-v2' });
        },
      }),
      rt.swapPlugin({
        name: 'b',
        version: '1.0.1',
        async setup(ctx: RuntimeContext) {
          await yieldOnce();
          ctx.actions.registerAction({ id: 'b:do', handler: () => 'b-v2' });
        },
      }),
    ]);
    expect(resA.status).toBe('fulfilled');
    expect(resB.status).toBe('fulfilled');

    const ctx = rt.getContext();
    expect(await ctx.actions.runAction('a:do')).toBe('a-v2');
    expect(await ctx.actions.runAction('b:do')).toBe('b-v2');
  });
});
