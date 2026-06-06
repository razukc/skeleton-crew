# Skeleton Crew Runtime v0.6.0

**A minimal plugin runtime for building modular JavaScript applications.**

Stop wiring up infrastructure. Start building features.

```bash
npm install skeleton-crew-runtime@^0.6.0
```
## What's New in v0.6.0

**True atomic hot-swap.** The new plugin's `setup` runs against a buffered context that doesn't touch the live registries. If it throws, the buffer is dropped and the old plugin is observably untouched — actions still serve, services still resolve, event handlers still fire. If it succeeds, the buffer commits to the live registries in one synchronous batch.

```ts
await runtime.swapPlugin({
  name: 'my-plugin',
  version: '2.0.0',
  setup(ctx) {
    // v1 is still fully live here. ctx.services.get('cfg') falls back to
    // v1's value until v2 registers its own. Events emitted here are
    // handled by v1.
    ctx.actions.registerAction({ id: 'my-plugin:greet', handler: () => 'v2' });
    throw new Error('boom');  // v1 keeps running. Action 'greet' still returns 'v1'.
  },
});
```

Sequence:

1. Pre-flight (semver, deps, `validateConfig`) — same as 0.5.0.
2. **Buffered setup** of the new plugin — writes go into an in-memory `SwapBuffer`, reads merge buffer over live.
3. **Commit** (synchronous) — `replaceAtomic` flips each id in the live registries, ids the old plugin owned that the new plugin omitted are retired.
4. `plugin:swapped` event.
5. **Then** `dispose` of the old plugin (behavior change from 0.5.0 — was step 1).

Other 0.6.0 surface:
- **`replaceAtomic` and `unregister` added to `ActionEngine`, `ScreenRegistry`, `ServiceRegistry`** — the primitives the swap commit step uses. Available to plugins but typically not needed outside hot-swap.
- **Read semantics during buffered setup**: `ctx.services.get` / `actions.hasAction` / `screens.getScreen` / `plugins.getPlugin` all read buffer-first, fall through to live.
- **Event subscriptions during buffered setup are queued and committed at commit time** — a subscription registered inside `setup` won't fire on events emitted during the same setup. This avoids leaking subscriptions on rollback.

**[→ Complete v0.6.0 Changelog](CHANGELOG.md#060---2026-06-07)**

## What's New in v0.5.0

A correctness release driven by an internal code review of the plugin system, with hot-swap as the focal point. Every finding was first captured as a failing reproducer test (shipped in `tests/unit/review-reproducers.test.ts`), then fixed one commit at a time.

- **Hot-swap is now pre-flight-safe (`runtime.swapPlugin()`)**: semver, dependency presence, and `validateConfig` are all checked **before** any side effect. If any pre-flight check rejects, the running plugin is completely untouched. Previously, a failed config validation tore down the running plugin with no recovery. (Note: the residual atomicity window — a throw from the new plugin's own setup — is closed in 0.6.0.)
- **SemVer 2.0 pre-release support**: `isNewerVersion` (and therefore `swapPlugin`) now correctly handles `1.2.4-rc.1`-style versions, backed by the `semver` package.
- **Concurrent swap protection**: a second `swapPlugin` call for the same plugin while one is in flight rejects with `PluginSwapError` instead of corrupting registry state.
- **Error class preservation**: `runtime.initialize()` failures now re-throw the original error class (e.g. `ValidationError`) with custom properties and `Error.cause` intact — `instanceof`-based error handling works as documented.
- **Rollback completeness**: a plugin whose setup throws mid-way no longer leaks its partially-registered actions/screens/services.
- **Loader diagnostics**: missing dependencies are now warned about at discovery time, pointing at the likely load failure instead of a confusing init-time error.
- **`PluginRegistry.reset()`** replaces the misleadingly-named `clear()` (deprecated alias retained until 0.6).

**[→ Complete v0.5.0 Changelog](CHANGELOG.md#050---2026-06-07)**

## What's New in v0.4.0
 
### Added
- **Action Retry**: New `retry` field on `ActionDefinition`. On failure, the action is retried up to `retry` times with exponential backoff (100ms, 200ms, 400ms…). Timeout and memory errors are never retried.
- **Action Memory Limit**: New `memoryLimitMb` field on `ActionDefinition`. Measures heap delta before/after execution and throws `ActionMemoryError` if the limit is exceeded. No-op in browser environments where `process.memoryUsage` is unavailable.
- **Execution Recorder (`ctx.trace`)**: New first-class observability API on `RuntimeContext`. Every action run produces a frozen `TraceEntry` with `runId`, `actionId`, `input`, `output`, `status`, `durationMs`, `startedAt`, `error`, and `attempt`. Accessible via `ctx.trace.getEntries()`, `ctx.trace.getEntriesFor(id)`, and `ctx.trace.clear()`. Capped at 1000 entries by default.
- **`ActionMemoryError`**: New error class thrown when an action exceeds its `memoryLimitMb`.
- **`ExecutionRecorderImpl`**: New exported class for the in-memory recorder implementation.
- **Types**: `TraceEntry`, `TraceStatus`, `ExecutionRecorder`, `PluginSwapError` exported from the core package. `ActionMetadata` now includes `retry` and `memoryLimitMb` fields.

### Changed
- **`ActionEngine` constructor**: Now accepts an optional `onTrace` callback for recording execution entries. Fully backward compatible — existing code passing only a logger is unaffected.
- **`RuntimeContextImpl` constructor**: Now accepts an optional `ExecutionRecorderImpl` instance. Falls back to a standalone recorder when not provided (e.g. in tests).

**[→ Complete v0.4.1 Features](CHANGELOG.md#040---2026-03-22)**

## What's New in v0.3.3

✅ **Browser Compatibility** - Fixed critical runtime crash in browsers by lazy-loading Node.js dependencies  
📝 **Documentation** - Updated all examples to use proper TypeScript `import type` syntax  
🔧 **Stability** - Improved test reliability for performance monitoring

**[→ Complete v0.3.3 Features](CHANGELOG.md#033---2026-01-22)**

## What's New in v0.3.2

✅ **Service Locator API** - New `ctx.services` API for type-safe inter-plugin communication  
📝 **Service Locator Guide** - New dedicated guide for using the Service Locator pattern  

**[→ Complete v0.3.2 Features](CHANGELOG.md#032---2026-01-16)**

## What's New in v0.3.0

✅ **Config Validation** - Validate plugin configuration before setup runs with detailed error reporting  
📝 **Logger Documentation** - Comprehensive guide to the built-in logging system and external integrations  
📊 **Optimized Telemetry** - Cleaner startup logs with consolidated plugin loading information  
🔍 **Introspection** - Enhanced plugin metadata for better runtime transparency

**[→ Complete v0.3.0 Features](CHANGELOG.md#030---2026-01-15)**

## What's New in v0.2.1

🔍 **Plugin Discovery** - Automatic plugin loading from file paths and npm packages  
🔄 **Dependency Resolution** - Automatic topological sorting for correct plugin initialization order  
🛠️ **Enhanced DX** - Better error messages with dependency hints for missing actions  
🚀 **Production Ready** - All critical bugs fixed based on real-world usage feedback  
✅ **Verified Stable** - Tested and validated in production migrations

### Plugin Discovery Example

```typescript
// Automatic plugin discovery - no manual registration needed!
const runtime = new Runtime<MyConfig>({
  config: myConfig,
  
  // Load plugins from directories
  pluginPaths: [
    './plugins',           // Load all plugins from directory
    './custom-plugin.js'   // Load specific plugin file
  ],
  
  // Load plugins from npm packages
  pluginPackages: [
    '@my-org/auth-plugin',
    'my-custom-plugin'
  ]
});

await runtime.initialize(); // Plugins auto-loaded and sorted by dependencies!
```

**[→ Complete v0.2.1 Features](CHANGELOG.md#021---2025-01-07)**

## What's New in v0.2.0

🎯 **Generic Runtime/Context** - Full TypeScript generic support for type-safe configuration  
⚡ **Sync Config Access** - Direct synchronous access to configuration via `ctx.config`  
🔗 **Plugin Dependencies** - Explicit dependency resolution with validation  
📝 **Enhanced Logger** - Logger available on context for all plugins  
🔄 **100% Backward Compatible** - All v0.1.x code continues to work

### Quick Migration Example

```typescript
// v0.1.x
const runtime = new Runtime({
  hostContext: { config: myConfig }
});

// v0.2.0 - Fully typed!
interface MyConfig { apiUrl: string; }
const runtime = new Runtime<MyConfig>({
  config: { apiUrl: 'https://api.example.com' }
});
```

**[→ Complete Migration Guide](docs/guides/v0.1-to-v0.2-migration.md)**

---
## Documentation

### Getting Started
- **[Installation](docs/getting-started/installation.md)** - Install and setup
- **[API Reference](docs/api/reference.md)** - Complete TypeScript API
- **[Core Concepts](docs/getting-started/core-concepts.md)** - Understand the fundamentals
- **[Your First Plugin](docs/getting-started/your-first-plugin.md)** - Build your first feature
- **[Logger Guide](docs/guides/logger-guide.md)** - Master the built-in logging system
- **[Config Validation](docs/guides/config-validation.md)** - How to validate plugin configuration
- **[Service Locator](docs/guides/service-locator-guide.md)** - Type-safe inter-plugin communication

### v0.2.0 Migration & Guides
- **[v0.1.x → v0.2.0 Migration](docs/guides/v0.1-to-v0.2-migration.md)** - Complete migration walkthrough
- **[Plugin Dependencies](docs/guides/plugin-dependencies.md)** - Dependency patterns and best practices
- **[Sync vs Async Patterns](docs/guides/sync-async-patterns.md)** - Configuration and execution patterns
- **[Real-World Examples](docs/guides/real-world-examples.md)** - Production-ready implementations
- **[Migration Guide](docs/guides/migration-guide.md)** - Integrate with existing apps
- **[Examples Guide](docs/guides/EXAMPLES_GUIDE.md)** - Learn through code examples

### Use Cases
- **[Browser Extensions](docs/use-cases/BROWSER_TOOLS.md)** - Build browser tools
- **[CLI Applications](docs/use-cases/)** - Command-line tools
- **[Real-Time Apps](docs/use-cases/)** - Collaboration and sync

### Advanced
- **[Architecture](docs/architecture/)** - How it works under the hood
- **[Troubleshooting](docs/troubleshooting/)** - Common issues and solutions

---

## What is this?

Skeleton Crew Runtime is a lightweight foundation for building applications where features can be added, removed, or replaced without touching existing code. Think VS Code's extension system, but for any JavaScript application.

**Core idea:** Your app is a collection of plugins. Each plugin registers actions (business logic), screens (UI definitions), and events (communication). The runtime coordinates everything.

**Result:** Add features by dropping in plugins. Remove features by taking them out. No refactoring. No breaking changes.

## Why would I use this?

You're building something modular and you might know these challenges:

- **Wiring up infrastructure** - Event buses, plugin loaders, action registries
- **Tight coupling** - Changing one feature breaks three others
- **Testing nightmares** - Can't test features in isolation
- **Framework lock-in** - Married to React/Vue/whatever forever
- **Refactoring hell** - Adding features means touching existing code

**Skeleton Crew Runtime gives you:**

- **Plugin isolation** - Features don't know about each other
- **Event-driven communication** - Plugins coordinate without coupling
- **Framework freedom** - Business logic separate from UI
- **Testability** - Mock what you need, test what matters
- **Minimal core** - < 5KB, zero dependencies

## Show me code

Here's a complete plugin that adds a feature to your app:

```typescript
import { Runtime } from 'skeleton-crew-runtime';
import type { PluginDefinition, RuntimeContext } from 'skeleton-crew-runtime';

// v0.2.0: Define your config interface
interface AppConfig {
  notifications: {
    apiKey: string;
    defaultTimeout: number;
  };
  features: {
    pushNotifications: boolean;
  };
}

// 1. Create typed runtime
const runtime = new Runtime<AppConfig>({
  config: {
    notifications: {
      apiKey: process.env.NOTIFICATION_API_KEY!,
      defaultTimeout: 5000
    },
    features: {
      pushNotifications: true
    }
  }
});

await runtime.initialize();
const ctx = runtime.getContext();

// 2. Write a plugin (this is a complete feature)
const notificationsPlugin: PluginDefinition<AppConfig> = {
  name: 'notifications',
  version: '1.0.0',
  dependencies: [], // v0.2.0: Explicit dependencies
  
  setup(ctx: RuntimeContext<AppConfig>) {
    // ✅ Fully typed config access
    const { notifications, features } = ctx.config;
    
    if (!features.pushNotifications) {
      ctx.logger.info('Push notifications disabled');
      return;
    }
    
    // Register business logic with type safety
    ctx.actions.registerAction<
      { userId: string; message: string },
      { success: boolean; messageId: string }
    >({
      id: 'notifications:send',
      handler: async ({ userId, message }, ctx) => {
        // ✅ Typed config access in handlers
        const { apiKey, defaultTimeout } = ctx.config.notifications;
        
        // Your logic here
        const messageId = await sendPushNotification(userId, message, {
          apiKey,
          timeout: defaultTimeout
        });
        
        // Let other plugins know
        ctx.events.emit('notification:sent', { userId, messageId });
        
        return { success: true, messageId };
      },
      timeout: notifications.defaultTimeout
    });
    
    // React to other plugins
    ctx.events.on('user:registered', async (user: any) => {
      await ctx.actions.runAction('notifications:send', {
        userId: user.id,
        message: 'Welcome!'
      });
    });
    
    ctx.logger.info('Notifications plugin initialized');
  }
};

// 3. Register and use
ctx.plugins.registerPlugin(notificationsPlugin);

// anywhere in your app - fully typed!
const result = await ctx.actions.runAction('notifications:send', {
  userId: '123',
  message: 'Your order shipped!'
});

console.log(`Message sent: ${result.messageId}`);
```

**That's it.** The plugin is isolated, testable, fully typed, and can be removed without breaking anything.

## Core concepts (5 minutes)

### 1. Plugin Discovery (v0.2.1): Automatic Loading

No more manual plugin registration! The runtime can automatically discover and load plugins:

```typescript
import { Runtime } from 'skeleton-crew-runtime';

const runtime = new Runtime<MyConfig>({
  config: myConfig,
  
  // Discover plugins from file system
  pluginPaths: [
    './src/plugins',        // Directory: loads all .js/.mjs files
    './auth-plugin.js',     // Single file: loads specific plugin
    './dist/plugins'        // Works with compiled TypeScript too!
  ],
  
  // Discover plugins from npm packages
  pluginPackages: [
    '@my-org/auth-plugin',  // npm package with plugin export
    'my-logging-plugin'     // Any package that exports a plugin
  ]
});

await runtime.initialize();
// ✅ All plugins auto-loaded and sorted by dependencies!
```

**Dependency Resolution:** Plugins are automatically sorted by their `dependencies` array, so they initialize in the correct order.

### 2. Plugins: Isolated Features

### 2. Plugins: Isolated Features

A plugin is just an object with a name and a setup function:

```typescript
import type { PluginDefinition, RuntimeContext } from 'skeleton-crew-runtime';

// v0.2.0: Define your config type
interface MyAppConfig {
  apiUrl: string;
  features: { analytics: boolean };
}

export const myPlugin: PluginDefinition<MyAppConfig> = {
  name: 'my-plugin',
  version: '1.0.0',
  dependencies: ['config'], // v0.2.0: Explicit dependencies
  
  setup(ctx: RuntimeContext<MyAppConfig>) {
    // ✅ Fully typed config access
    const { apiUrl, features } = ctx.config;
    
    if (features.analytics) {
      ctx.logger.info(`Plugin initialized for ${apiUrl}`);
    }
    
    // Register your feature here
  },
  
  dispose(ctx: RuntimeContext<MyAppConfig>) {
    // Optional: cleanup resources when plugin is removed
    // Use this for: closing connections, clearing timers, releasing memory
    // Event listeners auto-cleanup, so you usually don't need this
  }
};
```

### 3. Actions: Business Logic

Actions are named functions that do work:

```typescript
// v0.2.0: Type-safe action registration
interface CreateOrderParams {
  customerId: string;
  items: Array<{ id: string; quantity: number }>;
}

interface Order {
  id: string;
  customerId: string;
  total: number;
  status: 'pending' | 'confirmed';
}

// Register an action
ctx.actions.registerAction<CreateOrderParams, Order>({
  id: 'orders:create',
  handler: async (orderData, ctx) => {
    // ✅ Typed config access
    const { apiUrl } = ctx.config;
    
    // ✅ Typed parameters
    const { customerId, items } = orderData;
    
    const order = await createOrder(customerId, items);
    ctx.events.emit('order:created', order);
    
    ctx.logger.info(`Order created: ${order.id}`);
    return order; // ✅ Typed return value
  },
  timeout: 10000 // Optional timeout
});

// Call from anywhere - fully typed!
const order = await ctx.actions.runAction<CreateOrderParams, Order>(
  'orders:create',
  { customerId: '123', items: [{ id: 'item1', quantity: 2 }] }
);
```

### 4. Events: Decouple Features

Plugins communicate without knowing about each other:

```typescript
// Plugin A: Emit event
ctx.events.emit('order:created', order);

// Plugin B: React (doesn't know about Plugin A)
ctx.events.on('order:created', (order) => {
  sendConfirmationEmail(order);
});

// v0.2.0: Async event handling
await ctx.events.emitAsync('order:created', order); // Wait for all handlers
```

### 5. Configuration: Type-Safe Access (v0.2.0)

Direct synchronous access to typed configuration:

```typescript
import { Runtime } from 'skeleton-crew-runtime';

interface AppConfig {
  database: { url: string; maxConnections: number };
  api: { baseUrl: string; timeout: number };
  features: { caching: boolean; analytics: boolean };
}

const runtime = new Runtime<AppConfig>({
  config: {
    database: {
      url: process.env.DATABASE_URL!,
      maxConnections: 10
    },
    api: {
      baseUrl: 'https://api.example.com',
      timeout: 5000
    },
    features: {
      caching: true,
      analytics: process.env.NODE_ENV === 'production'
    }
  }
});

// In plugins: direct typed access
setup(ctx: RuntimeContext<AppConfig>) {
  // ✅ Fully typed, synchronous access
  const { database, api, features } = ctx.config;
  
  if (features.caching) {
    initializeCache();
  }
  
  // ✅ Available in action handlers
  ctx.actions.registerAction({
    id: 'api:request',
    handler: async (endpoint: string) => {
      const { baseUrl, timeout } = ctx.config.api;
      return await fetch(`${baseUrl}${endpoint}`, { timeout });
    }
  });
}
```

### 6. Host Context: Bridge to Existing Code

Inject your existing services so plugins can use them:

```typescript
import { Runtime } from 'skeleton-crew-runtime';

const runtime = new Runtime<AppConfig>({
  config: myTypedConfig,
  hostContext: {
    // Legacy services
    db: yourDatabase,
    cache: redisClient,
    logger: yourLogger
  }
});

await runtime.initialize();
const ctx = runtime.getContext();

// Plugins access via ctx.host (for legacy integration)
const { db, logger } = ctx.host;
```

### 7. Service Locator (v0.3.1): Type-safe inter-plugin communication

Plugins can register and consume shared services without hard dependency coupling:

```typescript
// Plugin A: Register a service
setup(ctx) {
  const myService = {
    doSomething: () => console.log('Service in action!')
  };
  ctx.services.register('my-api', myService);
}

// Plugin B: Consume the service
setup(ctx) {
  // Wait for the providing plugin to initialize first!
  const api = ctx.services.get<MyApiType>('my-api');
  api.doSomething();
}
```

### 8. Screens (Optional): UI Definitions

Define screens that any UI framework can render:

```typescript
ctx.screens.registerScreen({
  id: 'orders:list',
  title: 'Orders',
  component: 'OrderListComponent'  // string, class, function, or any type
});
```

---

## What can I build?

Skeleton Crew works for any modular JavaScript application:

### Developer Tools
- **CLI tools** - Task runners, deployment scripts, dev environments
- **Browser extensions** - Tab managers, productivity tools, dev tools
- **Build tools** - Custom bundlers, code generators, linters

### Internal Applications
- **Admin panels** - User management, content moderation, analytics
- **Dashboards** - Monitoring, reporting, data visualization
- **Workflow tools** - Approval systems, task management, automation

### Real-Time Applications
- **Collaboration tools** - Shared editing, presence, chat
- **Live dashboards** - Stock tickers, sports scores, IoT monitoring
- **Multiplayer features** - Game state sync, player coordination

### Modular Systems
- **Plugin marketplaces** - Let users extend your app
- **White-label products** - Different features for different customers
- **Microservices** - Coordinate distributed services

**Not ideal for:** Public-facing websites (use Next.js), complex routing (use React Router), heavy state management (use Redux).

---

## Real examples

### CLI Tool (150 lines vs 500+)
**What you'll see:** Interactive CLI that runs commands, shows output, handles errors. All plugin-based.

```bash
# Build a command palette for Git, npm, and Docker:
cd demo/dev-launcher
npm install && npm start
```

### Real-Time Collaboration (130 lines vs 500+)
**What you'll see:** Multiple clients syncing state in real-time. No Firebase, no Socket.io boilerplate.

```bash
# Build a multi-user sync system:
cd demo/collab-hub
npm install && npm run build
npm run server  # Terminal 1
npm run client  # Terminal 2-3
```

**[See all demos →](demo/README.md)**

---

## FAQ

### Do I need to rewrite my app?

No. Skeleton Crew runs alongside your existing code. Write new features as plugins, keep old code unchanged.

### What if I want to migrate existing features later?

You can gradually replace legacy code with plugins using feature flags. Or don't — both approaches work fine.

### Does this work with my UI framework?

Yes. Skeleton Crew is UI-agnostic. Use React, Vue, Svelte, or no UI at all. The runtime doesn't care.

### Is this overkill for small apps?

Possibly. If you have a simple app with no legacy code and no plans to grow, you might not need this. But if you're dealing with technical debt or planning for modularity, it's a good fit.

### How big is the runtime?

Less than 5KB gzipped. Minimal overhead.

### Can I use this in production?

Yes. The runtime is stable and tested. Start with non-critical features, then expand.

---

**Built for developers who need to modernize legacy apps without the risk of a full rewrite.**
