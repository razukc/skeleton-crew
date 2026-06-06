import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import { Runtime } from '../../src/runtime.js';
import { PluginSwapError } from '../../src/types.js';
import type { PluginDefinition, RuntimeContext, Logger } from '../../src/types.js';

const silentLogger = (): Logger => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
});

/**
 * Property: Atomic Swap Rollback (Issue #2 / 0.6.0)
 *
 * For any v1 plugin registering any combination of actions / screens / services
 * / event handlers, a v2 swap whose setup throws at any registration step
 * leaves the visible state of those four registries IDENTICAL to what it was
 * before swapPlugin was called.
 *
 * "Identical" means:
 *  - every v1 action id still serves
 *  - every v1 screen id still resolves
 *  - every v1 service name still resolves to the same value
 *  - every v1 event handler still fires
 *
 * This is the user-visible contract of true atomic swap. It is the
 * property the manual reproducer in plugin-hotswap.test.ts covers for a
 * single shape; this test sweeps the space.
 */
describe('Property: Atomic Swap Rollback', () => {
  it('failed v2.setup leaves all four resource types observably unchanged', async () => {
    await fc.assert(
      fc.asyncProperty(
        // 1–5 actions, 1–5 screens, 1–5 services, 0–3 event subscriptions
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 0, max: 3 }),
        // Throw at registration step N (0-indexed across v2's own writes)
        fc.integer({ min: 0, max: 9 }),
        async (nActions, nScreens, nServices, nEvents, throwAtStep) => {
          const rt = new Runtime({ logger: silentLogger() });
          const handlers: Array<() => void> = [];
          rt.registerPlugin({
            name: 'p',
            version: '1.0.0',
            setup(ctx: RuntimeContext) {
              for (let i = 0; i < nActions; i++) {
                ctx.actions.registerAction({ id: `p:a${i}`, handler: () => `v1-a${i}` });
              }
              for (let i = 0; i < nScreens; i++) {
                ctx.screens.registerScreen({ id: `p:s${i}`, title: `s${i}`, component: 'X' });
              }
              for (let i = 0; i < nServices; i++) {
                ctx.services.register(`p:svc${i}`, { tag: `v1-${i}` });
              }
              for (let i = 0; i < nEvents; i++) {
                const h = vi.fn();
                handlers.push(h);
                ctx.events.on(`tick${i}`, h);
              }
            },
          });
          await rt.initialize();

          const v2: PluginDefinition = {
            name: 'p',
            version: '1.0.1',
            setup(ctx: RuntimeContext) {
              let step = 0;
              const maybeThrow = () => { if (step++ === throwAtStep) throw new Error('boom'); };
              // Same registrations but in a different shape — v2's writes
              // should be either buffered and dropped (on throw) or
              // committed (if throwAtStep is past the last step).
              maybeThrow();
              for (let i = 0; i < nActions; i++) {
                ctx.actions.registerAction({ id: `p:a${i}`, handler: () => `v2-a${i}` });
                maybeThrow();
              }
              for (let i = 0; i < nScreens; i++) {
                ctx.screens.registerScreen({ id: `p:s${i}`, title: `s${i}-v2`, component: 'Y' });
                maybeThrow();
              }
              for (let i = 0; i < nServices; i++) {
                ctx.services.register(`p:svc${i}`, { tag: `v2-${i}` });
                maybeThrow();
              }
            },
          };

          const result = await rt.swapPlugin(v2).then(
            () => 'fulfilled' as const,
            (e) => (e instanceof PluginSwapError ? 'rejected' : Promise.reject(e)),
          );
          const ctx = rt.getContext();

          if (result === 'rejected') {
            // Atomicity: v1 untouched on every dimension.
            for (let i = 0; i < nActions; i++) {
              expect(ctx.actions.hasAction(`p:a${i}`)).toBe(true);
              expect(await ctx.actions.runAction(`p:a${i}`)).toBe(`v1-a${i}`);
            }
            for (let i = 0; i < nScreens; i++) {
              expect(ctx.screens.getScreen(`p:s${i}`)?.title).toBe(`s${i}`);
            }
            for (let i = 0; i < nServices; i++) {
              expect(ctx.services.get<{ tag: string }>(`p:svc${i}`).tag).toBe(`v1-${i}`);
            }
            for (let i = 0; i < nEvents; i++) {
              const before = handlers[i].mock.calls.length;
              ctx.events.emit(`tick${i}`);
              expect(handlers[i].mock.calls.length).toBe(before + 1);
            }
          } else {
            // The throw landed past v2's last write — swap committed.
            // v2's resources are live; that's not what this property tests,
            // but the test still has to be a valid run.
            for (let i = 0; i < nActions; i++) {
              expect(await ctx.actions.runAction(`p:a${i}`)).toBe(`v2-a${i}`);
            }
          }
        },
      ),
      { numRuns: 50 },
    );
  });
});
