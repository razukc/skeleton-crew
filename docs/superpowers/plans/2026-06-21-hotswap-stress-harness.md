# Hot-Swap Adversarial Stress Harness — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Fastify + autocannon harness under `experiments/hotswap-stress/` that drives concurrent HTTP load through scr actions while hot-swapping the backing plugins, with a per-request oracle for each of six swap scenarios.

**Architecture:** A thin Fastify app whose route handlers are pure `runAction` shims (scr owns all logic + state via an in-memory `store` service). A control plane (`POST /__swap/*`) fires `runtime.swapPlugin(v2)` while the data plane is saturated. A load layer combines autocannon (saturation + aggregate zero-5xx/perf oracles) with a `fetch`-based verifier loop (captures per-response bodies + timestamps for body-shape oracles). An orchestrator runs each scenario (boot → flood+verify → timed swap → assert → tear down) and writes `RESULTS.md`.

**Tech Stack:** TypeScript (ES2022 ESM), Fastify 5, autocannon 8, vitest 4, `skeleton-crew` (local `file:../..`).

**Spec:** `docs/superpowers/specs/2026-06-21-hotswap-stress-design.md`

**Conventions (verified against the repo):**
- Root `tsconfig.json` is ES2022 / NodeNext-style ESM with `strict`, `noUnusedLocals`, `noUnusedParameters`. Every `.ts` import of a local file uses the `.js` extension. No unused vars/params will compile.
- Sub-packages extend the root tsconfig with `outDir: ./dist`, `rootDir: ./src` (see `demo/collab-hub/tsconfig.json`).
- The current package name is `skeleton-crew` (NOT the older `skeleton-crew-runtime` the demos import). Import from `skeleton-crew`.
- Branch: `experiment/hotswap-stress-harness` (already checked out).

**scr API facts the plan relies on (verified in `src/types.ts`, `src/runtime.ts`):**
- `new Runtime<TConfig>({ logger?, config? })`; `await rt.initialize()`; `rt.getContext()`; `await rt.shutdown()`.
- `rt.registerPlugin(def)` before init; after init, swap via `await rt.swapPlugin(v2)`.
- `rt.updateConfig(partial)` mutates live config (used by scenario 5).
- Context shape: `ctx.actions.registerAction({id,handler})` → handler is `(params, ctx) => R | Promise<R>`; `ctx.actions.runAction(id, params)`; `ctx.actions.hasAction(id)`.
- `ctx.services.register(name, svc)`, `.get<T>(name)`, `.has(name)`, `.unregister(name)`.
- `ctx.events.on(event, handler)`, `.emit(event, data)`.
- `PluginSwapError` is exported from `skeleton-crew`; a failed/throwing swap rejects with it.
- A plugin: `{ name, version, validateConfig?, setup(ctx), dispose?(ctx) }`. Swap requires a strictly-higher semver `version`.
- `Logger` type is exported from `skeleton-crew` (added to both `src/index.ts` and `src/index.browser.ts` barrels in Task 0 below — it was defined in `types.ts` but omitted from the public re-export list).

---

## File Structure

| File | Responsibility |
|---|---|
| `experiments/hotswap-stress/package.json` | deps (fastify, autocannon, skeleton-crew local), scripts |
| `experiments/hotswap-stress/tsconfig.json` | extends root, builds `src/` + `harness/` to `dist/` |
| `experiments/hotswap-stress/src/types.ts` | shared types: `StressConfig`, `Post`, `Comment`, `Store` |
| `experiments/hotswap-stress/src/plugins/store-plugin.ts` | in-memory `store` service; v1 + v2 (dispose-clobber) variants |
| `experiments/hotswap-stress/src/plugins/posts-plugin.ts` | posts CRUD actions; v1 + v2 variants (clean/throwing/hijack/skew) |
| `experiments/hotswap-stress/src/plugins/comments-plugin.ts` | comments actions + `post:deleted` subscriber; v1 + v2 |
| `experiments/hotswap-stress/src/swap-timeline.ts` | high-res swap-phase marker log |
| `experiments/hotswap-stress/src/server.ts` | `buildServer()` — Fastify route shims + `/__swap/*` control plane |
| `experiments/hotswap-stress/harness/oracles.ts` | per-scenario invariant assertions over verifier samples + autocannon result |
| `experiments/hotswap-stress/harness/load.ts` | `flood()` (autocannon) + `verify()` (fetch sampler) |
| `experiments/hotswap-stress/harness/scenarios.ts` | the six scenario definitions (plugins, v2, swap trigger, oracle) |
| `experiments/hotswap-stress/harness/run.ts` | orchestrator → writes `RESULTS.md` |
| `experiments/hotswap-stress/README.md` | how to run, what it proves |
| `experiments/hotswap-stress/tests/*.test.ts` | vitest unit tests for plugins, server, oracles |

Each task below is TDD where the unit is testable in isolation (plugins, server, oracles) and integration-style for the orchestrator. Commit after every green step.

---

## Task 0: Export `Logger` from the library barrels (prerequisite)

**Status: already applied during plan authoring** — listed here for traceability and so the plan is self-contained.

The harness's test files type their mock logger as `import type { Logger } from 'skeleton-crew'`. `Logger` is defined in `src/types.ts` and exported there, but was omitted from the public re-export list in both barrels. Without this, every harness test file fails to compile.

**Files:**
- Modify: `src/index.ts` (add `type Logger,` to the `from './types.js'` re-export block)
- Modify: `src/index.browser.ts` (same addition — preserves node/browser parity, the subject of the prior Finding 7)

- [x] **Step 1: Add `type Logger,` after `RuntimeState,` in `src/index.ts`'s types re-export block.**
- [x] **Step 2: Add the same line in `src/index.browser.ts` (keep barrels in parity).**
- [x] **Step 3: Verify** — `npx tsc --noEmit` exits 0; `npx vitest run` stays 887/887.
- [ ] **Step 4: Commit** (fold into the scaffold commit or commit standalone)

```bash
git add src/index.ts src/index.browser.ts
git commit -m "feat(exports): export Logger type from node + browser barrels"
```

---

## Task 1: Scaffold the sub-package

**Files:**
- Create: `experiments/hotswap-stress/package.json`
- Create: `experiments/hotswap-stress/tsconfig.json`
- Create: `experiments/hotswap-stress/.gitignore`
- Create: `experiments/hotswap-stress/vitest.config.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "hotswap-stress",
  "version": "1.0.0",
  "description": "Adversarial hot-swap stress harness for skeleton-crew",
  "type": "module",
  "private": true,
  "scripts": {
    "build": "tsc",
    "stress": "npm run build && node dist/harness/run.js",
    "test": "vitest --run",
    "test:watch": "vitest",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "skeleton-crew": "file:../..",
    "fastify": "^5.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "autocannon": "^8.0.0",
    "@types/autocannon": "^7.12.0",
    "typescript": "^5.3.3",
    "vitest": "^4.0.15"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": ".",
    "noEmit": false
  },
  "include": ["src/**/*", "harness/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

Note: `rootDir` is `.` (not `./src`) because we build both `src/` and `harness/`. The `stress` script runs `dist/harness/run.js`.

- [ ] **Step 3: Create .gitignore**

```
node_modules/
dist/
RESULTS.md
package-lock.json
```

- [ ] **Step 4: Create vitest.config.ts**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
```

- [ ] **Step 5: Install and verify the toolchain**

Run: `cd experiments/hotswap-stress && npm install`
Expected: installs fastify, autocannon, links local skeleton-crew. No errors.

Then run: `npm run type-check`
Expected: PASS (no files yet to compile beyond config = exit 0; if "No inputs were found" error appears, that's fine for this step — it resolves once src files exist in Task 2).

- [ ] **Step 6: Commit**

```bash
git add experiments/hotswap-stress/package.json experiments/hotswap-stress/tsconfig.json experiments/hotswap-stress/.gitignore experiments/hotswap-stress/vitest.config.ts
git commit -m "chore(stress): scaffold hotswap-stress sub-package"
```

---

## Task 2: Shared types + in-memory store contract

**Files:**
- Create: `experiments/hotswap-stress/src/types.ts`

- [ ] **Step 1: Write the types**

```ts
// Shared types for the hot-swap stress harness.

/** A blog post resource. `tag` is added by the posts v2 "clean swap" variant. */
export interface Post {
  id: string;
  title: string;
  views: number;
  tag?: string; // present only after the clean-swap v2
}

/** A comment resource, linked to a post. */
export interface Comment {
  id: string;
  postId: string;
  text: string;
}

/**
 * The in-memory store handle, registered as the `store` service.
 * Map-backed so reads/writes are synchronous — no file-I/O async noise to
 * confound the swap-window timing signal.
 */
export interface Store {
  posts: Map<string, Post>;
  comments: Map<string, Comment>;
}

/** Runtime config. `pageSize` is the value scenario 5 mutates mid-swap. */
export interface StressConfig {
  pageSize: number;
}

/** Factory for a fresh, seeded store. */
export function createStore(): Store {
  const posts = new Map<string, Post>();
  const comments = new Map<string, Comment>();
  for (let i = 1; i <= 100; i++) {
    posts.set(String(i), { id: String(i), title: `Post ${i}`, views: i });
  }
  comments.set('1', { id: '1', postId: '1', text: 'first' });
  return { posts, comments };
}
```

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add experiments/hotswap-stress/src/types.ts
git commit -m "feat(stress): shared types and in-memory store factory"
```

---

## Task 3: store-plugin (v1 + v2 dispose-clobber variant)

**Files:**
- Create: `experiments/hotswap-stress/src/plugins/store-plugin.ts`
- Create: `experiments/hotswap-stress/tests/store-plugin.test.ts`

The store-plugin registers the `store` service. The v2 variant re-registers `store` AND its `dispose` unregisters `store` — this is the Finding 1 dispose-clobber bait. After a swap, the store must still be present (v1.dispose must not clobber v2's re-registered service).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi } from 'vitest';
import { Runtime } from 'skeleton-crew';
import type { Logger } from 'skeleton-crew';
import { storePluginV1, storePluginV2 } from '../src/plugins/store-plugin.js';
import type { Store } from '../src/types.js';

const mockLogger = (): Logger => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() });

describe('store-plugin', () => {
  it('v1 registers a seeded store service', async () => {
    const rt = new Runtime({ logger: mockLogger() });
    rt.registerPlugin(storePluginV1);
    await rt.initialize();
    const ctx = rt.getContext();
    expect(ctx.services.has('store')).toBe(true);
    const store = ctx.services.get<Store>('store');
    expect(store.posts.size).toBe(100);
    await rt.shutdown();
  });

  it('survives a swap to v2 whose dispose unregisters store (Finding 1)', async () => {
    const rt = new Runtime({ logger: mockLogger() });
    rt.registerPlugin(storePluginV1);
    await rt.initialize();
    await rt.swapPlugin(storePluginV2);
    const ctx = rt.getContext();
    // v1.dispose ran AFTER commit and called services.unregister('store');
    // the identity guard must keep v2's store alive.
    expect(ctx.services.has('store')).toBe(true);
    await rt.shutdown();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest --run tests/store-plugin.test.ts`
Expected: FAIL — `storePluginV1` not exported / module not found.

- [ ] **Step 3: Write the implementation**

```ts
import type { PluginDefinition, RuntimeContext } from 'skeleton-crew';
import type { StressConfig, Store } from '../types.js';
import { createStore } from '../types.js';

// The store service is the single source of truth for posts/comments.
// Registered under the name 'store' so posts/comments plugins can resolve it.

export const storePluginV1: PluginDefinition<StressConfig> = {
  name: 'store',
  version: '1.0.0',
  setup(ctx: RuntimeContext<StressConfig>) {
    ctx.services.register<Store>('store', createStore());
  },
  dispose(ctx: RuntimeContext<StressConfig>) {
    ctx.services.unregister('store');
  },
};

// v2 re-registers 'store' (carrying the existing data forward) and ALSO
// unregisters it in dispose. Because v1.dispose runs after commit, a naive
// by-name unregister would delete v2's freshly-registered store. The runtime's
// post-swap dispose guard (Finding 1) must prevent that.
export const storePluginV2: PluginDefinition<StressConfig> = {
  name: 'store',
  version: '1.0.1',
  setup(ctx: RuntimeContext<StressConfig>) {
    // Carry forward existing data if present, else seed fresh.
    const existing = ctx.services.has('store') ? ctx.services.get<Store>('store') : createStore();
    ctx.services.register<Store>('store', existing);
  },
  dispose(ctx: RuntimeContext<StressConfig>) {
    ctx.services.unregister('store');
  },
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest --run tests/store-plugin.test.ts`
Expected: PASS (both tests).

- [ ] **Step 5: Commit**

```bash
git add experiments/hotswap-stress/src/plugins/store-plugin.ts experiments/hotswap-stress/tests/store-plugin.test.ts
git commit -m "feat(stress): store-plugin with dispose-clobber v2 variant"
```

---

## Task 4: posts-plugin (v1 + four v2 variants)

**Files:**
- Create: `experiments/hotswap-stress/src/plugins/posts-plugin.ts`
- Create: `experiments/hotswap-stress/tests/posts-plugin.test.ts`

posts-plugin registers `posts:list/get/create/update/delete`, all reading/writing the `store` service. Four v2 variants drive scenarios 1, 2, 4, 5:
- `postsPluginV2Clean` — `posts:list` adds `tag: 'v2'` to each returned post (scenario 1).
- `postsPluginV2Throwing` — registers then throws in setup (scenario 2).
- `postsPluginV2Hijack` — tries to register a `comments:list` action it doesn't own (scenario 4).
- `postsPluginV2Skew` — `validateConfig` records the observed `pageSize`; `setup` records it again, to detect config skew (scenario 5).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi } from 'vitest';
import { Runtime, PluginSwapError } from 'skeleton-crew';
import type { Logger } from 'skeleton-crew';
import { storePluginV1 } from '../src/plugins/store-plugin.js';
import {
  postsPluginV1,
  postsPluginV2Clean,
  postsPluginV2Throwing,
  postsPluginV2Hijack,
} from '../src/plugins/posts-plugin.js';
import { commentsPluginV1 } from '../src/plugins/comments-plugin.js';
import type { Post, StressConfig } from '../src/types.js';

const mockLogger = (): Logger => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() });

async function boot() {
  const rt = new Runtime<StressConfig>({ logger: mockLogger(), config: { pageSize: 10 } });
  rt.registerPlugin(storePluginV1);
  rt.registerPlugin(postsPluginV1);
  rt.registerPlugin(commentsPluginV1);
  await rt.initialize();
  return rt;
}

describe('posts-plugin', () => {
  it('v1 list returns pageSize posts without a tag', async () => {
    const rt = await boot();
    const ctx = rt.getContext();
    const list = await ctx.actions.runAction<undefined, Post[]>('posts:list', undefined);
    expect(list).toHaveLength(10);
    expect(list[0].tag).toBeUndefined();
    await rt.shutdown();
  });

  it('clean v2 list tags every post', async () => {
    const rt = await boot();
    await rt.swapPlugin(postsPluginV2Clean);
    const ctx = rt.getContext();
    const list = await ctx.actions.runAction<undefined, Post[]>('posts:list', undefined);
    expect(list.every((p) => p.tag === 'v2')).toBe(true);
    await rt.shutdown();
  });

  it('throwing v2 leaves v1 fully live (atomicity)', async () => {
    const rt = await boot();
    await expect(rt.swapPlugin(postsPluginV2Throwing)).rejects.toBeInstanceOf(PluginSwapError);
    const ctx = rt.getContext();
    const list = await ctx.actions.runAction<undefined, Post[]>('posts:list', undefined);
    expect(list[0].tag).toBeUndefined(); // still v1
    await rt.shutdown();
  });

  it('hijack v2 is rejected and comments stay intact', async () => {
    const rt = await boot();
    await expect(rt.swapPlugin(postsPluginV2Hijack)).rejects.toBeInstanceOf(PluginSwapError);
    const ctx = rt.getContext();
    expect(ctx.actions.hasAction('comments:list')).toBe(true);
    await rt.shutdown();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest --run tests/posts-plugin.test.ts`
Expected: FAIL — posts-plugin exports missing (and comments-plugin not yet created; that import fails too — Task 5 creates it. Run this test again at the end of Task 5).

- [ ] **Step 3: Write the implementation**

```ts
import type { PluginDefinition, RuntimeContext } from 'skeleton-crew';
import type { StressConfig, Store, Post } from '../types.js';

// Helper: resolve the store service from context.
function store(ctx: RuntimeContext<StressConfig>): Store {
  return ctx.services.get<Store>('store');
}

// Registers the five CRUD actions. `tagger` lets v2 inject a tag into list
// results without duplicating the whole plugin (DRY across v1 and clean-v2).
function registerPostsActions(
  ctx: RuntimeContext<StressConfig>,
  tagger: (p: Post) => Post,
): void {
  ctx.actions.registerAction<undefined, Post[]>({
    id: 'posts:list',
    handler: (_params, c) => {
      const pageSize = c.config.pageSize;
      const all = [...store(c).posts.values()].slice(0, pageSize);
      return all.map(tagger);
    },
  });
  ctx.actions.registerAction<{ id: string }, Post | null>({
    id: 'posts:get',
    handler: ({ id }, c) => store(c).posts.get(id) ?? null,
  });
  ctx.actions.registerAction<{ title: string }, Post>({
    id: 'posts:create',
    handler: ({ title }, c) => {
      const s = store(c);
      const id = String(s.posts.size + 1);
      const post: Post = { id, title, views: 0 };
      s.posts.set(id, post);
      return post;
    },
  });
  ctx.actions.registerAction<{ id: string; title: string }, Post | null>({
    id: 'posts:update',
    handler: ({ id, title }, c) => {
      const s = store(c);
      const existing = s.posts.get(id);
      if (!existing) return null;
      const updated = { ...existing, title };
      s.posts.set(id, updated);
      return updated;
    },
  });
  ctx.actions.registerAction<{ id: string }, { deleted: boolean }>({
    id: 'posts:delete',
    handler: ({ id }, c) => {
      const deleted = store(c).posts.delete(id);
      if (deleted) c.events.emit('post:deleted', { id });
      return { deleted };
    },
  });
}

const identity = (p: Post): Post => p;
const addV2Tag = (p: Post): Post => ({ ...p, tag: 'v2' });

export const postsPluginV1: PluginDefinition<StressConfig> = {
  name: 'posts',
  version: '1.0.0',
  dependencies: ['store'],
  setup(ctx) {
    registerPostsActions(ctx, identity);
  },
};

// Scenario 1: clean swap — list now tags every post.
export const postsPluginV2Clean: PluginDefinition<StressConfig> = {
  name: 'posts',
  version: '1.1.0',
  dependencies: ['store'],
  setup(ctx) {
    registerPostsActions(ctx, addV2Tag);
  },
};

// Scenario 2: throwing swap — registers, then throws. v1 must stay live.
export const postsPluginV2Throwing: PluginDefinition<StressConfig> = {
  name: 'posts',
  version: '1.2.0',
  dependencies: ['store'],
  setup(ctx) {
    registerPostsActions(ctx, addV2Tag);
    throw new Error('posts v2 setup boom');
  },
};

// Scenario 4: cross-plugin hijack — tries to register an action comments owns.
export const postsPluginV2Hijack: PluginDefinition<StressConfig> = {
  name: 'posts',
  version: '1.3.0',
  dependencies: ['store'],
  setup(ctx) {
    registerPostsActions(ctx, identity);
    // comments:list is owned by comments-plugin — this must be rejected.
    ctx.actions.registerAction({ id: 'comments:list', handler: () => 'HIJACK' });
  },
};

// Scenario 5: config skew — record pageSize at validate vs setup time.
// The recorder object is module-level so the test/harness can read both marks.
export const skewProbe: { validated?: number; setup?: number } = {};

export const postsPluginV2Skew: PluginDefinition<StressConfig> = {
  name: 'posts',
  version: '1.4.0',
  dependencies: ['store'],
  validateConfig: (config) => {
    skewProbe.validated = config.pageSize;
    return true;
  },
  async setup(ctx) {
    // Yield once so the harness can call updateConfig() during the await window.
    await new Promise<void>((resolve) => setImmediate(resolve));
    skewProbe.setup = ctx.config.pageSize;
    registerPostsActions(ctx, identity);
  },
};
```

- [ ] **Step 4: Type-check (full suite runs after Task 5 creates comments-plugin)**

Run: `npm run type-check`
Expected: FAIL only on the missing `comments-plugin.js` import in the test — that's expected and resolved in Task 5. The `src/plugins/posts-plugin.ts` file itself must type-check clean; if `tsc` reports errors inside posts-plugin.ts, fix them now.

- [ ] **Step 5: Commit**

```bash
git add experiments/hotswap-stress/src/plugins/posts-plugin.ts experiments/hotswap-stress/tests/posts-plugin.test.ts
git commit -m "feat(stress): posts-plugin with clean/throwing/hijack/skew v2 variants"
```

---

## Task 5: comments-plugin (v1 + v2)

**Files:**
- Create: `experiments/hotswap-stress/src/plugins/comments-plugin.ts`
- Create: `experiments/hotswap-stress/tests/comments-plugin.test.ts`

comments-plugin registers `comments:list/create` and subscribes to `post:deleted` (cascade-deletes comments for that post). The v2 variant is a clean upgrade used by scenario 6 (concurrent dual-swap).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi } from 'vitest';
import { Runtime } from 'skeleton-crew';
import type { Logger } from 'skeleton-crew';
import { storePluginV1 } from '../src/plugins/store-plugin.js';
import { postsPluginV1 } from '../src/plugins/posts-plugin.js';
import { commentsPluginV1, commentsPluginV2 } from '../src/plugins/comments-plugin.js';
import type { Comment, StressConfig } from '../src/types.js';

const mockLogger = (): Logger => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() });

async function boot() {
  const rt = new Runtime<StressConfig>({ logger: mockLogger(), config: { pageSize: 10 } });
  rt.registerPlugin(storePluginV1);
  rt.registerPlugin(postsPluginV1);
  rt.registerPlugin(commentsPluginV1);
  await rt.initialize();
  return rt;
}

describe('comments-plugin', () => {
  it('lists comments', async () => {
    const rt = await boot();
    const ctx = rt.getContext();
    const list = await ctx.actions.runAction<undefined, Comment[]>('comments:list', undefined);
    expect(list).toHaveLength(1);
    await rt.shutdown();
  });

  it('cascade-deletes comments when post:deleted fires', async () => {
    const rt = await boot();
    const ctx = rt.getContext();
    await ctx.actions.runAction('posts:delete', { id: '1' });
    const list = await ctx.actions.runAction<undefined, Comment[]>('comments:list', undefined);
    expect(list).toHaveLength(0); // comment for post 1 cascaded away
    await rt.shutdown();
  });

  it('swaps cleanly to v2', async () => {
    const rt = await boot();
    await rt.swapPlugin(commentsPluginV2);
    const ctx = rt.getContext();
    expect(ctx.actions.hasAction('comments:list')).toBe(true);
    await rt.shutdown();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest --run tests/comments-plugin.test.ts`
Expected: FAIL — comments-plugin exports missing.

- [ ] **Step 3: Write the implementation**

```ts
import type { PluginDefinition, RuntimeContext } from 'skeleton-crew';
import type { StressConfig, Store, Comment } from '../types.js';

function store(ctx: RuntimeContext<StressConfig>): Store {
  return ctx.services.get<Store>('store');
}

function registerCommentsActions(ctx: RuntimeContext<StressConfig>): void {
  ctx.actions.registerAction<undefined, Comment[]>({
    id: 'comments:list',
    handler: (_params, c) => [...store(c).comments.values()],
  });
  ctx.actions.registerAction<{ postId: string; text: string }, Comment>({
    id: 'comments:create',
    handler: ({ postId, text }, c) => {
      const s = store(c);
      const id = String(s.comments.size + 1);
      const comment: Comment = { id, postId, text };
      s.comments.set(id, comment);
      return comment;
    },
  });

  // Cascade: when a post is deleted, drop its comments.
  ctx.events.on('post:deleted', (data) => {
    const { id } = data as { id: string };
    const s = store(ctx);
    for (const [cid, comment] of s.comments) {
      if (comment.postId === id) s.comments.delete(cid);
    }
  });
}

export const commentsPluginV1: PluginDefinition<StressConfig> = {
  name: 'comments',
  version: '1.0.0',
  dependencies: ['store'],
  setup(ctx) {
    registerCommentsActions(ctx);
  },
};

// Scenario 6: a clean upgrade swapped concurrently with posts.
export const commentsPluginV2: PluginDefinition<StressConfig> = {
  name: 'comments',
  version: '1.1.0',
  dependencies: ['store'],
  setup(ctx) {
    registerCommentsActions(ctx);
  },
};
```

- [ ] **Step 4: Run both plugin test files**

Run: `npx vitest --run tests/comments-plugin.test.ts tests/posts-plugin.test.ts`
Expected: PASS (all tests in both files; posts-plugin's test now resolves the comments import).

- [ ] **Step 5: Commit**

```bash
git add experiments/hotswap-stress/src/plugins/comments-plugin.ts experiments/hotswap-stress/tests/comments-plugin.test.ts
git commit -m "feat(stress): comments-plugin with post:deleted cascade + v2"
```

---

## Task 6: swap-timeline (phase marker log)

**Files:**
- Create: `experiments/hotswap-stress/src/swap-timeline.ts`
- Create: `experiments/hotswap-stress/tests/swap-timeline.test.ts`

A small recorder of high-res timestamps for swap phases, so a failed request can be placed on the swap timeline (pre / mid-window / post-commit).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { SwapTimeline } from '../src/swap-timeline.js';

describe('SwapTimeline', () => {
  it('records marks with monotonic offsets and classifies phases', () => {
    const tl = new SwapTimeline();
    tl.mark('swap:start');
    const tMid = tl.now();
    tl.mark('commit');
    tl.mark('dispose-done');

    // A timestamp taken between swap:start and commit is the "mid" window.
    expect(tl.phaseAt(tMid)).toBe('mid');
    // Before any mark → pre; after dispose-done → post.
    expect(tl.phaseAt(tl.startedAt() - 1)).toBe('pre');
    expect(tl.phaseAt(tl.now() + 1000)).toBe('post');
    expect(tl.marks().map((m) => m.label)).toEqual(['swap:start', 'commit', 'dispose-done']);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest --run tests/swap-timeline.test.ts`
Expected: FAIL — `SwapTimeline` not found.

- [ ] **Step 3: Write the implementation**

```ts
import { performance } from 'node:perf_hooks';

export type SwapPhase = 'pre' | 'mid' | 'post';

export interface SwapMark {
  label: string;
  t: number; // performance.now() ms
}

/**
 * Records high-resolution timestamps around a swap so a sampled request can be
 * attributed to a phase: pre (before swap:start), mid (between swap:start and
 * commit), or post (at/after commit). 'commit' is the boundary that matters —
 * an in-flight request that started mid-window but the swap committed under it
 * is the adversarial case.
 */
export class SwapTimeline {
  private _marks: SwapMark[] = [];

  now(): number {
    return performance.now();
  }

  mark(label: string): void {
    this._marks.push({ label, t: performance.now() });
  }

  marks(): readonly SwapMark[] {
    return this._marks;
  }

  startedAt(): number {
    const start = this._marks.find((m) => m.label === 'swap:start');
    return start ? start.t : Infinity;
  }

  private committedAt(): number {
    const commit = this._marks.find((m) => m.label === 'commit');
    return commit ? commit.t : Infinity;
  }

  phaseAt(t: number): SwapPhase {
    if (t < this.startedAt()) return 'pre';
    if (t < this.committedAt()) return 'mid';
    return 'post';
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest --run tests/swap-timeline.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add experiments/hotswap-stress/src/swap-timeline.ts experiments/hotswap-stress/tests/swap-timeline.test.ts
git commit -m "feat(stress): SwapTimeline phase classifier"
```

---

## Task 7: Fastify server + control plane

**Files:**
- Create: `experiments/hotswap-stress/src/server.ts`
- Create: `experiments/hotswap-stress/tests/server.test.ts`

`buildServer(runtime)` returns a Fastify app. Data-plane routes are pure `runAction` shims. The control plane exposes `POST /__swap/:plugin` that calls a supplied swap function (injected so tests can stub it). Route handlers must map a rejected action to a 5xx, and a missing resource to 404 — so the oracle can distinguish a swap-window 5xx from an ordinary 404.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi } from 'vitest';
import { Runtime } from 'skeleton-crew';
import type { Logger } from 'skeleton-crew';
import { storePluginV1 } from '../src/plugins/store-plugin.js';
import { postsPluginV1 } from '../src/plugins/posts-plugin.js';
import { commentsPluginV1 } from '../src/plugins/comments-plugin.js';
import { buildServer } from '../src/server.js';
import type { StressConfig } from '../src/types.js';

const mockLogger = (): Logger => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() });

async function bootServer() {
  const rt = new Runtime<StressConfig>({ logger: mockLogger(), config: { pageSize: 10 } });
  rt.registerPlugin(storePluginV1);
  rt.registerPlugin(postsPluginV1);
  rt.registerPlugin(commentsPluginV1);
  await rt.initialize();
  const app = buildServer(rt, async () => { /* default no-op swap */ });
  await app.ready();
  return { rt, app };
}

describe('buildServer', () => {
  it('GET /posts returns the list via the action', async () => {
    const { rt, app } = await bootServer();
    const res = await app.inject({ method: 'GET', url: '/posts' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(10);
    await app.close();
    await rt.shutdown();
  });

  it('GET /posts/:id 404s for a missing post (distinct from 5xx)', async () => {
    const { rt, app } = await bootServer();
    const res = await app.inject({ method: 'GET', url: '/posts/99999' });
    expect(res.statusCode).toBe(404);
    await app.close();
    await rt.shutdown();
  });

  it('POST /__swap/:plugin invokes the swap function', async () => {
    const rt = new Runtime<StressConfig>({ logger: mockLogger(), config: { pageSize: 10 } });
    rt.registerPlugin(storePluginV1);
    rt.registerPlugin(postsPluginV1);
    rt.registerPlugin(commentsPluginV1);
    await rt.initialize();
    const swap = vi.fn(async (_plugin: string) => {});
    const app = buildServer(rt, swap);
    await app.ready();
    const res = await app.inject({ method: 'POST', url: '/__swap/posts' });
    expect(res.statusCode).toBe(200);
    expect(swap).toHaveBeenCalledWith('posts');
    await app.close();
    await rt.shutdown();
  });

  it('POST /__swap/:plugin returns 409 when the swap rejects', async () => {
    const rt = new Runtime<StressConfig>({ logger: mockLogger(), config: { pageSize: 10 } });
    rt.registerPlugin(storePluginV1);
    rt.registerPlugin(postsPluginV1);
    rt.registerPlugin(commentsPluginV1);
    await rt.initialize();
    const swap = vi.fn(async () => { throw new Error('swap rejected'); });
    const app = buildServer(rt, swap);
    await app.ready();
    const res = await app.inject({ method: 'POST', url: '/__swap/posts' });
    expect(res.statusCode).toBe(409);
    await app.close();
    await rt.shutdown();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest --run tests/server.test.ts`
Expected: FAIL — `buildServer` not found.

- [ ] **Step 3: Write the implementation**

```ts
import Fastify, { type FastifyInstance } from 'fastify';
import type { Runtime } from 'skeleton-crew';
import type { StressConfig, Post, Comment } from './types.js';

/**
 * A swap trigger: given a plugin name, perform (or reject) a swap. Injected so
 * the orchestrator can map a name to the specific v2 variant for a scenario,
 * and so tests can stub it.
 */
export type SwapFn = (plugin: string) => Promise<void>;

/**
 * Builds the Fastify data plane + control plane. Route handlers are pure
 * runAction shims — all logic and state live in scr. A rejected action handler
 * surfaces as 500 (a swap-window failure the oracle counts); a null/absent
 * resource surfaces as 404 (ordinary, NOT counted as a swap failure).
 */
export function buildServer(runtime: Runtime<StressConfig>, swap: SwapFn): FastifyInstance {
  const app = Fastify({ logger: false });
  const ctx = () => runtime.getContext();

  app.get('/posts', async () => {
    return ctx().actions.runAction<undefined, Post[]>('posts:list', undefined);
  });

  app.get<{ Params: { id: string } }>('/posts/:id', async (req, reply) => {
    const post = await ctx().actions.runAction<{ id: string }, Post | null>('posts:get', {
      id: req.params.id,
    });
    if (post === null) return reply.code(404).send({ error: 'not found' });
    return post;
  });

  app.post<{ Body: { title: string } }>('/posts', async (req, reply) => {
    const created = await ctx().actions.runAction<{ title: string }, Post>('posts:create', {
      title: req.body?.title ?? 'untitled',
    });
    return reply.code(201).send(created);
  });

  app.delete<{ Params: { id: string } }>('/posts/:id', async (req) => {
    return ctx().actions.runAction<{ id: string }, { deleted: boolean }>('posts:delete', {
      id: req.params.id,
    });
  });

  app.get('/comments', async () => {
    return ctx().actions.runAction<undefined, Comment[]>('comments:list', undefined);
  });

  // Control plane: trigger a swap. A rejected swap → 409 (expected for the
  // hijack/throwing scenarios); success → 200.
  app.post<{ Params: { plugin: string } }>('/__swap/:plugin', async (req, reply) => {
    try {
      await swap(req.params.plugin);
      return reply.code(200).send({ swapped: req.params.plugin });
    } catch (err) {
      return reply.code(409).send({ error: (err as Error).message });
    }
  });

  return app;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest --run tests/server.test.ts`
Expected: PASS (all four tests).

- [ ] **Step 5: Commit**

```bash
git add experiments/hotswap-stress/src/server.ts experiments/hotswap-stress/tests/server.test.ts
git commit -m "feat(stress): Fastify server with runAction shims + swap control plane"
```

---

## Task 8: Load layer — flood (autocannon) + verify (fetch sampler)

**Files:**
- Create: `experiments/hotswap-stress/harness/load.ts`
- Create: `experiments/hotswap-stress/tests/load.test.ts`

autocannon returns aggregate stats only (no per-request bodies). Oracles 1 and 5 need response *bodies*. So the load layer has two parts:
- `flood(url, {connections, duration})` → wraps autocannon, returns its result (for zero-5xx + perf oracles).
- `verify(url, {durationMs, timeline})` → a concurrent fetch loop that records each response's body + a `performance.now()` stamp + the swap phase at receipt. These samples feed the body-shape oracles.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi } from 'vitest';
import { Runtime } from 'skeleton-crew';
import type { Logger } from 'skeleton-crew';
import { storePluginV1 } from '../src/plugins/store-plugin.js';
import { postsPluginV1 } from '../src/plugins/posts-plugin.js';
import { commentsPluginV1 } from '../src/plugins/comments-plugin.js';
import { buildServer } from '../src/server.js';
import { SwapTimeline } from '../src/swap-timeline.js';
import { verify } from '../harness/load.js';
import type { StressConfig } from '../src/types.js';

const mockLogger = (): Logger => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() });

describe('verify sampler', () => {
  it('captures response bodies, status, and phase for a live server', async () => {
    const rt = new Runtime<StressConfig>({ logger: mockLogger(), config: { pageSize: 10 } });
    rt.registerPlugin(storePluginV1);
    rt.registerPlugin(postsPluginV1);
    rt.registerPlugin(commentsPluginV1);
    await rt.initialize();
    const app = buildServer(rt, async () => {});
    const address = await app.listen({ port: 0, host: '127.0.0.1' });

    const timeline = new SwapTimeline();
    timeline.mark('swap:start');
    const samples = await verify(`${address}/posts`, { durationMs: 250, timeline });
    timeline.mark('commit');

    expect(samples.length).toBeGreaterThan(0);
    expect(samples.every((s) => s.status === 200)).toBe(true);
    expect(Array.isArray(samples[0].body)).toBe(true);
    expect(['pre', 'mid', 'post']).toContain(samples[0].phase);

    await app.close();
    await rt.shutdown();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest --run tests/load.test.ts`
Expected: FAIL — `verify` not found.

- [ ] **Step 3: Write the implementation**

```ts
import autocannon, { type Result } from 'autocannon';
import type { SwapTimeline, SwapPhase } from '../src/swap-timeline.js';

export interface FloodOptions {
  connections: number;
  duration: number; // seconds
}

/** Saturate the URL with autocannon; returns aggregate stats. */
export function flood(url: string, opts: FloodOptions): Promise<Result> {
  return autocannon({ url, connections: opts.connections, duration: opts.duration });
}

export interface Sample {
  status: number;
  body: unknown;
  t: number; // performance.now() at receipt
  phase: SwapPhase;
}

export interface VerifyOptions {
  durationMs: number;
  timeline: SwapTimeline;
  concurrency?: number; // default 8
}

/**
 * Concurrent fetch loop that records each response's body + receipt time +
 * swap phase. Unlike autocannon (aggregate only), this captures bodies so the
 * body-shape oracles (whole-v1-or-whole-v2, config-snapshot) can inspect them.
 */
export async function verify(url: string, opts: VerifyOptions): Promise<Sample[]> {
  const { durationMs, timeline, concurrency = 8 } = opts;
  const samples: Sample[] = [];
  const deadline = timeline.now() + durationMs;

  async function worker(): Promise<void> {
    while (timeline.now() < deadline) {
      try {
        const res = await fetch(url);
        const t = timeline.now();
        let body: unknown = null;
        try {
          body = await res.json();
        } catch {
          body = null; // non-JSON (e.g. error page) — recorded as null
        }
        samples.push({ status: res.status, body, t, phase: timeline.phaseAt(t) });
      } catch {
        // Connection-level failure (e.g. mid-restart). Record as status 0 so
        // the oracle can see it; phase classified at failure time.
        const t = timeline.now();
        samples.push({ status: 0, body: null, t, phase: timeline.phaseAt(t) });
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return samples;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest --run tests/load.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add experiments/hotswap-stress/harness/load.ts experiments/hotswap-stress/tests/load.test.ts
git commit -m "feat(stress): load layer — autocannon flood + fetch verifier"
```

---

## Task 9: Oracles

**Files:**
- Create: `experiments/hotswap-stress/harness/oracles.ts`
- Create: `experiments/hotswap-stress/tests/oracles.test.ts`

Each oracle takes the verifier `Sample[]` (and where relevant the autocannon `Result`) and returns a verdict `{ pass: boolean, detail: string }`. Crash-signal discipline: a 5xx/status-0 sample is only counted when its phase is `mid` or `post` AND the scenario expects zero failures; ordinary 404s never count.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import {
  oracleNoServerErrors,
  oracleWholeShape,
  oracleConfigSnapshot,
} from '../harness/oracles.js';
import type { Sample } from '../harness/load.js';

function sample(partial: Partial<Sample>): Sample {
  return { status: 200, body: [], t: 0, phase: 'mid', ...partial };
}

describe('oracles', () => {
  it('oracleNoServerErrors fails when a mid-phase 5xx is present', () => {
    const samples = [sample({ status: 200 }), sample({ status: 500, phase: 'mid' })];
    expect(oracleNoServerErrors(samples).pass).toBe(false);
  });

  it('oracleNoServerErrors ignores 404s', () => {
    const samples = [sample({ status: 200 }), sample({ status: 404, phase: 'mid' })];
    expect(oracleNoServerErrors(samples).pass).toBe(true);
  });

  it('oracleWholeShape fails on a mixed v1/v2 batch within one response', () => {
    // A single list response containing both tagged and untagged posts = torn.
    const torn = sample({ body: [{ id: '1', tag: 'v2' }, { id: '2' }] });
    expect(oracleWholeShape(torn ? [torn] : []).pass).toBe(false);
  });

  it('oracleWholeShape passes when every response is uniformly v1 or v2', () => {
    const v1 = sample({ body: [{ id: '1' }, { id: '2' }] });
    const v2 = sample({ body: [{ id: '1', tag: 'v2' }, { id: '2', tag: 'v2' }] });
    expect(oracleWholeShape([v1, v2]).pass).toBe(true);
  });

  it('oracleConfigSnapshot fails when validate and setup saw different pageSize', () => {
    expect(oracleConfigSnapshot({ validated: 10, setup: 20 }).pass).toBe(false);
    expect(oracleConfigSnapshot({ validated: 10, setup: 10 }).pass).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest --run tests/oracles.test.ts`
Expected: FAIL — oracle functions not found.

- [ ] **Step 3: Write the implementation**

```ts
import type { Sample } from './load.js';

export interface Verdict {
  pass: boolean;
  detail: string;
}

/** True server errors (5xx) or connection failures (status 0) are failures.
 *  404s are ordinary and ignored. Only mid/post-phase samples are judged —
 *  a pre-swap blip is harness noise. */
export function oracleNoServerErrors(samples: Sample[]): Verdict {
  const bad = samples.filter(
    (s) => (s.status >= 500 || s.status === 0) && s.phase !== 'pre',
  );
  return {
    pass: bad.length === 0,
    detail: bad.length === 0
      ? `0 server errors across ${samples.length} samples`
      : `${bad.length} server-error samples (e.g. status ${bad[0].status} in phase ${bad[0].phase})`,
  };
}

/** Every list response must be uniformly v1 (no tag) or v2 (all tagged) —
 *  never a mix within a single response body. */
export function oracleWholeShape(samples: Sample[]): Verdict {
  for (const s of samples) {
    if (!Array.isArray(s.body)) continue;
    const arr = s.body as Array<{ tag?: string }>;
    if (arr.length === 0) continue;
    const tagged = arr.filter((p) => p.tag === 'v2').length;
    if (tagged !== 0 && tagged !== arr.length) {
      return {
        pass: false,
        detail: `torn response: ${tagged}/${arr.length} posts tagged v2 in phase ${s.phase}`,
      };
    }
  }
  return { pass: true, detail: `all ${samples.length} responses whole (uniform v1 or v2)` };
}

/** validateConfig and setup must have observed the same pageSize snapshot. */
export function oracleConfigSnapshot(probe: { validated?: number; setup?: number }): Verdict {
  const pass = probe.validated !== undefined && probe.validated === probe.setup;
  return {
    pass,
    detail: pass
      ? `config snapshot stable: pageSize=${probe.validated} at both validate and setup`
      : `config skew: validate saw ${probe.validated}, setup saw ${probe.setup}`,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest --run tests/oracles.test.ts`
Expected: PASS (all five tests).

- [ ] **Step 5: Commit**

```bash
git add experiments/hotswap-stress/harness/oracles.ts experiments/hotswap-stress/tests/oracles.test.ts
git commit -m "feat(stress): per-scenario oracle assertions"
```

---

## Task 10: Scenario definitions

**Files:**
- Create: `experiments/hotswap-stress/harness/scenarios.ts`
- Create: `experiments/hotswap-stress/tests/scenarios.test.ts`

Each scenario bundles: the plugins to boot, the swap to fire (by plugin name → v2), the resource URL the verifier hits, and the oracle(s) to apply. Scenario 6 fires two swaps concurrently.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { SCENARIOS } from '../harness/scenarios.js';

describe('scenario catalogue', () => {
  it('defines all six scenarios with unique ids', () => {
    expect(SCENARIOS).toHaveLength(6);
    const ids = SCENARIOS.map((s) => s.id);
    expect(new Set(ids).size).toBe(6);
    expect(ids).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('each scenario has a name, verifyPath, and run function', () => {
    for (const s of SCENARIOS) {
      expect(typeof s.name).toBe('string');
      expect(s.verifyPath.startsWith('/')).toBe(true);
      expect(typeof s.run).toBe('function');
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest --run tests/scenarios.test.ts`
Expected: FAIL — `SCENARIOS` not found.

- [ ] **Step 3: Write the implementation**

```ts
import { Runtime, type Logger } from 'skeleton-crew';
import { storePluginV1, storePluginV2 } from '../src/plugins/store-plugin.js';
import {
  postsPluginV1,
  postsPluginV2Clean,
  postsPluginV2Throwing,
  postsPluginV2Hijack,
  postsPluginV2Skew,
  skewProbe,
} from '../src/plugins/posts-plugin.js';
import { commentsPluginV1, commentsPluginV2 } from '../src/plugins/comments-plugin.js';
import { buildServer, type SwapFn } from '../src/server.js';
import { SwapTimeline } from '../src/swap-timeline.js';
import { verify, flood } from './load.js';
import {
  oracleNoServerErrors,
  oracleWholeShape,
  oracleConfigSnapshot,
  type Verdict,
} from './oracles.js';
import type { StressConfig } from '../src/types.js';

const silentLogger = (): Logger => ({
  debug: () => {}, info: () => {}, warn: () => {}, error: () => {},
});

export interface ScenarioResult {
  id: number;
  name: string;
  verdicts: Verdict[];
  totalSamples: number;
  serverErrors: number;
  p99LatencyMs: number;
}

export interface Scenario {
  id: number;
  name: string;
  verifyPath: string;
  run(baseConfig: ScenarioRunConfig): Promise<ScenarioResult>;
}

export interface ScenarioRunConfig {
  connections: number;
  durationSec: number;
  swapAtMs: number; // when, into the run, to fire the swap
}

// Boot a fresh runtime + server for a scenario. The swap function is provided
// per-scenario to map a plugin name to its v2 variant.
async function bootScenario(
  swap: SwapFn,
  config: StressConfig = { pageSize: 10 },
): Promise<{ runtime: Runtime<StressConfig>; app: ReturnType<typeof buildServer>; address: string }> {
  const runtime = new Runtime<StressConfig>({ logger: silentLogger(), config });
  runtime.registerPlugin(storePluginV1);
  runtime.registerPlugin(postsPluginV1);
  runtime.registerPlugin(commentsPluginV1);
  await runtime.initialize();
  const app = buildServer(runtime, swap);
  const address = await app.listen({ port: 0, host: '127.0.0.1' });
  return { runtime, app, address };
}

// Shared driver: start flood + verify, fire the swap mid-run via the timeline,
// then assemble a ScenarioResult. `extraOracles` lets a scenario add body-shape
// or probe oracles beyond the universal no-server-errors check.
async function driveScenario(opts: {
  id: number;
  name: string;
  verifyPath: string;
  cfg: ScenarioRunConfig;
  swap: SwapFn;
  initialConfig?: StressConfig;
  fireSwap: (runtime: Runtime<StressConfig>, address: string, timeline: SwapTimeline) => Promise<void>;
  extraOracles?: (samples: Awaited<ReturnType<typeof verify>>) => Verdict[];
}): Promise<ScenarioResult> {
  const timeline = new SwapTimeline();
  const { runtime, app, address } = await bootScenario(opts.swap, opts.initialConfig);

  const floodResult = flood(`${address}${opts.verifyPath}`, {
    connections: opts.cfg.connections,
    duration: opts.cfg.durationSec,
  });
  const verifyResult = verify(`${address}${opts.verifyPath}`, {
    durationMs: opts.cfg.durationSec * 1000,
    timeline,
  });

  // Fire the swap partway through the run.
  await new Promise((r) => setTimeout(r, opts.cfg.swapAtMs));
  await opts.fireSwap(runtime, address, timeline);

  const [samples, ac] = await Promise.all([verifyResult, floodResult]);

  const verdicts: Verdict[] = [oracleNoServerErrors(samples)];
  if (opts.extraOracles) verdicts.push(...opts.extraOracles(samples));

  await app.close();
  await runtime.shutdown();

  return {
    id: opts.id,
    name: opts.name,
    verdicts,
    totalSamples: samples.length,
    serverErrors: samples.filter((s) => (s.status >= 500 || s.status === 0) && s.phase !== 'pre').length,
    p99LatencyMs: ac.latency.p99,
  };
}

export const SCENARIOS: Scenario[] = [
  {
    id: 1,
    name: 'Clean swap (posts v1 → v2 tagged)',
    verifyPath: '/posts',
    run: (cfg) =>
      driveScenario({
        id: 1, name: 'Clean swap', verifyPath: '/posts', cfg,
        swap: async () => {},
        fireSwap: async (rt, _addr, tl) => {
          tl.mark('swap:start');
          await rt.swapPlugin(postsPluginV2Clean);
          tl.mark('commit');
        },
        extraOracles: (samples) => [oracleWholeShape(samples)],
      }),
  },
  {
    id: 2,
    name: 'Throwing swap (posts v2 setup throws)',
    verifyPath: '/posts',
    run: (cfg) =>
      driveScenario({
        id: 2, name: 'Throwing swap', verifyPath: '/posts', cfg,
        swap: async () => {},
        fireSwap: async (rt, _addr, tl) => {
          tl.mark('swap:start');
          await rt.swapPlugin(postsPluginV2Throwing).catch(() => { /* expected reject */ });
          tl.mark('commit');
        },
      }),
  },
  {
    id: 3,
    name: 'Dispose-clobber (store v2 dispose unregisters store)',
    verifyPath: '/posts',
    run: (cfg) =>
      driveScenario({
        id: 3, name: 'Dispose-clobber', verifyPath: '/posts', cfg,
        swap: async () => {},
        fireSwap: async (rt, _addr, tl) => {
          tl.mark('swap:start');
          await rt.swapPlugin(storePluginV2);
          tl.mark('commit');
        },
      }),
  },
  {
    id: 4,
    name: 'Cross-plugin hijack (posts v2 grabs comments:list)',
    verifyPath: '/comments',
    run: (cfg) =>
      driveScenario({
        id: 4, name: 'Cross-plugin hijack', verifyPath: '/comments', cfg,
        swap: async () => {},
        fireSwap: async (rt, _addr, tl) => {
          tl.mark('swap:start');
          await rt.swapPlugin(postsPluginV2Hijack).catch(() => { /* expected reject */ });
          tl.mark('commit');
        },
      }),
  },
  {
    id: 5,
    name: 'Config skew (updateConfig during posts v2 await window)',
    verifyPath: '/posts',
    run: (cfg) =>
      driveScenario({
        id: 5, name: 'Config skew', verifyPath: '/posts', cfg,
        swap: async () => {},
        fireSwap: async (rt, _addr, tl) => {
          tl.mark('swap:start');
          const swapDone = rt.swapPlugin(postsPluginV2Skew);
          // Mutate config during the setup await window.
          await new Promise((r) => setTimeout(r, 0));
          rt.updateConfig({ pageSize: 20 });
          await swapDone.catch(() => {});
          tl.mark('commit');
        },
        extraOracles: () => [oracleConfigSnapshot(skewProbe)],
      }),
  },
  {
    id: 6,
    name: 'Concurrent dual-swap (posts + comments same tick)',
    verifyPath: '/posts',
    run: (cfg) =>
      driveScenario({
        id: 6, name: 'Concurrent dual-swap', verifyPath: '/posts', cfg,
        swap: async () => {},
        fireSwap: async (rt, _addr, tl) => {
          tl.mark('swap:start');
          // Both swaps fired without awaiting between them — they race through
          // buffered-setup → commit against the same live registries.
          const a = rt.swapPlugin(postsPluginV2Clean);
          const b = rt.swapPlugin(commentsPluginV2);
          await Promise.allSettled([a, b]);
          tl.mark('commit');
        },
        extraOracles: (samples) => [oracleWholeShape(samples)],
      }),
  },
];
```

Note: the `swap` SwapFn passed to `buildServer` is unused for the data-plane oracles here (the orchestrator drives swaps directly via `fireSwap` for precise timeline control), so each scenario passes a no-op. The control-plane route still exists and is exercised by `server.test.ts`. `skewProbe` is reset at the top of scenario 5's run via the fresh module state per process; the orchestrator runs scenarios sequentially in one process, so reset it explicitly — see Task 11.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest --run tests/scenarios.test.ts`
Expected: PASS (both tests).

- [ ] **Step 5: Commit**

```bash
git add experiments/hotswap-stress/harness/scenarios.ts experiments/hotswap-stress/tests/scenarios.test.ts
git commit -m "feat(stress): six scenario definitions with timeline-driven swaps"
```

---

## Task 11: Orchestrator + RESULTS.md

**Files:**
- Create: `experiments/hotswap-stress/harness/run.ts`
- Create: `experiments/hotswap-stress/tests/run.test.ts`

`run.ts` runs all six scenarios sequentially (or one via `--scenario=N`), collects `ScenarioResult[]`, and writes `RESULTS.md`. Reset `skewProbe` before scenario 5 so a prior run can't leak state. It must exit non-zero if any oracle fails (so the experiment can gate a manual check), and print a compact summary.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { renderResults } from '../harness/run.js';
import type { ScenarioResult } from '../harness/scenarios.js';

describe('renderResults', () => {
  it('renders a markdown ledger with a row per scenario', () => {
    const results: ScenarioResult[] = [
      {
        id: 1, name: 'Clean swap',
        verdicts: [{ pass: true, detail: '0 server errors' }, { pass: true, detail: 'all whole' }],
        totalSamples: 1234, serverErrors: 0, p99LatencyMs: 12.5,
      },
      {
        id: 2, name: 'Throwing swap',
        verdicts: [{ pass: false, detail: '3 server-error samples' }],
        totalSamples: 1000, serverErrors: 3, p99LatencyMs: 40,
      },
    ];
    const md = renderResults(results);
    expect(md).toContain('# Hot-Swap Stress — Results');
    expect(md).toContain('Clean swap');
    expect(md).toContain('✅');
    expect(md).toContain('❌');
    expect(md).toContain('3 server-error samples');
  });

  it('reports a clean sweep with no findings', () => {
    const results: ScenarioResult[] = [
      { id: 1, name: 'Clean swap', verdicts: [{ pass: true, detail: 'ok' }], totalSamples: 10, serverErrors: 0, p99LatencyMs: 5 },
    ];
    const md = renderResults(results);
    expect(md).toContain('No new findings');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest --run tests/run.test.ts`
Expected: FAIL — `renderResults` not found.

- [ ] **Step 3: Write the implementation**

```ts
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { SCENARIOS, type ScenarioResult, type ScenarioRunConfig } from './scenarios.js';
import { skewProbe } from '../src/plugins/posts-plugin.js';

const DEFAULT_CFG: ScenarioRunConfig = {
  connections: 50,
  durationSec: 3,
  swapAtMs: 1200,
};

export function renderResults(results: ScenarioResult[]): string {
  const allPass = results.every((r) => r.verdicts.every((v) => v.pass));
  const rows = results
    .map((r) => {
      const ok = r.verdicts.every((v) => v.pass);
      const mark = ok ? '✅' : '❌';
      const detail = r.verdicts.map((v) => `${v.pass ? '✓' : '✗'} ${v.detail}`).join('; ');
      return `| ${r.id} | ${mark} ${r.name} | ${r.totalSamples} | ${r.serverErrors} | ${r.p99LatencyMs.toFixed(1)} | ${detail} |`;
    })
    .join('\n');

  const findings = results
    .filter((r) => r.verdicts.some((v) => !v.pass))
    .map((r) => `- **Scenario ${r.id} (${r.name})**: ${r.verdicts.filter((v) => !v.pass).map((v) => v.detail).join('; ')}`)
    .join('\n');

  return `# Hot-Swap Stress — Results

| # | Scenario | Samples | Server errors | p99 (ms) | Oracle detail |
|---|---|---|---|---|---|
${rows}

## Findings

${allPass ? 'No new findings — the 0.6.x swap path held under HTTP load across all scenarios.' : findings}

> Generated by \`npm run stress\`. A failing oracle here is a *candidate* finding;
> reproduce and minimize it to a unit probe under scr's \`tests/\` before claiming a bug.
`;
}

function parseScenarioArg(argv: string[]): number | null {
  const arg = argv.find((a) => a.startsWith('--scenario='));
  if (!arg) return null;
  const n = Number(arg.split('=')[1]);
  return Number.isInteger(n) ? n : null;
}

export async function main(argv: string[]): Promise<number> {
  const only = parseScenarioArg(argv);
  const scenarios = only ? SCENARIOS.filter((s) => s.id === only) : SCENARIOS;
  if (scenarios.length === 0) {
    console.error(`No scenario with id ${only}`);
    return 1;
  }

  const results: ScenarioResult[] = [];
  for (const s of scenarios) {
    // Reset cross-scenario probe state so a prior scenario can't leak.
    skewProbe.validated = undefined;
    skewProbe.setup = undefined;
    console.log(`▶ Scenario ${s.id}: ${s.name}`);
    const result = await s.run(DEFAULT_CFG);
    const ok = result.verdicts.every((v) => v.pass);
    console.log(`  ${ok ? '✅ pass' : '❌ FAIL'} — ${result.totalSamples} samples, ${result.serverErrors} server errors, p99 ${result.p99LatencyMs.toFixed(1)}ms`);
    results.push(result);
  }

  const md = renderResults(results);
  const outPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'RESULTS.md');
  await writeFile(outPath, md, 'utf8');
  console.log(`\nWrote ${outPath}`);

  const allPass = results.every((r) => r.verdicts.every((v) => v.pass));
  return allPass ? 0 : 1;
}

// Entry point when run directly (node dist/harness/run.js).
const isDirectRun = process.argv[1] === fileURLToPath(import.meta.url);
if (isDirectRun) {
  main(process.argv.slice(2)).then((code) => process.exit(code));
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest --run tests/run.test.ts`
Expected: PASS (both tests).

- [ ] **Step 5: Commit**

```bash
git add experiments/hotswap-stress/harness/run.ts experiments/hotswap-stress/tests/run.test.ts
git commit -m "feat(stress): orchestrator + RESULTS.md renderer"
```

---

## Task 12: Full build + end-to-end smoke run

**Files:**
- (no new files; this task validates the whole rig)

- [ ] **Step 1: Run the full unit suite**

Run: `cd experiments/hotswap-stress && npm test`
Expected: PASS — all test files green (store, posts, comments, swap-timeline, server, load, oracles, scenarios, run).

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: `tsc` compiles `src/` + `harness/` to `dist/` with no errors. (If `noUnusedLocals`/`noUnusedParameters` flags an unused `_addr`/`_params`, confirm it's prefixed with `_`; tsconfig's `noUnusedParameters` ignores leading-underscore names.)

- [ ] **Step 3: Run the full stress experiment**

Run: `npm run stress`
Expected: prints six `▶ Scenario N` lines each ending `✅ pass`, then `Wrote .../RESULTS.md`. Process exits 0.

If any scenario prints `❌ FAIL`: that is a *candidate finding*. Do NOT mark this task complete by editing the oracle to pass. Instead: read the failing oracle detail in `RESULTS.md`, reproduce it as a focused unit test under the repo's own `tests/unit/` (mirroring the swap-path-regression style), and confirm whether it's a real scr defect or a harness artifact. Record the outcome in `RESULTS.md`'s Findings section. A genuine finding is a *success* of the experiment, not a task failure.

- [ ] **Step 4: Inspect RESULTS.md**

Run: `npx vitest --run` is not needed; open `experiments/hotswap-stress/RESULTS.md` and confirm it has six rows and a Findings section.

- [ ] **Step 5: Commit (RESULTS.md is gitignored; commit only if a finding was minimized)**

If the run was a clean sweep, there's nothing to commit here (RESULTS.md is gitignored by design — it's a generated artifact).
If a finding was minimized into `tests/unit/`, commit that:

```bash
git add tests/unit/
git commit -m "test(swap): regression probe for finding surfaced by stress harness"
```

---

## Task 13: README

**Files:**
- Create: `experiments/hotswap-stress/README.md`

- [ ] **Step 1: Write the README**

```markdown
# Hot-Swap Adversarial Stress Harness

Drives concurrent HTTP load through skeleton-crew actions while hot-swapping the
backing plugins underneath — the "taste of its own medicine" swap-path hunt, in
the wild instead of deterministic unit probes.

## What it does

A thin Fastify server whose every route is a `runAction` shim (scr owns all
logic + state via an in-memory `store` service). `autocannon` saturates a
resource while the harness fires `runtime.swapPlugin(v2)` mid-flood. A separate
`fetch` verifier records each response's body + swap-phase so per-request
oracles can judge correctness — not just "did it crash."

## Scenarios

| # | Scenario | What it probes |
|---|---|---|
| 1 | Clean swap | In-flight reads see whole-v1 or whole-v2, never a mix |
| 2 | Throwing swap | A v2 whose setup throws never 5xxes a live request (0.6.0 atomicity) |
| 3 | Dispose-clobber | v1.dispose must not delete v2's re-registered `store` (Finding 1) |
| 4 | Cross-plugin hijack | A swap grabbing another plugin's action is rejected (Finding 8) |
| 5 | Config skew | validateConfig + setup observe one config snapshot (Finding 9) |
| 6 | Concurrent dual-swap | Two plugins swapping at once — the net-new bug candidate |

## Run

```bash
npm install
npm run stress              # all six scenarios → RESULTS.md
npm run stress -- --scenario=6   # just one
npm test                    # unit tests for plugins, server, oracles
```

Exit code is non-zero if any oracle fails. A failing oracle is a *candidate*
finding: reproduce and minimize it to a unit probe under the repo's `tests/`
before claiming a bug. A clean sweep confirms the 0.6.x hardening held under
real HTTP load.

## Design

See [`docs/superpowers/specs/2026-06-21-hotswap-stress-design.md`](../../docs/superpowers/specs/2026-06-21-hotswap-stress-design.md).
```

- [ ] **Step 2: Commit**

```bash
git add experiments/hotswap-stress/README.md
git commit -m "docs(stress): harness README"
```

---

## Done criteria

- All six scenarios run to completion via `npm run stress`, each with a wired oracle.
- `RESULTS.md` is generated with a six-row ledger + Findings section.
- The full unit suite (`npm test`) is green.
- Any oracle failure has been triaged: either minimized into a `tests/unit/` regression probe (real finding) or explained as a harness artifact in RESULTS.md.
- A clean sweep is a valid done state — it confirms the 0.6.x swap path holds under HTTP load.
