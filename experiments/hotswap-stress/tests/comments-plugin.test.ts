import { describe, it, expect, vi } from 'vitest';
import { Runtime } from 'skeleton-crew';
import type { Logger } from 'skeleton-crew';
import { storePluginV1 } from '../src/plugins/store-plugin.js';
import { postsPluginV1 } from '../src/plugins/posts-plugin.js';
import { commentsPluginV1, commentsPluginV2 } from '../src/plugins/comments-plugin.js';
import type { Comment, StressConfig } from '../src/types.js';

const mockLogger = (): Logger => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() });

async function boot() {
  const rt = new Runtime<StressConfig>({ logger: mockLogger(), config: { pageSize: 10 } });
  rt.registerPlugin(storePluginV1);
  rt.registerPlugin(postsPluginV1);
  rt.registerPlugin(commentsPluginV1);
  await rt.initialize();
  return rt;
}

describe('comments-plugin', () => {
  it('lists comments', async () => {
    const rt = await boot();
    const ctx = rt.getContext();
    const list = await ctx.actions.runAction<undefined, Comment[]>('comments:list', undefined);
    expect(list).toHaveLength(1);
    await rt.shutdown();
  });

  it('cascade-deletes comments when post:deleted fires', async () => {
    const rt = await boot();
    const ctx = rt.getContext();
    await ctx.actions.runAction('posts:delete', { id: '1' });
    const list = await ctx.actions.runAction<undefined, Comment[]>('comments:list', undefined);
    expect(list).toHaveLength(0); // comment for post 1 cascaded away
    await rt.shutdown();
  });

  it('swaps cleanly to v2', async () => {
    const rt = await boot();
    await rt.swapPlugin(commentsPluginV2);
    const ctx = rt.getContext();
    expect(ctx.actions.hasAction('comments:list')).toBe(true);
    await rt.shutdown();
  });
});
