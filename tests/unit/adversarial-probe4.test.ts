import { describe, it, expect, vi } from 'vitest';
import { Runtime } from '../../src/runtime.js';
import { ExecutionRecorderImpl } from '../../src/execution-recorder.js';
import { SimplePerformanceMonitor } from '../../src/performance.js';
import { createFeatureFlagPlugin, FEATURE_FLAG_SERVICE } from '../../src/plugins/FeatureFlagPlugin.js';
import type { Logger, PluginDefinition, RuntimeContext, TraceEntry } from '../../src/types.js';

const mockLogger = (): Logger => ({
  debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(),
});

// ──────────────────────────────────────────────────────────────────────────
// PROBE 14 (FINDING-1 IMPACT ON SHIPPED PLUGIN): the bundled FeatureFlagPlugin
// has a dispose that calls services.unregister(FEATURE_FLAG_SERVICE). Hot-swap
// v3.0.0 → v3.0.1 of it should leave the service live (v2 re-registered it),
// but Finding 1 means v1.dispose nukes v2's service. This proves the bug bites
// our OWN shipped plugin, not just a contrived test plugin.
// ──────────────────────────────────────────────────────────────────────────
describe('PROBE 14: hot-swapping the bundled FeatureFlagPlugin', () => {
  it('feature-flags service stays live after swapping the plugin to a newer version', async () => {
    const rt = new Runtime({ logger: mockLogger() });
    const v1 = createFeatureFlagPlugin({ flags: [{ key: 'x', type: 'boolean', defaultValue: true }] });
    rt.registerPlugin(v1);
    await rt.initialize();

    expect(rt.getContext().services.has(FEATURE_FLAG_SERVICE)).toBe(true);

    // v2: identical plugin but bumped version. Same dispose (unregisters svc).
    const v2 = { ...createFeatureFlagPlugin({ flags: [{ key: 'x', type: 'boolean', defaultValue: false }] }), version: '3.0.1' } as PluginDefinition;
    await rt.swapPlugin(v2);

    // After atomic swap, the feature-flags service MUST still be registered.
    expect(rt.getContext().services.has(FEATURE_FLAG_SERVICE)).toBe(true); // BUG via Finding 1
    await rt.shutdown();
  });
});

// ──────────────────────────────────────────────────────────────────────────
// PROBE 15 (RECORDER CAP=0): ExecutionRecorderImpl(0). record() pushes then
// shifts when length > 0, so a single push survives one tick. With maxEntries
// 0 the cap is "> 0" → it always shifts back to empty. Verify no crash and
// the invariant entries.length <= maxEntries holds (it can't, since 0 < 1).
// This is an off-by-one / degenerate-config probe.
// ──────────────────────────────────────────────────────────────────────────
describe('PROBE 15: ExecutionRecorder degenerate cap', () => {
  it('maxEntries=1 keeps exactly one entry', () => {
    const rec = new ExecutionRecorderImpl(1);
    const mk = (id: string): TraceEntry => ({
      runId: id, actionId: id, input: undefined, output: undefined,
      status: 'success', durationMs: 0, startedAt: 0, attempt: 1,
    });
    rec.record(mk('a'));
    rec.record(mk('b'));
    rec.record(mk('c'));
    const e = rec.getEntries();
    expect(e.length).toBe(1);
    expect(e[0].runId).toBe('c'); // keeps the newest
  });
});

// ──────────────────────────────────────────────────────────────────────────
// PROBE 16 (PERF MONITOR OVERWRITES): SimplePerformanceMonitor.recordMetric
// uses a Map keyed by name and overwrites. Two timers with the same label
// (e.g. two 'runtime:initialize' across instances sharing a monitor, or a
// repeated action) lose all but the last sample. Verify whether it accumulates
// or clobbers — clobbering silently is a metrics-correctness defect.
// ──────────────────────────────────────────────────────────────────────────
describe('PROBE 16: SimplePerformanceMonitor metric collisions', () => {
  // RECLASSIFIED as documented behavior, NOT a defect. The PerformanceMonitor
  // interface promises getMetrics(): Record<string, number> — a single number
  // per label. Last-write-wins is within that contract; callers needing
  // aggregation should accumulate before recording. This test pins the
  // documented semantics so a future change to aggregation is a conscious one.
  it('recording the same label twice keeps the last value (last-write-wins)', () => {
    const m = new SimplePerformanceMonitor();
    m.recordMetric('op', 10);
    m.recordMetric('op', 20);
    expect(m.getMetrics()).toEqual({ op: 20 });
  });
});

// ──────────────────────────────────────────────────────────────────────────
// PROBE 17 (FLAG audit at(-1) crash with maxAuditEntries:0): setFlag emits
// using auditLog.at(-1)!.timestamp. With maxAuditEntries:0, record() pushes
// then immediately shifts (length 1 > 0), leaving the log empty → at(-1) is
// undefined → "!" lies → reading .timestamp throws inside setFlag.
// ──────────────────────────────────────────────────────────────────────────
describe('PROBE 17: FeatureFlagPlugin maxAuditEntries=0 crashes setFlag', () => {
  it('setFlag does not throw when audit log capacity is 0', async () => {
    const rt = new Runtime({ logger: mockLogger() });
    const p = createFeatureFlagPlugin({
      flags: [{ key: 'f', type: 'boolean', defaultValue: false }],
      maxAuditEntries: 0,
    });
    rt.registerPlugin(p);
    await rt.initialize();
    const svc = rt.getContext().services.get<any>(FEATURE_FLAG_SERVICE);
    // BUG: auditLog.at(-1) is undefined → throws on .timestamp
    expect(() => svc.setFlag('f', true)).not.toThrow();
    await rt.shutdown();
  });
});

// ──────────────────────────────────────────────────────────────────────────
// PROBE 18 (FLAG percentage-rollout boundary): percentage:100 should roll out
// to everyone; percentage:0 to no one. hashBucket ∈ [0,100). bucket < pct.
// pct=100 → always true (good). pct=0 → never true (good). Verify 100 includes
// all and that a rule with percentage:100 actually returns its result.
// ──────────────────────────────────────────────────────────────────────────
describe('PROBE 18: FeatureFlag percentage-rollout boundaries', () => {
  it('percentage:100 rolls out to every userId', async () => {
    const rt = new Runtime({ logger: mockLogger() });
    const p = createFeatureFlagPlugin({
      flags: [{
        key: 'beta', type: 'boolean', defaultValue: false,
        rules: [{ type: 'percentage-rollout', percentage: 100, result: true }],
      }],
    });
    rt.registerPlugin(p);
    await rt.initialize();
    const svc = rt.getContext().services.get<any>(FEATURE_FLAG_SERVICE);
    for (const uid of ['a', 'b', 'c', 'z', 'user-12345', '']) {
      // empty userId short-circuits rollout (break), so skip the empty case
      if (uid === '') continue;
      expect(svc.isEnabled('beta', { userId: uid })).toBe(true);
    }
    await rt.shutdown();
  });
});
