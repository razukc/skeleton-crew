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
    feature: 'activity', name: 'feed is a non-empty array recording activity',
    run: async (base) => {
      // A bare Array.isArray check is vacuous: it passes on an empty feed, so a
      // regression that silently stops activity recording — on the experiment's
      // central hotspot feature — would register a FALSE PASS. Assert the feed
      // actually accumulates a known kind. We post a task first so this oracle
      // is self-contained (green standalone, not only in full-suite order).
      await fetch(`${base}/tasks`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: 'A' }) });
      const feed = await j(await fetch(`${base}/activity`));
      return ok(Array.isArray(feed) && feed.some((e: any) => e.kind === 'task.created'), 'activity feed records task.created');
    },
  },
];
