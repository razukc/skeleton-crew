# Skeleton Crew Runtime

A minimal, plugin-based application runtime for building internal tools and modular applications without UI framework lock-in.


## What is Skeleton Crew?

Skeleton Crew is a tiny runtime that handles screens, actions, events, and plugins — **without enforcing how your app looks or behaves**. It's the "backend of your frontend" that lets you build plugin-driven apps with any UI framework (React, Vue, CLI, or none at all).

```typescript
import { Runtime } from "skeleton-crew";

const runtime = new Runtime();
await runtime.initialize();

// Register a plugin
await runtime.getContext().plugins.registerPlugin({
  name: "hello",
  version: "1.0.0",
  setup(ctx) {
    ctx.screens.registerScreen({
      id: "home",
      title: "Hello World",
      component: () => console.log("Hello from Skeleton Crew!")
    });
  }
});

// Render a screen
runtime.renderScreen("home");
```

## Why Skeleton Crew?

Most frameworks give you a full stack, a default UI layer, opinions about structure, routing, state management, rendering, data fetching, and how you should build your app.

Skeleton Crew gives you **none of that** — on purpose.

Instead, it gives you *just enough* structure to build:

* Internal tools
* Admin dashboards
* Multi-screen apps
* Plugin-based apps
* Config-driven or dynamically-generated interfaces
* Custom no-code/low-code platforms
* Micro-tools built by teams
* Multi UI framework apps

The premise is simple:

> **Skeleton Crew handles everything *except* the UI.**
>
> Plugins define screens, actions, events, and features.
> The UI layer (React, Vue, Svelte, Solid, native, CLI, etc.) is plugged in separately and optional.

This creates several benefits:

---

### **1. Your UI stack is *your choice***

React? Vue? Solid? Vanilla HTML? Native mobile wrappers? All possible.

Skeleton Crew doesn’t import any UI framework — the UI is a **plugin**, not part of the runtime.
This gives you the same runtime across entirely different front-ends.

---

### **2. You can build real apps from simple blocks**

Plugins can register:

* Screens
* Actions
* Events
* Their own sub-plugins
* Feature bundles
* UI providers
* Business logic modules
* Domain-driven “capabilities”

This lets you grow your app like LEGO pieces.

---

### **3. Zero global state**

Everything stays inside the runtime instance.
You can spin up multiple runtimes in a single page — clean, isolated, easy to test.

---

### **4. A stable contract between the backend and the UI**

Since the UI layer is optional and external:

* You can generate screens dynamically
* You can switch UI frameworks without rewriting logic
* You can embed your app inside another app
* You can even run the runtime in Node without DOM

The runtime acts like the backend *of your frontend*.

---

### **5. It is perfect for internal tools, multi-screen dashboards, and plugins**

You can do things that normal frameworks make painful:

* Register screens based on user permissions
* Hot-load plugins
* Build custom “tiny apps” inside a bigger tool
* Enable/disable features at runtime
* Create reusable organizational toolkits

Skeleton Crew is a **general-purpose runtime for assembling apps** — not a web UI framework.

---

### Key Benefits

- **UI-Agnostic**: No built-in UI framework. Use React, Vue, Svelte, CLI, or anything else.
- **Plugin-Driven**: Everything extends through plugins (including UI rendering).
- **Minimal Core**: Only essential primitives (screens, actions, plugins, events).
- **Environment-Neutral**: Works in browser, Node.js, or any JavaScript runtime.
- **Zero Global State**: Multiple isolated runtime instances in a single application.
- **Testable**: Clean boundaries make testing straightforward.

### Perfect For

- Internal tools and admin dashboards
- Multi-screen applications
- Plugin-based architectures
- Config-driven or dynamically-generated interfaces
- Custom no-code/low-code platforms
- Organizational toolkits with shared capabilities

## Quick Start

### Installation

```bash
npm install skeleton-crew
```

### Your First Plugin

Create a simple plugin that registers a screen and an action:

```typescript
// plugins/counter.ts
export const CounterPlugin = {
  name: "counter",
  version: "1.0.0",
  setup(ctx) {
    let count = 0;

    // Register a screen
    ctx.screens.registerScreen({
      id: "counter",
      title: "Counter",
      component: { count }
    });

    // Register actions
    ctx.actions.registerAction({
      id: "increment",
      handler() {
        count++;
        ctx.events.emit("counter:changed", count);
        return count;
      }
    });

    ctx.actions.registerAction({
      id: "decrement",
      handler() {
        count--;
        ctx.events.emit("counter:changed", count);
        return count;
      }
    });

    // Listen to events
    ctx.events.on("counter:changed", (newCount) => {
      console.log(`Counter is now: ${newCount}`);
    });
  }
};
```

### Initialize and Run

```typescript
// app.ts
import { Runtime } from "skeleton-crew";
import { CounterPlugin } from "./plugins/counter.js";

const runtime = new Runtime();
await runtime.initialize();

// Optional: Set a UI provider
runtime.setUIProvider({
  render(screen, ctx) {
    console.log(`Rendering screen: ${screen.title}`);
    console.log(`Current count: ${screen.component.count}`);
  }
});

// Register plugin
await runtime.getContext().plugins.registerPlugin(CounterPlugin);

// Render screen
runtime.renderScreen("counter");

// Execute actions
await runtime.getContext().actions.executeAction("increment");
await runtime.getContext().actions.executeAction("increment");
await runtime.getContext().actions.executeAction("decrement");
```

## Core Concepts

### Screens

Named UI surfaces that your app can render. Screens are registered by plugins and rendered by UI providers.

```typescript
ctx.screens.registerScreen({
  id: "users:list",
  title: "User List",
  component: UserListComponent
});
```

### Actions

Named handlers for app behaviors (sync or async). Actions can be triggered by UI interactions or other plugins.

```typescript
ctx.actions.registerAction({
  id: "users:load",
  handler: async () => {
    const users = await fetchUsers();
    return users;
  }
});
```

### Events

Pub/sub communication between plugins. Events enable loose coupling and cross-plugin coordination.

```typescript
// Emit an event
ctx.events.emit("user:created", { id: 123, name: "Alice" });

// Listen to an event
ctx.events.on("user:created", (user) => {
  console.log(`New user: ${user.name}`);
});
```

### Plugins

Self-contained modules that register screens, actions, and event handlers. Plugins are the primary extension mechanism.

```typescript
export const MyPlugin = {
  name: "my-plugin",
  version: "1.0.0",
  setup(ctx) {
    // Register screens, actions, events
  }
};
```

### UI Providers

Optional plugins that handle rendering. This is how you integrate React, Vue, CLI, or any other UI layer.

```typescript
runtime.setUIProvider({
  mount(target) {
    // Optional: Initialize UI framework
  },
  render(screen, ctx) {
    // Render the screen using your UI framework
  }
});
```

## Example Application

Check out the `/example` folder for a complete working application that demonstrates:

- Multiple plugins working together
- Screen registration and rendering
- Action execution
- Event-driven communication
- Terminal-based UI provider

Run the example:

```bash
npm run example
```

## Architecture

```
                  +-----------------------+
                  |   Your Application    |
                  +-----------------------+
                         | registers
                         v
             +----------------------------+
             |         Plugins            |
             +----------------------------+
            /       |           |          \
           v        v           v           v
      Screens   Actions      Events     UI Provider
           \        |           |          /
            \       |           |         /
             \      |           |        /
                 +---------------------+
                 |   Runtime Core      |
                 +---------------------+
```

### Subsystems

1. **PluginRegistry**: Manages plugin registration and lifecycle
2. **ScreenRegistry**: Stores and retrieves screen definitions
3. **ActionEngine**: Registers and executes actions
4. **EventBus**: Pub/sub event system for cross-subsystem communication
5. **UIBridge** (optional): UI provider integration layer

### Initialization Sequence

1. Create PluginRegistry
2. Create ScreenRegistry
3. Create ActionEngine
4. Create EventBus
5. Create UIBridge
6. Create RuntimeContext (unified API)
7. Execute plugin setup callbacks

## Building Real Applications

### Multi-Plugin Application

```typescript
// plugins/users.ts
export const UsersPlugin = {
  name: "users",
  version: "1.0.0",
  setup(ctx) {
    ctx.screens.registerScreen({
      id: "users:list",
      title: "Users",
      component: UserListComponent
    });

    ctx.actions.registerAction({
      id: "users:load",
      handler: async () => await fetchUsers()
    });
  }
};

// plugins/reports.ts
export const ReportsPlugin = {
  name: "reports",
  version: "1.0.0",
  setup(ctx) {
    ctx.screens.registerScreen({
      id: "reports:overview",
      title: "Reports",
      component: ReportsComponent
    });

    ctx.actions.registerAction({
      id: "reports:generate",
      handler: async (params) => await generateReport(params)
    });

    // Listen to user events
    ctx.events.on("user:created", (user) => {
      console.log(`Generate welcome report for ${user.name}`);
    });
  }
};

// app.ts
const runtime = new Runtime();
await runtime.initialize();

await runtime.getContext().plugins.registerPlugin(UsersPlugin);
await runtime.getContext().plugins.registerPlugin(ReportsPlugin);

runtime.renderScreen("users:list");
```

### Recommended Folder Structure

```
my-app/
 ├─ src/
 │   ├─ plugins/
 │   │    ├─ users/
 │   │    │    ├─ index.ts
 │   │    │    └─ screens.ts
 │   │    ├─ reports/
 │   │    └─ shared/
 │   ├─ ui/
 │   │    ├─ react/
 │   │    ├─ vue/
 │   │    └─ console/
 │   └─ app.ts
 ├─ package.json
 └─ README.md
```

## API Reference

For complete API documentation including all TypeScript interfaces, classes, methods, and types, see [API.md](API.md).

### Quick Reference

**Runtime:**
```typescript
const runtime = new Runtime(options?: { logger?: Logger });
await runtime.initialize();
runtime.setUIProvider(provider: UIProvider);
runtime.renderScreen(screenId: string);
runtime.getContext(): RuntimeContext;
runtime.isInitialized(): boolean;
runtime.getState(): RuntimeState;
await runtime.shutdown();
```

**RuntimeContext:**
```typescript
const ctx = runtime.getContext();

// Screens
ctx.screens.registerScreen(screen: ScreenDefinition): () => void;
ctx.screens.getScreen(id: string): ScreenDefinition | null;
ctx.screens.getAllScreens(): ScreenDefinition[];

// Actions
ctx.actions.registerAction<P, R>(action: ActionDefinition<P, R>): () => void;
ctx.actions.runAction<P, R>(id: string, params?: P): Promise<R>;

// Plugins
ctx.plugins.registerPlugin(plugin: PluginDefinition): void;
ctx.plugins.getPlugin(name: string): PluginDefinition | null;
ctx.plugins.getAllPlugins(): PluginDefinition[];
ctx.plugins.getInitializedPlugins(): string[];

// Events
ctx.events.emit(event: string, data?: unknown): void;
ctx.events.emitAsync(event: string, data?: unknown): Promise<void>;
ctx.events.on(event: string, handler: (data: unknown) => void): () => void;


## What Skeleton Crew Is NOT

- ❌ Not a UI framework
- ❌ Not a routing library
- ❌ Not a state management library
- ❌ Not tied to React/Vue/Svelte
- ❌ Not opinionated about data fetching
- ❌ Not a backend framework

## What Skeleton Crew IS

- ✅ A runtime for screen/action/event/plugin orchestration
- ✅ The "backend of your frontend"
- ✅ A plugin-based engine for multi-screen apps
- ✅ A UI-agnostic architecture for building tools
- ✅ A way to build apps that grow like LEGO
- ✅ An extremely testable, stateless, extensible core

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run example application
npm run example
```

## TypeScript Support

Skeleton Crew is written in TypeScript with full type definitions included.

```typescript
import type {
  Runtime,
  RuntimeContext,
  PluginDefinition,
  ScreenDefinition,
  ActionDefinition,
  UIProvider
} from "skeleton-crew";
```

## License

MIT

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to get started.

---

**Built with ❤️ for developers who want structure without constraints.**
