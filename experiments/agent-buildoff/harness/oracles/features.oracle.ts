import type { Oracle } from '../oracle-runner.js';

const J = (r: Response) => r.json() as Promise<any>;
const ok = (cond: boolean, detail: string) => ({ pass: cond, detail });
const post = (base: string, path: string, body: unknown) =>
  fetch(`${base}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

async function mkTask(base: string, title = 'T'): Promise<string> {
  return (await J(await post(base, '/tasks', { title }))).id;
}
async function mkMember(base: string, name = 'Ada'): Promise<string> {
  return (await J(await post(base, '/members', { name }))).id;
}

export const featureOracles: Oracle[] = [
  {
    feature: 'f1', name: 'comment create + list + activity',
    run: async (base) => {
      const t = await mkTask(base);
      const c = await post(base, `/tasks/${t}/comments`, { author: 'Ada', text: 'hi' });
      const cid = (await J(c)).id;
      const list = await J(await fetch(`${base}/tasks/${t}/comments`));
      const feed = await J(await fetch(`${base}/activity`));
      return ok(c.status === 201 && list.some((x: any) => x.id === cid) && feed.some((e: any) => e.kind === 'comment.created'),
        'comment created, listed, and recorded');
    },
  },
  {
    feature: 'f2', name: 'mention from @name',
    run: async (base) => {
      const m = await mkMember(base, 'Bob');
      const t = await mkTask(base);
      await post(base, `/tasks/${t}/comments`, { author: 'Ada', text: 'ping @Bob' });
      const mentions = await J(await fetch(`${base}/members/${m}/mentions`));
      return ok(Array.isArray(mentions) && mentions.length >= 1, 'mention recorded for Bob');
    },
  },
  {
    feature: 'f3', name: 'assign task to member',
    run: async (base) => {
      const m = await mkMember(base);
      const t = await mkTask(base);
      const a = await post(base, `/tasks/${t}/assign`, { memberId: m });
      const got = await J(await fetch(`${base}/tasks/${t}`));
      return ok(a.status === 200 && got.assigneeId === m, 'task assigned');
    },
  },
  {
    feature: 'f4', name: 'assignment produces a notification',
    run: async (base) => {
      const m = await mkMember(base);
      const t = await mkTask(base);
      await post(base, `/tasks/${t}/assign`, { memberId: m });
      const notes = await J(await fetch(`${base}/members/${m}/notifications`));
      return ok(notes.some((n: any) => n.kind === 'assignment' && n.taskId === t), 'assignment notification present');
    },
  },
  {
    feature: 'f5', name: 'tag a task + query by tag',
    run: async (base) => {
      const t = await mkTask(base);
      await post(base, `/tasks/${t}/tags`, { tag: 'urgent' });
      const got = await J(await fetch(`${base}/tasks/${t}`));
      const byTag = await J(await fetch(`${base}/tags/urgent/tasks`));
      return ok(got.tags?.includes('urgent') && byTag.some((x: any) => x.id === t), 'tag applied and queryable');
    },
  },
  {
    feature: 'f6', name: 'search matches task title',
    run: async (base) => {
      await mkTask(base, 'find-me-xyz');
      const res = await J(await fetch(`${base}/search?q=xyz`));
      return ok(Array.isArray(res.tasks) && res.tasks.some((x: any) => x.title.includes('xyz')), 'search found task');
    },
  },
  {
    feature: 'f7', name: 'react to an activity entry',
    run: async (base) => {
      const m = await mkMember(base);
      await mkTask(base);
      const feed = await J(await fetch(`${base}/activity`));
      const aid = feed[0].id;
      const r = await post(base, `/activity/${aid}/reactions`, { memberId: m, emoji: '👍' });
      const list = await J(await fetch(`${base}/activity/${aid}/reactions`));
      return ok(r.status === 201 && list.some((x: any) => x.emoji === '👍'), 'reaction added');
    },
  },
  {
    feature: 'f8', name: 'digest aggregates counts',
    run: async (base) => {
      const m = await mkMember(base);
      const t = await mkTask(base);
      await post(base, `/tasks/${t}/assign`, { memberId: m });
      const d = await J(await fetch(`${base}/members/${m}/digest`));
      return ok(typeof d.assignments === 'number' && d.assignments >= 1, 'digest counts assignment');
    },
  },
];
