import { describe, it, expect, vi } from 'vitest';
import { Runtime } from 'skeleton-crew';
import type { Logger } from 'skeleton-crew';
import { storePluginV1 } from '../src/plugins/store-plugin.js';
import { postsPluginV1 } from '../src/plugins/posts-plugin.js';
import { commentsPluginV1 } from '../src/plugins/comments-plugin.js';
import { buildServer } from '../src/server.js';
import type { StressConfig } from '../src/types.js';

const mockLogger = (): Logger => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() });

async function bootServer() {
  const rt = new Runtime<StressConfig>({ logger: mockLogger(), config: { pageSize: 10 } });
  rt.registerPlugin(storePluginV1);
  rt.registerPlugin(postsPluginV1);
  rt.registerPlugin(commentsPluginV1);
  await rt.initialize();
  const app = buildServer(rt, async () => { /* default no-op swap */ });
  await app.ready();
  return { rt, app };
}

describe('buildServer', () => {
  it('GET /posts returns the list via the action', async () => {
    const { rt, app } = await bootServer();
    const res = await app.inject({ method: 'GET', url: '/posts' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(10);
    await app.close();
    await rt.shutdown();
  });

  it('GET /posts/:id 404s for a missing post (distinct from 5xx)', async () => {
    const { rt, app } = await bootServer();
    const res = await app.inject({ method: 'GET', url: '/posts/99999' });
    expect(res.statusCode).toBe(404);
    await app.close();
    await rt.shutdown();
  });

  it('POST /__swap/:plugin invokes the swap function', async () => {
    const rt = new Runtime<StressConfig>({ logger: mockLogger(), config: { pageSize: 10 } });
    rt.registerPlugin(storePluginV1);
    rt.registerPlugin(postsPluginV1);
    rt.registerPlugin(commentsPluginV1);
    await rt.initialize();
    const swap = vi.fn(async (_plugin: string) => {});
    const app = buildServer(rt, swap);
    await app.ready();
    const res = await app.inject({ method: 'POST', url: '/__swap/posts' });
    expect(res.statusCode).toBe(200);
    expect(swap).toHaveBeenCalledWith('posts');
    await app.close();
    await rt.shutdown();
  });

  it('POST /__swap/:plugin returns 409 when the swap rejects', async () => {
    const rt = new Runtime<StressConfig>({ logger: mockLogger(), config: { pageSize: 10 } });
    rt.registerPlugin(storePluginV1);
    rt.registerPlugin(postsPluginV1);
    rt.registerPlugin(commentsPluginV1);
    await rt.initialize();
    const swap = vi.fn(async () => { throw new Error('swap rejected'); });
    const app = buildServer(rt, swap);
    await app.ready();
    const res = await app.inject({ method: 'POST', url: '/__swap/posts' });
    expect(res.statusCode).toBe(409);
    await app.close();
    await rt.shutdown();
  });

  it('a throwing action surfaces as HTTP 500 (the oracle’s swap-failure signal)', async () => {
    const { rt, app } = await bootServer();
    // Force the action layer to throw: after shutdown, getContext()/runAction
    // reject, which Fastify maps to a 500 — the signal the oracle counts as a
    // swap-window failure (distinct from an ordinary 404).
    await rt.shutdown();
    const res = await app.inject({ method: 'GET', url: '/posts' });
    expect(res.statusCode).toBe(500);
    await app.close();
  });
});
