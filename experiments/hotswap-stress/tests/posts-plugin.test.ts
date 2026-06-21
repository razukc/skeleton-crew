import { describe, it, expect, vi } from 'vitest';
import { Runtime, PluginSwapError } from 'skeleton-crew';
import type { Logger } from 'skeleton-crew';
import { storePluginV1 } from '../src/plugins/store-plugin.js';
import {
  postsPluginV1,
  postsPluginV2Clean,
  postsPluginV2Throwing,
  postsPluginV2Hijack,
} from '../src/plugins/posts-plugin.js';
import { commentsPluginV1 } from '../src/plugins/comments-plugin.js';
import type { Post, StressConfig } from '../src/types.js';

const mockLogger = (): Logger => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() });

async function boot() {
  const rt = new Runtime<StressConfig>({ logger: mockLogger(), config: { pageSize: 10 } });
  rt.registerPlugin(storePluginV1);
  rt.registerPlugin(postsPluginV1);
  rt.registerPlugin(commentsPluginV1);
  await rt.initialize();
  return rt;
}

describe('posts-plugin', () => {
  it('v1 list returns pageSize posts without a tag', async () => {
    const rt = await boot();
    const ctx = rt.getContext();
    const list = await ctx.actions.runAction<undefined, Post[]>('posts:list', undefined);
    expect(list).toHaveLength(10);
    expect(list[0].tag).toBeUndefined();
    await rt.shutdown();
  });

  it('clean v2 list tags every post', async () => {
    const rt = await boot();
    await rt.swapPlugin(postsPluginV2Clean);
    const ctx = rt.getContext();
    const list = await ctx.actions.runAction<undefined, Post[]>('posts:list', undefined);
    expect(list.every((p) => p.tag === 'v2')).toBe(true);
    await rt.shutdown();
  });

  it('throwing v2 leaves v1 fully live (atomicity)', async () => {
    const rt = await boot();
    await expect(rt.swapPlugin(postsPluginV2Throwing)).rejects.toBeInstanceOf(PluginSwapError);
    const ctx = rt.getContext();
    const list = await ctx.actions.runAction<undefined, Post[]>('posts:list', undefined);
    expect(list[0].tag).toBeUndefined(); // still v1
    await rt.shutdown();
  });

  it('hijack v2 is rejected and comments stay intact', async () => {
    const rt = await boot();
    await expect(rt.swapPlugin(postsPluginV2Hijack)).rejects.toBeInstanceOf(PluginSwapError);
    const ctx = rt.getContext();
    expect(ctx.actions.hasAction('comments:list')).toBe(true);
    await rt.shutdown();
  });
});
