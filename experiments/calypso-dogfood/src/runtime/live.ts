import { readFile } from 'node:fs/promises';
import { Client, GatewayIntentBits, Events } from 'discord.js';
import { bootDogfood } from '../../harness/run.js';
import { extractInput, renderReply, renderError } from './adapter.js';

// Hand-run only (npm run live). Not part of CI. Proves the SAME carved commands
// serve over a real gateway; hot-swap is invoked from a REPL/SIGUSR2 by hand.
const cfg = JSON.parse(await readFile(new URL('../../config.json', import.meta.url), 'utf8'));
const driver = await bootDogfood();
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const optionNames = interaction.options.data.map((o) => o.name);
  try {
    const input = extractInput({
      user: interaction.user, guildId: interaction.guildId,
      options: { get: (n) => interaction.options.get(n) }, optionNames,
    });
    const result = await driver.dispatch(interaction.commandName, input);
    await interaction.reply(renderReply(result));
  } catch (err) {
    await interaction.reply(renderError(err));
  }
});

client.once(Events.ClientReady, (c) => console.log(`live as ${c.user.tag} — session ${c.ws.shards.first()?.id}`));
await client.login(cfg.token);
