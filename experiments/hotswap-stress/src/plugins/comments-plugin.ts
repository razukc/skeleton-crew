import type { PluginDefinition, RuntimeContext } from 'skeleton-crew';
import type { StressConfig, Store, Comment } from '../types.js';

function store(ctx: RuntimeContext<StressConfig>): Store {
  return ctx.services.get<Store>('store');
}

function registerCommentsActions(ctx: RuntimeContext<StressConfig>): void {
  ctx.actions.registerAction<undefined, Comment[]>({
    id: 'comments:list',
    handler: (_params, c) => [...store(c).comments.values()],
  });
  ctx.actions.registerAction<{ postId: string; text: string }, Comment>({
    id: 'comments:create',
    handler: ({ postId, text }, c) => {
      const s = store(c);
      const id = String(s.nextId++);
      const comment: Comment = { id, postId, text };
      s.comments.set(id, comment);
      return comment;
    },
  });

  // Cascade: when a post is deleted, drop its comments.
  ctx.events.on('post:deleted', (data) => {
    const { id } = data as { id: string };
    const s = store(ctx);
    for (const [cid, comment] of s.comments) {
      if (comment.postId === id) s.comments.delete(cid);
    }
  });
}

export const commentsPluginV1: PluginDefinition<StressConfig> = {
  name: 'comments',
  version: '1.0.0',
  dependencies: ['store'],
  setup(ctx) {
    registerCommentsActions(ctx);
  },
};

// Scenario 6: a clean upgrade swapped concurrently with posts.
export const commentsPluginV2: PluginDefinition<StressConfig> = {
  name: 'comments',
  version: '1.1.0',
  dependencies: ['store'],
  setup(ctx) {
    registerCommentsActions(ctx);
  },
};
