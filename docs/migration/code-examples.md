Show code examples of embedding SCR into a legacy project

Great — below are **practical, copy-pasteable code examples** and a short migration guide showing *how to embed the Skeleton Crew Runtime (SCR) into a legacy project* in three common contexts:

1. **Backend service (Express)** — sidecar / in-process integration
2. **Frontend (legacy React app)** — embedding SCR as extension point for new screens/actions
3. **Existing CLI** — augment with SCR plugin commands

At the end I include **patterns & pitfall checklist**, tests to add, and a link to the local example bundle you uploaded so you can inspect/modify the demo code I created earlier:

**Local example path (use this as file URL in your tooling):**
`file:///mnt/data/skeleton-app`

---

## Overview: how embedding works (short)

* SCR is headless: runtime + registries + event bus + plugin lifecycles.
* You embed it inside your app and **expose an integration surface** (events/actions/screens) to your legacy code.
* Legacy app can fire events into SCR; SCR plugins can call back into the legacy app via registered actions or callbacks.
* Three patterns: **In-Process**, **Sidecar (separate process)**, **Hybrid (socket/websocket bridging)**. Examples below use **in-process** for simplicity; I’ll note sidecar differences where needed.

---

## 1) Backend service (Express) — In-process integration (recommended first step)

**Goal:** Let your existing Express service publish domain events to SCR and let SCR plugins handle business logic (webhooks, transformations, background jobs).

**Why**: Minimal code changes, runtime runs inside same process, low-latency. If you later need isolation, switch to sidecar.

### Files / snippets

**Install** (assume SCR sources are local or published)

```bash
# if runtime is published as package
npm install @extn/runtime

# or use your local runtime via workspace / local path
# npm i /path/to/skeleton-app
```

**server.js (Express + SCR)**

```js
import express from 'express';
import { Runtime } from 'skeleton-crew'; // or relative import to your src/runtime.js

async function bootstrap() {
  const app = express();
  app.use(express.json());

  // Create runtime
  const runtime = new Runtime();

  // register any built-in or local plugins
  // runtime.pluginRegistry.registerPlugin(require('./plugins/validate-plugin').default);
  // runtime.pluginRegistry.registerPlugin(require('./plugins/webhook-plugin').default);

  // initialize -> runs plugin.setup(ctx)
  await runtime.initialize();

  // Expose a small adapter to publish events from your Express app
  app.post('/orders', async (req, res) => {
    const order = req.body;
    // insert into your DB as usual...
    // Now publish into SCR for extensible logic
    runtime.getContext().events.emit('order.created', order);

    res.status(201).send({ ok: true, id: order.id });
  });

  // Optionally expose SCR control endpoints for admin
  app.get('/_scr/plugins', (req, res) => {
    res.json(runtime.getContext().plugins.getAllPlugins());
  });

  app.listen(3000, () => console.log('server listening 3000'));
}

bootstrap().catch(err => {
  console.error(err);
  process.exit(1);
});
```

**Example Plugin (plugins/webhook-plugin.js)**

```js
export default {
  name: 'webhook-plugin',
  async setup(ctx) {
    // subscribe to events and forward as webhooks
    ctx.events.on('order.created', async (order) => {
      try {
        // call an external webhook or run logic
        await sendWebhook('https://hooks.example/created', order);
      } catch (err) {
        console.error('webhook failed', err);
      }
    });
  }
};
```

**Sidecar note:** If you prefer isolation, run SCR in a separate Node process and use a transport (e.g., local WebSocket or Unix domain socket). The Express app emits to sidecar via HTTP/WS; sidecar returns results via events.

---

## 2) Frontend: integrate into a legacy React app (add extension points)

**Goal:** Make the existing React app able to **load SCR plugins** that register screens, actions, and UI widgets — without rewriting existing app.

**Strategy:** Add a `SCRHost` component inside your app that mounts a UI provider plugin (e.g. React UI adapter) and exposes a small API to other React components.

### Approach (in-process via ESM import)

1. Add the `@extn/ui-react` adapter plugin (or your own) to the client build.
2. Instantiate runtime at app startup and `mount` UI provider to a DOM mount node.
3. Let plugins register screens/actions; provide a small router or slot system for plugins to inject into known app slots.

### Example integration

**index.js (React entry)**

```jsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { Runtime } from 'skeleton-crew';
import { ReactUIProvider } from 'skeleton-crew-ui-react'; // your adapter

async function init() {
  const runtime = new Runtime();
  await runtime.initialize();

  // mount React-based UI provider into a node reserved for SCR managed screens
  const mountNode = document.getElementById('scr-root');
  await runtime.setUIProvider(ReactUIProvider);
  await runtime.getUIProvider().mount(mountNode, runtime.getContext());

  // expose runtime on window for debug (dev only)
  window.__SCR__ = runtime;

  createRoot(document.getElementById('root')).render(<App runtime={runtime} />);
}

init();
```

**App.jsx (use a slot)**

```jsx
export default function App({ runtime }) {
  return (
    <div>
      <header>Legacy App Header</header>
      <main style={{ display: 'flex' }}>
        <aside style={{ width: 260 }}>
          {/* legacy left menu */}
        </aside>
        <section style={{ flex: 1 }}>
          {/* mount point for plugin-driven screens */}
          <div id="scr-root" />
        </section>
      </main>
    </div>
  );
}
```

**Plugin that registers a small admin panel**

```js
export default {
  name: 'admin-insights',
  async setup(ctx) {
    ctx.screens.registerScreen({
      id: 'admin.insights',
      title: 'Insights',
      component: { /* schema that React UI provider understands */ }
    });
  }
}
```

**Pattern: "Slots"** — Build named DOM slots (header, sidebar, content, footer). The UI provider uses slot registry to inject plugin UI into these slots, enabling partial extension rather than full-page takeover.

**Security:** For web-apps, ensure plugin code is trusted or sandboxed (CSP, iframe, or server-side validation).

---

## 3) Existing CLI — add plugin commands and workflows

**Goal:** Let legacy CLI gain a plugin system. Developers can install plugins and extend CLI commands without modifying core.

**Two options:**

* **Embed SCR** into existing CLI binary (process-level), or
* **Wrap CLI** with an SCR-powered wrapper that dispatches to plugins.

### Example: Integrate into an existing CLI (node-based)

**cli.js**

```js
#!/usr/bin/env node
import { Runtime } from 'skeleton-crew';
import yargs from 'yargs';

async function main() {
  const runtime = new Runtime();
  // register your built-in plugin that provides CLI scaffolding plugin
  // runtime.pluginRegistry.registerPlugin(require('./plugins/cli-helpers').default);

  await runtime.initialize();

  // generic command to run plugin-provided actions
  yargs.command('plugin run <action>', 'run a plugin action', (y) => {
    y.positional('action', { type: 'string' });
  }, async (argv) => {
    try {
      const result = await runtime.getContext().actions.runAction(argv.action, argv);
      console.log('Result:', result);
    } catch (err) {
      console.error('Action failed', err);
    } finally {
      await runtime.shutdown();
    }
  });

  // fallback: show help
  yargs.parse();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
```

**Plugin (plugins/file-utils.js)**

```js
export default {
  name: 'file-utils',
  async setup(ctx) {
    ctx.actions.registerAction({
      id: 'files.list',
      handler: async (payload, runtimeCtx) => {
        const fs = await import('fs/promises');
        const list = await fs.readdir(payload.path || '.');
        return list;
      }
    });
  }
};
```

Now users can do:

```bash
node cli.js plugin run files.list --path=./src
```

**Upgrade path:** Add `scr plugins install` or `scr plugins ls` commands by adding a plugin registry action that lists installed plugins (persisted to disk).

---

## Patterns for integration (choose based on risk/need)

### Pattern A — In-process (fastest)

* Embed runtime in same process (Express / React / CLI)
* Pros: low-latency, easy access to in-memory state
* Cons: plugin crashes can affect host; needs careful error isolation

### Pattern B — Sidecar process

* Run runtime as separate Node process; communicate via local WebSocket/HTTP/Unix socket
* Pros: isolation, ease of plugin hot-reload, separate lifecycle
* Cons: more complexity in transport, more deploy surface

### Pattern C — Hybrid bridge

* For browser legacy apps: host a small bridge server that proxies events between host and SCR (could be sidecar or remote)
* Useful where the host cannot run runtime directly (e.g., PHP monolith)

---

## Practical Implementation checklist

1. **Decide isolation mode**: in-process vs sidecar. Start in-process for quick wins.
2. **Define extension surface** for host application (events/actions/screens slots). Keep it minimal.
3. **Add a small adapter layer** that converts host app’s internal events into SCR events. e.g., `emit('user.signed_up', payload)`.
4. **Bootstrap runtime early** (app start) and make `runtime.getContext()` accessible to host modules that need to register plugins or emit events.
5. **Provide safe plugin APIs**: avoid exposing internals to third-party plugins. Use small facades: `ctx.screens.registerScreen`, `ctx.actions.registerAction`, `ctx.events.on/emit`.
6. **Add logging & monitoring**: log plugin errors clearly with plugin name & stack.
7. **Add uninstall / rollback behaviors**: if plugin setup fails, dispose already initialized plugins (we recommended reverse-order disposal earlier).
8. **Testing**: add unit tests for the integration adapter and at least one end-to-end plugin scenario.

---

## Example: Migration plan for a legacy Express app

**Phase 0 — Prep**

* Add runtime as a dev dependency; create `plugins/` folder
* Create simple `plugin-adapter.js` that adapts host events to SCR events

**Phase 1 — Ingest events**

* Instrument key points to `runtime.getContext().events.emit(...)`

**Phase 2 — Add first plugin**

* Add `plugins/webhook-plugin` that listens to `order.created` and performs actions

**Phase 3 — Add admin UI (optional)**

* Add a React UI provider plugin to render plugin-provided screens in `/admin` route

**Phase 4 — Increase plugin usage**

* Allow non-engineers to add new plugins through CI or an internal marketplace

---

## Tests & QA to add

* **Unit**: test adapter functions that map host events → SCR events.
* **Integration**: simulate plugin setup that registers actions & screens; assert invocation from host.
* **Resilience**: intentionally throw in plugin.setup() and assert the host runtime handles the error and disposes partial state.
* **Permission isolation** (optional): verify plugin file access is limited if you run them via sidecar sandbox.

---

## Pitfalls & mitigation

* **Untrusted plugin code**: do not load untrusted plugins in-process; prefer sidecar or sandboxed environment.
* **Blocking plugins**: enforce timeouts or run heavy tasks in background workers.
* **State coupling**: avoid exposing host mutable internals; prefer pass-by-value or controlled facades.
* **Versioning**: add plugin manifest `compatibility` version checks if host runtime evolves.

---

## Quick code checklist to commit (example for Express)

* [ ] `npm i skeleton-crew` (or link local path)
* [ ] Add `src/scr-bootstrap.js` with `new Runtime(); await runtime.initialize(); module.exports = runtime;`
* [ ] Replace direct calls to external systems with SCR events where you want extensibility (e.g., after order created: `runtime.getContext().events.emit('order.created', order)`)
* [ ] Create `plugins/webhook-plugin.js` and register via `runtime.pluginRegistry.registerPlugin(require(...))`
* [ ] Add a small `/admin/_scr` route to inspect plugin registry and events (dev only)
* [ ] Add tests covering the integration points

---

## Reference: local example bundle

Inspect the example I created earlier (terminal UI + counter plugin) to see a minimal in-process embedding pattern:

**Path to local example:**
`file:///mnt/data/skeleton-app`

Open that folder and pay attention to `example/index.ts` — it boots a `Runtime`, registers plugins, initializes runtime, and mounts a terminal UI provider. That is the minimal skeleton for embedding SCR.

---

If you want I can:

* Generate an **Express integration PR** with concrete diffs for your repo.
* Generate a **React UI provider** that mounts into an existing SPA (with code that maps SCR screens to React components).
* Produce a **sidecar template** (Node process + WebSocket bridge) for safer plugin isolation.

Which of these would you like me to produce next?
