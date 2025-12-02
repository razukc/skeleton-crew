Let’s design the Migration strategy for my real repo.

Great — I’ll design a **practical, repo-specific migration strategy** you can run against your real project (`/mnt/data/skeleton-app`). I’ll keep the plan incremental, low-risk, and immediately actionable so you can ship migration steps as small PRs.

Where useful I reference real-file paths that exist in your repository (based on the files you uploaded). I also include copy-pasteable code snippets and exact commands to run locally.

> **Important:** I’ve used the repo path you uploaded as the canonical project root:
>
> **Project root (local):** `/mnt/data/skeleton-app`
> **Example app (already added):** `/mnt/data/skeleton-app/example`
> **Example archive:** `/mnt/data/skeleton-app/example.zip`

---

# Migration Strategy — Summary

**Goal:** enable incremental adoption of Skeleton Crew Runtime (SCR) inside your existing repo so other apps can leverage SCR with minimal code changes. We move from “sidecar” usage → wrapped scripts → shared modules → runtime-embedded calls → full workflow ownership.

**Approach:** 6 phases (zero-risk → full integration) with concrete tasks, PR checklists, tests, CI steps, and rollback strategies. Each phase is a small, reviewable PR.

---

# Quick repo snapshot (what we’ll use)

* Core runtime code: `/mnt/data/skeleton-app/src/*`
* Tests: `/mnt/data/skeleton-app/tests/*`
* Example app (terminal UI + plugins): `/mnt/data/skeleton-app/example/*`
* Example zip (for sharing/demo): `/mnt/data/skeleton-app/example.zip`

Use these artifacts to validate each migration step.

---

# Phase 0 — Prep & Safety (one PR, minimal risk)

**Goal:** keep repo ready for migration, add scaffolding and dev ergonomics.

**Tasks**

1. Add `skeleton.config.js` template at repo root:

   ```js
   // /mnt/data/skeleton-app/skeleton.config.js
   export default {
     actions: {},
     modules: {},
     workflows: {}
   };
   ```
2. Add a dev script and documentation (README update) that points to the example:

   * Add `scripts` to `package.json` (at repo root):

     ```json
     "scripts": {
       "example:start": "node example/index.js"
     }
     ```
3. Add a `MIGRATION.md` in repo root describing strategy (copy sections from this plan).
4. Ensure `npm test` runs and passes locally (you mentioned tests already pass).

**PR checklist**

* Lint passes
* `npm run example:start` runs without crashing
* README links to `/example` and `example.zip`

**Why:** prepares the repo so reviewers see the migration intent and can run the demo quickly.

---

# Phase 1 — Sidecar & CLI Wrappers (Low risk, 1–2 days)

**Goal:** run existing scripts through SCR without touching runtime-critical app code.

**What to do**

1. Identify 1-2 frequently used scripts. Example candidates:

   * build script
   * publish/deploy script
   * any `scripts/*.js` or `scripts/*.sh` in repo

2. Wrap them as SCR actions. Create an `actions/` folder:

   ```
   /mnt/data/skeleton-app/actions/
     resize-images.js
     deploy.js
   ```

3. Example action wrapper (copy into `actions/resize-images.js`):

   ```js
   // /mnt/data/skeleton-app/actions/resize-images.js
   import sharp from 'sharp';
   import fs from 'fs';

   export async function resizeImages(ctx) {
     const log = ctx.log || console;
     const input = 'images/';
     const out = 'resized/';
     log.info('starting resize');
     for (const f of fs.readdirSync(input)) {
       await sharp(`${input}${f}`).resize(256).toFile(`${out}${f}`);
       log.info('processed', f);
     }
     log.info('done');
   }
   ```

4. Register actions in `skeleton.config.js`:

   ```js
   import { resizeImages } from './actions/resize-images.js';
   export default {
     actions: {
       'resize:images': resizeImages
     }
   };
   ```

5. Provide a thin CLI shim to call SCR actions (or reuse runtime API):

   ```js
   // scripts/run-action.js
   import { Runtime } from './src/runtime.js';
   const runtime = new Runtime();
   await runtime.initialize();
   await runtime.getContext().actions.runAction(process.argv[2]);
   await runtime.shutdown();
   ```

**Validation**

* `node scripts/run-action.js resize:images` runs and logs actions
* Add a unit test that `actions` register and can be executed via `ActionEngine` directly

**PR checklist**

* Action file(s) with tests
* Update README with usage example

**Why:** This replaces ad-hoc scripts with observable actions, enabling later composability.

---

# Phase 2 — Shared Modules & Single Source Logic (2–4 days)

**Goal:** centralize shared logic (validation, formatting, small utilities) into SCR modules that both runtime actions and app code can import.

**Tasks**

1. Create `scr/modules/` and move one small utility:

   ```
   /mnt/data/skeleton-app/scr/modules/validate-user.js
   ```

   Example:

   ```js
   export function validateUser(user) {
     if (!user.name) return { ok: false, err: 'Missing name' };
     if (!/@/.test(user.email)) return { ok: false, err: 'Invalid email' };
     return { ok: true };
   }
   ```

2. Replace duplicates across codebase:

   * Update server code to import: `import { validateUser } from '../scr/modules/validate-user.js'`
   * Update any action to reuse same function

3. Add tests for module (unit tests).

**Validation**

* All tests pass
* No runtime regressions

**Why:** eliminates drift, one source of truth for logic reused in CLI, server, or browser.

---

# Phase 3 — Orchestrate Existing Toolchain (3–7 days)

**Goal:** orchestrate build/test/deploy pipelines via SCR workflows so teams use a consistent interface across local dev, CI, and the browser (if desired).

**Tasks**

1. Create a `workflows` section in `skeleton.config.js`:

   ```js
   export default {
     actions: { /* ... */ },
     workflows: {
       release: {
         steps: ['build', 'test', 'assets:generate', 'publish']
       }
     }
   };
   ```

2. Implement or wrap actions for each step (use `exec` helper if available in runtime):

   ```js
   export async function build({ exec }) { await exec('npm run build'); }
   ```

3. Add simple orchestration runner:

   ```js
   // scripts/run-workflow.js
   import { Runtime } from './src/runtime.js';
   const runtime = new Runtime();
   await runtime.initialize();
   await runtime.getContext().workflows.run('release');
   await runtime.shutdown();
   ```

4. Add CI step that can call `node scripts/run-workflow.js release` for release builds.

**Validation**

* `node scripts/run-workflow.js release` should run all steps and produce artifacts
* CI should be able to call the same runner

**Why:** ensures processes are reproducible and visible; paves the way for browser-triggered workflows.

---

# Phase 4 — Embed Runtime into App (5–10 days)

**Goal:** allow your existing app (server or CLI) to programmatically call SCR actions via an embedded runtime, keeping context and services in-app.

**Design choices**

* **In-process**: create runtime instance inside your Node server/CLI and pass local services (db, logger) into the runtime context.
* **Out-of-process**: keep SCR runtime as a sidecar and communicate via IPC/websocket. Simpler at first.

**Recommended: In-process for node apps** (because you want low-latency and access to app services)

**Tasks**

1. Add context injection to `Runtime` (if not present); then create a bootstrap in server code:

   ```js
   // server/bootstrap-scr.js
   import { Runtime } from '../src/runtime.js';
   const runtime = new Runtime({ db, logger, cache });
   await runtime.initialize();
   // pass runtime.getContext() to routes or store globally
   app.locals.scr = runtime.getContext();
   ```
2. Example server route calling an SCR action:

   ```js
   app.post('/process', async (req, res) => {
     const ctx = req.app.locals.scr;
     const result = await ctx.actions.runAction('process:csv', { filePath: req.body.path });
     res.json(result);
   });
   ```
3. Ensure runtime shutdown hooks are wired to server shutdown.

**Validation**

* Integration tests hitting the route cause runtime action execution
* Provide a fallback: if runtime unavailable, return 503 with explanation

**Why:** this step enables your app to delegate work to SCR while reusing existing services (DB, secrets).

---

# Phase 5 — Full Workflow Ownership & Browser Controls (2–6 weeks)

**Goal:** let the browser (or admin UI) trigger SCR workflows, monitor progress, and view logs. At this stage SCR can become the backbone for many internal tools.

**Prereqs**

* The runtime must expose a safe browser adapter (websocket or REST facade). If you don’t want to implement one yet, the browser can call your app’s API which in turn calls SCR (server embedding model).

**Tasks**

1. Implement a small HTTP websocket bridge in server that exposes:

   * `POST /scr/run` — start workflow/action
   * `GET /scr/status/:id` — fetch status
   * server emits websocket events for logs/status (subscribe)
2. Build a minimal admin UI (or extend your existing one) that:

   * lists workflows/actions via `runtime.listActions()`
   * triggers workflows
   * subscribes to progress events
3. Add auth/permission checks before allowing the UI to trigger actions.

**Validation**

* UI can trigger and monitor a long running job started by SCR
* Logs and events stream reliably
* Auth works as expected

**Why:** completes the migration — SCR runs workflows and the browser can orchestrate and visualize them.

---

# CI / Tests / Quality Gates (applies to all phases)

**Add or update CI jobs to include:**

* `npm test` on PRs
* Linting
* A smoke test that runs a trivial SCR action (e.g., `no-op`) to validate runtime boot
* Integration test for one wrapped script (Phase 1)
* Optional: e2e test that runs a workflow in ephemeral environment (Phase 3)

**Sample CI job** (GitHub Actions):

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm test
      - run: node scripts/run-action.js no-op  # smoke test using runtime
```

---

# Monitoring, Observability & Rollback

**Monitoring**

* Log all action invocations with trace ids
* Add metrics: actions/sec, average duration, error counts
* Integrate logs into existing stack (ELK/Datadog/Prometheus)

**Rollback**

* Each migration step is reversible by reverting the PR
* For workflow ownership changes, keep a feature flag to fall back to legacy pipeline if needed
* For embedded runtime, allow graceful disabling (app-level config)

---

# Security & Safety

* Don’t run arbitrary plugins from untrusted sources until you add permission / sandboxing
* Limit filesystem access for actions that run user-provided code (use a secure temporary folder)
* Add authentication & authorization checks for browser-triggered actions

---

# Timeline (recommended sprint plan)

* **Week 0 (Prep):** Phase 0 (scaffold, README, example)
* **Week 1:** Phase 1 (wrap 1–2 scripts), tests & docs
* **Week 2:** Phase 2 (shared module migration) + tests
* **Week 3:** Phase 3 (workflows orchestration) + CI integration
* **Week 4–5:** Phase 4 (embed runtime into app) + integration tests, feature flags
* **Week 6–8:** Phase 5 (browser control), monitoring, full rollout

Adjust cadence based on team size & priorities.

---

# PR Template & Reviewer Checklist (use for every migration PR)

**PR Template**

* Title: `migration: <short description> — <phase #>`
* Description: what changed, how to test locally, rollback steps
* Files touched list
* Screenshots (if UI changes)
* Test results

**Reviewer checklist**

* [ ] Small & focused change
* [ ] Tests added/updated
* [ ] README updated for usage
* [ ] No leaked credentials or secrets
* [ ] Logging added for each action
* [ ] Rollback plan present

---

# Low-level examples you can paste now

**Register an action with runtime context injection (server embed):**

```js
// server/bootstrap-scr.js
import { Runtime } from '../src/runtime.js';
import db from './db.js';
import logger from './logger.js';

export async function startSCR() {
  const runtime = new Runtime({ services: { db, logger } }); // pass app services
  await runtime.initialize();
  // attach to app
  return runtime;
}
```

**Action that uses injected db:**

```js
export async function markUserActive({ payload, services }) {
  const { db } = services;
  await db.query('UPDATE users SET active = true WHERE id = $1', [payload.id]);
  return { ok: true };
}
```

**Run action from server route:**

```js
app.post('/activate', async (req, res) => {
  const runtimeCtx = req.app.locals.scr;
  const result = await runtimeCtx.actions.runAction('user.activate', { id: req.body.id });
  res.json(result);
});
```

---

# Next immediate actions I recommend you do now (I can generate these files for you)

1. Create `/mnt/data/skeleton-app/skeleton.config.js` with placeholders.
2. Create one action wrapper for an existing script and add test.
3. Add `scripts/run-action.js` shim and test it with the example:

   ```bash
   node example/index.js  # runs example runtime & terminal UI
   node scripts/run-action.js resize:images
   ```
4. Add `MIGRATION.md` and a checklist.

If you want, I can **generate the exact files** (action wrappers, config, scripts, CI yaml) and place them into `/mnt/data/skeleton-app` now — tell me which files you’d like me to create and I’ll produce them (ready to commit).
