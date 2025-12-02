# Skeleton Crew Runtime

**Write 150 lines instead of 500. Ship in hours, not days.**

A minimal plugin runtime that eliminates 65-75% of boilerplate for internal tools, browser extensions, and modular applications.

```bash
npm install skeleton-crew-runtime
```

## The Problem

You're building an internal tool. Before writing any business logic, you need:

- **CLI Tools**: 500+ lines (readline, command parsing, process management, error handling)
- **Real-time Features**: 500+ lines (WebSocket server, state sync, message routing, race conditions)
- **Browser Extensions**: 550+ lines (background scripts, message passing, storage, manifest boilerplate)
- **Legacy Apps**: Can't add features without touching fragile code

**You spend 80% of your time on i

## The Solution

Skeleton Crew Runtime provides a minimal plugin architecture that eliminates boilerplate:

**Before** (traditional approach - 500+ lines):
```typescript
// Set up readline, command parsing, process spawning
const readline = require('readline');
const { spawn } = require('child_process');

const rl = readline.createInterface({ /* 50+ lines */ });
const commands = new Map();

function executeCommand(cmd, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args);
    let stdout = '', stderr = '';
    
    proc.stdout.on('data', (data) => stdout += data);
    proc.stderr.on('data', (data) => stderr += data);
    proc.on('close', (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(stderr));
    });
  });
}

// ... 400+ more lines of boilerplate
```

**After** (with Skeleton Crew - 150 lines):
```typescript
import { Runtime } from 'skeleton-crew-runtime';

// Inject system access via host context
const runtime = new Runtime({
  hostContext: {
    exec: (cmd, args) => execSync(`${cmd} ${args.join(' ')}`)
  }
});

// Write features as plugins (30 lines each)
const gitPlugin = {
  name: 'git',
  version: '1.0.0',
  setup(ctx) {
    ctx.actions.registerAction({
      id: 'git:status',
      handler: async (_, ctx) => {
        const { exec } = ctx.host;
        return exec('git', ['status']);
      }
    });
  }
};

await runtime.initialize();
```

**Result:** 70% less code, fully testable, easily extensible.

## Concrete Results

Real projects built with Skeleton Crew Runtime:

| Project | Traditional | With SCR | Reduction |
|---------|------------|----------|-----------|
| **CLI Dev Tools** | 500+ lines | 150 lines | 70% |
| **Real-time Collab** | 500+ lines | 130 lines | 75% |
| **Browser Extension** | 550+ lines | 190 lines | 65% |
| **Bundle Size** | 50-150KB | 4-8KB | 90%+ |
| **Build Time** | 1-7 days | 1-3 hours | 95%+ |

See [working demos](demo/README.md) with full source code.

## Why This Works

### ✅ Plugin Architecture
Write features as isolated plugins. Add/remove without touching other code.

### ✅ Event-Driven Coordination
Plugins communicate via events. Zero state management, zero race conditions.

### ✅ Host Context Injection
Access existing services (databases, APIs, loggers) without tight coupling.

### ✅ Framework-Agnostic
Business logic in plugins, UI in any framework (React, Vue, CLI, or none).

### ✅ Minimal Core
< 5KB runtime. No heavy dependencies. No framework lock-in.


## Quick Start (5 Minutes)

### 1. Install

```bash
npm install skeleton-crew-runtime
```

### 2. Create Runtime

```typescript
import { Runtime } from 'skeleton-crew-runtime';

const runtime = new Runtime({
  hostContext: {
    // Inject existing services (optional)
    db: yourDatabase,
    logger: yourLogger
  }
});

await runtime.initialize();
const ctx = runtime.getContext();
```

### 3. Write a Plugin

```typescript
const notificationsPlugin = {
  name: 'notifications',
  version: '1.0.0',
  
  setup(ctx) {
    // Register business logic as actions
    ctx.actions.registerAction({
      id: 'notifications:send',
      handler: async ({ userId, message }) => {
        const { db, logger } = ctx.host;
        
        logger.info(`Sending to user ${userId}`);
        await db.insert('notifications', { userId, message });
        
        // Emit event for other plugins
        ctx.events.emit('notification:sent', { userId });
        
        return { success: true };
      }
    });
    
    // React to events from other plugins
    ctx.events.on('user:registered', async (user) => {
      await ctx.actions.runAction('notifications:send', {
        userId: user.id,
        message: 'Welcome!'
      });
    });
  }
};
```

### 4. Use It

```typescript
// Register plugin
ctx.plugins.registerPlugin(notificationsPlugin);

// Call from anywhere
await ctx.actions.runAction('notifications:send', {
  userId: 123,
  message: 'Your order shipped!'
});
```

**That's it.** 30 lines vs 200+ traditional. Fully testable. Easily extensible.

## See It In Action

### Quick Demos (30 minutes each)

**[Dev Tool Launcher](demo/dev-launcher)** - CLI Command Palette  
Problem: Juggling Git, npm, Docker commands daily  
Solution: 150 lines vs 500+ traditional (70% reduction)

```bash
cd demo/dev-launcher && npm install && npm start
```

**[Real-Time Collaboration Hub](demo/collab-hub)** - Multi-User Sync  
Problem: Firebase (150KB+) or Socket.io + Redux (100KB+)  
Solution: 130 lines vs 500+ traditional (75% reduction)

```bash
cd demo/collab-hub && npm install && npm run build
npm run server  # Terminal 1
npm run client  # Terminal 2-3
```

**[See all demos →](demo/README.md)**

### Advanced Showcases (2-3 hours each)

**[Tab Manager Extension](showcase/tab-manager)** - Production Browser Extension  
190 lines vs 550+ traditional | 5 plugins | Chrome Web Store ready

**[Documentation Engine](showcase/documentation-engine)** - Multi-Plugin Docs Site  
265 lines vs 750+ traditional | 10+ plugins | Build-time optimized

**[See all showcases →](showcase/README.md)**

## Core Concepts (5 Minutes to Learn)

### 1. Host Context: Bridge to Legacy Code

Inject your existing services so plugins can use them:

```typescript
const runtime = new Runtime({
  hostContext: {
    db: legacyDatabase,      // Your existing DB connection
    cache: redisClient,      // Your existing cache
    auth: authService        // Your existing auth
  }
});

// Plugins access via ctx.host
const { db, cache, auth } = ctx.host;
```

### 2. Actions: Business Logic

Encapsulate operations as named, testable actions:

```typescript
ctx.actions.registerAction({
  id: "orders:create",
  handler: async (orderData) => {
    const { db } = ctx.host;
    const order = await db.insert("orders", orderData);
    ctx.events.emit("order:created", order);
    return order;
  }
});

// Call from anywhere
const order = await ctx.actions.runAction("orders:create", data);
```

### 3. Events: Decouple Features

Let features communicate without direct dependencies:

```typescript
// Feature A: Emit event
ctx.events.emit("order:created", order);

// Feature B: React to event (doesn't know about Feature A)
ctx.events.on("order:created", (order) => {
  ctx.actions.runAction("email:send", {
    to: order.customerEmail,
    template: "order-confirmation"
  });
});
```

### 4. Plugins: Isolated Features

Group related functionality into plugins:

```typescript
export const OrdersPlugin = {
  name: "orders",
  version: "1.0.0",
  setup(ctx) {
    // Register actions, screens, event handlers
    // Everything for "orders" feature in one place
  }
};
```

### 5. Screens (Optional): UI Definitions

Define screens that any UI framework can render:

```typescript
ctx.screens.registerScreen({
  id: "orders:list",
  title: "Orders",
  component: OrderListComponent  // React, Vue, or anything
});
```

## Real-World Migration Patterns

### Pattern 1: Feature Flags (Safest)

Gradually switch features from legacy to plugins:

```typescript
const features = {
  notifications: 'plugin',  // Using Skeleton Crew
  payments: 'legacy',       // Still using old code
  reports: 'plugin'         // Using Skeleton Crew
};

class App {
  async sendNotification(userId, message) {
    if (features.notifications === 'plugin') {
      return this.runtime.getContext().actions.runAction(
        'notifications:send',
        { userId, message }
      );
    } else {
      return this.legacyNotifications.send(userId, message);
    }
  }
}
```

**Benefits:** Roll back instantly if issues arise. Test in production with small user percentage.

### Pattern 2: New Features Only

Keep legacy code frozen. All new features are plugins:

```typescript
// Legacy code (frozen, no changes)
class LegacyApp {
  constructor() {
    this.db = new Database();
    this.users = new UserService(this.db);
  }
}

// New features as plugins
const runtime = new Runtime({
  hostContext: {
    db: legacyApp.db,
    users: legacyApp.users
  }
});

// New "analytics" feature - clean plugin code
const AnalyticsPlugin = {
  name: "analytics",
  version: "1.0.0",
  setup(ctx) {
    const { db, users } = ctx.host;
    
    ctx.actions.registerAction({
      id: "analytics:track",
      handler: async (event) => {
        await db.insert("analytics", event);
      }
    });
  }
};
```

**Benefits:** Legacy code stays stable. New code is clean and testable. No rewrite needed.

### Pattern 3: Strangler Fig

Gradually replace legacy services with plugin-based ones:

```typescript
// Phase 1: Legacy service
const legacyAuth = new LegacyAuthService();

// Phase 2: New auth plugin (same interface)
const AuthPlugin = {
  name: "auth",
  version: "2.0.0",
  setup(ctx) {
    ctx.actions.registerAction({
      id: "auth:login",
      handler: async (credentials) => {
        // New implementation
      }
    });
  }
};

// Phase 3: Switch gradually
const useNewAuth = process.env.NEW_AUTH === 'true';

async function login(credentials) {
  if (useNewAuth) {
    return runtime.getContext().actions.runAction('auth:login', credentials);
  } else {
    return legacyAuth.login(credentials);
  }
}
```

**Benefits:** Replace services one at a time. Run both versions in parallel. Validate before full switch.

### Pattern 4: Event-Driven Integration

Let legacy code emit events that plugins handle:

```typescript
// Legacy code (minimal change - just emit events)
class LegacyUserService {
  async createUser(userData) {
    const user = await this.db.insert('users', userData);
    
    // Add this one line
    eventBus.emit('user:created', user);
    
    return user;
  }
}

// New plugin reacts to legacy events
const WelcomeEmailPlugin = {
  name: "welcome-emails",
  version: "1.0.0",
  setup(ctx) {
    ctx.events.on('user:created', async (user) => {
      await ctx.actions.runAction('email:send', {
        to: user.email,
        template: 'welcome'
      });
    });
  }
};
```

**Benefits:** Minimal legacy changes. New features are completely isolated. Easy to add/remove features.

## When to Use Skeleton Crew

### ✅ Perfect For

- **Internal tools** - Admin panels, dashboards, dev tools (70% less code)
- **Browser extensions** - Background scripts, content scripts (65% less code)
- **CLI applications** - Task runners, deployment tools (70% less code)
- **Real-time features** - Collaboration, presence, chat (75% less code)
- **Legacy modernization** - Add features without touching old code
- **Modular applications** - Features that can be enabled/disabled
- **Prototypes** - Validate ideas in hours, not days

### ❌ Not Ideal For

- **Public-facing apps** - Use Next.js, Remix, etc. (better SEO, routing)
- **Complex routing needs** - Use React Router, TanStack Router, etc.
- **Heavy state management** - Use Redux, Zustand, etc.
- **Static websites** - No need for runtime architecture
- **Single-feature apps** - Plugin system adds unnecessary complexity

---

## Advanced Features

### Introspection API

Debug and monitor your runtime:

```typescript
const ctx = runtime.getContext();

// List all registered resources
const actions = ctx.introspect.listActions();
const plugins = ctx.introspect.listPlugins();
const screens = ctx.introspect.listScreens();

// Get metadata
const stats = ctx.introspect.getMetadata();
// { runtimeVersion: "0.1.0", totalActions: 15, totalPlugins: 5 }
```

**Use cases:** Admin dashboards, debugging tools, runtime monitoring.

### Action Timeouts

Prevent hanging operations:

```typescript
ctx.actions.registerAction({
  id: "api:fetch",
  timeout: 5000,  // 5 seconds max
  handler: async () => {
    return await fetch('/api/data');
  }
});
```

### Event Patterns

**Fire-and-forget:**
```typescript
ctx.events.emit('user:created', user);  // Synchronous
```

**Wait for handlers:**
```typescript
await ctx.events.emitAsync('order:processed', order);  // Asynchronous
```

---

## Learning Resources

### Complete Migration Guide

See [Migration Guide](docs/guides/migration-guide.md) for:
- Step-by-step migration strategies
- Real-world examples
- Common pitfalls and solutions
- Testing strategies

### Tutorial: Build a Task Manager

Learn by building a complete app from scratch:

```bash
npm run build
npm run tutorial:01  # Start with step 1
```

See [example/tutorial/README.md](example/tutorial/README.md).

### Example Applications

Run focused examples:

```bash
npm run example:01  # Plugin System
npm run example:02  # Screen Registry
npm run example:03  # Action Engine
npm run example:04  # Event Bus
npm run example:05  # Runtime Context
npm run example     # Complete playground
```

## How It Works

```
┌─────────────────────────────────────────────────┐
│           Your Legacy Application               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │ Database │  │   API    │  │  Logger  │     │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘     │
│       │             │              │            │
│       └─────────────┴──────────────┘            │
│                     │                            │
│              Host Context (injected)             │
└─────────────────────┬───────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────┐
│         Skeleton Crew Runtime                   │
│                                                  │
│  ┌──────────────────────────────────────────┐  │
│  │  Plugin 1    Plugin 2    Plugin 3        │  │
│  │  (new code)  (new code)  (new code)      │  │
│  └──────────────────────────────────────────┘  │
│         │            │            │             │
│    ┌────▼────┐  ┌───▼────┐  ┌───▼────┐        │
│    │ Actions │  │ Events │  │Screens │        │
│    └─────────┘  └────────┘  └────────┘        │
└─────────────────────────────────────────────────┘
```

**Key insight:** Legacy services flow up through host context. New features are isolated plugins that use those services.

## Testing Your Plugins

One of the biggest wins: plugins are easy to test.

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { Runtime } from 'skeleton-crew-runtime';
import { NotificationsPlugin } from './notifications.js';

describe('NotificationsPlugin', () => {
  let runtime;
  let mockDb;
  
  beforeEach(async () => {
    // Mock your legacy services
    mockDb = {
      insert: vi.fn().mockResolvedValue({ id: 1 })
    };
    
    // Create isolated runtime for testing
    runtime = new Runtime({
      hostContext: { db: mockDb }
    });
    
    await runtime.initialize();
    runtime.getContext().plugins.registerPlugin(NotificationsPlugin);
  });
  
  it('sends notification', async () => {
    const ctx = runtime.getContext();
    
    const result = await ctx.actions.runAction('notifications:send', {
      userId: 123,
      message: 'Test'
    });
    
    expect(result.success).toBe(true);
    expect(mockDb.insert).toHaveBeenCalledWith('notifications', {
      userId: 123,
      message: 'Test',
      createdAt: expect.any(Date)
    });
  });
});
```

**Benefits:**
- No need to set up entire legacy app
- Mock only what you need
- Fast, isolated tests
- Easy to test edge cases

## API Quick Reference

### Runtime Setup

```typescript
import { Runtime } from 'skeleton-crew-runtime';

const runtime = new Runtime({
  hostContext: {
    // Your existing services
    db: yourDatabase,
    logger: yourLogger
  }
});

await runtime.initialize();
const ctx = runtime.getContext();
```

### Working with Actions

```typescript
// Register
ctx.actions.registerAction({
  id: 'feature:action',
  timeout: 5000,  // optional
  handler: async (params) => {
    const { db } = ctx.host;
    return await db.query(params);
  }
});

// Execute
const result = await ctx.actions.runAction('feature:action', params);
```

### Working with Events

```typescript
// Subscribe
ctx.events.on('entity:changed', (data) => {
  console.log('Changed:', data);
});

// Emit (fire-and-forget)
ctx.events.emit('entity:changed', { id: 123 });

// Emit (wait for handlers)
await ctx.events.emitAsync('entity:changed', { id: 123 });
```

### Working with Plugins

```typescript
// Define
export const MyPlugin = {
  name: 'my-plugin',
  version: '1.0.0',
  setup(ctx) {
    // Register actions, screens, events
  },
  dispose(ctx) {
    // Optional cleanup
  }
};

// Register
ctx.plugins.registerPlugin(MyPlugin);
```

### Accessing Host Context

```typescript
// In any plugin
setup(ctx) {
  const { db, logger, cache } = ctx.host;
  
  // Use your existing services
  await db.query('SELECT * FROM users');
  logger.info('Plugin initialized');
}
```

### Introspection

```typescript
// List resources
const actions = ctx.introspect.listActions();
const plugins = ctx.introspect.listPlugins();

// Get metadata
const actionMeta = ctx.introspect.getActionDefinition('feature:action');
const stats = ctx.introspect.getMetadata();
```

**Full API documentation:** [API.md](docs/api/API.md)

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

## Documentation

- **[Migration Guide](docs/guides/migration-guide.md)** - Step-by-step migration strategies
- **[API Reference](docs/api/API.md)** - Complete TypeScript API
- **[Examples Guide](docs/guides/EXAMPLES_GUIDE.md)** - Learn through examples
- **[Browser Extensions](docs/use-cases/BROWSER_TOOLS.md)** - Building browser tools
- **[Project Overview](docs/PROJECT_OVERVIEW.md)** - Architecture deep dive

## Get Started

```bash
npm install skeleton-crew-runtime
```

Then follow the [Quick Start](#quick-start-add-your-first-feature) above.

---

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT

---

**Built for developers who need to modernize legacy apps without the risk of a full rewrite.**
