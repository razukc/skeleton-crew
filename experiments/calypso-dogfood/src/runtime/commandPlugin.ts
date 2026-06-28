import type { PluginDefinition } from 'skeleton-crew';
import { slashToContract } from './slashToContract.js';

export interface CommandHost {
  uptimeMs: number;
  wsPingMs: number;
  now(): number;
  roles?: Record<string, { name: string }>;
}
export type CommandResult = { text?: string; embed?: Record<string, unknown> };

export interface CarvedCommand {
  name: string;
  builder: { toJSON(): any };
  run(input: Record<string, unknown>, host: CommandHost): Promise<CommandResult>;
}

export function makeCommandPlugin(cmd: CarvedCommand, host: CommandHost, version = '1.0.0'): PluginDefinition {
  const { input } = slashToContract(cmd.builder);
  return {
    name: `cmd-${cmd.name}`,
    version,
    setup(ctx) {
      ctx.actions.registerAction({
        id: `cmd:${cmd.name}`,
        input,
        handler: (params: Record<string, unknown>) => cmd.run(params ?? {}, host),
      });
    },
  };
}
