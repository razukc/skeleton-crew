import { describe, it, expect } from 'vitest';
import { Runtime } from 'skeleton-crew';
import { makeFakeDiscord } from '../src/capabilities/discord.js';
import { randomcolorCommand, makeMutatingPlugin } from '../src/commands/randomcolor.js';

const roles = [
  { id: 'c1', name: 'Color Red', hexColor: '#ff0000' },
  { id: 'c2', name: 'Color Blue', hexColor: '#0000ff' },
];
const input = { invokerId: 'u1', guildId: 'g1' };

describe('randomcolor (capability port)', () => {
  it('mutates the member color via the capability and reports the change', async () => {
    const discord = makeFakeDiscord({ colorRoles: roles });
    const rt = new Runtime({ config: {} });
    rt.registerPlugin(makeMutatingPlugin(randomcolorCommand, discord));
    await rt.initialize();
    const res: any = await rt.getContext().actions.runAction('cmd:randomcolor', input);
    expect(res.text).toMatch(/➔ (Color Red|Color Blue)/);
    // capability observed the mutation
    await expect(discord.getMemberColor('g1', 'u1')).resolves.toMatch(/c1|c2/);
  });

  it('reports "no colors" when the guild has none (does not throw)', async () => {
    const discord = makeFakeDiscord({ colorRoles: [] });
    const rt = new Runtime({ config: {} });
    rt.registerPlugin(makeMutatingPlugin(randomcolorCommand, discord));
    await rt.initialize();
    const res: any = await rt.getContext().actions.runAction('cmd:randomcolor', input);
    expect(res.text).toContain('no colors');
  });
});
