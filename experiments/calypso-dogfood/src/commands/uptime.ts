import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration.js';
import { SlashCommandBuilder } from 'discord.js';
import type { CarvedCommand } from '../runtime/commandPlugin.js';

dayjs.extend(duration);

// Carried from CalypsoBot src/commands/information/uptime.ts — humanization logic
// is verbatim; the value source changes from `client.uptime` to `host.uptimeMs`.
export const uptimeCommand: CarvedCommand = {
  name: 'uptime',
  builder: new SlashCommandBuilder().setName('uptime').setDescription("Gets the bot's current uptime."),
  async run(_input, host) {
    const d = dayjs.duration(host.uptimeMs);
    const days = `${d.days()} day${d.days() === 1 ? '' : 's'}`;
    const hours = `${d.hours()} hour${d.hours() === 1 ? '' : 's'}`;
    const minutes = `${d.minutes()} minute${d.minutes() === 1 ? '' : 's'}`;
    const seconds = `${d.seconds()} second${d.seconds() === 1 ? '' : 's'}`;
    return { text: `${days}, ${hours}, ${minutes}, and ${seconds}` };
  },
};
