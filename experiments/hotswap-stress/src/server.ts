import Fastify, { type FastifyInstance } from 'fastify';
import type { Runtime } from 'skeleton-crew';
import type { StressConfig, Post, Comment } from './types.js';

/**
 * A swap trigger: given a plugin name, perform (or reject) a swap. Injected so
 * the orchestrator can map a name to the specific v2 variant for a scenario,
 * and so tests can stub it.
 */
export type SwapFn = (plugin: string) => Promise<void>;

/**
 * Builds the Fastify data plane + control plane. Route handlers are pure
 * runAction shims — all logic and state live in scr. A rejected action handler
 * surfaces as 500 (a swap-window failure the oracle counts); a null/absent
 * resource surfaces as 404 (ordinary, NOT counted as a swap failure).
 */
export function buildServer(runtime: Runtime<StressConfig>, swap: SwapFn): FastifyInstance {
  const app = Fastify({ logger: false });
  const ctx = () => runtime.getContext();

  app.get('/posts', async () => {
    return ctx().actions.runAction<undefined, Post[]>('posts:list', undefined);
  });

  app.get<{ Params: { id: string } }>('/posts/:id', async (req, reply) => {
    const post = await ctx().actions.runAction<{ id: string }, Post | null>('posts:get', {
      id: req.params.id,
    });
    if (post === null) return reply.code(404).send({ error: 'not found' });
    return post;
  });

  app.post<{ Body: { title: string } }>('/posts', async (req, reply) => {
    const created = await ctx().actions.runAction<{ title: string }, Post>('posts:create', {
      title: req.body?.title ?? 'untitled',
    });
    return reply.code(201).send(created);
  });

  app.delete<{ Params: { id: string } }>('/posts/:id', async (req) => {
    return ctx().actions.runAction<{ id: string }, { deleted: boolean }>('posts:delete', {
      id: req.params.id,
    });
  });

  app.get('/comments', async () => {
    return ctx().actions.runAction<undefined, Comment[]>('comments:list', undefined);
  });

  // Control plane: trigger a swap. A rejected swap → 409 (expected for the
  // hijack/throwing scenarios); success → 200.
  app.post<{ Params: { plugin: string } }>('/__swap/:plugin', async (req, reply) => {
    try {
      await swap(req.params.plugin);
      return reply.code(200).send({ swapped: req.params.plugin });
    } catch (err) {
      return reply.code(409).send({ error: (err as Error).message });
    }
  });

  return app;
}
