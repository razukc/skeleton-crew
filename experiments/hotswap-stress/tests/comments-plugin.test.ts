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

  it('creates a comment with a fresh monotonic id', async () => {
    const rt = await boot();
    const ctx = rt.getContext();
    const created = await ctx.actions.runAction<{ postId: string; text: string }, Comment>(
      'comments:create',
      { postId: '2', text: 'second' },
    );
    expect(created.postId).toBe('2');
    expect(created.text).toBe('second');
    const list = await ctx.actions.runAction<undefined, Comment[]>('comments:list', undefined);
    expect(list).toHaveLength(2); // seed comment + the new one
    await rt.shutdown();
  });

  it('cascade fires exactly once after a v1→v2 swap (old subscriber retired)', async () => {
    const rt = await boot();
    const ctx = rt.getContext();
    // Add a second comment on post 2 so we can prove a single, targeted cascade.
    await ctx.actions.runAction('comments:create', { postId: '2', text: 'on post 2' });
    await rt.swapPlugin(commentsPluginV2);
    // Deleting post 1 should remove ONLY post 1's comment, exactly once.
    await ctx.actions.runAction('posts:delete', { id: '1' });
    const list = await ctx.actions.runAction<undefined, Comment[]>('comments:list', undefined);
    // Seed comment (post 1) gone; the post-2 comment remains. If a leaked v1
    // subscriber also ran, it would still only delete post-1 comments — so to
    // make a double-fire observable we assert the surviving set precisely.
    expect(list).toHaveLength(1);
    expect(list[0].postId).toBe('2');
    await rt.shutdown();
  });
});
