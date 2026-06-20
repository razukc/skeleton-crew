import { describe, it, expect, vi } from 'vitest';
import { Runtime } from '../../src/runtime.js';
import { ConfigPlugin } from '../../src/plugins/ConfigPlugin.js';
import type { Logger, RuntimeContext } from '../../src/types.js';

const mockLogger = (): Logger => ({
  debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(),
});

// ──────────────────────────────────────────────────────────────────────────
// PROBE 23 (ConfigPlugin mutates the caller's host object): config:set does
// Object.assign(host.config, payload). host.config is the ORIGINAL object the
// caller passed (shallow freeze copies the reference, doesn't clone). So
// config:set reaches out and mutates the host application's own config —
// directly contradicting the in-file comment "We do not modify ctx.host".
// ──────────────────────────────────────────────────────────────────────────
describe('PROBE 23: ConfigPlugin config:set leaks into host object', () => {
  it('config:set must not mutate the caller-owned host.config object', async () => {
    const originalHostConfig = { theme: 'light' };
    const rt = new Runtime({
      logger: mockLogger(),
      hostContext: { config: originalHostConfig },
    });
    rt.registerPlugin(ConfigPlugin);
    await rt.initialize();

    const ctx = rt.getContext();
    await ctx.actions.runAction('config:set', { theme: 'dark', secret: 'leaked' });

    // The caller's original object must be untouched.
    expect(originalHostConfig).toEqual({ theme: 'light' }); // BUG: now mutated
    await rt.shutdown();
  });

  it('config:set throws if the host froze its own config object', async () => {
    const frozenHostConfig = Object.freeze({ theme: 'light' });
    const rt = new Runtime({
      logger: mockLogger(),
      hostContext: { config: frozenHostConfig },
    });
    rt.registerPlugin(ConfigPlugin);
    await rt.initialize();

    const ctx = rt.getContext();
    // Object.assign onto a frozen target throws in strict mode (ESM is strict).
    // A config plugin should not explode just because the host hardened its
    // config. Either way this documents the fragility.
    await expect(
      ctx.actions.runAction('config:set', { theme: 'dark' })
    ).resolves.toBeDefined(); // BUG: rejects with TypeError on frozen target
    await rt.shutdown();
  });
});

// ──────────────────────────────────────────────────────────────────────────
// PROBE 24 (BROWSER EXPORT PARITY): index.browser.ts omits PluginSwapError,
// ActionMemoryError, ExecutionRecorderImpl, isNewerVersion, the FeatureFlag
// plugin, and the trace types. Browser consumers therefore cannot
// `instanceof PluginSwapError` to handle a failed hot-swap — a documented,
// throwable error class. This is an API-surface parity defect.
// ──────────────────────────────────────────────────────────────────────────
describe('PROBE 24: browser build export parity', () => {
  it('browser entry exports PluginSwapError (hot-swap is browser-relevant)', async () => {
    const browser = await import('../../src/index.browser.js');
    const node = await import('../../src/index.js');
    expect(typeof (node as any).PluginSwapError).toBe('function');
    // Browser hot-swap can fail too; consumers need the class to catch it.
    expect(typeof (browser as any).PluginSwapError).toBe('function'); // BUG: undefined
  });

  it('browser entry exports ActionMemoryError', async () => {
    const browser = await import('../../src/index.browser.js');
    expect(typeof (browser as any).ActionMemoryError).toBe('function'); // BUG: undefined
  });
});

// ──────────────────────────────────────────────────────────────────────────
// PROBE 25 (ActionExecutionError cause chain): verify the original error is
// preserved as .cause so callers can inspect the real failure. This is a
// "does the good thing actually work" probe.
// ──────────────────────────────────────────────────────────────────────────
describe('PROBE 25: ActionExecutionError preserves cause', () => {
  it('wraps the original error as .cause', async () => {
    const { ActionEngine } = await import('../../src/action-engine.js');
    const engine = new ActionEngine(mockLogger());
    engine.setContext({} as RuntimeContext);
    const boom = new Error('inner failure');
    engine.registerAction({ id: 'x', handler: () => { throw boom; } });
    try {
      await engine.runAction('x');
      expect.unreachable('should have thrown');
    } catch (e: any) {
      expect(e.name).toBe('ActionExecutionError');
      expect(e.cause).toBe(boom);
    }
  });
});
