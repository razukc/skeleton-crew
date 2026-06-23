import type { PluginDefinition, RuntimeContext } from 'skeleton-crew';
import type { WorkspaceStore, Task } from '../store-plugin.js';

export const tasksPlugin: PluginDefinition = {
  name: 'tasks',
  version: '1.0.0',
  dependencies: ['store'],
  setup(ctx: RuntimeContext) {
    const store = () => ctx.services.get<WorkspaceStore>('store');

    ctx.actions.registerAction<{ title: string }, Task>({
      id: 'tasks:create',
      handler: async ({ title }, c) => {
        const s = store();
        const task: Task = { id: s.nextId(), title: title ?? 'untitled', done: false };
        s.tasks.set(task.id, task);
        await c.actions.runAction('activity:record', { kind: 'task.created', data: { id: task.id, title: task.title } });
        return task;
      },
    });

    ctx.actions.registerAction<undefined, Task[]>({
      id: 'tasks:list',
      handler: () => [...store().tasks.values()],
    });

    ctx.actions.registerAction<{ id: string }, Task | null>({
      id: 'tasks:get',
      handler: ({ id }) => store().tasks.get(id) ?? null,
    });
  },
};
