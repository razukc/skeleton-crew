# Skeleton Crew Runtime

**A minimal plugin runtime for building modular JavaScript applications.**

Stop wiring up infrastructure. Start building features.

```bash
npm install skeleton-crew-runtime
```

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
import { Runtime, PluginDefinition } from 'skeleton-crew-runtime';

// 1. Create runtime
const runtime = new Runtime();
await runtime.initialize();
const ctx = runtime.getContext();

// 2. Write a plugin (this is a complete feature)
const notificationsPlugin: PluginDefinition = {
  name: 'notifications',
  version: '1.0.0',
  
  setup(ctx) {
    // Register business logic
    ctx.actions.registerAction({
      id: 'notifications:send',
      handler: async ({ userId, message }, ctx) => {
        // Your logic here
        await sendPushNotification(userId, message);
        
        // Let other plugins know
        ctx.events.emit('notification:sent', { userId });
        
        return { success: true };
      }
    });
    
    // React to other plugins
    ctx.events.on('user:registered', async (user) => {
      await ctx.actions.runAction('notifications:send', {
        userId: user.id,
        message: 'Welcome!'
      });
    });
  }
};

// 3. Register and use
ctx.plugins.registerPlugin(notificationsPlugin);

// anywhere in your app
await ctx.actions.runAction('notifications:send', {
  userId: 123,
  message: 'Your order shipped!'
});
```

**That's it.** The plugin is isolated, testable, and can be removed without breaking anything.

## Core concepts (5 minutes)

### 1. Plugins: Isolated Features

A plugin is just an object with a name and a setup function:

```typescript
import type { PluginDefinition, RuntimeContext } from 'skeleton-crew-runtime';

export const myPlugin: PluginDefinition = {
  name: 'my-plugin',
  version: '1.0.0',
  
  setup(ctx: RuntimeContext) {
    // Register your feature here
  },
  
  dispose(ctx: RuntimeContext) {
    // Optional: cleanup resources when plugin is removed
    // Use this for: closing connections, clearing timers, releasing memory
    // Event listeners auto-cleanup, so you usually don't need this
  }
};
```

### 2. Actions: Business Logic

Actions are named functions that do work:

```typescript
// Register an action
ctx.actions.registerAction({
  id: 'orders:create',
  handler: async (orderData, ctx) => {
    const { db } = ctx.host;
    const order = await db.insert('orders', orderData);
    ctx.events.emit('order:created', order);
    return order;
  }
});

// Call from anywhere
const order = await ctx.actions.runAction('orders:create', data);
```

### 3. Events: Decouple Features

Plugins communicate without knowing about each other:

```typescript
// Plugin A: Emit event
ctx.events.emit('order:created', order);

// Plugin B: React (doesn't know about Plugin A)
ctx.events.on('order:created', (order) => {
  sendConfirmationEmail(order);
});
```

### 4. Host Context: Bridge to Existing Code

Inject your existing services so plugins can use them:

```typescript
import { Runtime } from 'skeleton-crew-runtime';

const runtime = new Runtime({
  hostContext: {
    db: yourDatabase,
    cache: redisClient,
    logger: yourLogger
  }
});

await runtime.initialize();
const ctx = runtime.getContext();

// Plugins access via ctx.host
const { db, logger } = ctx.host;
```

### 5. Screens (Optional): UI Definitions

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

## Documentation

### Getting Started
- **[Installation](docs/getting-started/installation.md)** - Install and setup
- **[API Reference](docs/api/reference.md)** - Complete TypeScript API
- **[Core Concepts](docs/getting-started/README.md)** - Understand the fundamentals
- **[Your First Plugin](docs/getting-started/your-first-plugin.md)** - Build your first feature

### Guides & Examples
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
