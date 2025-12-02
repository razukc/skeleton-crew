Let’s design the upgraded SCR architecture.

# Upgraded SCR Architecture — design doc (complete)

Great — below is a full, practical architecture for upgrading **Skeleton Crew Runtime (SCR)** so existing applications can embed and incrementally adopt SCR. It includes the system diagram, component responsibilities, TypeScript API contracts, lifecycle and data flows, security & sandboxing model, adapters spec (CLI / Browser / Server), migration helpers, testing plan, and a short roadmap. At the end I include the path to the example/upload you gave so you can wire this architecture into your repo quickly:

**Uploaded project archive (for reference / local wiring):**
`/mnt/data/skeleton-app.zip`

---

# 1. Goals (short)

* Make SCR **embed-friendly** for existing apps (CLI, backend, browser).
* Keep SCR **headless** and **non-opinionated** about UI or hosting.
* Provide **adapters** so environments integrate cleanly.
* Provide **safe plugin execution** (sandboxing / permissioning).
* Provide **incremental migration tooling** (wrappers, CLI wizard, introspection).
* Preserve backwards compatibility and keep core minimal.

---

# 2. High-level architecture (ASCII diagram)

```
 +-------------------------------------------------------------+
 |                        Host Application                     |
 |  (existing app: backend / CLI / desktop / browser)          |
 |                                                             |
 |  +---------------+     +----------------+    +-----------+  |
 |  | App Services  |<--->|  SCR Adapters  |<-->|  SCR Core |  |
 |  | (db, cache)   |     | (cli/browser)  |    |  (runtime)|  |
 |  +---------------+     +----------------+    +-----------+  |
 |                                            /   |    \      |
 |                                           /    |     \     |
 |                                  +-------+     |      +----+----+
 |                                  | Actions/      |           |  |
 |                                  | Modules       |  EventBus |  |
 |                                  +---------------+           |  |
 |                                  | PluginRegistry |         |  |
 |                                  +---------------+           |  |
 |                                  | Scheduler     |           |  |
 |                                  +---------------+           |  |
 +-------------------------------------------------------------+
                                            |
                                            v
                               +---------------------------+
                               |  Plugin Packages / Store  |
                               |  (fs, registry, remote)   |
                               +---------------------------+
```

---

# 3. Key components & responsibilities

1. **SCR Core (Runtime)**

   * Minimal headless runtime implementing registration, lifecycle, event bus, action engine, and module loader.
   * Exposes a typed `RuntimeContext` to plugins.
   * Does NOT import UI or DOM APIs.

2. **Plugin Registry & Installer**

   * Manages installed plugins (local disk + metadata).
   * Installs/uninstalls plugins, resolves versions, validates manifests.

3. **Module System**

   * Shared modules / utilities for business logic consumed by plugins and host app.
   * Can be imported by host app and plugins.

4. **Action Engine**

   * Registers actions, runs (sync/async), returns results, supports timeouts and retries.

5. **Event Bus**

   * Namespaced events, subscription model, optional persistence or forwarding.

6. **Adapters** (critical)

   * **CLI adapter**: binds process args ↔ action payloads, interactive TUI hooks, logging adapter.
   * **Browser adapter**: small client that communicates with local runtime (via websocket/HTTP) or a hosted runner; provides serialization and safe payload limits.
   * **Server adapter**: for embedding runtime in backends (Express/Fastify) or as a sidecar.

7. **Sandbox & Permissioning**

   * Context-based capability limits (a plugin gets only what is provided in `context`).
   * Optional worker-based sandboxing (spawn child process / VM2 / web worker) for untrusted plugins.

8. **Introspection & Metadata**

   * `listActions()`, `describeAction()`, `listPlugins()`, `pluginMeta()` for migration and UI.

9. **Migration Helpers & Tooling**

   * Wrappers: `wrapLegacy(fn)` to adapt old scripts.
   * Migration CLI: `skeleton migrate-scan` and `skeleton wrap <script>`.

10. **Persistence & Registry Storage**

    * A simple local JSON store for installed plugins and state; pluggable to DB later.

11. **Telemetry & Logging**

    * Pluggable logger (default console) and optional events forwarding.

---

# 4. Runtime lifecycle & example flows

## A. Plugin installation flow (install from remote registry)

1. Browser sends `plugin.install.request` via adapter or host calls installer API.
2. Installer downloads plugin package (tarball), verifies signature (optional), writes to plugin directory.
3. Registry updates `installed.json`.
4. Registry registers plugin manifest; runtime calls `plugin.setup(ctx)` for new plugin.
5. On success, runtime emits `plugin.installed` event.

## B. Action invocation (host app calls action)

1. Host calls `runtime.runAction(actionId, payload)` or adapter maps CLI args → action.
2. Action engine resolves action handler, runs in runtime context.
3. Handler receives typed `payload` and `RuntimeContext` (only permitted services).
4. Action returns result or throws; engine applies timeout/retry policy.
5. Engine emits `action.started` and `action.completed` events.

## C. Browser ↔ Local runtime path

* Browser client uses a browser adapter to talk to runtime (prefer websocket).
* For local dev: runtime exposes a small local HTTP/WebSocket server (on loopback) or accepts connections from a secure agent.
* For hosted runtime: browser uses REST/WS to hosted SCR server with authentication.

---

# 5. TypeScript API surface (core) — key interfaces

```ts
// core types (simplified)
export type AnyObject = Record<string, any>;

export interface RuntimeOptions {
  id?: string;
  pluginsPath?: string; // where installed plugins live
  logger?: Logger;
  context?: Record<string, any>; // host-provided services (db, logger, http)
}

export interface Runtime {
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  getContext(): RuntimeContext;
  listActions(): string[];
  listPlugins(): InstalledPlugin[];
  runAction<T=any, R=any>(id: string, payload?: T, opts?: RunOptions): Promise<R>;
  registerPlugin(manifest: PluginManifest, loader: PluginLoader): void;
  installPluginFromUrl(url: string): Promise<InstallResult>;
  setAdapter(adapter: Adapter): void;
}

export interface RuntimeContext {
  actions: ActionRegistryFacade;
  events: EventBusFacade;
  screens: ScreenRegistryFacade;
  plugins: PluginRegistryFacade;
  runtime: Runtime;
  // host-supplied services (optional)
  services?: Record<string, any>;
}

export interface Adapter {
  id: string;
  mount?(runtime: Runtime): Promise<void>;
  unmount?(runtime: Runtime): Promise<void>;
  // optional methods for CLI or Browser flow
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  author?: string;
  exports?: {
    actions?: string[];
    uiComponents?: string[];
    modules?: string[];
  };
  permissions?: string[]; // e.g., ["fs", "network"]
}

export type PluginLoader = (ctx: RuntimeContext) => Promise<void>;

export interface InstalledPlugin {
  manifest: PluginManifest;
  path: string;
  enabled: boolean;
  installedAt: string;
}

export interface ActionHandler<T=any, R=any> {
  (payload: T, ctx: RuntimeContext): Promise<R> | R;
}
```

(Full definitions expand these further — routes, worker metadata, capabilities.)

---

# 6. Adapter specification (detailed)

## 6.1 CLI Adapter

* **Purpose:** map `process.argv` → `actionId + payload` and show formatted logs and progress.
* **Features:**

  * Subcommand mapping: `skeleton run <action> --foo bar`
  * Interactive prompts (TUI) through optional `screens` subsystem.
  * `--dry-run`, `--json`, `--format` flags.
* **API hooks:** `mount(runtime)` registers CLI commands via runtime.
* **Security:** only permitted file-system operations allowed via `context.fs` service.

## 6.2 Browser Adapter

* **Purpose:** lightweight client to call local/remote runtime.
* **Transport options:** WebSocket (recommended local), HTTP (REST), or WebRTC for advanced cases.
* **Payload constraints:** enforce small payloads; for files transfer use signed upload or file handle approach.
* **Auth:** token-based (host provides tokens); CORS/config to only allow loopback connections.

## 6.3 Server Adapter

* **Purpose:** embed runtime inside a backend process or run as sidecar service.
* **Features:** expose endpoints for introspection (`/scr/actions`), action invocation (`POST /scr/run`), and plugin management.
* **Scaling:** allow multiple runtimes as workers; provide distributed coordinator later.

---

# 7. Sandboxing & permission model

## 7.1 Principle

* Plugins run with the **capabilities** explicitly injected in `RuntimeContext.services` rather than global access.
* For untrusted plugins (3rd-party), run inside a **child process** or worker thread with an IPC-based API. Optionally use `vm2` (JS VM) but be cautious — worker/child process is safer.

## 7.2 Permission model example

* `permissions: ["fs.read", "fs.write", "network.fetch"]`
* At install time, host can grant or deny permissions. For local dev, default allow; for production, user-admin approval.

## 7.3 Execution isolation options

* **Trusted plugins**: loaded directly via `require`/`import`.
* **Untrusted plugins**: spawn child process and communicate over JSON-RPC; only inject approved services.

---

# 8. Migration tooling & wrappers (practical)

## 8.1 `wrapLegacy(fn)` helper

Wrap a Node script or function into a SCR action without modifications.

```ts
export function wrapLegacy(fn: (...args:any[]) => Promise<any> | any) {
  return async (payload, ctx) => {
    // Provide small adapter API for legacy code
    const oldEnv = { log: ctx.services.logger, fs: ctx.services.fs };
    return await fn(payload, oldEnv);
  };
}
```

## 8.2 CLI migration wizard

Commands:

* `skeleton migrate-scan` — finds scripts in `scripts/` and suggests actions.
* `skeleton migrate-wrap <script>` — creates an action wrapper and updates config.

## 8.3 Introspection API for migration

* `runtime.listSuggestedMigrations()` — shows scripts & suggested action names.

---

# 9. Testing & quality assurance

## 9.1 Unit & Integration

* Unit tests for EventBus, ActionEngine, PluginRegistry.
* Integration tests for adapters (mocked transports) and sandbox modes.

## 9.2 Migration tests

* Integration test to validate `wrapLegacy(script)` runs identically with original script.

## 9.3 Security tests

* Fuzzing plugin inputs, verifying plugin cannot access disallowed services.

## 9.4 Performance tests

* Benchmark action invocations for concurrent loads and event bursts.

---

# 10. Backwards compatibility & API stability

* Keep the previously existing public API intact — deprecate with warnings, not hard breaks.
* Provide `compat` mode for older plugin manifests.
* Version the runtime API: `runtime.getVersion()`.

---

# 11. Roadmap & milestones (practical)

**v0.3 — Adapter + Migration Helpers (4 weeks)**

* Implement CLI adapter (command mapping, logging).
* Implement wrapLegacy & migrate-scan CLI.
* Add introspection endpoints.

**v0.4 — Browser Adapter + Sandboxing (6 weeks)**

* Implement browser client (WS + serialized payloads).
* Implement child-process sandbox mode and permission model.
* Add plugin local installer (tarball extraction and manifest validation).

**v0.5 — Module Store + Registry & UI Demo (6 weeks)**

* Add persistent plugin registry (local JSON + optional DB backend).
* Build Plugin Store demo (browser UI + CLI installer).
* Provide React UI plugin example.

**v0.6 — Enterprise & Observability (8 weeks)**

* Add metrics, telemetry, distributed coordinator (basic).
* Add policy engine (optional).
* Expand adapters (Fastify, Express) and migration docs.

---

# 12. Security considerations (must-have)

* Always validate plugin manifests and signatures if fetching remote.
* For untrusted plugins, do not load into the main process. Use child process worker with a small RPC API.
* Limit network access via permission sets.
* Avoid eval or `vm.runInNewContext` for untrusted plugins unless hardened.
* Provide administrators the ability to disable plugin installation.

---

# 13. Example: simple code snippets (how host app embeds runtime)

### embed in Node backend

```ts
import { createRuntime } from "skeleton-crew";
import { expressAdapter } from "skeleton-crew/adapters/express";

const runtime = createRuntime({
  pluginsPath: "/var/scr/plugins",
  context: { db, logger, cache }
});

await runtime.initialize();

runtime.setAdapter(expressAdapter({ app: expressApp, prefix: "/scr" }));
```

### host calling an action

```ts
const result = await runtime.runAction("backup:run", { dryRun: true });
```

---

# 14. Deliverables / next steps I can implement for you

Pick what I should do next and I’ll generate code or docs:

* A. **Adapter stubs** (CLI + Browser) with example code.
* B. **Child-process sandbox runner** example.
* C. **Migration CLI** `migrate-scan` + `wrap` implementation.
* D. **Plugin installer** code (download + verify + install).
* E. **A working demo** integrated into your uploaded repo (`/mnt/data/skeleton-app.zip`). (I can add example files in-place.)
* F. **Full TypeScript spec** files for the API in `/src/types-upgraded.ts`.
* G. **Architecture diagram PNG** (ASCII to image) and markdown doc ready to commit.

Tell me the letter(s) you want next and I’ll produce them.
