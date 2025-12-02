Full technical spec (TS definitions) for adapters, context, wrappers.

# Full technical spec — TypeScript definitions for Adapters, Context, and Wrappers

Below is a complete, copy-pasteable TypeScript spec you can use as the **contract** for upgrading SCR so existing applications can embed it. It includes:

* Runtime public types and low-level internal primitives
* Adapter interfaces (CLI, Browser, Server, UI, Storage)
* Strongly-typed `RuntimeContext` and action/module/plugin contracts
* Wrapper helpers for migrating legacy code (functions, shell commands, child processes)
* Examples of usage and small notes on semantics

> Repository archive you uploaded (for reference / to attach examples): `/mnt/data/skeleton-app.zip`

---

> Implementation note: these are **type definitions + small helper signatures**. They are intentionally conservative (no runtime behavior assumed). Use them as your authoritative API surface for v0.3.

```ts
// types/scr-core.d.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Skeleton Crew Runtime - Core Types
 *
 * These types describe the public API surface of the runtime,
 * adapter contracts, plugin contracts, and wrapper helpers.
 */

/* -----------------------
   Primitive utility types
   ----------------------- */

export type JsonValue = null | boolean | number | string | JsonValue[] | { [k: string]: JsonValue };

export type AsyncOrSync<T> = T | Promise<T>;

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
  debug(...args: any[]): void;
  info(...args: any[]): void;
  warn(...args: any[]): void;
  error(...args: any[]): void;
  // Optional structured helpers
  step?(message: string, meta?: Record<string, any>): void;
  done?(message: string, meta?: Record<string, any>): void;
}

/* -----------------------
   Runtime options & meta
   ----------------------- */

export interface RuntimeOptions {
  id?: string; // optional human-friendly instance id
  logger?: Logger;
  adapters?: Adapter[]; // adapters to install at creation
  context?: Record<string, any>; // injected host objects (DB, http client, etc.)
  allowUnsafePlugins?: boolean; // opt in for permissive plugin behavior
}

/* -----------------------
   Action types
   ----------------------- */

/**
 * Generic action handler signature.
 * - P: payload type
 * - R: return/result type
 */
export type ActionHandler<P = any, R = any> = (params: {
  payload?: P;
  runtime: RuntimeContext;
  logger: Logger;
  meta?: Record<string, any>;
}) => AsyncOrSync<R>;

/**
 * Action definition that authors provide when registering an action.
 */
export interface ActionDefinition<P = any, R = any> {
  id: string;
  description?: string;
  schema?: unknown; // optional validation schema (e.g. Zod, JSON Schema)
  handler: ActionHandler<P, R>;
  timeoutMs?: number;
  retry?: {
    attempts: number;
    backoffMs?: number;
  };
}

/* -----------------------
   Module types (shared logic)
   ----------------------- */

export interface ModuleExports {
  [name: string]: any;
}

export interface ModuleDefinition {
  id: string;
  description?: string;
  exports: ModuleExports;
}

/* -----------------------
   Plugin types
   ----------------------- */

export type PluginSetupFn = (ctx: RuntimeContext) => AsyncOrSync<void>;
export type PluginDisposeFn = (ctx: RuntimeContext) => AsyncOrSync<void>;

/**
 * Minimal plugin surface. Plugins should avoid creating global state and
 * instead use the runtime context to register their actions/screens/modules.
 */
export interface PluginDefinition {
  id: string;
  name?: string;
  version?: string;
  description?: string;
  // plugin manifest: exports to introspection (actions/ui/components)
  manifest?: {
    actions?: string[];
    uiComponents?: string[]; // identifiers for UI adapters to map
    routes?: string[];
    workers?: string[];
  };
  setup: PluginSetupFn;
  dispose?: PluginDisposeFn;
  // An optional "capabilities" object to declare required host features
  capabilities?: string[];
}

/* -----------------------
   Screen / UI schema
   ----------------------- */

/**
 * Because SCR is headless, a ScreenDefinition intentionally avoids framework types.
 * `component` is an opaque value; UI adapters know how to render it.
 */
export interface ScreenDefinition {
  id: string;
  title?: string;
  description?: string;
  component?: any; // opaque schema; consumed by UI adapters
  meta?: Record<string, any>;
}

/* -----------------------
   RuntimeContext (public API)
   ----------------------- */

/**
 * Exposed to plugin authors and external callers. Do not expose internal Maps.
 */
export interface RuntimeContext {
  // Identification & runtime
  readonly runtimeId: string;
  readonly isInitialized: boolean;

  // Actions API
  actions: {
    register<P = any, R = any>(def: ActionDefinition<P, R>): () => void; // returns unregister
    run<P = any, R = any>(actionId: string, payload?: P, opts?: { timeoutMs?: number }): Promise<R>;
    has(actionId: string): boolean;
    list(): readonly string[]; // list action IDs
  };

  // Screens API
  screens: {
    register(screen: ScreenDefinition): () => void;
    get(screenId: string): ScreenDefinition | undefined;
    list(): ScreenDefinition[];
  };

  // Plugins API
  plugins: {
    register(plugin: PluginDefinition): void;
    get(pluginId: string): PluginDefinition | undefined;
    list(): PluginDefinition[];
  };

  // Modules API
  modules: {
    register(mod: ModuleDefinition): void;
    get(moduleId: string): ModuleDefinition | undefined;
  };

  // Events API
  events: {
    emit(event: string, payload?: any): void;
    on(event: string, handler: (payload?: any) => void): () => void; // returns unsubscribe
    once(event: string, handler: (payload?: any) => void): void;
    listSubscribers(event: string): number;
  };

  // Host-provided services (injected at runtime creation)
  readonly host: Readonly<Record<string, any>>;

  // Introspection & admin
  listActions(): string[];
  listScreens(): ScreenDefinition[];
  listPlugins(): PluginDefinition[];
  describeAction(actionId: string): { id: string; description?: string; schema?: unknown } | undefined;

  // Utilities
  logger: Logger;
  // Expose the runtime instance for advanced use (careful not to leak internals)
  runtime?: Runtime;
}

/* -----------------------
   Runtime public surface
   ----------------------- */

export interface Runtime {
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  getContext(): RuntimeContext;
  // quick programmatic register helpers (convenience)
  registerAction<P = any, R = any>(def: ActionDefinition<P, R>): () => void;
  registerPlugin(plugin: PluginDefinition): void;
  setAdapter(adapter: Adapter): void;
  // runtime-level helpers
  renderScreen(screenId: string): Promise<void>; // delegates to UI adapter
}

/* -----------------------
   Adapter contracts
   ----------------------- */

/**
 * Base adapter interface. Adapters integrate SCR into host environments.
 * Examples: CLI, Browser, Server (Express/Fastify), Electron, Mobile (React Native).
 */
export interface Adapter {
  id: string;
  /**
   * Called when adapter is attached to runtime (before runtime.initialize).
   * Adapter can register actions, expose host services, or patch behaviour.
   */
  attach?: (runtime: Runtime, ctx: RuntimeContext) => AsyncOrSync<void>;
  /**
   * Called after runtime initialization. Adapters may perform mounting work here.
   */
  start?: (runtime: Runtime, ctx: RuntimeContext) => AsyncOrSync<void>;
  /**
   * Called during shutdown to cleanup resources.
   */
  stop?: (runtime: Runtime, ctx: RuntimeContext) => AsyncOrSync<void>;
  // Adapters may expose capabilities to runtime via a well-known property.
  capabilities?: string[];
}

/* -----------------------
   Standard adapters
   ----------------------- */

/* CLI Adapter */
export interface CLIAdapterOptions {
  // command name prefix for actions, e.g. "scr"
  commandPrefix?: string;
  // maps CLI args to payload; provide a function to parse args into { actionId, payload }
  parse?: (argv: string[]) => { actionId: string; payload?: any; opts?: any };
  // pretty output formatting
  writer?: { write: (s: string) => void; clear?: () => void };
  // register a help command using runtime.listActions()
  registerHelp?: boolean;
}
export interface CLIAdapter extends Adapter {
  id: 'cli';
  options?: CLIAdapterOptions;
}

/* Browser Adapter */
export interface BrowserAdapterOptions {
  // a channel factory to send/receive events between browser and runtime (e.g. postMessage, websocket)
  createChannel?: (opts?: any) => BrowserChannel;
  // whether to auto-serialize large objects by reference handles
  useHandles?: boolean;
}
export interface BrowserAdapter extends Adapter {
  id: 'browser';
  options?: BrowserAdapterOptions;
}

/* Generic BrowserChannel used by BrowserAdapter */
export interface BrowserChannel {
  send(event: string, payload?: any): Promise<void>;
  on(event: string, handler: (payload?: any) => void): () => void;
  request<T = any>(event: string, payload?: any): Promise<T>;
}

/* Server Adapter (examples: express, fastify) */
export interface ServerAdapterOptions {
  framework?: 'express' | 'fastify' | 'koa' | 'hapi' | string;
  mountPath?: string; // e.g. '/scr'
  authMiddleware?: (req: any, res: any, next: any) => void;
}
export interface ServerAdapter extends Adapter {
  id: 'server';
  options?: ServerAdapterOptions;
}

/* UI Adapter (React/Vue/etc) */
export interface UIAdapterOptions {
  // how the adapter maps SCR screen schema -> framework components
  mapComponent?: (componentSchema: any, ctx: RuntimeContext) => any;
  // optional mount point element id
  mountPointId?: string;
}
export interface UIAdapter extends Adapter {
  id: 'ui';
  options?: UIAdapterOptions;
}

/* Storage Adapter */
export interface StorageAdapter extends Adapter {
  id: 'storage';
  // read/write interface
  read(key: string): Promise<any>;
  write(key: string, value: any): Promise<void>;
  delete(key: string): Promise<void>;
  list?(prefix?: string): Promise<string[]>;
}

/* -----------------------
   Wrappers / Migration helpers
   ----------------------- */

/**
 * Wrap a legacy (synchronous) function into an ActionHandler-compatible wrapper.
 */
export function wrapLegacyFunction<P = any, R = any>(
  fn: (payload?: P, ctx?: any) => R | Promise<R>
): ActionHandler<P, R>;

/**
 * Wrap a shell command (string) into an ActionHandler.
 * The wrapper will execute child_process.exec and stream logs via the runtime logger.
 */
export function wrapShellCommand(cmd: string, opts?: { cwd?: string; env?: Record<string, string>; timeoutMs?: number }): ActionHandler<any, { code: number; stdout: string; stderr: string }>;

/**
 * Wrap a Node ChildProcess spawn invocation into an action.
 * Intended for long-running tasks that need streaming I/O.
 */
export function wrapChildProcess(spawnArgs: { cmd: string; args?: string[]; opts?: any }): ActionHandler<any, { exitCode: number }>;

/**
 * Create an adapter wrapper that turns a simple CLI program into an Adapter.
 * Useful for moving existing CLI tools into SCR step-by-step.
 */
export function createCLIAdapterFromProgram(programPath: string, options?: CLIAdapterOptions): CLIAdapter;

/* -----------------------
   Migration helpers signatures
   ----------------------- */

/**
 * Auto-wrap an existing script (path to JS) and register it as an action.
 * This is a convenience used by migration tooling.
 */
export function registerScriptAsAction(runtime: Runtime, actionId: string, scriptPath: string, opts?: { timeoutMs?: number }): Promise<() => void>;

/* -----------------------
   Introspection & admin types
   ----------------------- */

export interface ActionDescription {
  id: string;
  description?: string;
  schema?: unknown;
  timeoutMs?: number;
  pluginId?: string;
}

export interface PluginInstallResult {
  success: boolean;
  pluginId?: string;
  error?: string;
  installedPath?: string;
}
```

---

# Integration examples (short, copy/paste)

### 1) Create runtime with injected host services

```ts
import { createRuntime } from 'skeleton-crew'; // assume exported factory
import { CLIAdapter } from 'skeleton-crew/types/scr-core';

const runtime = createRuntime({
  id: 'my-app',
  logger: console,
  context: {
    db: myDbInstance,           // pass DB handle
    httpClient: fetch,         // provide host fetch
    secrets: mySecretsManager, // host secrets
  },
});

// attach a CLI adapter
runtime.setAdapter(new CLIAdapter({ commandPrefix: 'scr' }));

await runtime.initialize();
```

### 2) Register legacy script as action (migration helper)

```ts
await registerScriptAsAction(runtime, 'images:resize', './scripts/resize-images.js');
// now runtime.actions.run('images:resize') works
```

### 3) Browser adapter basic usage

```ts
const browserAdapter = {
  id: 'browser',
  async attach(runtime, ctx) {
    const channel = createPostMessageChannel(window.parent);
    channel.on('plugin.install.request', async (payload) => {
      const result = await runtime.getContext().plugins.install(payload.pluginId);
      await channel.send('plugin.install.result', result);
    });
  },
  start() { /* no-op */ },
  stop() {}
};
runtime.setAdapter(browserAdapter);
```

### 4) Using wrappers for shell commands

```ts
const resizeAction = wrapShellCommand('node scripts/resize-images.js', { cwd: process.cwd() });
runtime.registerAction({ id: 'resize:images', handler: resizeAction });
```

---

# Implementation guidance & semantics notes

* **Adapters attach before runtime.initialize**: call `runtime.setAdapter(adapter)` prior to `initialize()` so adapters can register actions or host objects.
* **Context object is readonly for plugins**: host-provided `context` should be exposed as read-only to avoid accidental mutation; prefer factories.
* **Action timeout semantics**: if `timeoutMs` is specified, runtime must implement cancellation or rejection; for Node, use `AbortController` where possible.
* **Wrap helpers must stream logs**: `wrapShellCommand` and `wrapChildProcess` should forward `stdout/stderr` to runtime.logger (and event bus) incrementally.
* **Security**: `wrapShellCommand` → by default should be disabled unless `allowUnsafePlugins` is true; migrations must be intentional.
* **Serialization & Handles**: For BrowserAdapter, large payloads should use handle references (IDs) with a storage adapter rather than full transfer.
* **Adapters & capabilities**: adapters declare capabilities (e.g., 'fs', 'net', 'db') so plugin manifests can declare dependencies. Runtime should reject plugin registration if host lacks required capability (or warn).
* **Plugin isolation**: plugins should run in the same process initially (simplicity), but define an isolation boundary (error handling, timeouts). Future versions may run plugins in workers or child processes.

---

# Example: Strongly-typed Action registration (pattern)

```ts
// src/actions/user.ts
import { ActionDefinition } from 'skeleton-crew/types/scr-core';

export type CreateUserPayload = { name: string; email: string; role?: string };
export type CreateUserResult = { id: string; createdAt: string };

export const createUserAction: ActionDefinition<CreateUserPayload, CreateUserResult> = {
  id: 'user.create',
  description: 'Create a new user',
  handler: async ({ payload, runtime, logger }) => {
    // use host DB from runtime context
    const db = runtime.getContext().host.db;
    const record = await db.users.insert(payload);
    return { id: record.id, createdAt: record.createdAt };
  }
};

// register:
runtime.registerAction(createUserAction);
```

---

# Suggested folder structure (for upgraded runtime + adapters)

```
/packages/scr-runtime/
  src/
    runtime.ts
    runtime-context.ts
    action-engine.ts
    plugin-registry.ts
    event-bus.ts
    adapters/
      cli-adapter.ts
      browser-adapter.ts
      server-adapter.ts
      ui-adapter.ts
    wrappers/
      shell-wrapper.ts
      childproc-wrapper.ts
      script-wrapper.ts
    types/
      scr-core.d.ts
  tests/
  package.json
```

---

# Next steps I can produce (pick one)

* ✅ Complete `types` file as a `.d.ts` or `.ts` and a minimal runtime factory implementation scaffold.
* ✅ Concrete implementation of `CLIAdapter` and `wrapShellCommand` (runnable code).
* ✅ BrowserAdapter with a postMessage channel and handle-based serializer.
* ✅ Adapter capability enforcement and plugin manifest validation code.
* ✅ Example migration repo that demonstrates: wrap script → action; browser-adapter → install plugin; CLI command invoking action.

Which one would you like me to generate next?
