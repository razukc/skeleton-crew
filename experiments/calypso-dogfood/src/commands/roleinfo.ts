import { SlashCommandBuilder } from 'discord.js';
import type { CarvedCommand } from '../runtime/commandPlugin.js';

// Carried from CalypsoBot src/commands/information/roleinfo.ts. The required
// `role` option becomes a required contract field (see slashToContract). The
// embed body is reduced to a deterministic echo; the demonstrand is the contract.
export const roleinfoCommand: CarvedCommand = {
  name: 'roleinfo',
  builder: new SlashCommandBuilder()
    .setName('roleinfo')
    .setDescription('Displays role information.')
    .addRoleOption(o => o.setName('role').setDescription('The role.').setRequired(true)),
  async run(input) {
    return { text: `role ${String(input.role)}` };
  },
};
