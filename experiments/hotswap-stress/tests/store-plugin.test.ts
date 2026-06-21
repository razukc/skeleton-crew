import { describe, it, expect, vi } from 'vitest';
import { Runtime } from 'skeleton-crew';
import type { Logger } from 'skeleton-crew';
import { storePluginV1, storePluginV2 } from '../src/plugins/store-plugin.js';
import type { Store } from '../src/types.js';

const mockLogger = (): Logger => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() });

describe('store-plugin', () => {
  it('v1 registers a seeded store service', async () => {
    const rt = new Runtime({ logger: mockLogger() });
    rt.registerPlugin(storePluginV1);
    await rt.initialize();
    const ctx = rt.getContext();
    expect(ctx.services.has('store')).toBe(true);
    const store = ctx.services.get<Store>('store');
    expect(store.posts.size).toBe(100);
    await rt.shutdown();
  });

  it('survives a swap to v2 whose dispose unregisters store (Finding 1)', async () => {
    const rt = new Runtime({ logger: mockLogger() });
    rt.registerPlugin(storePluginV1);
    await rt.initialize();
    await rt.swapPlugin(storePluginV2);
    const ctx = rt.getContext();
    // v1.dispose ran AFTER commit and called services.unregister('store');
    // the identity guard must keep v2's store alive.
    expect(ctx.services.has('store')).toBe(true);
    const store = ctx.services.get<Store>('store');
    expect(store.posts.size).toBe(100); // v1's seeded data carried forward through the swap
    await rt.shutdown();
  });
});
