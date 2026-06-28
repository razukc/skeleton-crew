import { describe, it, expect } from 'vitest';
import { Runtime } from 'skeleton-crew';

describe('scr smoke', () => {
  it('registers a plugin and runs its action', async () => {
    const rt = new Runtime({ config: {} });
    rt.registerPlugin({
      name: 'cmd-smoke',
      version: '1.0.0',
      setup(ctx) {
        ctx.actions.registerAction({ id: 'cmd:smoke', handler: () => 'ok' });
      },
    });
    await rt.initialize();
    const ctx = rt.getContext();
    await expect(ctx.actions.runAction('cmd:smoke')).resolves.toBe('ok');
  });
});
