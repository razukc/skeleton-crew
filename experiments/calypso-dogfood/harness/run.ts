import { Runtime, type PluginDefinition } from 'skeleton-crew';
import { makeCommandPlugin, type CommandHost } from '../src/runtime/commandPlugin.js';
import { uptimeCommand } from '../src/commands/uptime.js';
import { roleinfoCommand } from '../src/commands/roleinfo.js';
import { makeFakeDiscord, type DiscordCapability } from '../src/capabilities/discord.js';
import { randomcolorCommand, makeMutatingPlugin } from '../src/commands/randomcolor.js';

export interface Driver {
  dispatch(name: string, input: Record<string, unknown>): Promise<unknown>;
  swap(name: string, plugin: PluginDefinition): Promise<void>;
}

export async function bootDogfood(opts: {
  host?: Partial<CommandHost>;
  discord?: DiscordCapability;
} = {}): Promise<Driver> {
  const host: CommandHost = {
    uptimeMs: 90_061_000, wsPingMs: 42, now: () => 0, ...opts.host,
  };
  const discord = opts.discord ?? makeFakeDiscord({
    colorRoles: [{ id: 'c1', name: 'Color Red', hexColor: '#ff0000' }],
  });

  const rt = new Runtime({ config: {} });
  rt.registerPlugin(makeCommandPlugin(uptimeCommand, host));
  rt.registerPlugin(makeCommandPlugin(roleinfoCommand, host));
  rt.registerPlugin(makeMutatingPlugin(randomcolorCommand, discord));
  await rt.initialize();
  const ctx = rt.getContext();

  return {
    dispatch: (name, input) => ctx.actions.runAction(`cmd:${name}`, input),
    swap: (_name, plugin) => rt.swapPlugin(plugin),
  };
}

// CLI entry: run the three demos and print a summary (used by `npm run` smoke, not live).
if (import.meta.url === `file://${process.argv[1]}`) {
  bootDogfood().then(async (d) => {
    const up = await d.dispatch('uptime', { invokerId: 'u1', guildId: 'g1' });
    console.log('uptime →', up);
  });
}
