import type { FastifyInstance } from 'fastify';
import { getStore } from '../store.js';

export function registerActivity(app: FastifyInstance): void {
  app.get('/activity', async () => getStore().activity);
}
