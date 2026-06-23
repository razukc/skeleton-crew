import type { FastifyInstance } from 'fastify';
import { getStore, recordActivity, type Member } from '../store.js';

export function registerMembers(app: FastifyInstance): void {
  app.post<{ Body: { name: string } }>('/members', async (req, reply) => {
    const s = getStore();
    const member: Member = { id: String(s.nextId++), name: req.body?.name ?? 'unnamed' };
    s.members.set(member.id, member);
    recordActivity('member.created', { id: member.id, name: member.name });
    return reply.code(201).send(member);
  });

  app.get('/members', async () => [...getStore().members.values()]);

  app.get<{ Params: { id: string } }>('/members/:id', async (req, reply) => {
    const m = getStore().members.get(req.params.id);
    if (!m) return reply.code(404).send({ error: 'not found' });
    return m;
  });
}
