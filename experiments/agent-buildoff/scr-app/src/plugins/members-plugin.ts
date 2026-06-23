import type { PluginDefinition, RuntimeContext } from 'skeleton-crew';
import type { WorkspaceStore, Member } from '../store-plugin.js';

export const membersPlugin: PluginDefinition = {
  name: 'members',
  version: '1.0.0',
  dependencies: ['store'],
  setup(ctx: RuntimeContext) {
    const store = () => ctx.services.get<WorkspaceStore>('store');

    ctx.actions.registerAction<{ name: string }, Member>({
      id: 'members:create',
      handler: async ({ name }, c) => {
        const s = store();
        const member: Member = { id: s.nextId(), name: name ?? 'unnamed' };
        s.members.set(member.id, member);
        await c.actions.runAction('activity:record', { kind: 'member.created', data: { id: member.id, name: member.name } });
        return member;
      },
    });

    ctx.actions.registerAction<undefined, Member[]>({
      id: 'members:list',
      handler: () => [...store().members.values()],
    });

    ctx.actions.registerAction<{ id: string }, Member | null>({
      id: 'members:get',
      handler: ({ id }) => store().members.get(id) ?? null,
    });
  },
};
