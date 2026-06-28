import { describe, it, expect } from 'vitest';
import { Runtime, PluginSwapError } from 'skeleton-crew';
import { makeCommandPlugin } from '../src/runtime/commandPlugin.js';
import { uptimeCommand } from '../src/commands/uptime.js';

const host = { uptimeMs: 90_061_000, wsPingMs: 42, now: () => 0 };
const input = { invokerId: 'u1', guildId: 'g1' };

describe('Demo 2: failed swap rolls back', () => {
  it('keeps v1 serving when a swap setup throws', async () => {
    const rt = new Runtime({ config: {} });
    rt.registerPlugin(makeCommandPlugin(uptimeCommand, host));
    await rt.initialize();
    const ctx = rt.getContext();

    const before: any = await ctx.actions.runAction('cmd:uptime', input);

    // A swap whose setup throws mid-install.
    const brokenSwap = {
      name: 'cmd-uptime',
      version: '2.0.0',
      setup() { throw new Error('boom during setup'); },
    };
    // SCR wraps a setup-throw in PluginSwapError (runtime.ts commit path).
    await expect(rt.swapPlugin(brokenSwap)).rejects.toBeInstanceOf(PluginSwapError);

    // v1 still serves, unchanged.
    const after: any = await ctx.actions.runAction('cmd:uptime', input);
    expect(after.text).toBe(before.text);
  });
});
