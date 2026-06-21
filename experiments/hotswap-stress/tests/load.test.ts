import { describe, it, expect, vi } from 'vitest';
import { Runtime } from 'skeleton-crew';
import type { Logger } from 'skeleton-crew';
import { storePluginV1 } from '../src/plugins/store-plugin.js';
import { postsPluginV1 } from '../src/plugins/posts-plugin.js';
import { commentsPluginV1 } from '../src/plugins/comments-plugin.js';
import { buildServer } from '../src/server.js';
import { SwapTimeline } from '../src/swap-timeline.js';
import { verify } from '../harness/load.js';
import type { StressConfig } from '../src/types.js';

const mockLogger = (): Logger => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() });

describe('verify sampler', () => {
  it('captures response bodies, status, and phase for a live server', async () => {
    const rt = new Runtime<StressConfig>({ logger: mockLogger(), config: { pageSize: 10 } });
    rt.registerPlugin(storePluginV1);
    rt.registerPlugin(postsPluginV1);
    rt.registerPlugin(commentsPluginV1);
    await rt.initialize();
    const app = buildServer(rt, async () => {});
    const address = await app.listen({ port: 0, host: '127.0.0.1' });

    const timeline = new SwapTimeline();
    timeline.mark('swap:start');
    const samples = await verify(`${address}/posts`, { durationMs: 250, timeline });
    timeline.mark('commit');

    expect(samples.length).toBeGreaterThan(0);
    expect(samples.every((s) => s.status === 200)).toBe(true);
    expect(Array.isArray(samples[0].body)).toBe(true);
    expect(['pre', 'mid', 'post']).toContain(samples[0].phase);

    await app.close();
    await rt.shutdown();
  });
});
