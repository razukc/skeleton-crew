import { describe, it, expect, vi } from 'vitest';
import { Runtime } from '../../src/runtime.js';
import { createFeatureFlagPlugin, FEATURE_FLAG_SERVICE } from '../../src/plugins/FeatureFlagPlugin.js';
import type { Logger, PluginDefinition, RuntimeContext } from '../../src/types.js';

const mockLogger = (): Logger => ({
  debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(),
});

// ──────────────────────────────────────────────────────────────────────────
// PROBE 19 (unsetFlag at(-1) crash — sibling of PROBE 17): same defect path.
// ──────────────────────────────────────────────────────────────────────────
describe('PROBE 19: FeatureFlagPlugin maxAuditEntries=0 crashes unsetFlag', () => {
  it('unsetFlag does not throw when audit log capacity is 0', async () => {
    const rt = new Runtime({ logger: mockLogger() });
    const p = createFeatureFlagPlugin({
      flags: [{ key: 'f', type: 'boolean', defaultValue: true }],
      maxAuditEntries: 0,
    });
    rt.registerPlugin(p);
    await rt.initialize();
    const svc = rt.getContext().services.get<any>(FEATURE_FLAG_SERVICE);
    expect(() => svc.unsetFlag('f')).not.toThrow(); // BUG: at(-1) undefined
    await rt.shutdown();
  });
});

// ──────────────────────────────────────────────────────────────────────────
// PROBE 20 (coerce number from non-numeric string): setFlag('n', 'abc') on a
// number flag → Number('abc') is NaN → throws FlagTypeMismatchError. Good.
// But setFlag('n', '') → Number('') is 0, silently coercing empty string to 0.
// And setFlag('n', '  12 ') → 12. Document the silent coercions.
// ──────────────────────────────────────────────────────────────────────────
describe('PROBE 20: FeatureFlag number coercion surprises', () => {
  it('empty string coerces to 0 for a number flag (silent)', async () => {
    const rt = new Runtime({ logger: mockLogger() });
    const p = createFeatureFlagPlugin({
      flags: [{ key: 'n', type: 'number', defaultValue: 5 }],
    });
    rt.registerPlugin(p);
    await rt.initialize();
    const svc = rt.getContext().services.get<any>(FEATURE_FLAG_SERVICE);
    svc.setFlag('n', '' as any);
    // This documents current behavior: '' → 0. If you consider '' invalid,
    // this is a silent-coercion footgun. Asserting the surprising result:
    expect(svc.getValue('n')).toBe(0);
    await rt.shutdown();
  });
});

// ──────────────────────────────────────────────────────────────────────────
// PROBE 21 (topo sort: dependent registered BEFORE dependency in input order).
// loadPlugins sorts by deps. A consumer listed first with a dep listed second
// must come out AFTER its dependency. Verify the sort actually reorders.
// ──────────────────────────────────────────────────────────────────────────
describe('PROBE 21: plugin-loader topo sort reorders dependents', () => {
  it('a dependent declared first is emitted after its dependency', async () => {
    const { DirectoryPluginLoader } = await import('../../src/plugin-loader.js');
    const loader = new DirectoryPluginLoader(mockLogger());
    // Access the private sort via the public loadPlugins is awkward; instead
    // exercise the real runtime path: register consumer THEN provider, both
    // manually, and confirm initialization order honors deps. (Manual
    // registration does NOT topo-sort — executeSetup runs in registration
    // order — so this probes whether the runtime requires correct manual order.)
    const order: string[] = [];
    const provider: PluginDefinition = {
      name: 'prov', version: '1.0.0',
      setup() { order.push('prov'); },
    };
    const consumer: PluginDefinition = {
      name: 'cons', version: '1.0.0', dependencies: ['prov'],
      setup() { order.push('cons'); },
    };
    const rt = new Runtime({ logger: mockLogger() });
    // Register consumer FIRST (wrong order for manual registration).
    rt.registerPlugin(consumer);
    rt.registerPlugin(provider);
    // executeSetup runs in registration order and validates deps are already
    // initialized → this SHOULD throw because prov isn't initialized yet.
    await expect(rt.initialize()).rejects.toThrow(/dependency/);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// PROBE 22 (getValue on rule-resolved flag with no store entry): a flag whose
// only definition is via rules, evaluated WITHOUT matching rule, falls to
// store.get(key). If key was seeded, fine. Verify getValue throws cleanly for
// a totally unknown key rather than returning undefined.
// ──────────────────────────────────────────────────────────────────────────
describe('PROBE 22: FeatureFlag getValue unknown key', () => {
  it('getValue on an unregistered key throws, never returns undefined', async () => {
    const rt = new Runtime({ logger: mockLogger() });
    const p = createFeatureFlagPlugin({ flags: [] });
    rt.registerPlugin(p);
    await rt.initialize();
    const svc = rt.getContext().services.get<any>(FEATURE_FLAG_SERVICE);
    expect(() => svc.getValue('nope')).toThrow(/not registered/);
    await rt.shutdown();
  });
});
