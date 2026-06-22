import { Runtime, type Logger } from 'skeleton-crew';

const silent = (): Logger => ({ debug: () => {}, info: () => {}, warn: () => {}, error: () => {} });

/** Inject a colliding action registration into a fresh runtime and report how
 *  the runtime responds. SCR's registries reject a duplicate id loudly. */
export async function collidingRegistrationOutcome(): Promise<{ rejected: boolean; errorName: string }> {
  const rt = new Runtime({ logger: silent() });
  // The two plugin names MUST differ ('owner' vs 'collide') so the only possible
  // DuplicateRegistrationError is the ACTION-id collision on 'hotspot:write'. If
  // both names matched, a plugin-NAME collision would throw the same error class
  // and the probe would pass for the wrong reason.
  rt.registerPlugin({
    name: 'owner', version: '1.0.0',
    setup(ctx) { ctx.actions.registerAction({ id: 'hotspot:write', handler: () => 'ok' }); },
  });
  rt.registerPlugin({
    name: 'collide', version: '1.0.0',
    setup(ctx) { ctx.actions.registerAction({ id: 'hotspot:write', handler: () => 'HIJACK' }); },
  });
  try {
    await rt.initialize();
    await rt.shutdown();
    return { rejected: false, errorName: '' };
  } catch (err) {
    await rt.shutdown().catch(() => {});
    // Prefer err.name — the explicit string the library guarantees (types.ts) —
    // over err.constructor.name, which relies on the class symbol not being renamed.
    return { rejected: true, errorName: err instanceof Error ? err.name : 'unknown' };
  }
}

/** A hotspot writer that throws. Confirm the throw is contained to the calling
 *  action and the runtime keeps serving other actions. */
export async function throwingHotspotContained(): Promise<{ callerThrew: boolean; runtimeAlive: boolean }> {
  const rt = new Runtime({ logger: silent() });
  rt.registerPlugin({
    name: 'hotspot', version: '1.0.0',
    setup(ctx) {
      ctx.actions.registerAction({ id: 'hotspot:write', handler: () => { throw new Error('boom'); } });
      ctx.actions.registerAction({ id: 'hotspot:read', handler: () => 'alive' });
    },
  });
  await rt.initialize();
  const ctx = rt.getContext();
  let callerThrew = false;
  try { await ctx.actions.runAction('hotspot:write', {}); } catch { callerThrew = true; }
  const stillWorks = await ctx.actions.runAction('hotspot:read', {});
  await rt.shutdown();
  return { callerThrew, runtimeAlive: stillWorks === 'alive' };
}
