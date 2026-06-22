import Fastify, { type FastifyInstance } from 'fastify';
import { Runtime, type Logger } from 'skeleton-crew';
import { storePlugin } from './store-plugin.js';
import { membersPlugin } from './plugins/members-plugin.js';
import { tasksPlugin } from './plugins/tasks-plugin.js';
import { activityPlugin } from './plugins/activity-plugin.js';

const silentLogger = (): Logger => ({ debug: () => {}, info: () => {}, warn: () => {}, error: () => {} });

/** Builds the SCR arm. Every route is a thin runAction shim; all logic and
 *  state live in plugins. An agent adding a feature adds a plugin file, a
 *  registerPlugin line, and route shim(s) — and reaches other features only
 *  through services/actions/events. */
export async function buildScrServer(): Promise<{ app: FastifyInstance; runtime: Runtime }> {
  const runtime = new Runtime({ logger: silentLogger() });
  runtime.registerPlugin(storePlugin);
  runtime.registerPlugin(membersPlugin);
  runtime.registerPlugin(tasksPlugin);
  runtime.registerPlugin(activityPlugin);
  await runtime.initialize();
  const ctx = () => runtime.getContext();

  const app = Fastify({ logger: false });

  app.post<{ Body: { name: string } }>('/members', async (req, reply) =>
    reply.code(201).send(await ctx().actions.runAction('members:create', { name: req.body?.name })));
  app.get('/members', async () => ctx().actions.runAction('members:list', undefined));
  app.get<{ Params: { id: string } }>('/members/:id', async (req, reply) => {
    const m = await ctx().actions.runAction('members:get', { id: req.params.id });
    return m === null ? reply.code(404).send({ error: 'not found' }) : m;
  });

  app.post<{ Body: { title: string } }>('/tasks', async (req, reply) =>
    reply.code(201).send(await ctx().actions.runAction('tasks:create', { title: req.body?.title })));
  app.get('/tasks', async () => ctx().actions.runAction('tasks:list', undefined));
  app.get<{ Params: { id: string } }>('/tasks/:id', async (req, reply) => {
    const t = await ctx().actions.runAction('tasks:get', { id: req.params.id });
    return t === null ? reply.code(404).send({ error: 'not found' }) : t;
  });

  app.get('/activity', async () => ctx().actions.runAction('activity:list', undefined));

  return { app, runtime };
}
