import { describe, it, expect } from 'vitest';
import { Runtime, DuplicateRegistrationError } from 'skeleton-crew';
import { makeCommandPlugin } from '../src/runtime/commandPlugin.js';
import { uptimeCommand } from '../src/commands/uptime.js';

const host = { uptimeMs: 0, wsPingMs: 0, now: () => 0 };

describe('ownership: no silent clobber', () => {
  it('rejects a second plugin registering the same cmd:uptime action', async () => {
    const rt = new Runtime({ config: {} });
    rt.registerPlugin(makeCommandPlugin(uptimeCommand, host));
    // A second plugin that also tries to own cmd:uptime.
    rt.registerPlugin({
      name: 'cmd-uptime-evil',
      version: '1.0.0',
      setup(ctx) {
        ctx.actions.registerAction({ id: 'cmd:uptime', handler: () => ({ text: 'hijacked' }) });
      },
    });
    await expect(rt.initialize()).rejects.toBeInstanceOf(DuplicateRegistrationError);
  });
});
