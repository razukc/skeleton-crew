import { describe, it, expect } from 'vitest';
import { buildScrServer } from '../scr-app/src/host.js';

describe('scr baseline', () => {
  it('creates a member and lists it', async () => {
    const { app, runtime } = await buildScrServer();
    const created = await app.inject({ method: 'POST', url: '/members', payload: { name: 'Ada' } });
    expect(created.statusCode).toBe(201);
    const id = created.json().id;
    const list = await app.inject({ method: 'GET', url: '/members' });
    expect(list.json().map((m: { id: string }) => m.id)).toContain(id);
    await app.close();
    await runtime.shutdown();
  });

  it('creating a task records to the activity hotspot service', async () => {
    const { app, runtime } = await buildScrServer();
    await app.inject({ method: 'POST', url: '/tasks', payload: { title: 'Ship it' } });
    const feed = await app.inject({ method: 'GET', url: '/activity' });
    const kinds = feed.json().map((e: { kind: string }) => e.kind);
    expect(kinds).toContain('task.created');
    await app.close();
    await runtime.shutdown();
  });
});
