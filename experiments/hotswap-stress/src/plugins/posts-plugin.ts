import type { PluginDefinition, RuntimeContext } from 'skeleton-crew';
import type { StressConfig, Store, Post } from '../types.js';

// Helper: resolve the store service from context.
function store(ctx: RuntimeContext<StressConfig>): Store {
  return ctx.services.get<Store>('store');
}

// Registers the five CRUD actions. `tagger` lets v2 inject a tag into list
// results without duplicating the whole plugin (DRY across v1 and clean-v2).
function registerPostsActions(
  ctx: RuntimeContext<StressConfig>,
  tagger: (p: Post) => Post,
): void {
  ctx.actions.registerAction<undefined, Post[]>({
    id: 'posts:list',
    handler: (_params, c) => {
      const pageSize = c.config.pageSize;
      const all = [...store(c).posts.values()].slice(0, pageSize);
      return all.map(tagger);
    },
  });
  ctx.actions.registerAction<{ id: string }, Post | null>({
    id: 'posts:get',
    handler: ({ id }, c) => store(c).posts.get(id) ?? null,
  });
  ctx.actions.registerAction<{ title: string }, Post>({
    id: 'posts:create',
    handler: ({ title }, c) => {
      const s = store(c);
      const id = String(s.posts.size + 1);
      const post: Post = { id, title, views: 0 };
      s.posts.set(id, post);
      return post;
    },
  });
  ctx.actions.registerAction<{ id: string; title: string }, Post | null>({
    id: 'posts:update',
    handler: ({ id, title }, c) => {
      const s = store(c);
      const existing = s.posts.get(id);
      if (!existing) return null;
      const updated = { ...existing, title };
      s.posts.set(id, updated);
      return updated;
    },
  });
  ctx.actions.registerAction<{ id: string }, { deleted: boolean }>({
    id: 'posts:delete',
    handler: ({ id }, c) => {
      const deleted = store(c).posts.delete(id);
      if (deleted) c.events.emit('post:deleted', { id });
      return { deleted };
    },
  });
}

const identity = (p: Post): Post => p;
const addV2Tag = (p: Post): Post => ({ ...p, tag: 'v2' });

export const postsPluginV1: PluginDefinition<StressConfig> = {
  name: 'posts',
  version: '1.0.0',
  dependencies: ['store'],
  setup(ctx) {
    registerPostsActions(ctx, identity);
  },
};

// Scenario 1: clean swap — list now tags every post.
export const postsPluginV2Clean: PluginDefinition<StressConfig> = {
  name: 'posts',
  version: '1.1.0',
  dependencies: ['store'],
  setup(ctx) {
    registerPostsActions(ctx, addV2Tag);
  },
};

// Scenario 2: throwing swap — registers, then throws. v1 must stay live.
export const postsPluginV2Throwing: PluginDefinition<StressConfig> = {
  name: 'posts',
  version: '1.2.0',
  dependencies: ['store'],
  setup(ctx) {
    registerPostsActions(ctx, addV2Tag);
    throw new Error('posts v2 setup boom');
  },
};

// Scenario 4: cross-plugin hijack — tries to register an action comments owns.
export const postsPluginV2Hijack: PluginDefinition<StressConfig> = {
  name: 'posts',
  version: '1.3.0',
  dependencies: ['store'],
  setup(ctx) {
    registerPostsActions(ctx, identity);
    // comments:list is owned by comments-plugin — this must be rejected.
    ctx.actions.registerAction({ id: 'comments:list', handler: () => 'HIJACK' });
  },
};

// Scenario 5: config skew — record pageSize at validate vs setup time.
// The recorder object is module-level so the test/harness can read both marks.
export const skewProbe: { validated?: number; setup?: number } = {};

export const postsPluginV2Skew: PluginDefinition<StressConfig> = {
  name: 'posts',
  version: '1.4.0',
  dependencies: ['store'],
  validateConfig: (config) => {
    skewProbe.validated = config.pageSize;
    return true;
  },
  async setup(ctx) {
    // Yield once so the harness can call updateConfig() during the await window.
    await new Promise<void>((resolve) => setImmediate(resolve));
    skewProbe.setup = ctx.config.pageSize;
    registerPostsActions(ctx, identity);
  },
};
