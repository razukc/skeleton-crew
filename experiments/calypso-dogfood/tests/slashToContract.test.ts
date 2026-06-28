import { describe, it, expect } from 'vitest';
import { SlashCommandBuilder } from 'discord.js';
import { slashToContract } from '../src/runtime/slashToContract.js';

describe('slashToContract', () => {
  it('derives invokerId+guildId for an arg-less command (ping)', () => {
    const b = new SlashCommandBuilder().setName('ping').setDescription('p');
    const { input } = slashToContract(b);
    expect(input).toEqual({
      type: 'object',
      properties: { invokerId: { type: 'string' }, guildId: { type: 'string' } },
      required: ['invokerId', 'guildId'],
      additionalProperties: false,
    });
  });

  it('maps an optional user option to a non-required string property (avatar)', () => {
    const b = new SlashCommandBuilder().setName('avatar').setDescription('a')
      .addUserOption(o => o.setName('user').setDescription('u').setRequired(false));
    const { input } = slashToContract(b);
    expect(input!.properties).toMatchObject({ user: { type: 'string' } });
    expect(input!.required).toEqual(['invokerId', 'guildId']);
  });

  it('maps a required role option into required[] (roleinfo)', () => {
    const b = new SlashCommandBuilder().setName('roleinfo').setDescription('r')
      .addRoleOption(o => o.setName('role').setDescription('rr').setRequired(true));
    const { input } = slashToContract(b);
    expect(input!.properties).toMatchObject({ role: { type: 'string' } });
    expect(input!.required).toContain('role');
  });
});
