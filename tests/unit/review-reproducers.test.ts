/**
 * Reproducer tests for code-review findings.
 *
 * Each test asserts the behavior the docs/README/CHANGELOG promise.
 *   - A FAILING test = the bug reproduces; the finding is real.
 *   - A PASSING test = the finding is wrong; the code already delivers.
 *
 * These tests are written to test current behavior against the contract,
 * NOT to enforce a particular fix. They are evidence, not specification.
 */
import { describe, it, expect, vi } from 'vitest';
import { Runtime } from '../../src/runtime.js';
import { PluginRegistry, isNewerVersion } from '../../src/plugin-registry.js';
import { DirectoryPluginLoader } from '../../src/plugin-loader.js';
import { ConsoleLogger, ValidationError, PluginSwapError } from '../../src/types.js';
import type { PluginDefinition, RuntimeContext, Logger } from '../../src/types.js';

const silentLogger = (): Logger => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
});

function makePlugin(
  name: string,
  version: string,
  overrides: Partial<PluginDefinition> = {}
): PluginDefinition {
  return { name, version, setup: vi.fn(), ...overrides };
}

// ─────────────────────────────────────────────────────────────────────────────
// Finding #1 — swapPlugin atomicity: failed validateConfig must not destroy v1
// Promise (README:12 / CHANGELOG:10): "Rolls back on setup failure"
// ─────────────────────────────────────────────────────────────────────────────
describe('FINDING #1 — atomicity of swapPlugin', () => {
  it('failed validateConfig on new plugin leaves OLD plugin running', async () => {
    const rt = new Runtime({ logger: silentLogger() });
    const v1Dispose = vi.fn();
    rt.registerPlugin({
      name: 'p',
      version: '1.0.0',
      setup(ctx: RuntimeContext) {
        ctx.actions.registerAction({ id: 'p:hello', handler: () => 'v1' });
      },
      dispose: v1Dispose,
    });
    await rt.initialize();

    const v2: PluginDefinition = {
      name: 'p',
      version: '1.0.1',
      validateConfig: () => ({ valid: false, errors: ['rejected'] }),
      setup: vi.fn(),
    };

    await expect(rt.swapPlugin(v2)).rejects.toThrow(PluginSwapError);

    const ctx = rt.getContext();
    // Promise: old plugin still serving, dispose not called.
    expect(ctx.actions.hasAction('p:hello')).toBe(true);
    expect(await ctx.actions.runAction('p:hello')).toBe('v1');
    expect(v1Dispose).not.toHaveBeenCalled();
    expect(ctx.introspect.getPluginDefinition('p')?.version).toBe('1.0.0');
  });

  // Resolved in 0.6.0: the residual window is closed by true atomic swap
  // (buffered v2.setup against a SwapBuffer; commit synchronously on
  // success, drop the buffer on failure). v1 stays fully live during
  // v2.setup, so a throw from v2.setup is observably a no-op.
  it('failed v2.setup leaves OLD plugin running (0.6)', async () => {
    const rt = new Runtime({ logger: silentLogger() });
    rt.registerPlugin({
      name: 'p',
      version: '1.0.0',
      setup(ctx: RuntimeContext) {
        ctx.actions.registerAction({ id: 'p:hello', handler: () => 'v1' });
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
    // Promise read literally as "rolls back": v1 should still serve.
    expect(ctx.actions.hasAction('p:hello')).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Finding #2 — executeSetup catch leaks resources of the failing plugin
// ─────────────────────────────────────────────────────────────────────────────
describe('FINDING #2 — executeSetup resource leak on mid-setup throw', () => {
  it('failing plugin\'s already-registered actions are cleaned up on rollback', async () => {
    const rt = new Runtime({ logger: silentLogger() });
    rt.registerPlugin({
      name: 'a',
      version: '1.0.0',
      setup(ctx: RuntimeContext) {
        ctx.actions.registerAction({ id: 'a:ok', handler: () => 'a' });
      },
    });
    rt.registerPlugin({
      name: 'b',
      version: '1.0.0',
      setup(ctx: RuntimeContext) {
        ctx.actions.registerAction({ id: 'b:partial', handler: () => 'b' });
        throw new Error('b exploded mid-setup');
      },
    });

    await expect(rt.initialize()).rejects.toThrow();

    // Reach into the ActionEngine directly — getContext() throws because the
    // runtime is not marked initialized after a failed initialize(). That's
    // beside the point; the point is whether b:partial was unregistered.
    const actions = (rt as unknown as { actions: { hasAction(id: string): boolean } }).actions;
    expect(actions.hasAction('a:ok')).toBe(false);
    // The leak: b:partial gets stranded in the ActionEngine.
    expect(actions.hasAction('b:partial')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Finding #3 — executeSetup wraps errors as plain Error, loses class identity
// Doc contract: docs/guides/config-validation.md instructs `instanceof ValidationError`
// ─────────────────────────────────────────────────────────────────────────────
describe('FINDING #3 — error class preservation through initialize()', () => {
  it('ValidationError from validateConfig survives as ValidationError', async () => {
    const rt = new Runtime({ logger: silentLogger() });
    rt.registerPlugin({
      name: 'p',
      version: '1.0.0',
      validateConfig: () => ({ valid: false, errors: ['nope'] }),
      setup: vi.fn(),
    });

    try {
      await rt.initialize();
      throw new Error('expected initialize() to throw');
    } catch (e) {
      // Promise: docs say `if (e instanceof ValidationError) { ... }`
      expect(e).toBeInstanceOf(ValidationError);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Finding #4 — swapPlugin has no re-entrancy guard
// ─────────────────────────────────────────────────────────────────────────────
describe('FINDING #4 — concurrent swapPlugin re-entrancy', () => {
  it('concurrent swaps do not corrupt initializedPlugins (no duplicate entries)', async () => {
    const rt = new Runtime({ logger: silentLogger() });
    // v1 has an async dispose, so teardownPlugin actually yields to the event
    // loop. Without this, swap() never gives control back to the second call
    // and the race window is closed by accident, not by design.
    const yieldOnce = () => new Promise<void>(r => setTimeout(r, 5));
    rt.registerPlugin({
      name: 'p',
      version: '1.0.0',
      setup: vi.fn(),
      dispose: vi.fn(yieldOnce),
    });
    await rt.initialize();

    // Both new versions also have async setup so the second call actually
    // observes an interleave.
    const v2: PluginDefinition = {
      name: 'p',
      version: '1.0.1',
      setup: vi.fn(yieldOnce),
      dispose: vi.fn(yieldOnce),
    };
    const v3: PluginDefinition = {
      name: 'p',
      version: '1.0.2',
      setup: vi.fn(yieldOnce),
    };

    const a = rt.swapPlugin(v2);
    const b = rt.swapPlugin(v3);
    const results = await Promise.allSettled([a, b]);

    const ctx = rt.getContext();
    const initialized = ctx.plugins.getInitializedPlugins();
    const occurrences = initialized.filter(n => n === 'p').length;
    // Promise (implied by docs): plugin is initialized exactly once.
    expect(occurrences).toBe(1);
    // And outcomes are well-defined: either both succeed serially, or one is
    // rejected with PluginSwapError. Silently corrupt state is a contract break.
    for (const r of results) {
      if (r.status === 'rejected') {
        expect(r.reason).toBeInstanceOf(PluginSwapError);
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Finding #5 — parseSemver rejects valid SemVer 2.0 pre-release versions
// ─────────────────────────────────────────────────────────────────────────────
describe('FINDING #5 — semver pre-release support', () => {
  it('isNewerVersion treats 1.2.4-rc.1 as newer than 1.2.3', () => {
    // CHANGELOG links semver.org/spec/v2.0.0; this is the canonical case.
    expect(isNewerVersion('1.2.3', '1.2.4-rc.1')).toBe(true);
  });

  it('swapPlugin allows upgrading 1.0.0 → 1.0.1-beta.1', async () => {
    const rt = new Runtime({ logger: silentLogger() });
    rt.registerPlugin(makePlugin('p', '1.0.0'));
    await rt.initialize();

    await expect(rt.swapPlugin(makePlugin('p', '1.0.1-beta.1'))).resolves.toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Finding #6 — setupSinglePlugin skips dependency check (hot-swap path)
// ─────────────────────────────────────────────────────────────────────────────
describe('FINDING #6 — dependency validation on hot-swap', () => {
  it('swap to a version declaring a missing dependency is rejected pre-flight', async () => {
    const rt = new Runtime({ logger: silentLogger() });
    rt.registerPlugin(makePlugin('p', '1.0.0'));
    await rt.initialize();

    const v2: PluginDefinition = {
      name: 'p',
      version: '1.0.1',
      dependencies: ['nonexistent'],
      setup: vi.fn(),
    };

    // Promise: dependency validation mirrors executeSetup's behavior.
    await expect(rt.swapPlugin(v2)).rejects.toThrow(/dependency/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Finding #7 — clear() is a misleading name for a post-dispose state reset.
//
// The original finding read this as a behavior bug (clear should dispose).
// After review the chosen fix is contract clarification, not behavior change:
// the method is renamed to reset() with JSDoc that documents the
// post-dispose-only contract, and clear() becomes a deprecated alias that
// emits logger.warn when called. Consumers who were using clear() correctly
// (after dispose) keep working; consumers who were using it incorrectly
// get a logged warning pointing them at the new name + contract.
// ─────────────────────────────────────────────────────────────────────────────
describe('FINDING #7 — reset() name + deprecated clear() alias', () => {
  it('reset() is the new public name and behaves as a pure state reset', async () => {
    const rt = new Runtime({ logger: silentLogger() });
    rt.registerPlugin(makePlugin('p', '1.0.0'));
    await rt.initialize();
    await rt.shutdown(); // dispose first, per contract

    const registry = (rt as unknown as { plugins: PluginRegistry & { reset(): void } }).plugins;
    // Must not throw; idempotent on a post-dispose registry.
    expect(() => registry.reset()).not.toThrow();
  });

  // 0.5.0 shipped clear() as a deprecated alias emitting logger.warn,
  // promising removal in 0.6. As of 0.6.0 the method is gone — calling it
  // is a TypeError. Callers that ignored the deprecation warning now
  // notice; reset() is the only supported name.
  it('clear() has been removed in 0.6 (the promised cleanup)', async () => {
    const rt = new Runtime({ logger: silentLogger() });
    rt.registerPlugin(makePlugin('p', '1.0.0'));
    await rt.initialize();
    await rt.shutdown();

    const registry = (rt as unknown as { plugins: PluginRegistry & { clear?: () => void } }).plugins;
    expect(registry.clear).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Finding #8 — sortPluginsByDependencies silently drops missing-dep warning
// ─────────────────────────────────────────────────────────────────────────────
describe('FINDING #8 — missing-dep diagnostic in plugin-loader sort', () => {
  it('logs a warning when a declared dependency is absent from the batch', () => {
    const logger = silentLogger();
    const loader = new DirectoryPluginLoader(logger);

    const plugins: PluginDefinition[] = [
      { name: 'dependent', version: '1.0.0', dependencies: ['core'], setup: vi.fn() },
    ];

    // Reach into the private sort to exercise it directly.
    (loader as unknown as {
      sortPluginsByDependencies: (p: PluginDefinition[]) => PluginDefinition[];
    }).sortPluginsByDependencies(plugins);

    // Promise: a missing dep at sort time should be visible, not silent.
    expect(logger.warn).toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Finding #9 — double topological sort wastes work / scoped wrong
// (Pure cleanup finding — not a behavioral bug. Skip reproducer; would be
//  asserting on internal call counts which is fragile.)
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Finding #10 — duplicated validateConfig handling (cleanup, no reproducer)
// ─────────────────────────────────────────────────────────────────────────────
