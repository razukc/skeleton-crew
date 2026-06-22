import type { PluginDefinition, RuntimeContext } from 'skeleton-crew';
import type { WorkspaceStore, ActivityEntry } from '../store-plugin.js';

export const activityPlugin: PluginDefinition = {
  name: 'activity',
  version: '1.0.0',
  dependencies: ['store'],
  setup(ctx: RuntimeContext) {
    ctx.actions.registerAction<undefined, ActivityEntry[]>({
      id: 'activity:list',
      handler: (_p, c) => c.services.get<WorkspaceStore>('store').activity,
    });
  },
};
