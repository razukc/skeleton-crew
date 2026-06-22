import { describe, it, expect, beforeEach } from 'vitest';
import { buildMonoServer } from '../mono-app/src/server.js';
import { resetStore } from '../mono-app/src/store.js';

describe('mono baseline', () => {
  beforeEach(() => resetStore());

  it('creates a member and lists it', async () => {
    const app = buildMonoServer();
    const created = await app.inject({ method: 'POST', url: '/members', payload: { name: 'Ada' } });
    expect(created.statusCode).toBe(201);
    const id = created.json().id;
    const list = await app.inject({ method: 'GET', url: '/members' });
    expect(list.json().map((m: { id: string }) => m.id)).toContain(id);
    await app.close();
  });

  it('creating a task records to the activity hotspot', async () => {
    const app = buildMonoServer();
    await app.inject({ method: 'POST', url: '/tasks', payload: { title: 'Ship it' } });
    const feed = await app.inject({ method: 'GET', url: '/activity' });
    const kinds = feed.json().map((e: { kind: string }) => e.kind);
    expect(kinds).toContain('task.created');
    await app.close();
  });
});
