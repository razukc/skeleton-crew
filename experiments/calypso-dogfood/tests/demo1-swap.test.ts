import { describe, it, expect } from 'vitest';
import { Runtime } from 'skeleton-crew';
import { makeCommandPlugin } from '../src/runtime/commandPlugin.js';
import { uptimeCommand } from '../src/commands/uptime.js';
import { uptimeCommandV2 } from '../src/commands/uptime.v2.js';

const host = { uptimeMs: 90_061_000, wsPingMs: 42, now: () => 0 };
const input = { invokerId: 'u1', guildId: 'g1' };

describe('Demo 1: hot-swap without reconnect', () => {
  it('swaps cmd:uptime live; transport identity (ctx) is unchanged', async () => {
    const rt = new Runtime({ config: {} });
    rt.registerPlugin(makeCommandPlugin(uptimeCommand, host));
    await rt.initialize();
    const ctxBefore = rt.getContext();

    const v1: any = await ctxBefore.actions.runAction('cmd:uptime', input);
    expect(v1.text).not.toContain('up:');

    await rt.swapPlugin(makeCommandPlugin(uptimeCommandV2, host, '2.0.0'));

    const ctxAfter = rt.getContext();
    const v2: any = await ctxAfter.actions.runAction('cmd:uptime', input);
    expect(v2.text).toContain('up:');                 // behavior changed
    expect(ctxAfter).toBe(ctxBefore);                 // same context object = no "reconnect"
  });
});
