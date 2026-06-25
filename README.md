# Skeleton Crew Runtime

**A plugin runtime for running and evolving live applications safely — hot-swap features without a redeploy, and contain failures by construction.**

Not a framework for writing apps faster. A runtime for the subsystem that has to keep running while it changes.

```bash
npm install skeleton-crew
```

```ts
import { Runtime } from 'skeleton-crew';

const runtime = new Runtime({ config: {} });

// Ship v1 of a feature.
runtime.registerPlugin({
  name: 'greeter',
  version: '1.0.0',
  setup(ctx) {
    ctx.actions.registerAction({ id: 'greeter:hello', handler: () => 'hello from v1' });
  },
});

await runtime.initialize();
const ctx = runtime.getContext();

// Swap in v2 atomically — while the system is live, with automatic rollback.
await runtime.swapPlugin({
  name: 'greeter',
  version: '2.0.0',
  setup(ctx) {
    // v1 is still fully live in here. If this setup throws, the buffer is
    // dropped and v1 keeps serving — observers never see a half-swapped state.
    ctx.actions.registerAction({ id: 'greeter:hello', handler: () => 'hello from v2' });
  },
});

await ctx.actions.runAction('greeter:hello'); // → 'hello from v2'
```

If `swapPlugin`'s `setup` had thrown, `greeter:hello` would still return `'hello from v1'`. The swap is all-or-nothing. (After `initialize()`, register further plugins with `ctx.plugins.registerPlugin()`.)

## What it is

A small runtime for the part of a system that must **keep serving traffic while its features change underneath it**, and must **fail loudly and locally** when two changes collide instead of silently corrupting each other. Think VS Code's extension host or a live API gateway: components come and go at runtime, and the host's job is to make that safe.

A subsystem is a set of plugins. Each plugin registers actions (business logic), services, screens, and events through a runtime context that **owns** those registrations — it enforces who owns what, rejects collisions with a typed error, contains a throwing handler to its caller, and can replace a plugin atomically while the system is live.

**The enforcement is the point.** A plain module is isolated only as long as everyone remembers to keep it isolated. The runtime makes isolation and safe replacement a property of the system, not a discipline you hope holds.

## What it guarantees, by construction

- **Atomic hot-swap with rollback** — a new plugin version installs in one synchronous commit, or the old one keeps running untouched (`runtime.swapPlugin()`).
- **Enforced ownership** — a plugin can only touch what it registered; a colliding registration is rejected with `DuplicateRegistrationError`, never silently overwritten; one swap can't hijack another plugin's resources.
- **Fault containment** — a throwing handler is contained to its caller; the runtime and other plugins stay alive.
- **Framework freedom** — business logic separate from UI; no React/Vue lock-in.
- **Minimal core** — < 5KB, zero dependencies.

## When to use it (and when not to)

| Use Skeleton Crew when… | Use plain modules / your framework when… |
|---|---|
| The system must change while it stays live (hot-swap) | You can redeploy to ship a change |
| Untrusted or third-party plugins run inside your process | You write and own all the code |
| Many agents/authors extend one surface concurrently | One author, or naturally independent features |
| You're hardening one subsystem of an existing app | You're greenfielding a whole app from scratch |
| Silent cross-feature breakage is a real, costly risk | A test suite already catches your regressions |

This honesty is deliberate. Skeleton Crew is **not** a productivity multiplier for *writing* code — modern tooling and AI agents have largely erased that cost. We tested exactly that, head-to-head, and the build-productivity story came back null; the operational-safety story is what held. The full method and results — including the null — are in [`experiments/agent-buildoff/FINDINGS.md`](experiments/agent-buildoff/FINDINGS.md).

Its value is **operational**: keeping a system correct and available *while it mutates*, under conditions a human can't manually supervise. If your system never changes live and you control all its code, you probably don't need it — and that's fine.

## Documentation

- **[Installation](docs/getting-started/installation.md)** — install and setup
- **[Core Concepts](docs/getting-started/core-concepts.md)** — actions, services, events, plugins
- **[Your First Plugin](docs/getting-started/your-first-plugin.md)** — build a feature end to end
- **[API Reference](docs/api/reference.md)** — complete TypeScript API
- **[Service Locator](docs/guides/service-locator-guide.md)** — type-safe inter-plugin communication
- **[Config Validation](docs/guides/config-validation.md)** — validate plugin config before setup runs
- **[Integrate with an existing app](docs/guides/migration-guide.md)** — adopt the runtime in one subsystem
- **[Architecture](docs/architecture/)** — how it works under the hood

## Versioning

This project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html). All release notes — features, fixes, and migration guidance — live in the **[Changelog](CHANGELOG.md)**. Maintainers: see **[RELEASING.md](RELEASING.md)** for the publish workflow.

## License

[MIT](LICENSE)
