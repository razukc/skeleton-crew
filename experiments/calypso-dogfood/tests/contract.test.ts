import { describe, it, expect } from 'vitest';
import { Runtime, ContractViolationError } from 'skeleton-crew';
import { makeCommandPlugin } from '../src/runtime/commandPlugin.js';
import { roleinfoCommand } from '../src/commands/roleinfo.js';

const host = { uptimeMs: 0, wsPingMs: 0, now: () => 0 };

async function boot() {
  const rt = new Runtime({ config: {} });
  rt.registerPlugin(makeCommandPlugin(roleinfoCommand, host));
  await rt.initialize();
  return rt.getContext();
}

describe('contract enforcement (roleinfo)', () => {
  it('rejects missing required role arg with ContractViolationError', async () => {
    const ctx = await boot();
    await expect(
      ctx.actions.runAction('cmd:roleinfo', { invokerId: 'u1', guildId: 'g1' }),
    ).rejects.toBeInstanceOf(ContractViolationError);
  });

  it('runs when the required role arg is present', async () => {
    const ctx = await boot();
    const res: any = await ctx.actions.runAction('cmd:roleinfo', {
      invokerId: 'u1', guildId: 'g1', role: 'r123',
    });
    expect(res.text).toBe('role r123');
  });
});
