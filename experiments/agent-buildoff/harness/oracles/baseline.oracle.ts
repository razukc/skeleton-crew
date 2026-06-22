import type { Oracle } from '../oracle-runner.js';

const j = (r: Response) => r.json() as Promise<any>;
const ok = (cond: boolean, detail: string) => ({ pass: cond, detail });

export const baselineOracles: Oracle[] = [
  {
    feature: 'members', name: 'create + list',
    run: async (base) => {
      const c = await fetch(`${base}/members`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Ada' }) });
      const id = (await j(c)).id;
      const list = await j(await fetch(`${base}/members`));
      return ok(c.status === 201 && list.some((m: any) => m.id === id), `member ${id} present`);
    },
  },
  {
    feature: 'tasks', name: 'create records activity',
    run: async (base) => {
      await fetch(`${base}/tasks`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: 'T' }) });
      const feed = await j(await fetch(`${base}/activity`));
      return ok(feed.some((e: any) => e.kind === 'task.created'), 'task.created in feed');
    },
  },
  {
    feature: 'activity', name: 'feed is an array',
    run: async (base) => {
      const feed = await j(await fetch(`${base}/activity`));
      return ok(Array.isArray(feed), 'activity is array');
    },
  },
];
