import { describe, it, expect } from 'vitest';
import { Runtime, ContractViolationError } from 'skeleton-crew';
import { makeCommandPlugin } from '../src/runtime/commandPlugin.js';
import { uptimeCommand } from '../src/commands/uptime.js';
import { makeFakeDiscord } from '../src/capabilities/discord.js';
import { randomcolorCommand, makeMutatingPlugin } from '../src/commands/randomcolor.js';

const host = { uptimeMs: 90_061_000, wsPingMs: 42, now: () => 0 };
const good = { invokerId: 'u1', guildId: 'g1' };

async function boot(failOnSet: boolean) {
  const discord = makeFakeDiscord({
    colorRoles: [{ id: 'c1', name: 'Color Red', hexColor: '#ff0000' }],
    failOnSet,
  });
  const rt = new Runtime({ config: {} });
  rt.registerPlugin(makeCommandPlugin(uptimeCommand, host));            // sibling
  rt.registerPlugin(makeMutatingPlugin(randomcolorCommand, discord));  // mutating
  await rt.initialize();
  return rt.getContext();
}

describe('Demo 3: containment + contracts', () => {
  it('(a) rejects bad input at the boundary; handler never runs', async () => {
    const ctx = await boot(false);
    // invokerId missing -> contract violation
    await expect(
      ctx.actions.runAction('cmd:randomcolor', { guildId: 'g1' }),
    ).rejects.toBeInstanceOf(ContractViolationError);
  });

  it('(b) a throwing randomcolor is contained; sibling cmd:uptime still serves', async () => {
    const ctx = await boot(true);   // setMemberColor throws (role hierarchy)
    await expect(ctx.actions.runAction('cmd:randomcolor', good)).rejects.toBeTruthy();
    // The host and the sibling are unharmed:
    const res: any = await ctx.actions.runAction('cmd:uptime', good);
    expect(res.text).toContain('1 day');
  });
});
