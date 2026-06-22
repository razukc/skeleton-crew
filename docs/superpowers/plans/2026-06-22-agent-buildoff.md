# Agent Build-Off Experiment — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `experiments/agent-buildoff/` rig that has a headless Claude agent build the same feature backlog into two arms — an SCR-plugin app and a competent monolith control — across five phases, measuring verification surface, tokens/feature, cross-feature blast radius, parallel-incident class, and the cost-crossover index.

**Architecture:** A vitest-tested sub-package mirroring `experiments/hotswap-stress/`. Two Fastify "arm" apps (`scr-app/`, `mono-app/`) seeded at functional parity with 3 baseline features and a shared **activity-feed hotspot**. A harness that (a) invokes `claude --print --output-format stream-json --verbose` in a per-run **sandbox copy** of an arm, parsing its ndjson for token usage + files-read; (b) runs a **frozen, arm-agnostic** HTTP oracle suite after every landing; (c) orchestrates sequential build-off (K=3 repeats), modification, parallel-contention, and deterministic fault-injection phases; (d) renders `RESULTS.md` with a cost-over-N slope, crossover index, and pre-registered-predictions scorecard.

**Tech Stack:** TypeScript (ES2022 ESM), Fastify 5, vitest 4, `skeleton-crew` (local `file:../..`), the `claude` CLI (headless), Node `node:child_process`/`node:fs`.

**Spec:** `docs/superpowers/specs/2026-06-22-agent-buildoff-design.md`

**Conventions (verified against the repo):**
- Root `tsconfig.json` is ES2022 ESM with `strict`, `noUnusedLocals`, `noUnusedParameters`. Every local `.ts` import uses the `.js` extension. No unused vars/params will compile.
- Sub-packages extend the root tsconfig with `outDir: ./dist`; the hotswap rig uses `rootDir: "."` and `include: ["src/**/*", "harness/**/*"]`. We mirror this.
- The package name is `skeleton-crew`; import the runtime from `skeleton-crew`.
- `tests/` is excluded from `tsc` (vitest runs it); `harness/` and `src/` ARE type-checked.
- Branch: `experiment/agent-buildoff` (already checked out, spec committed at `5fb7199`).
- The harness consumes `skeleton-crew` from the parent `dist/` (gitignored). Run `npm run build` at repo root before building/running the rig so the local dep is fresh.

**Agent-invocation facts (verified on this machine, `claude` v2.1.x):**
- `claude --print --output-format stream-json --verbose` writes newline-delimited JSON to stdout. Prompt is supplied on stdin.
- The final line is `{"type":"result", "usage":{input_tokens,output_tokens,cache_read_input_tokens,cache_creation_input_tokens,...}, "total_cost_usd":N, "num_turns":N, "session_id":"..."}`.
- Each tool call appears as `{"type":"assistant","message":{"content":[{"type":"tool_use","name":"Read"|"Grep"|...,"input":{"file_path":"...","glob":"..."}}]}}`.
- Useful flags: `--permission-mode acceptEdits` (no interactive prompts), `--allowedTools "Read,Grep,Glob,Edit,Write,Bash"`, `--add-dir <dir>`, `--model <id>`, `--max-budget-usd <n>`. No `ANTHROPIC_API_KEY` needed (cached auth).
- The CLI is invoked with `cwd` set to the sandbox so relative reads resolve there.

**Domain (the substrate): a "team workspace" JSON API.**
- Baseline features (built by THIS plan, both arms): `members` (CRUD people), `tasks` (CRUD tasks), `activity` (an append-only activity feed — **THE HOTSPOT**; every feature records to it).
- Backlog features (built by AGENTS during the experiment, NOT in this plan): `f1 comments`, `f2 mentions`, `f3 assignment`, `f4 notifications`, `f5 tags`, `f6 search`, `f7 reactions`, `f8 digest`. Each is engineered to read prior features' data and/or write the activity hotspot (lever 1). Their specs are authored in Task 8; their oracles in Task 9; the agents implement them in Task 14.

---

## File Structure

| File | Responsibility |
|---|---|
| `experiments/agent-buildoff/package.json` | deps (fastify, skeleton-crew local), scripts |
| `experiments/agent-buildoff/tsconfig.json` | extends root; builds `src/` (both arms) + `harness/` to `dist/` |
| `experiments/agent-buildoff/.gitignore` | `node_modules/`, `dist/`, `RESULTS.md`, `.sandboxes/`, `package-lock.json` |
| `experiments/agent-buildoff/vitest.config.ts` | vitest config (forks pool, like hotswap) |
| `experiments/agent-buildoff/mono-app/src/store.ts` | monolith shared mutable store (incl. the activity hotspot array) |
| `experiments/agent-buildoff/mono-app/src/features/*.ts` | one route-registrar per feature (baseline: members, tasks, activity) |
| `experiments/agent-buildoff/mono-app/src/server.ts` | Fastify app wiring feature registrars; `buildMonoServer()` |
| `experiments/agent-buildoff/scr-app/src/store-plugin.ts` | SCR `store` service (incl. activity hotspot) + `activity:record` action/event |
| `experiments/agent-buildoff/scr-app/src/plugins/*.ts` | one plugin per feature (baseline: members, tasks, activity) |
| `experiments/agent-buildoff/scr-app/src/host.ts` | Fastify host; routes are `runAction` shims; `buildScrServer()` |
| `experiments/agent-buildoff/harness/types.ts` | shared types: `Arm`, `AgentRunResult`, `FeatureRunMetrics`, `OracleResult` |
| `experiments/agent-buildoff/harness/agent-invoke.ts` | spawn headless `claude`, parse ndjson → `AgentRunResult` |
| `experiments/agent-buildoff/harness/sandbox.ts` | per-run sandbox copy of an arm; land a chosen run back |
| `experiments/agent-buildoff/harness/oracle-runner.ts` | boot an arm server, run the frozen oracle suite, return `OracleResult[]` |
| `experiments/agent-buildoff/harness/oracles/*.oracle.ts` | the FROZEN black-box HTTP oracles, grouped by feature |
| `experiments/agent-buildoff/harness/faults.ts` | Phase-4 deterministic fault injectors (no agents) |
| `experiments/agent-buildoff/harness/metrics.ts` | aggregation: median/spread, crossover index, slope |
| `experiments/agent-buildoff/harness/report.ts` | `renderResults()` → RESULTS.md markdown |
| `experiments/agent-buildoff/harness/phases.ts` | phase orchestration (sequential/modify/parallel/fault) |
| `experiments/agent-buildoff/harness/run.ts` | CLI entry → runs phases → writes RESULTS.md |
| `experiments/agent-buildoff/backlog/*.md` | the fixed feature specs fed verbatim to both arms |
| `experiments/agent-buildoff/PREDICTIONS.md` | pre-registered predictions (committed before any live run) |
| `experiments/agent-buildoff/builder-prompt.md` | the builder-agent prompt template |
| `experiments/agent-buildoff/README.md` | how to run, what it proves |
| `experiments/agent-buildoff/tests/*.test.ts` | vitest unit tests for harness machinery + both baseline apps |

**Phasing of the plan:** Tasks 1–3 build the substrate. Tasks 4–7 build the measurement instrument (TDD against a fake CLI — no tokens). Tasks 8–10 author the experiment inputs (specs, oracles, predictions). Tasks 11–13 build fault-injection, metrics, reporting, and orchestration. Task 14 is the live experiment run (token-expensive, non-deterministic). Task 15 is the README + final review.

---

## Task 1: Scaffold the sub-package

**Files:**
- Create: `experiments/agent-buildoff/package.json`
- Create: `experiments/agent-buildoff/tsconfig.json`
- Create: `experiments/agent-buildoff/.gitignore`
- Create: `experiments/agent-buildoff/vitest.config.ts`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "agent-buildoff",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "type-check": "tsc --noEmit",
    "build": "tsc",
    "test": "vitest --run",
    "experiment": "npm run build && node dist/harness/run.js"
  },
  "dependencies": {
    "fastify": "^5.0.0",
    "skeleton-crew": "file:../.."
  },
  "devDependencies": {
    "vitest": "^4.0.0",
    "@types/node": "^22.0.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": ".",
    "types": ["node"]
  },
  "include": ["mono-app/src/**/*", "scr-app/src/**/*", "harness/**/*"],
  "exclude": ["tests", "dist", ".sandboxes"]
}
```

- [ ] **Step 3: Create `.gitignore`**

```
node_modules/
dist/
RESULTS.md
.sandboxes/
package-lock.json
```

- [ ] **Step 4: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    pool: 'forks',
    poolOptions: { forks: { minForks: 1, maxForks: 4 } },
    testTimeout: 20000,
  },
});
```

- [ ] **Step 5: Install and verify**

Run: `cd experiments/agent-buildoff && npm install`
Expected: installs fastify, vitest, links local `skeleton-crew`. (If the parent dist is stale, run `npm run build` at the repo root first.)

- [ ] **Step 6: Commit**

```bash
git add experiments/agent-buildoff/package.json experiments/agent-buildoff/tsconfig.json experiments/agent-buildoff/.gitignore experiments/agent-buildoff/vitest.config.ts
git commit -m "chore(buildoff): scaffold agent-buildoff sub-package"
```

---

## Task 2: Monolith arm — shared store + 3 baseline features + server

**Files:**
- Create: `experiments/agent-buildoff/mono-app/src/store.ts`
- Create: `experiments/agent-buildoff/mono-app/src/features/members.ts`
- Create: `experiments/agent-buildoff/mono-app/src/features/tasks.ts`
- Create: `experiments/agent-buildoff/mono-app/src/features/activity.ts`
- Create: `experiments/agent-buildoff/mono-app/src/server.ts`
- Test: `experiments/agent-buildoff/tests/mono-baseline.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd experiments/agent-buildoff && npx vitest --run tests/mono-baseline.test.ts`
Expected: FAIL — cannot find `../mono-app/src/server.js`.

- [ ] **Step 3: Create `mono-app/src/store.ts`**

```ts
// The monolith's shared, mutable store. Every feature imports this module
// directly and mutates it — this is the coupling the experiment measures.
// `activity` is THE HOTSPOT: every feature appends to it.

export interface Member { id: string; name: string }
export interface Task { id: string; title: string; done: boolean }
export interface ActivityEntry { id: string; kind: string; at: number; data: Record<string, unknown> }

export interface Store {
  members: Map<string, Member>;
  tasks: Map<string, Task>;
  activity: ActivityEntry[];
  nextId: number;
}

let store: Store = freshStore();

function freshStore(): Store {
  return { members: new Map(), tasks: new Map(), activity: [], nextId: 1 };
}

/** Reset to a clean state — used by tests and between sandboxed runs. */
export function resetStore(): void {
  store = freshStore();
}

export function getStore(): Store {
  return store;
}

/** The hotspot writer. Monotonic id via the shared counter. */
export function recordActivity(kind: string, data: Record<string, unknown>): ActivityEntry {
  const s = getStore();
  const entry: ActivityEntry = { id: String(s.nextId++), kind, at: 0, data };
  s.activity.push(entry);
  return entry;
}
```

Note: `at: 0` (not `Date.now()`) keeps the activity feed deterministic for oracles. Ordering is by array position / id, not timestamp.

- [ ] **Step 4: Create `mono-app/src/features/members.ts`**

```ts
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
```

- [ ] **Step 5: Create `mono-app/src/features/tasks.ts`**

```ts
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
```

- [ ] **Step 6: Create `mono-app/src/features/activity.ts`**

```ts
import type { FastifyInstance } from 'fastify';
import { getStore } from '../store.js';

export function registerActivity(app: FastifyInstance): void {
  app.get('/activity', async () => getStore().activity);
}
```

- [ ] **Step 7: Create `mono-app/src/server.ts`**

```ts
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
```

- [ ] **Step 8: Run to verify it passes**

Run: `cd experiments/agent-buildoff && npx vitest --run tests/mono-baseline.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 9: Commit**

```bash
git add experiments/agent-buildoff/mono-app experiments/agent-buildoff/tests/mono-baseline.test.ts
git commit -m "feat(buildoff): monolith arm baseline (members/tasks/activity hotspot)"
```

---

## Task 3: SCR arm — store-plugin hotspot + 3 baseline plugins + host

**Files:**
- Create: `experiments/agent-buildoff/scr-app/src/store-plugin.ts`
- Create: `experiments/agent-buildoff/scr-app/src/plugins/members-plugin.ts`
- Create: `experiments/agent-buildoff/scr-app/src/plugins/tasks-plugin.ts`
- Create: `experiments/agent-buildoff/scr-app/src/plugins/activity-plugin.ts`
- Create: `experiments/agent-buildoff/scr-app/src/host.ts`
- Test: `experiments/agent-buildoff/tests/scr-baseline.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd experiments/agent-buildoff && npx vitest --run tests/scr-baseline.test.ts`
Expected: FAIL — cannot find `../scr-app/src/host.js`.

- [ ] **Step 3: Create `scr-app/src/store-plugin.ts`**

```ts
import type { PluginDefinition, RuntimeContext } from 'skeleton-crew';

// The SCR arm's hotspot. Instead of a shared mutable module, the activity feed
// is a `store` service plus an `activity:record` action other plugins call and
// an `activity:recorded` event they can react to. This is the enforced seam.

export interface Member { id: string; name: string }
export interface Task { id: string; title: string; done: boolean }
export interface ActivityEntry { id: string; kind: string; at: number; data: Record<string, unknown> }

export interface WorkspaceStore {
  members: Map<string, Member>;
  tasks: Map<string, Task>;
  activity: ActivityEntry[];
  nextId(): string;
}

export const storePlugin: PluginDefinition = {
  name: 'store',
  version: '1.0.0',
  setup(ctx: RuntimeContext) {
    let counter = 1;
    const store: WorkspaceStore = {
      members: new Map(),
      tasks: new Map(),
      activity: [],
      nextId: () => String(counter++),
    };
    ctx.services.register<WorkspaceStore>('store', store);

    // The hotspot writer, exposed as an action so any plugin can record
    // without importing the store module. Emits an event for reactors.
    ctx.actions.registerAction<{ kind: string; data: Record<string, unknown> }, ActivityEntry>({
      id: 'activity:record',
      handler: ({ kind, data }, c) => {
        const s = c.services.get<WorkspaceStore>('store');
        const entry: ActivityEntry = { id: s.nextId(), kind, at: 0, data };
        s.activity.push(entry);
        c.events.emit('activity:recorded', entry);
        return entry;
      },
    });
  },
};
```

- [ ] **Step 4: Create `scr-app/src/plugins/members-plugin.ts`**

```ts
import type { PluginDefinition, RuntimeContext } from 'skeleton-crew';
import type { WorkspaceStore, Member } from '../store-plugin.js';

export const membersPlugin: PluginDefinition = {
  name: 'members',
  version: '1.0.0',
  dependencies: ['store'],
  setup(ctx: RuntimeContext) {
    const store = () => ctx.services.get<WorkspaceStore>('store');

    ctx.actions.registerAction<{ name: string }, Member>({
      id: 'members:create',
      handler: async ({ name }, c) => {
        const s = store();
        const member: Member = { id: s.nextId(), name: name ?? 'unnamed' };
        s.members.set(member.id, member);
        await c.actions.runAction('activity:record', { kind: 'member.created', data: { id: member.id, name: member.name } });
        return member;
      },
    });

    ctx.actions.registerAction<undefined, Member[]>({
      id: 'members:list',
      handler: () => [...store().members.values()],
    });

    ctx.actions.registerAction<{ id: string }, Member | null>({
      id: 'members:get',
      handler: ({ id }) => store().members.get(id) ?? null,
    });
  },
};
```

- [ ] **Step 5: Create `scr-app/src/plugins/tasks-plugin.ts`**

```ts
import type { PluginDefinition, RuntimeContext } from 'skeleton-crew';
import type { WorkspaceStore, Task } from '../store-plugin.js';

export const tasksPlugin: PluginDefinition = {
  name: 'tasks',
  version: '1.0.0',
  dependencies: ['store'],
  setup(ctx: RuntimeContext) {
    const store = () => ctx.services.get<WorkspaceStore>('store');

    ctx.actions.registerAction<{ title: string }, Task>({
      id: 'tasks:create',
      handler: async ({ title }, c) => {
        const s = store();
        const task: Task = { id: s.nextId(), title: title ?? 'untitled', done: false };
        s.tasks.set(task.id, task);
        await c.actions.runAction('activity:record', { kind: 'task.created', data: { id: task.id, title: task.title } });
        return task;
      },
    });

    ctx.actions.registerAction<undefined, Task[]>({
      id: 'tasks:list',
      handler: () => [...store().tasks.values()],
    });

    ctx.actions.registerAction<{ id: string }, Task | null>({
      id: 'tasks:get',
      handler: ({ id }) => store().tasks.get(id) ?? null,
    });
  },
};
```

- [ ] **Step 6: Create `scr-app/src/plugins/activity-plugin.ts`**

```ts
import type { PluginDefinition, RuntimeContext } from 'skeleton-crew';
import type { WorkspaceStore, ActivityEntry } from '../store-plugin.js';

export const activityPlugin: PluginDefinition = {
  name: 'activity',
  version: '1.0.0',
  dependencies: ['store'],
  setup(ctx: RuntimeContext) {
    ctx.actions.registerAction<undefined, ActivityEntry[]>({
      id: 'activity:list',
      handler: (_p, c) => c.services.get<WorkspaceStore>('store').activity,
    });
  },
};
```

- [ ] **Step 7: Create `scr-app/src/host.ts`**

```ts
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
```

- [ ] **Step 8: Run to verify it passes**

Run: `cd experiments/agent-buildoff && npx vitest --run tests/scr-baseline.test.ts`
Expected: PASS (2 tests). (If `skeleton-crew` type imports fail, run `npm run build` at the repo root to refresh the local dist.)

- [ ] **Step 9: Commit**

```bash
git add experiments/agent-buildoff/scr-app experiments/agent-buildoff/tests/scr-baseline.test.ts
git commit -m "feat(buildoff): SCR arm baseline (store hotspot service + member/task/activity plugins)"
```

---

## Task 4: Harness types + agent-invoke (headless claude parser, TDD via fake CLI)

**Files:**
- Create: `experiments/agent-buildoff/harness/types.ts`
- Create: `experiments/agent-buildoff/harness/agent-invoke.ts`
- Create: `experiments/agent-buildoff/tests/fake-claude.mjs` (test fixture: a fake CLI)
- Test: `experiments/agent-buildoff/tests/agent-invoke.test.ts`

- [ ] **Step 1: Create the shared types `harness/types.ts`**

```ts
export type Arm = 'scr' | 'mono';

export interface AgentRunResult {
  ok: boolean;                 // process exited 0 AND a result envelope was seen
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  costUsd: number;
  numTurns: number;
  filesRead: string[];         // deduped, from Read/Grep/Glob tool_use file_path
  sessionId: string;
}

export interface OracleResult {
  feature: string;             // which feature this oracle belongs to (e.g. 'tasks', 'f1')
  name: string;
  pass: boolean;
  detail: string;
}

export interface FeatureRunMetrics {
  feature: string;
  arm: Arm;
  repeat: number;
  agent: AgentRunResult;
  filesTouched: string[];      // git/diff name-only in the sandbox
  oracleResults: OracleResult[];
  featureOraclePass: boolean;  // did THIS feature's own oracles all pass
  foreignBreakage: number;     // count of OTHER features' oracle failures
}
```

- [ ] **Step 2: Write the failing test `tests/agent-invoke.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { runAgent } from '../harness/agent-invoke.js';

const here = dirname(fileURLToPath(import.meta.url));
const fakeCli = join(here, 'fake-claude.mjs');

describe('runAgent (parses headless claude stream-json)', () => {
  it('extracts token usage, cost, and files read from the ndjson stream', async () => {
    const res = await runAgent({
      prompt: 'build f1',
      cwd: here,
      command: process.execPath,        // node
      baseArgs: [fakeCli, 'happy'],     // fake CLI scenario "happy"
    });
    expect(res.ok).toBe(true);
    expect(res.inputTokens).toBe(1000);
    expect(res.outputTokens).toBe(50);
    expect(res.costUsd).toBeCloseTo(0.25, 5);
    expect(res.numTurns).toBe(2);
    expect(res.sessionId).toBe('sess-123');
    // Read + Grep + Glob file_paths, deduped:
    expect(res.filesRead.sort()).toEqual(['a.ts', 'b.ts', 'c.ts']);
  });

  it('marks ok=false when no result envelope is emitted', async () => {
    const res = await runAgent({
      prompt: 'x', cwd: here, command: process.execPath, baseArgs: [fakeCli, 'noresult'],
    });
    expect(res.ok).toBe(false);
  });

  it('marks ok=false when the process exits non-zero', async () => {
    const res = await runAgent({
      prompt: 'x', cwd: here, command: process.execPath, baseArgs: [fakeCli, 'crash'],
    });
    expect(res.ok).toBe(false);
  });

  it('tolerates non-JSON noise lines without throwing', async () => {
    const res = await runAgent({
      prompt: 'x', cwd: here, command: process.execPath, baseArgs: [fakeCli, 'noisy'],
    });
    expect(res.ok).toBe(true);
    expect(res.inputTokens).toBe(1000);
  });
});
```

- [ ] **Step 3: Create the fake CLI fixture `tests/fake-claude.mjs`**

```js
// A fake `claude --print --output-format stream-json` for deterministic tests.
// Reads a scenario name from argv[2] and emits canned ndjson to stdout.
// Spends zero tokens. Consumes (and ignores) stdin so the parent can write a prompt.
import process from 'node:process';

const scenario = process.argv[2] ?? 'happy';
process.stdin.resume();
process.stdin.on('data', () => {});

function line(obj) { process.stdout.write(JSON.stringify(obj) + '\n'); }

function toolUse(name, input) {
  return { type: 'assistant', message: { content: [{ type: 'tool_use', name, input }] } };
}

const result = {
  type: 'result',
  usage: { input_tokens: 1000, output_tokens: 50, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
  total_cost_usd: 0.25,
  num_turns: 2,
  session_id: 'sess-123',
};

process.stdin.on('end', () => {
  if (scenario === 'crash') { process.exit(3); }
  if (scenario === 'happy' || scenario === 'noisy') {
    if (scenario === 'noisy') process.stdout.write('not json at all\n');
    line(toolUse('Read', { file_path: 'a.ts' }));
    line(toolUse('Read', { file_path: 'a.ts' }));     // duplicate → deduped
    line(toolUse('Grep', { file_path: 'b.ts', pattern: 'x' }));
    line(toolUse('Glob', { file_path: 'c.ts' }));
    line(toolUse('Edit', { file_path: 'd.ts' }));      // writes are NOT counted as reads
    line(result);
  } else if (scenario === 'noresult') {
    line(toolUse('Read', { file_path: 'a.ts' }));      // no result envelope
  }
  process.exit(0);
});
```

Note: the parser counts `Read`/`Grep`/`Glob` as reads; `Edit`/`Write` are excluded (they are *touches*, captured separately via git diff). The fixture asserts that distinction.

- [ ] **Step 4: Run to verify it fails**

Run: `cd experiments/agent-buildoff && npx vitest --run tests/agent-invoke.test.ts`
Expected: FAIL — cannot find `../harness/agent-invoke.js`.

- [ ] **Step 5: Implement `harness/agent-invoke.ts`**

```ts
import { spawn } from 'node:child_process';
import type { AgentRunResult } from './types.js';

const READ_TOOLS = new Set(['Read', 'Grep', 'Glob']);

export interface RunAgentOptions {
  prompt: string;
  cwd: string;
  /** The executable to run. Defaults to 'claude'. Tests inject node + fake CLI. */
  command?: string;
  /** Args before the standard flags. Tests pass [fakeCliPath, scenario]. */
  baseArgs?: string[];
  /** Extra claude flags (model, allowedTools, max-budget). Ignored by the fake. */
  extraArgs?: string[];
}

/**
 * Invoke a headless agent and parse its stream-json. Token usage + cost come
 * from the final `result` envelope; files read come from Read/Grep/Glob
 * `tool_use` entries. Never throws on a bad stream — returns ok=false instead,
 * so one failed build can't abort the whole experiment.
 */
export function runAgent(opts: RunAgentOptions): Promise<AgentRunResult> {
  const command = opts.command ?? 'claude';
  const args = [
    ...(opts.baseArgs ?? ['--print', '--output-format', 'stream-json', '--verbose']),
    ...(opts.extraArgs ?? []),
  ];

  return new Promise((resolve) => {
    const proc = spawn(command, args, { cwd: opts.cwd });
    const filesRead = new Set<string>();
    const res: AgentRunResult = {
      ok: false, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0,
      cacheCreationTokens: 0, costUsd: 0, numTurns: 0, filesRead: [], sessionId: '',
    };
    let buffer = '';
    let sawResult = false;

    const handleLine = (line: string): void => {
      if (!line.trim()) return;
      let obj: unknown;
      try { obj = JSON.parse(line); } catch { return; } // tolerate noise
      const o = obj as Record<string, any>;
      if (o.type === 'result') {
        sawResult = true;
        const u = o.usage ?? {};
        res.inputTokens = u.input_tokens ?? 0;
        res.outputTokens = u.output_tokens ?? 0;
        res.cacheReadTokens = u.cache_read_input_tokens ?? 0;
        res.cacheCreationTokens = u.cache_creation_input_tokens ?? 0;
        res.costUsd = o.total_cost_usd ?? 0;
        res.numTurns = o.num_turns ?? 0;
        res.sessionId = o.session_id ?? '';
      } else if (o.type === 'assistant' && Array.isArray(o.message?.content)) {
        for (const c of o.message.content) {
          if (c?.type === 'tool_use' && READ_TOOLS.has(c.name) && typeof c.input?.file_path === 'string') {
            filesRead.add(c.input.file_path);
          }
        }
      }
    };

    proc.stdout.on('data', (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const l of lines) handleLine(l);
    });
    proc.stderr.on('data', () => { /* CLI diagnostics; ignored */ });
    proc.on('error', () => resolve(res)); // spawn failed (e.g. claude not found)
    proc.on('close', (code) => {
      if (buffer) handleLine(buffer);
      res.filesRead = [...filesRead];
      res.ok = code === 0 && sawResult;
      resolve(res);
    });

    proc.stdin.write(opts.prompt);
    proc.stdin.end();
  });
}
```

- [ ] **Step 6: Run to verify it passes**

Run: `cd experiments/agent-buildoff && npx vitest --run tests/agent-invoke.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 7: Commit**

```bash
git add experiments/agent-buildoff/harness/types.ts experiments/agent-buildoff/harness/agent-invoke.ts experiments/agent-buildoff/tests/agent-invoke.test.ts experiments/agent-buildoff/tests/fake-claude.mjs
git commit -m "feat(buildoff): headless-claude invoker with token + files-read capture (TDD via fake CLI)"
```

---

## Task 5: Sandbox — per-run arm copy + landing

**Files:**
- Create: `experiments/agent-buildoff/harness/sandbox.ts`
- Test: `experiments/agent-buildoff/tests/sandbox.test.ts`

Rationale: each measurement run must start from the same clean arm source so K repeats don't contaminate each other. We copy the arm's `src/` into a throwaway dir under `.sandboxes/`, symlink the arm's `node_modules` (deps are identical, copying is heavy), run the agent there, measure, then discard. "Landing" a chosen run copies its `src/` back over the arm.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, afterEach } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createSandbox, landSandbox } from '../harness/sandbox.js';

const cleanups: Array<() => void> = [];
afterEach(() => { cleanups.forEach((c) => c()); cleanups.length = 0; });

function makeFakeArm(): string {
  const arm = mkdtempSync(join(tmpdir(), 'arm-'));
  mkdirSync(join(arm, 'src'));
  writeFileSync(join(arm, 'src', 'a.ts'), 'export const a = 1;\n');
  cleanups.push(() => rmSync(arm, { recursive: true, force: true }));
  return arm;
}

describe('sandbox', () => {
  it('copies arm src into an isolated dir; edits there do not touch the arm', () => {
    const arm = makeFakeArm();
    const sb = createSandbox(arm, join(arm, '.sb'));
    cleanups.push(sb.cleanup);
    writeFileSync(join(sb.dir, 'src', 'a.ts'), 'export const a = 2;\n');
    expect(readFileSync(join(arm, 'src', 'a.ts'), 'utf8')).toContain('= 1'); // arm untouched
    expect(readFileSync(join(sb.dir, 'src', 'a.ts'), 'utf8')).toContain('= 2');
  });

  it('lands a sandbox back onto the arm', () => {
    const arm = makeFakeArm();
    const sb = createSandbox(arm, join(arm, '.sb'));
    cleanups.push(sb.cleanup);
    writeFileSync(join(sb.dir, 'src', 'a.ts'), 'export const a = 99;\n');
    landSandbox(sb.dir, arm);
    expect(readFileSync(join(arm, 'src', 'a.ts'), 'utf8')).toContain('= 99');
  });

  it('cleanup removes the sandbox dir', () => {
    const arm = makeFakeArm();
    const sb = createSandbox(arm, join(arm, '.sb'));
    sb.cleanup();
    expect(existsSync(sb.dir)).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd experiments/agent-buildoff && npx vitest --run tests/sandbox.test.ts`
Expected: FAIL — cannot find `../harness/sandbox.js`.

- [ ] **Step 3: Implement `harness/sandbox.ts`**

```ts
import { cpSync, rmSync, mkdirSync, existsSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';

export interface Sandbox {
  dir: string;
  cleanup: () => void;
}

/**
 * Copy an arm's `src/` (and tsconfig/package.json if present) into an isolated
 * sandbox dir. node_modules is symlinked when present (deps are identical and
 * copying is heavy). Returns the sandbox dir + a cleanup fn.
 */
export function createSandbox(armDir: string, sandboxDir: string): Sandbox {
  rmSync(sandboxDir, { recursive: true, force: true });
  mkdirSync(sandboxDir, { recursive: true });
  cpSync(join(armDir, 'src'), join(sandboxDir, 'src'), { recursive: true });
  for (const f of ['tsconfig.json', 'package.json']) {
    if (existsSync(join(armDir, f))) cpSync(join(armDir, f), join(sandboxDir, f));
  }
  const nm = join(armDir, 'node_modules');
  if (existsSync(nm)) {
    try { symlinkSync(nm, join(sandboxDir, 'node_modules'), 'junction'); } catch { /* best effort */ }
  }
  return { dir: sandboxDir, cleanup: () => rmSync(sandboxDir, { recursive: true, force: true }) };
}

/** Copy a sandbox's `src/` back over the arm — promotes a chosen run. */
export function landSandbox(sandboxDir: string, armDir: string): void {
  rmSync(join(armDir, 'src'), { recursive: true, force: true });
  cpSync(join(sandboxDir, 'src'), join(armDir, 'src'), { recursive: true });
}
```

Note on Windows: `symlinkSync(..., 'junction')` works for directories without admin rights. The `try/catch` degrades gracefully; if the link fails the build step in a sandbox would fail and the run is recorded `ok=false` — visible, not silent.

- [ ] **Step 4: Run to verify it passes**

Run: `cd experiments/agent-buildoff && npx vitest --run tests/sandbox.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add experiments/agent-buildoff/harness/sandbox.ts experiments/agent-buildoff/tests/sandbox.test.ts
git commit -m "feat(buildoff): per-run sandbox copy + landing"
```

---

## Task 6: Oracle runner — boot an arm, run the suite, classify breakage

**Files:**
- Create: `experiments/agent-buildoff/harness/oracle-runner.ts`
- Test: `experiments/agent-buildoff/tests/oracle-runner.test.ts`

The frozen oracles (Task 9) are arm-agnostic black-box HTTP checks grouped by feature. This runner takes a base URL + a feature registry, runs them, and computes `featureOraclePass` and `foreignBreakage` for a target feature.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { runOracles, summarize, type Oracle } from '../harness/oracle-runner.js';

const oracles: Oracle[] = [
  { feature: 'tasks', name: 'list ok', run: async () => ({ pass: true, detail: 'ok' }) },
  { feature: 'f1', name: 'comment ok', run: async () => ({ pass: false, detail: 'boom' }) },
  { feature: 'f2', name: 'mention ok', run: async () => ({ pass: true, detail: 'ok' }) },
];

describe('oracle-runner', () => {
  it('runs every oracle and tags results with their feature', async () => {
    const results = await runOracles('http://x', oracles);
    expect(results).toHaveLength(3);
    expect(results.find((r) => r.feature === 'f1')!.pass).toBe(false);
  });

  it('summarize computes featureOraclePass and foreignBreakage for a target', async () => {
    const results = await runOracles('http://x', oracles);
    const s = summarize(results, 'tasks');
    expect(s.featureOraclePass).toBe(true);       // tasks' own oracle passed
    expect(s.foreignBreakage).toBe(1);            // f1 broke (foreign to tasks)
  });

  it('an oracle that throws is recorded as a failure, not a crash', async () => {
    const boom: Oracle[] = [{ feature: 'x', name: 'throws', run: async () => { throw new Error('nope'); } }];
    const results = await runOracles('http://x', boom);
    expect(results[0].pass).toBe(false);
    expect(results[0].detail).toContain('nope');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd experiments/agent-buildoff && npx vitest --run tests/oracle-runner.test.ts`
Expected: FAIL — cannot find `../harness/oracle-runner.js`.

- [ ] **Step 3: Implement `harness/oracle-runner.ts`**

```ts
import type { OracleResult } from './types.js';

export interface Oracle {
  feature: string;
  name: string;
  run: (baseUrl: string) => Promise<{ pass: boolean; detail: string }>;
}

/** Run every oracle against a base URL; a throw becomes a failure result. */
export async function runOracles(baseUrl: string, oracles: Oracle[]): Promise<OracleResult[]> {
  const out: OracleResult[] = [];
  for (const o of oracles) {
    try {
      const r = await o.run(baseUrl);
      out.push({ feature: o.feature, name: o.name, pass: r.pass, detail: r.detail });
    } catch (err) {
      out.push({ feature: o.feature, name: o.name, pass: false, detail: err instanceof Error ? err.message : String(err) });
    }
  }
  return out;
}

/** For a target feature: did its own oracles pass, and how many OTHER
 *  features' oracles broke (the blast-radius signal). */
export function summarize(results: OracleResult[], targetFeature: string): { featureOraclePass: boolean; foreignBreakage: number } {
  const own = results.filter((r) => r.feature === targetFeature);
  const foreign = results.filter((r) => r.feature !== targetFeature);
  return {
    featureOraclePass: own.length > 0 && own.every((r) => r.pass),
    foreignBreakage: foreign.filter((r) => !r.pass).length,
  };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd experiments/agent-buildoff && npx vitest --run tests/oracle-runner.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add experiments/agent-buildoff/harness/oracle-runner.ts experiments/agent-buildoff/tests/oracle-runner.test.ts
git commit -m "feat(buildoff): oracle runner with foreign-breakage classification"
```

---

## Task 7: Metrics — median/spread, crossover index

**Files:**
- Create: `experiments/agent-buildoff/harness/metrics.ts`
- Test: `experiments/agent-buildoff/tests/metrics.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { median, spread, cumulative, crossoverIndex } from '../harness/metrics.js';

describe('metrics', () => {
  it('median of odd and even sets', () => {
    expect(median([5, 1, 3])).toBe(3);
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  it('spread is max minus min', () => {
    expect(spread([10, 4, 7])).toBe(6);
  });

  it('cumulative sums a series', () => {
    expect(cumulative([2, 3, 5])).toEqual([2, 5, 10]);
  });

  it('crossoverIndex is the first feature index where SCR cumulative < mono cumulative', () => {
    // SCR pricier early (ceremony), cheaper later (containment)
    const scr =  [100, 90, 80, 70];   // cumulative: 100,190,270,340
    const mono = [60, 80, 120, 200];  // cumulative: 60,140,260,460
    expect(crossoverIndex(scr, mono)).toBe(3); // at index 3, 340 < 460
  });

  it('crossoverIndex returns -1 when SCR never overtakes', () => {
    expect(crossoverIndex([100, 100], [10, 10])).toBe(-1);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd experiments/agent-buildoff && npx vitest --run tests/metrics.test.ts`
Expected: FAIL — cannot find `../harness/metrics.js`.

- [ ] **Step 3: Implement `harness/metrics.ts`**

```ts
export function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
}

export function spread(xs: number[]): number {
  if (xs.length === 0) return 0;
  return Math.max(...xs) - Math.min(...xs);
}

export function cumulative(xs: number[]): number[] {
  const out: number[] = [];
  let acc = 0;
  for (const x of xs) { acc += x; out.push(acc); }
  return out;
}

/** First feature index (0-based) where SCR cumulative cost drops below mono's.
 *  -1 if SCR never overtakes within the series. Series must be equal length. */
export function crossoverIndex(scrPerFeature: number[], monoPerFeature: number[]): number {
  const scr = cumulative(scrPerFeature);
  const mono = cumulative(monoPerFeature);
  const n = Math.min(scr.length, mono.length);
  for (let i = 0; i < n; i++) {
    if (scr[i] < mono[i]) return i;
  }
  return -1;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd experiments/agent-buildoff && npx vitest --run tests/metrics.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add experiments/agent-buildoff/harness/metrics.ts experiments/agent-buildoff/tests/metrics.test.ts
git commit -m "feat(buildoff): metrics — median/spread/cumulative/crossover"
```

---

## Task 8: Backlog feature specs + builder prompt template

**Files:**
- Create: `experiments/agent-buildoff/backlog/f1-comments.md` … `f8-digest.md`
- Create: `experiments/agent-buildoff/backlog/modify.md`
- Create: `experiments/agent-buildoff/backlog/parallel-a.md`, `parallel-b.md`
- Create: `experiments/agent-buildoff/builder-prompt.md`

These are content files (no code/tests). Each feature spec is **arm-agnostic** — it describes the HTTP behavior, never the implementation strategy. The builder prompt (Task 14) appends arm-specific convention notes.

- [ ] **Step 1: Write `backlog/f1-comments.md`**

```markdown
# Feature f1: Comments on tasks

Add the ability to comment on a task.

- `POST /tasks/:id/comments` with body `{ "author": string, "text": string }` →
  201 with `{ "id": string, "taskId": string, "author": string, "text": string }`.
  404 if the task does not exist.
- `GET /tasks/:id/comments` → 200 with an array of that task's comments (in
  creation order). 404 if the task does not exist.
- Creating a comment MUST record an activity entry of kind `comment.created`
  with data `{ taskId, commentId }`.
```

- [ ] **Step 2: Write `backlog/f2-mentions.md`**

```markdown
# Feature f2: Mentions

When a comment's text contains `@<member-name>` for an existing member, record
a mention.

- On comment creation (f1), scan the text for `@name` tokens. For each token
  matching an existing member's name, record an activity entry of kind
  `mention.created` with data `{ commentId, memberId }`.
- `GET /members/:id/mentions` → 200 with an array of `{ commentId }` for that
  member (creation order). 404 if the member does not exist.
```

- [ ] **Step 3: Write `backlog/f3-assignment.md`**

```markdown
# Feature f3: Task assignment

Assign a task to a member.

- `POST /tasks/:id/assign` with body `{ "memberId": string }` → 200 with the
  updated task including `{ "assigneeId": string }`. 404 if task or member is
  missing.
- `GET /tasks/:id` MUST now include `assigneeId` (null when unassigned).
- Assignment MUST record an activity entry of kind `task.assigned` with data
  `{ taskId, memberId }`.
```

- [ ] **Step 4: Write `backlog/f4-notifications.md`**

```markdown
# Feature f4: Notifications

Maintain a per-member notification list driven by activity.

- React to `mention.created` activity: append a notification to the mentioned
  member's list with `{ kind: "mention", commentId }`.
- React to `task.assigned` activity: append a notification to the assignee's
  list with `{ kind: "assignment", taskId }`.
- `GET /members/:id/notifications` → 200 with that member's notifications
  (creation order). 404 if the member does not exist.

Notifications MUST be produced by reacting to activity, not by callers invoking
notifications directly.
```

- [ ] **Step 5: Write `backlog/f5-tags.md`**

```markdown
# Feature f5: Tags

Tag tasks with free-form labels.

- `POST /tasks/:id/tags` with body `{ "tag": string }` → 200 with the updated
  task including `{ "tags": string[] }` (deduped, insertion order). 404 if the
  task is missing.
- `GET /tasks/:id` MUST include `tags` (empty array when none).
- `GET /tags/:tag/tasks` → 200 with the array of tasks carrying that tag.
- Tagging MUST record an activity entry of kind `task.tagged` with data
  `{ taskId, tag }`.
```

- [ ] **Step 6: Write `backlog/f6-search.md`**

```markdown
# Feature f6: Search

Search across tasks and comments.

- `GET /search?q=<term>` → 200 with `{ "tasks": Task[], "comments": Comment[] }`
  where tasks match on title (case-insensitive substring) and comments match on
  text. Empty term returns empty arrays.
- Search MUST read existing tasks (baseline) and comments (f1); it adds no new
  state and records no activity.
```

- [ ] **Step 7: Write `backlog/f7-reactions.md`**

```markdown
# Feature f7: Reactions

React to activity entries with an emoji.

- `POST /activity/:id/reactions` with body `{ "memberId": string, "emoji": string }`
  → 201 with `{ "activityId": string, "memberId": string, "emoji": string }`.
  404 if the activity entry or member is missing.
- `GET /activity/:id/reactions` → 200 with the array of reactions for that
  entry. 404 if the entry is missing.
- Adding a reaction MUST itself record an activity entry of kind
  `reaction.added` with data `{ activityId, emoji }`.
```

- [ ] **Step 8: Write `backlog/f8-digest.md`**

```markdown
# Feature f8: Digest

Aggregate a per-member digest across features.

- `GET /members/:id/digest` → 200 with
  `{ "memberId": string, "mentions": number, "assignments": number, "notifications": number }`
  computed from existing state: `mentions` = count of that member's mentions
  (f2), `assignments` = count of tasks assigned to them (f3), `notifications`
  = length of their notification list (f4). 404 if the member is missing.
- Digest reads only; it records no activity and adds no new state.
```

- [ ] **Step 9: Write `backlog/modify.md`** (Phase 2 — the modification money shot)

```markdown
# Modification: tasks gain a required `priority`

Change the `tasks` feature so every task has a `priority` of `"low" | "med" | "high"`.

- `POST /tasks` body now accepts `{ "title": string, "priority": "low"|"med"|"high" }`.
  If `priority` is omitted, default to `"med"`.
- `GET /tasks` and `GET /tasks/:id` MUST include `priority`.
- The `task.created` activity entry's data MUST include `priority`.
- All existing task-related features (assignment f3, tags f5, search f6, comments
  f1) MUST continue to pass their oracles unchanged.
```

- [ ] **Step 10: Write `backlog/parallel-a.md` and `backlog/parallel-b.md`** (Phase 3 — both touch the hotspot)

`parallel-a.md`:
```markdown
# Parallel A: Activity pagination

- `GET /activity?limit=<n>&offset=<m>` → 200 with at most `n` activity entries
  starting at offset `m` (defaults: limit 50, offset 0). Order unchanged.
- This feature reads and shapes the activity hotspot. It records no new activity.
```

`parallel-b.md`:
```markdown
# Parallel B: Activity filtering by kind

- `GET /activity?kind=<k>` → 200 with only the activity entries whose `kind`
  equals `k` (order unchanged). When `kind` is absent, behavior is unchanged.
- This feature reads and shapes the activity hotspot. It records no new activity.
```

Note: A and B both modify the `/activity` read path — the contended hotspot. In the monolith they edit the same handler/module; in SCR they touch the `activity` plugin. The phase records whether contention surfaced as a silent clobber (one feature's behavior lost) or a loud, local conflict.

- [ ] **Step 11: Write `builder-prompt.md`** (the template; `{{...}}` filled by the harness)

```markdown
You are implementing ONE feature in an existing app. Implement exactly what the
spec says — no more, no less. Do not refactor unrelated code.

## Feature spec
{{FEATURE_SPEC}}

## Architecture convention for THIS codebase
{{ARM_CONVENTION}}

## Rules
- Make only the changes needed for this one feature.
- The app already has baseline features (members, tasks, activity) and possibly
  earlier features; reuse their data — do not duplicate it.
- Do not edit tests. Do not read or look for any file named *.oracle.* — there
  are none in this directory.
- When done, ensure the project type-checks (`npm run type-check` if available).
```

The two `{{ARM_CONVENTION}}` strings (filled by `phases.ts`):
- **SCR:** "Features are SCR plugins. Add a plugin file under `src/plugins/`, register it in `src/host.ts`, and add Fastify route shim(s) in `src/host.ts` that call `runtime.runAction`. Reach other features only via `ctx.services`, `ctx.actions.runAction`, and `ctx.events`. Record activity by calling the `activity:record` action; react to activity via the `activity:recorded` event."
- **Mono:** "Features are Fastify route modules. Add a `src/features/<name>.ts` exporting a `register<Name>(app)` function and wire it in `src/server.ts`. Share state via the `src/store.ts` module. Record activity by calling `recordActivity(kind, data)` from `src/store.ts`."

- [ ] **Step 12: Commit**

```bash
git add experiments/agent-buildoff/backlog experiments/agent-buildoff/builder-prompt.md
git commit -m "docs(buildoff): backlog feature specs + builder prompt template"
```

---

## Task 9: Frozen oracle suite (baseline + f1–f8)

**Files:**
- Create: `experiments/agent-buildoff/harness/oracles/baseline.oracle.ts`
- Create: `experiments/agent-buildoff/harness/oracles/features.oracle.ts`
- Create: `experiments/agent-buildoff/harness/oracles/index.ts`
- Test: `experiments/agent-buildoff/tests/oracles-shape.test.ts`

The oracles are black-box `fetch`-based HTTP checks, grouped by feature, arm-agnostic. They are RED until an agent builds the feature — that's expected. We unit-test only their *shape/registry* here (that every backlog feature has at least one oracle), not their pass/fail (which requires a live arm).

A small helper keeps each oracle terse.

- [ ] **Step 1: Write the failing shape test**

```ts
import { describe, it, expect } from 'vitest';
import { ALL_ORACLES } from '../harness/oracles/index.js';

describe('frozen oracle suite shape', () => {
  it('covers every baseline and backlog feature', () => {
    const features = new Set(ALL_ORACLES.map((o) => o.feature));
    for (const f of ['members', 'tasks', 'activity', 'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8']) {
      expect(features.has(f)).toBe(true);
    }
  });

  it('every oracle has a feature, name, and run fn', () => {
    for (const o of ALL_ORACLES) {
      expect(typeof o.feature).toBe('string');
      expect(typeof o.name).toBe('string');
      expect(typeof o.run).toBe('function');
    }
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd experiments/agent-buildoff && npx vitest --run tests/oracles-shape.test.ts`
Expected: FAIL — cannot find `../harness/oracles/index.js`.

- [ ] **Step 3: Implement `harness/oracles/baseline.oracle.ts`**

```ts
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
```

- [ ] **Step 4: Implement `harness/oracles/features.oracle.ts`** (one+ oracle per backlog feature)

```ts
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
```

- [ ] **Step 5: Implement `harness/oracles/index.ts`**

```ts
import { baselineOracles } from './baseline.oracle.js';
import { featureOracles } from './features.oracle.js';
import type { Oracle } from '../oracle-runner.js';

export const ALL_ORACLES: Oracle[] = [...baselineOracles, ...featureOracles];
```

- [ ] **Step 6: Run to verify it passes**

Run: `cd experiments/agent-buildoff && npx vitest --run tests/oracles-shape.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 7: Verify baseline oracles pass against a live arm** (sanity — proves the oracle plumbing works end-to-end against real HTTP)

Add to the SAME test file:

```ts
import { runOracles } from '../harness/oracle-runner.js';
import { baselineOracles } from '../harness/oracles/baseline.oracle.js';
import { buildMonoServer } from '../mono-app/src/server.js';
import { resetStore } from '../mono-app/src/store.js';

describe('baseline oracles against the live mono arm', () => {
  it('all baseline oracles pass on the seeded monolith', async () => {
    resetStore();
    const app = buildMonoServer();
    const base = await app.listen({ port: 0, host: '127.0.0.1' });
    const results = await runOracles(base, baselineOracles);
    await app.close();
    expect(results.every((r) => r.pass)).toBe(true);
  });
});
```

Run: `cd experiments/agent-buildoff && npx vitest --run tests/oracles-shape.test.ts`
Expected: PASS (3 tests). The baseline oracles are green against the monolith; the f1–f8 oracles will be red until agents build them — that is correct and intended.

- [ ] **Step 8: Commit**

```bash
git add experiments/agent-buildoff/harness/oracles experiments/agent-buildoff/tests/oracles-shape.test.ts
git commit -m "feat(buildoff): frozen arm-agnostic oracle suite (baseline green, f1-f8 pending)"
```

---

## Task 10: Fault injection (Phase 4 — deterministic, no agents)

**Files:**
- Create: `experiments/agent-buildoff/harness/faults.ts`
- Test: `experiments/agent-buildoff/tests/faults.test.ts`

Phase 4 injects faults into a feature OTHERS depend on (the `store`/activity hotspot — `tasks`/`activity` sit on its path), then measures cross-feature breakage. We test the *injectors and their containment contract* directly, deterministically, with no agents. Two injectors that demonstrate the SCR-vs-mono containment difference at the runtime level:

1. **Colliding registration** — a second feature tries to own an already-owned id/route. SCR rejects with `DuplicateRegistrationError` (loud, contained); the monolith silently lets the later registration shadow/duplicate (or throws an unrelated error). 
2. **Throwing-on-write hotspot** — the activity writer throws. In SCR the throw is contained to the calling action (one request 500s, others fine); in the monolith a thrown shared-writer can corrupt the shared array mid-push for concurrent callers.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { Runtime } from 'skeleton-crew';
import { collidingRegistrationOutcome, throwingHotspotContained } from '../harness/faults.js';

describe('fault injection — SCR containment contract', () => {
  it('a colliding action registration is rejected loudly by SCR', async () => {
    const outcome = await collidingRegistrationOutcome();
    expect(outcome.rejected).toBe(true);
    expect(outcome.errorName).toBe('DuplicateRegistrationError');
  });

  it('a throwing hotspot write is contained to the caller, not the runtime', async () => {
    const contained = await throwingHotspotContained();
    expect(contained.callerThrew).toBe(true);     // the bad call failed
    expect(contained.runtimeAlive).toBe(true);     // other actions still work
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd experiments/agent-buildoff && npx vitest --run tests/faults.test.ts`
Expected: FAIL — cannot find `../harness/faults.js`.

- [ ] **Step 3: Implement `harness/faults.ts`**

```ts
import { Runtime, type Logger } from 'skeleton-crew';

const silent = (): Logger => ({ debug: () => {}, info: () => {}, warn: () => {}, error: () => {} });

/** Inject a colliding action registration into a fresh runtime and report how
 *  the runtime responds. SCR's registries reject a duplicate id loudly. */
export async function collidingRegistrationOutcome(): Promise<{ rejected: boolean; errorName: string }> {
  const rt = new Runtime({ logger: silent() });
  rt.registerPlugin({
    name: 'owner', version: '1.0.0',
    setup(ctx) { ctx.actions.registerAction({ id: 'hotspot:write', handler: () => 'ok' }); },
  });
  rt.registerPlugin({
    name: 'colliug', version: '1.0.0',
    setup(ctx) { ctx.actions.registerAction({ id: 'hotspot:write', handler: () => 'HIJACK' }); },
  });
  try {
    await rt.initialize();
    await rt.shutdown();
    return { rejected: false, errorName: '' };
  } catch (err) {
    await rt.shutdown().catch(() => {});
    return { rejected: true, errorName: err instanceof Error ? err.constructor.name : 'unknown' };
  }
}

/** A hotspot writer that throws. Confirm the throw is contained to the calling
 *  action and the runtime keeps serving other actions. */
export async function throwingHotspotContained(): Promise<{ callerThrew: boolean; runtimeAlive: boolean }> {
  const rt = new Runtime({ logger: silent() });
  rt.registerPlugin({
    name: 'hotspot', version: '1.0.0',
    setup(ctx) {
      ctx.actions.registerAction({ id: 'hotspot:write', handler: () => { throw new Error('boom'); } });
      ctx.actions.registerAction({ id: 'hotspot:read', handler: () => 'alive' });
    },
  });
  await rt.initialize();
  const ctx = rt.getContext();
  let callerThrew = false;
  try { await ctx.actions.runAction('hotspot:write', {}); } catch { callerThrew = true; }
  const stillWorks = await ctx.actions.runAction('hotspot:read', {});
  await rt.shutdown();
  return { callerThrew, runtimeAlive: stillWorks === 'alive' };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd experiments/agent-buildoff && npx vitest --run tests/faults.test.ts`
Expected: PASS (2 tests). (If `skeleton-crew` types are stale, `npm run build` at repo root.)

- [ ] **Step 5: Commit**

```bash
git add experiments/agent-buildoff/harness/faults.ts experiments/agent-buildoff/tests/faults.test.ts
git commit -m "feat(buildoff): deterministic fault-injection containment probes"
```

---

## Task 11: RESULTS.md renderer

**Files:**
- Create: `experiments/agent-buildoff/harness/report.ts`
- Test: `experiments/agent-buildoff/tests/report.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { renderResults, type ExperimentResults } from '../harness/report.js';

const sample: ExperimentResults = {
  model: 'claude-opus-4-8',
  repeats: 3,
  perFeature: [
    { feature: 'f1', scrTokensMedian: 1200, monoTokensMedian: 900, scrSurface: 3, monoSurface: 5, scrForeignBreak: 0, monoForeignBreak: 0 },
    { feature: 'f2', scrTokensMedian: 1100, monoTokensMedian: 1300, scrSurface: 3, monoSurface: 7, scrForeignBreak: 0, monoForeignBreak: 1 },
  ],
  crossoverIndex: 1,
  modification: { scrFilesOutsideTarget: 0, monoFilesOutsideTarget: 4, scrForeignBreak: 0, monoForeignBreak: 2 },
  parallel: { scrClass: 'loud-and-local', monoClass: 'silent', scrError: 'DuplicateRegistrationError', monoError: '' },
  faults: { collidingRejected: true, throwContained: true },
  predictions: [
    { claim: 'SCR cheaper by f8', predicted: 'yes', observed: 'yes', hit: true },
    { claim: 'mono blast radius grows', predicted: 'yes', observed: 'yes', hit: true },
  ],
};

describe('renderResults', () => {
  it('renders the headline sections', () => {
    const md = renderResults(sample);
    expect(md).toContain('# Agent Build-Off — Results');
    expect(md).toContain('| f1 |');
    expect(md).toContain('Crossover');
    expect(md).toContain('loud-and-local');
    expect(md).toContain('Predictions');
  });

  it('notes when there is no crossover', () => {
    const md = renderResults({ ...sample, crossoverIndex: -1 });
    expect(md).toContain('no crossover');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd experiments/agent-buildoff && npx vitest --run tests/report.test.ts`
Expected: FAIL — cannot find `../harness/report.js`.

- [ ] **Step 3: Implement `harness/report.ts`**

```ts
export interface PerFeatureRow {
  feature: string;
  scrTokensMedian: number; monoTokensMedian: number;
  scrSurface: number; monoSurface: number;
  scrForeignBreak: number; monoForeignBreak: number;
}

export interface ExperimentResults {
  model: string;
  repeats: number;
  perFeature: PerFeatureRow[];
  crossoverIndex: number; // -1 = none
  modification: { scrFilesOutsideTarget: number; monoFilesOutsideTarget: number; scrForeignBreak: number; monoForeignBreak: number };
  parallel: { scrClass: string; monoClass: string; scrError: string; monoError: string };
  faults: { collidingRejected: boolean; throwContained: boolean };
  predictions: Array<{ claim: string; predicted: string; observed: string; hit: boolean }>;
}

export function renderResults(r: ExperimentResults): string {
  const rows = r.perFeature.map((f) =>
    `| ${f.feature} | ${f.scrTokensMedian} | ${f.monoTokensMedian} | ${f.scrSurface} | ${f.monoSurface} | ${f.scrForeignBreak} | ${f.monoForeignBreak} |`
  ).join('\n');

  const crossover = r.crossoverIndex < 0
    ? `**no crossover** within ${r.perFeature.length} features — SCR's overhead did not amortize at this app size.`
    : `**Crossover at feature index ${r.crossoverIndex}** (\`${r.perFeature[r.crossoverIndex]?.feature}\`): SCR cumulative cost drops below the monolith here.`;

  const preds = r.predictions.map((p) =>
    `| ${p.claim} | ${p.predicted} | ${p.observed} | ${p.hit ? '✅' : '❌'} |`
  ).join('\n');

  return `# Agent Build-Off — Results

Model: \`${r.model}\` · repeats (Phase 1): ${r.repeats} · tokens are medians over repeats.

## Phase 1 — Sequential build-off (per feature)

| Feature | SCR tokens | Mono tokens | SCR read-surface | Mono read-surface | SCR foreign-break | Mono foreign-break |
|---|---|---|---|---|---|---|
${rows}

${crossover}

## Phase 2 — Modification blast radius

| Arm | Files touched outside target | Foreign oracle breaks |
|---|---|---|
| SCR | ${r.modification.scrFilesOutsideTarget} | ${r.modification.scrForeignBreak} |
| Mono | ${r.modification.monoFilesOutsideTarget} | ${r.modification.monoForeignBreak} |

## Phase 3 — Parallel contention on the hotspot

| Arm | Outcome class | Attributable error |
|---|---|---|
| SCR | ${r.parallel.scrClass} | ${r.parallel.scrError || '—'} |
| Mono | ${r.parallel.monoClass} | ${r.parallel.monoError || '—'} |

## Phase 4 — Fault containment (deterministic)

- Colliding registration rejected loudly by SCR: ${r.faults.collidingRejected ? '✅' : '❌'}
- Throwing hotspot write contained to caller: ${r.faults.throwContained ? '✅' : '❌'}

## Predictions (pre-registered)

| Claim | Predicted | Observed | Hit |
|---|---|---|---|
${preds}

> A null or pro-monolith result is a valid finding. Read this as a *trend* over
> a single K-repeated run, not a statistical proof. Phases 1–3 are
> non-deterministic; Phase 4 is deterministic.
`;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd experiments/agent-buildoff && npx vitest --run tests/report.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add experiments/agent-buildoff/harness/report.ts experiments/agent-buildoff/tests/report.test.ts
git commit -m "feat(buildoff): RESULTS.md renderer"
```

---

## Task 12: Phase orchestration + run entry

**Files:**
- Create: `experiments/agent-buildoff/harness/phases.ts`
- Create: `experiments/agent-buildoff/harness/run.ts`
- Test: `experiments/agent-buildoff/tests/phases.test.ts`

`phases.ts` wires the pieces. The pure, decision-making parts are unit-tested (which run to LAND, how a parallel outcome is CLASSIFIED). The live build loop and server boot are exercised by Task 14, not unit tests.

- [ ] **Step 1: Write the failing test (the two pure decisions)**

```ts
import { describe, it, expect } from 'vitest';
import { chooseLanding, classifyParallel } from '../harness/phases.js';
import type { FeatureRunMetrics } from '../harness/types.js';

function run(partial: Partial<FeatureRunMetrics>): FeatureRunMetrics {
  return {
    feature: 'f1', arm: 'scr', repeat: 0,
    agent: { ok: true, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0, costUsd: 0, numTurns: 0, filesRead: [], sessionId: '' },
    filesTouched: [], oracleResults: [], featureOraclePass: false, foreignBreakage: 0, ...partial,
  };
}

describe('phases pure decisions', () => {
  it('chooseLanding picks the first run whose feature oracles pass', () => {
    const runs = [run({ repeat: 0, featureOraclePass: false }), run({ repeat: 1, featureOraclePass: true }), run({ repeat: 2, featureOraclePass: true })];
    expect(chooseLanding(runs)?.repeat).toBe(1);
  });

  it('chooseLanding returns null when no run passed (flagged by caller)', () => {
    const runs = [run({ featureOraclePass: false }), run({ featureOraclePass: false })];
    expect(chooseLanding(runs)).toBeNull();
  });

  it('classifyParallel: a duplicate-registration error is loud-and-local', () => {
    const c = classifyParallel({ bothApplied: true, errorName: 'DuplicateRegistrationError', behaviorLost: false });
    expect(c.cls).toBe('loud-and-local');
  });

  it('classifyParallel: lost behavior with no error is silent', () => {
    const c = classifyParallel({ bothApplied: true, errorName: '', behaviorLost: true });
    expect(c.cls).toBe('silent');
  });

  it('classifyParallel: clean compose is loud-and-local (no loss, no error)', () => {
    const c = classifyParallel({ bothApplied: true, errorName: '', behaviorLost: false });
    expect(c.cls).toBe('loud-and-local');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd experiments/agent-buildoff && npx vitest --run tests/phases.test.ts`
Expected: FAIL — cannot find `../harness/phases.js`.

- [ ] **Step 3: Implement `harness/phases.ts`** (pure decisions + the live loop)

```ts
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { runAgent } from './agent-invoke.js';
import { createSandbox, landSandbox, type Sandbox } from './sandbox.js';
import { runOracles, summarize } from './oracle-runner.js';
import { ALL_ORACLES } from './oracles/index.js';
import type { Arm, FeatureRunMetrics } from './types.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..'); // experiments/agent-buildoff

/** Land the first repeat whose own feature oracles passed; null if none did. */
export function chooseLanding(runs: FeatureRunMetrics[]): FeatureRunMetrics | null {
  return runs.find((r) => r.featureOraclePass) ?? null;
}

export interface ParallelObservation { bothApplied: boolean; errorName: string; behaviorLost: boolean }
/** Classify a parallel-contention outcome. The bet: conflicts become
 *  loud-and-local (an attributable error OR a clean compose) rather than
 *  silent (a behavior silently lost with no error). */
export function classifyParallel(o: ParallelObservation): { cls: 'silent' | 'loud-and-local'; error: string } {
  if (o.behaviorLost && !o.errorName) return { cls: 'silent', error: '' };
  return { cls: 'loud-and-local', error: o.errorName };
}

const armDir = (arm: Arm): string => join(ROOT, arm === 'scr' ? 'scr-app' : 'mono-app');

const ARM_CONVENTION: Record<Arm, string> = {
  scr: 'Features are SCR plugins. Add a plugin file under `src/plugins/`, register it in `src/host.ts`, and add Fastify route shim(s) in `src/host.ts` that call `runtime.runAction`. Reach other features only via `ctx.services`, `ctx.actions.runAction`, and `ctx.events`. Record activity by calling the `activity:record` action; react via the `activity:recorded` event.',
  mono: 'Features are Fastify route modules. Add a `src/features/<name>.ts` exporting `register<Name>(app)` and wire it in `src/server.ts`. Share state via `src/store.ts`. Record activity by calling `recordActivity(kind, data)` from `src/store.ts`.',
};

/** Build the per-feature builder prompt from the template + spec + convention. */
export function buildPrompt(specPath: string, arm: Arm): string {
  const tmpl = readFileSync(join(ROOT, 'builder-prompt.md'), 'utf8');
  const spec = readFileSync(specPath, 'utf8');
  return tmpl.replace('{{FEATURE_SPEC}}', spec).replace('{{ARM_CONVENTION}}', ARM_CONVENTION[arm]);
}

/** git name-only diff of a sandbox's src vs the arm's src — the files touched.
 *  Uses `git diff --no-index` which works outside a repo and prints names. */
export function filesTouched(sandboxDir: string, arm: Arm): string[] {
  try {
    execFileSync('git', ['diff', '--no-index', '--name-only', join(armDir(arm), 'src'), join(sandboxDir, 'src')], { encoding: 'utf8' });
    return [];
  } catch (e: any) {
    // --no-index exits 1 when differences exist; stdout holds the names.
    const out: string = e?.stdout ?? '';
    return out.split('\n').map((s) => s.trim()).filter(Boolean);
  }
}

/**
 * One measurement run for (feature, arm): sandbox → agent build → typecheck-or-
 * skip → boot server → run full frozen oracle suite → metrics. The caller boots
 * the server via `bootArm`. Returns metrics; never throws (records ok=false).
 */
export async function measureRun(opts: {
  feature: string; arm: Arm; repeat: number; specPath: string;
  bootArm: (srcDir: string) => Promise<{ baseUrl: string; close: () => Promise<void> }>;
  claudeCommand?: string; claudeBaseArgs?: string[]; claudeExtraArgs?: string[];
}): Promise<{ metrics: FeatureRunMetrics; sandbox: Sandbox }> {
  const sandbox = createSandbox(armDir(opts.arm), join(ROOT, '.sandboxes', `${opts.arm}-${opts.feature}-${opts.repeat}`));
  const agent = await runAgent({
    prompt: buildPrompt(opts.specPath, opts.arm),
    cwd: sandbox.dir,
    command: opts.claudeCommand,
    baseArgs: opts.claudeBaseArgs,
    extraArgs: opts.claudeExtraArgs ?? ['--permission-mode', 'acceptEdits', '--allowedTools', 'Read,Grep,Glob,Edit,Write,Bash'],
  });

  const touched = filesTouched(sandbox.dir, opts.arm);

  let oracleResults: FeatureRunMetrics['oracleResults'] = [];
  try {
    const server = await opts.bootArm(join(sandbox.dir, 'src'));
    oracleResults = await runOracles(server.baseUrl, ALL_ORACLES);
    await server.close();
  } catch (err) {
    oracleResults = [{ feature: opts.feature, name: 'boot', pass: false, detail: err instanceof Error ? err.message : String(err) }];
  }

  const s = summarize(oracleResults, opts.feature);
  const metrics: FeatureRunMetrics = {
    feature: opts.feature, arm: opts.arm, repeat: opts.repeat, agent,
    filesTouched: touched, oracleResults,
    featureOraclePass: s.featureOraclePass, foreignBreakage: s.foreignBreakage,
  };
  return { metrics, sandbox };
}
```

Note: `bootArm` is injected so that booting a freshly-agent-built arm (which must be compiled/imported from the sandbox) is the orchestrator's concern, kept out of the pure/testable surface. For the SCR/mono arms this means `tsc` the sandbox then dynamic-`import()` its built `server.js`/`host.js` and `listen({port:0})`. The run task (14) supplies it; details there.

- [ ] **Step 4: Implement `harness/run.ts`** (entry point; the live orchestration shell)

```ts
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { renderResults, type ExperimentResults } from './report.js';
import { collidingRegistrationOutcome, throwingHotspotContained } from './faults.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');

/**
 * Live experiment entry. Phases 1–3 invoke the real `claude` CLI and are
 * token-expensive; Phase 4 is deterministic. This shell runs Phase 4 always and
 * gates the live phases behind --live so `npm run experiment` is safe to smoke
 * without spending tokens. The full live wiring is finalized in Task 14.
 */
export async function main(argv: string[]): Promise<number> {
  const live = argv.includes('--live');

  // Phase 4 (deterministic) — always run.
  const colliding = await collidingRegistrationOutcome();
  const thrown = await throwingHotspotContained();

  // Live phases populate these; smoke mode leaves them empty/zero.
  const results: ExperimentResults = {
    model: process.env.BUILDOFF_MODEL ?? 'claude-opus-4-8',
    repeats: 3,
    perFeature: [],
    crossoverIndex: -1,
    modification: { scrFilesOutsideTarget: 0, monoFilesOutsideTarget: 0, scrForeignBreak: 0, monoForeignBreak: 0 },
    parallel: { scrClass: '—', monoClass: '—', scrError: '', monoError: '' },
    faults: { collidingRejected: colliding.rejected && colliding.errorName === 'DuplicateRegistrationError', throwContained: thrown.callerThrew && thrown.runtimeAlive },
    predictions: [],
  };

  if (live) {
    // Task 14 fills in: sequential build-off, modification, parallel phases.
    console.log('Live phases run in Task 14 wiring.');
  }

  const md = renderResults(results);
  const out = join(ROOT, 'RESULTS.md');
  writeFileSync(out, md, 'utf8');
  console.log(`Wrote ${out}`);
  return 0;
}

const isDirect = process.argv[1] === fileURLToPath(import.meta.url);
if (isDirect) {
  main(process.argv.slice(2)).then((c) => process.exit(c), (e) => { console.error(e); process.exit(1); });
}
```

- [ ] **Step 5: Run to verify the pure-decision tests pass**

Run: `cd experiments/agent-buildoff && npx vitest --run tests/phases.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Type-check the whole rig**

Run: `cd experiments/agent-buildoff && npm run type-check`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add experiments/agent-buildoff/harness/phases.ts experiments/agent-buildoff/harness/run.ts experiments/agent-buildoff/tests/phases.test.ts
git commit -m "feat(buildoff): phase orchestration (pure decisions TDD'd) + run entry"
```

---

## Task 13: Pre-register predictions + deterministic smoke run

**Files:**
- Create: `experiments/agent-buildoff/PREDICTIONS.md`
- (no code; this task commits the predictions BEFORE any live run and smoke-tests the pipeline without tokens)

- [ ] **Step 1: Write `PREDICTIONS.md`** (pre-registered, committed before Task 14)

```markdown
# Pre-Registered Predictions — Agent Build-Off

Recorded BEFORE any live agent run. Model: claude-opus-4-8. Phase-1 repeats: K=3.

| # | Claim | Predicted direction / magnitude |
|---|---|---|
| 1 | SCR tokens/feature at f1 | HIGHER than mono (plugin ceremony) — small margin |
| 2 | SCR tokens/feature by f8 | LOWER than mono (containment) — margin grows with N |
| 3 | Cost crossover index | exists somewhere in f3–f6; may be absent at this size |
| 4 | SCR read-surface per feature | roughly FLAT in N (plugin + contract) |
| 5 | Mono read-surface per feature | GROWS in N (shared state to reason about) |
| 6 | Modification (Phase 2) files-outside-target | SCR ~0; mono grows with feature count |
| 7 | Modification foreign oracle breaks | SCR 0; mono > 0 |
| 8 | Parallel contention (Phase 3) | SCR loud-and-local; mono silent or merge-clobber |
| 9 | Fault containment (Phase 4) | SCR contains both injected faults (deterministic) |

A null result (no crossover, flat differences) is a valid, publishable outcome
and would indicate SCR's overhead does not amortize at this app size.
```

- [ ] **Step 2: Run the full unit suite**

Run: `cd experiments/agent-buildoff && npm test`
Expected: PASS — all test files green (mono baseline, scr baseline, agent-invoke, sandbox, oracle-runner, metrics, oracles-shape, faults, report, phases).

- [ ] **Step 3: Build + deterministic smoke (no tokens)**

Run: `cd experiments/agent-buildoff && npm run build && node dist/harness/run.js`
Expected: prints `Wrote .../RESULTS.md`, exits 0. Open `RESULTS.md`: Phase 4 shows both containment checks ✅; Phases 1–3 are empty/placeholder (live run not yet wired). This proves the deterministic spine end-to-end.

- [ ] **Step 4: Commit**

```bash
git add experiments/agent-buildoff/PREDICTIONS.md
git commit -m "docs(buildoff): pre-register predictions before any live run"
```

---

## Task 14: Live experiment run (Phases 1–3 wiring + execution)

**Files:**
- Modify: `experiments/agent-buildoff/harness/run.ts` (wire the live phases behind `--live`)
- Modify: `experiments/agent-buildoff/harness/phases.ts` (add `bootSandboxArm` + the sequential/modify/parallel drivers)

This task wires and RUNS the token-expensive, non-deterministic phases. It is the analogue of the stress harness's smoke-run task — not TDD. **Prerequisite: `claude --version` must work and be authenticated.** Run `npm run build` at the repo root first so the rig's local `skeleton-crew` is fresh.

- [ ] **Step 1: Add `bootSandboxArm` to `phases.ts`**

After an agent edits a sandbox's `src/`, compile and import it to boot a server. Append to `harness/phases.ts`:

```ts
import { spawnSync } from 'node:child_process';

/**
 * Compile a sandbox's src with the arm's tsconfig and dynamic-import the built
 * server, returning a listening base URL + close fn. Throws if the agent's code
 * does not compile (recorded as a failed run by the caller).
 */
export async function bootSandboxArm(arm: Arm, sandboxSrcDir: string): Promise<{ baseUrl: string; close: () => Promise<void> }> {
  const sandboxRoot = dirname(sandboxSrcDir);
  const tsc = spawnSync('npx', ['tsc', '-p', join(sandboxRoot, 'tsconfig.json'), '--outDir', join(sandboxRoot, 'dist')], { encoding: 'utf8', shell: true });
  if (tsc.status !== 0) throw new Error(`sandbox tsc failed: ${tsc.stdout}\n${tsc.stderr}`);

  if (arm === 'mono') {
    const mod = await import(`file://${join(sandboxRoot, 'dist', 'server.js')}?t=${globalThis.performance.now()}`);
    const store = await import(`file://${join(sandboxRoot, 'dist', 'store.js')}?t=${globalThis.performance.now()}`);
    store.resetStore?.();
    const app = mod.buildMonoServer();
    const baseUrl = await app.listen({ port: 0, host: '127.0.0.1' });
    return { baseUrl, close: () => app.close() };
  }
  const mod = await import(`file://${join(sandboxRoot, 'dist', 'host.js')}?t=${globalThis.performance.now()}`);
  const { app, runtime } = await mod.buildScrServer();
  const baseUrl = await app.listen({ port: 0, host: '127.0.0.1' });
  return { baseUrl, close: async () => { await app.close(); await runtime.shutdown(); } };
}
```

Note: each arm's sandbox needs its own `tsconfig.json` that extends the root and sets `rootDir: "src"`. Add `scr-app/tsconfig.json` and `mono-app/tsconfig.json` (each: `{ "extends": "../../../tsconfig.json", "compilerOptions": { "outDir": "./dist", "rootDir": "./src", "types": ["node"] }, "include": ["src/**/*"] }`) and copy them in `createSandbox` (already copied — `createSandbox` copies `tsconfig.json` when present). Create these two files as part of this step and commit them with the task.

- [ ] **Step 2: Wire the sequential build-off driver in `run.ts`**

Replace the `if (live)` block in `main` with a sequential loop over the backlog. For each feature, run K=3 `measureRun`s (resetting from the arm each time via fresh sandboxes), pick the landing via `chooseLanding`, `landSandbox` the chosen run onto the arm so the next feature builds on it, and record median tokens + median read-surface + foreign-breakage per arm. Compute `crossoverIndex` from the per-feature median token series. Full code:

```ts
// at top of run.ts:
import { measureRun, chooseLanding, bootSandboxArm } from './phases.js';
import { landSandbox } from './sandbox.js';
import { median, crossoverIndex } from './metrics.js';
import type { Arm, FeatureRunMetrics } from './types.js';

const BACKLOG = [
  { feature: 'f1', spec: 'f1-comments.md' },
  { feature: 'f2', spec: 'f2-mentions.md' },
  { feature: 'f3', spec: 'f3-assignment.md' },
  { feature: 'f4', spec: 'f4-notifications.md' },
  { feature: 'f5', spec: 'f5-tags.md' },
  { feature: 'f6', spec: 'f6-search.md' },
  { feature: 'f7', spec: 'f7-reactions.md' },
  { feature: 'f8', spec: 'f8-digest.md' },
];
const K = 3;

async function buildFeatureInArm(feature: string, specPath: string, arm: Arm): Promise<{ tokens: number[]; surface: number[]; foreign: number[]; landed: boolean }> {
  const runs: FeatureRunMetrics[] = [];
  const sandboxes = [];
  for (let r = 0; r < K; r++) {
    const { metrics, sandbox } = await measureRun({
      feature, arm, repeat: r, specPath,
      bootArm: (srcDir) => bootSandboxArm(arm, srcDir),
    });
    runs.push(metrics);
    sandboxes.push(sandbox);
  }
  const chosen = chooseLanding(runs);
  if (chosen) {
    const chosenSandbox = sandboxes[chosen.repeat];
    landSandbox(chosenSandbox.dir, join(ROOT, arm === 'scr' ? 'scr-app' : 'mono-app'));
  }
  sandboxes.forEach((s) => s.cleanup());
  return {
    tokens: runs.map((x) => x.agent.outputTokens + x.agent.inputTokens),
    surface: runs.map((x) => x.filesRead.length),
    foreign: runs.map((x) => x.foreignBreakage),
    landed: chosen !== null,
  };
}
```

Then in `main`, under `--live`, loop the backlog for both arms, assembling `results.perFeature` with `scrTokensMedian`/`monoTokensMedian` = `median(tokens)`, surfaces = `median(surface)`, foreign-breaks = max foreign across repeats; set `results.crossoverIndex = crossoverIndex(scrMedians, monoMedians)`.

- [ ] **Step 3: Wire Phase 2 (modification) and Phase 3 (parallel) — single-shot**

After the sequential loop lands all features, run `backlog/modify.md` once per arm via a single `measureRun` (no K), and compute `filesOutsideTarget` = `filesTouched` minus the target feature's own file(s), and foreign breakage from the oracle results. For Phase 3, dispatch `parallel-a.md` and `parallel-b.md` against the same arm state (two sequential `measureRun`s sharing one landed base, OR — to model true contention — build both in separate sandboxes off the same base and attempt to land both; a land conflict / lost behavior is the observation). Classify via `classifyParallel`. Populate `results.modification` and `results.parallel`. Populate `results.predictions` by scoring `PREDICTIONS.md` claims against observed values (hand-map each claim to its computed metric).

- [ ] **Step 4: Pre-flight check**

Run: `claude --version`
Expected: prints a version. If not found or unauthenticated, STOP — the live phases cannot run. (Phase 4 + the deterministic smoke from Task 13 still stand as partial results.)

- [ ] **Step 5: Rebuild parent + run the live experiment**

```bash
# from repo root: refresh the local skeleton-crew dist the rig consumes
npm run build
# then the experiment (token-expensive, slow — 8 features × 2 arms × 3 repeats + phases):
cd experiments/agent-buildoff && npm run build && node dist/harness/run.js --live
```

Expected: progress logs per feature/arm/repeat; finally `Wrote .../RESULTS.md`. Triage: if an arm's feature never lands (no repeat passed its oracles), `RESULTS.md` should reflect it honestly (that feature's row shows the failure) — do NOT edit oracles to force green. A feature the agent couldn't build in either arm is a substrate/spec problem to note, not hide.

- [ ] **Step 6: Inspect RESULTS.md and record the finding**

Open `experiments/agent-buildoff/RESULTS.md`. Confirm: per-feature table populated, crossover line present (index or "no crossover"), Phase 2/3/4 sections populated, predictions scored. The honest outcome — whatever it is — is the deliverable.

- [ ] **Step 7: Commit (only the tsconfig wiring + any code fixes; RESULTS.md is gitignored)**

```bash
git add experiments/agent-buildoff/harness/run.ts experiments/agent-buildoff/harness/phases.ts experiments/agent-buildoff/scr-app/tsconfig.json experiments/agent-buildoff/mono-app/tsconfig.json
git commit -m "feat(buildoff): wire and run live build-off phases"
```

---

## Task 15: README + final review

**Files:**
- Create: `experiments/agent-buildoff/README.md`

- [ ] **Step 1: Write the README**

```markdown
# Agent Build-Off

Tests skeleton-crew's core bet — *enforced feature isolation* — in the agent
era. The same headless Claude agent builds the same feature backlog two ways:
as SCR plugins (`scr-app/`) and as a competent Fastify monolith (`mono-app/`),
both seeded at functional parity with a shared activity-feed hotspot.

## What it measures

| Phase | Question | Determinism |
|---|---|---|
| 1 Sequential build-off | tokens/feature, read-surface, cross-feature breakage; cost crossover index | live agent, K=3 |
| 2 Modification | blast radius of a data-shape change (files + foreign breakage) | live agent, single-shot |
| 3 Parallel contention | does a hotspot conflict surface loud-and-local or silent | live agent, single-shot |
| 4 Fault injection | does SCR contain a colliding registration / throwing hotspot | deterministic |

The agent never sees the oracle suite or the other arm. Predictions are
pre-registered in `PREDICTIONS.md` before any live run.

## Run

```bash
npm install
npm test                       # deterministic unit suite (no tokens)
node dist/harness/run.js       # Phase 4 + smoke (no tokens) → RESULTS.md
node dist/harness/run.js --live   # FULL experiment — token-expensive, needs `claude` CLI authed
```

A null or pro-monolith result is a valid finding. Phases 1–3 are
non-deterministic (one K-repeated run is a trend, not a proof); Phase 4 is
deterministic. See `docs/superpowers/specs/2026-06-22-agent-buildoff-design.md`.
```

- [ ] **Step 2: Commit**

```bash
git add experiments/agent-buildoff/README.md
git commit -m "docs(buildoff): harness README"
```

- [ ] **Step 3: Final whole-rig review**

Dispatch a final code reviewer over the full branch diff (`git diff main...HEAD`), focused on: oracle soundness (can each oracle actually fail?), the fairness of the two arms (is the monolith genuinely competent, not a strawman?), the agent-invoke parser's robustness, and whether any metric can pass vacuously. Triage findings; fix blocking ones.

---

## Done criteria

- Both arms built to functional parity; baseline oracles green against both.
- The full deterministic unit suite (`npm test`) is green.
- `PREDICTIONS.md` committed before any live run.
- The deterministic spine (Phase 4 + smoke) generates `RESULTS.md` with no tokens.
- The live experiment (`--live`) runs all phases and generates a populated `RESULTS.md` — a clean trend OR a null/pro-monolith result is an acceptable done state.
- Any feature an agent couldn't build is reported honestly, not papered over.

## Out of scope (YAGNI)

- No persistence (both arms in-memory). No UI/dashboard. No CI wiring (live phases are non-deterministic + token-expensive). No second substrate or runtime. No statistical-significance claim (K=3 is a trend).
```
