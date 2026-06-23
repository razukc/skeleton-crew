import type { FastifyInstance } from 'fastify';
import { getStore, recordActivity, type Task } from '../store.js';

export function registerTasks(app: FastifyInstance): void {
  app.post<{ Body: { title: string } }>('/tasks', async (req, reply) => {
    const s = getStore();
    const task: Task = { id: String(s.nextId++), title: req.body?.title ?? 'untitled', done: false };
    s.tasks.set(task.id, task);
    recordActivity('task.created', { id: task.id, title: task.title });
    return reply.code(201).send(task);
  });

  app.get('/tasks', async () => [...getStore().tasks.values()]);

  app.get<{ Params: { id: string } }>('/tasks/:id', async (req, reply) => {
    const t = getStore().tasks.get(req.params.id);
    if (!t) return reply.code(404).send({ error: 'not found' });
    return t;
  });
}
