import Fastify, { type FastifyInstance } from 'fastify';
import { registerMembers } from './features/members.js';
import { registerTasks } from './features/tasks.js';
import { registerActivity } from './features/activity.js';

/** Builds the monolith arm. Feature registrars are wired here; they share
 *  state via the `store` module. An agent adding a feature adds a registrar
 *  and a line here, and reaches into the shared store directly. */
export function buildMonoServer(): FastifyInstance {
  const app = Fastify({ logger: false });
  registerMembers(app);
  registerTasks(app);
  registerActivity(app);
  return app;
}
