import { describe, it, expect } from 'vitest';
import { Runtime } from 'skeleton-crew';
import { makeCommandPlugin } from '../src/runtime/commandPlugin.js';
import { uptimeCommand } from '../src/commands/uptime.js';

const host = { uptimeMs: 90_061_000, wsPingMs: 42, now: () => 1_700_000_000_000 };

describe('uptime command as SCR plugin', () => {
  it('registers cmd:uptime and returns humanized uptime text', async () => {
    const rt = new Runtime({ config: {} });
    rt.registerPlugin(makeCommandPlugin(uptimeCommand, host));
    await rt.initialize();
    const ctx = rt.getContext();
    const res: any = await ctx.actions.runAction('cmd:uptime', {
      invokerId: 'u1', guildId: 'g1',
    });
    expect(res.text).toContain('1 day');
    expect(res.text).toContain('1 hour');
    expect(res.text).toContain('1 minute');
    expect(res.text).toContain('1 second');
  });
});
