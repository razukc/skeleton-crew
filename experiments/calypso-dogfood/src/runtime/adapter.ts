import { ContractViolationError } from 'skeleton-crew';

export function extractInput(interaction: {
  user: { id: string }; guildId: string | null;
  options: { get(name: string): { value?: unknown } | null };
  optionNames: string[];
}): Record<string, unknown> {
  const out: Record<string, unknown> = {
    invokerId: interaction.user.id,
    guildId: interaction.guildId ?? '',
  };
  for (const name of interaction.optionNames) {
    const opt = interaction.options.get(name);
    if (opt && opt.value !== undefined) out[name] = String(opt.value);
  }
  return out;
}

export function renderReply(result: unknown): string {
  if (typeof result === 'string') return result;
  if (result && typeof result === 'object' && 'text' in result) {
    return String((result as { text: unknown }).text);
  }
  return 'Done.';
}

export function renderError(err: unknown): string {
  if (err instanceof ContractViolationError) {
    return `Your input was invalid: ${err.message}`;
  }
  return 'That command errored — the bot is still running.';
}
