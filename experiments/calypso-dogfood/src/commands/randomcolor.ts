import { SlashCommandBuilder } from 'discord.js';
import type { PluginDefinition } from 'skeleton-crew';
import { slashToContract } from '../runtime/slashToContract.js';
import type { DiscordCapability } from '../capabilities/discord.js';

export interface MutatingCommand {
  name: string;
  builder: { toJSON(): any };
  run(input: Record<string, unknown>, discord: DiscordCapability): Promise<{ text: string }>;
}

// Carried from CalypsoBot src/commands/color/randomcolor.ts. The original wraps
// the role mutation in a hand-rolled try/catch; here we DELIBERATELY remove that
// try/catch so SCR's containment is what protects the host (spec §5 demo 3).
export const randomcolorCommand: MutatingCommand = {
  name: 'randomcolor',
  builder: new SlashCommandBuilder()
    .setName('randomcolor')
    .setDescription('Changes your current color to a randomly selected one.'),
  async run(input, discord) {
    const guildId = String(input.guildId);
    const memberId = String(input.invokerId);
    const colors = await discord.getColorRoles(guildId);
    if (colors.length === 0) return { text: 'Sorry, there are no colors set on this server.' };
    // Deterministic-enough random: index by current ms is disallowed in tests, so
    // pick based on member+guild hash to stay reproducible without Math.random.
    const idx = (guildId.length + memberId.length) % colors.length;
    const chosen = colors[idx];
    const old = await discord.getMemberColor(guildId, memberId);
    await discord.setMemberColor(guildId, memberId, chosen.id);   // may throw -> contained by SCR
    const oldName = colors.find(c => c.id === old)?.name ?? 'None';
    return { text: `${oldName} ➔ ${chosen.name}` };
  },
};

export function makeMutatingPlugin(
  cmd: MutatingCommand, discord: DiscordCapability, version = '1.0.0',
): PluginDefinition {
  const { input } = slashToContract(cmd.builder);
  return {
    name: `cmd-${cmd.name}`,
    version,
    setup(ctx) {
      ctx.actions.registerAction({
        id: `cmd:${cmd.name}`,
        input,
        handler: (params: Record<string, unknown>) => cmd.run(params ?? {}, discord),
      });
    },
  };
}
