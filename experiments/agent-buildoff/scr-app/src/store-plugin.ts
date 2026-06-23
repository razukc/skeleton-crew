import type { PluginDefinition, RuntimeContext } from 'skeleton-crew';

// The SCR arm's hotspot. Instead of a shared mutable module, the activity feed
// is a `store` service plus an `activity:record` action other plugins call and
// an `activity:recorded` event they can react to. This is the enforced seam.

export interface Member { id: string; name: string }
export interface Task { id: string; title: string; done: boolean }
export interface ActivityEntry { id: string; kind: string; at: number; data: Record<string, unknown> }

export interface WorkspaceStore {
  members: Map<string, Member>;
  tasks: Map<string, Task>;
  activity: ActivityEntry[];
  nextId(): string;
}

export const storePlugin: PluginDefinition = {
  name: 'store',
  version: '1.0.0',
  setup(ctx: RuntimeContext) {
    let counter = 1;
    const store: WorkspaceStore = {
      members: new Map(),
      tasks: new Map(),
      activity: [],
      nextId: () => String(counter++),
    };
    ctx.services.register<WorkspaceStore>('store', store);

    // The hotspot writer, exposed as an action so any plugin can record
    // without importing the store module. Emits an event for reactors.
    ctx.actions.registerAction<{ kind: string; data: Record<string, unknown> }, ActivityEntry>({
      id: 'activity:record',
      handler: ({ kind, data }, c) => {
        const s = c.services.get<WorkspaceStore>('store');
        const entry: ActivityEntry = { id: s.nextId(), kind, at: 0, data };
        s.activity.push(entry);
        c.events.emit('activity:recorded', entry);
        return entry;
      },
    });
  },
};
