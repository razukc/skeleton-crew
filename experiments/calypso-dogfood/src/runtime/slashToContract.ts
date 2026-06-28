import type { ActionDefinition } from 'skeleton-crew';

// Discord ApplicationCommandOptionType numeric codes we handle.
const TYPE_MAP: Record<number, { type: string }> = {
  3: { type: 'string' },   // String
  4: { type: 'number' },   // Integer
  5: { type: 'boolean' },  // Boolean
  6: { type: 'string' },   // User  -> carried as ID string
  7: { type: 'string' },   // Channel
  8: { type: 'string' },   // Role  -> carried as ID string
  9: { type: 'string' },   // Mentionable
  10: { type: 'number' },  // Number
};

export function slashToContract(
  builder: { toJSON(): { options?: Array<{ name: string; type: number; required?: boolean }> } },
): { input: ActionDefinition['input'] } {
  const json = builder.toJSON();
  const properties: Record<string, { type: string }> = {
    invokerId: { type: 'string' },
    guildId: { type: 'string' },
  };
  const required: string[] = ['invokerId', 'guildId'];

  for (const opt of json.options ?? []) {
    properties[opt.name] = TYPE_MAP[opt.type] ?? { type: 'string' };
    if (opt.required) required.push(opt.name);
  }

  return {
    input: { type: 'object', properties, required },
  };
}
