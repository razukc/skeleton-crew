import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration.js';
import { SlashCommandBuilder } from 'discord.js';
import type { CarvedCommand } from '../runtime/commandPlugin.js';

dayjs.extend(duration);

// v2 of uptime: same command, reworded output. Used to demonstrate a live swap.
export const uptimeCommandV2: CarvedCommand = {
  name: 'uptime',
  builder: new SlashCommandBuilder().setName('uptime').setDescription("Gets the bot's current uptime."),
  async run(_input, host) {
    const d = dayjs.duration(host.uptimeMs);
    return { text: `up: ${d.days()}d ${d.hours()}h ${d.minutes()}m ${d.seconds()}s` };
  },
};
