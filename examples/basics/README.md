# Basics - Focused Feature Demos

Learn Skeleton Crew Runtime one feature at a time. Each example demonstrates a single core feature in ~50-80 lines of code and runs in 10 seconds.

## Quick Start

```bash
# Build first
npm run build
npm run build:examples

# Run any example
npm run example:01  # Plugin System
npm run example:02  # Screen Registry
npm run example:03  # Action Engine
npm run example:04  # Event Bus
npm run example:05  # Runtime Context
```

---

## Example 01: Plugin System

**File**: `01-plugin-system/`  
**Time**: 10 seconds  
**Lines**: ~60

### What You'll Learn

- How to define a plugin
- Plugin registration and lifecycle
- Setup and dispose methods
- Plugin initialization order

### The Problem

How do I extend the runtime with custom functionality?

### The Solution

Plugins are the building blocks. Everything extends through plugins.

```typescript
const myPlugin: PluginDefinition = {
  name: 'my-plugin',
  version: '1.0.0',
  
  setup(context: RuntimeContext) {
    console.log('Plugin initialized!');
  },
  
  dispose() {
    console.log('Plugin cleaned up!');
  }
};

runtime.registerPlugin(myPlugin);
await runtime.initialize(); // Calls setup()
await runtime.shutdown();   // Calls dispose()
```

### Run It

```bash
npm run example:01
```

**Key Takeaway**: Plugins are registered before initialization, setup runs during initialization.

---

## Example 02: Screen Registry

**File**: `02-screen-registry/`  
**Time**: 10 seconds  
**Lines**: ~70

### What You'll Learn

- How to register screens
- Screen metadata and components
- Retrieving screens by ID
- Listing all screens

### The Problem

How do I define UI screens without coupling to a specific UI framework?

### The Solution

Screens are declarative data structures. Any UI provider can render them.

```typescript
context.screens.registerScreen({
  id: 'home',
  title: 'Home Screen',
  component: 'HomeComponent'  // String, class, function, anything
});

const screen = context.screens.getScreen('home');
const allScreens = context.screens.getAllScreens();
```

### Run It

```bash
npm run example:02
```

**Key Takeaway**: Screens are data, not UI. UI providers decide how to render them.

---

## Example 03: Action Engine

**File**: `03-action-engine/`  
**Time**: 10 seconds  
**Lines**: ~80

### What You'll Learn

- How to register actions
- Action handlers with parameters
- Executing actions
- Action timeouts
- Error handling

### The Problem

How do I encapsulate business logic that can be triggered from anywhere?

### The Solution

Actions are executable operations with handlers.

```typescript
// Register action
context.actions.registerAction({
  id: 'user:create',
  timeout: 5000,  // Optional
  handler: async (params: { name: string }) => {
    const user = await db.createUser(params.name);
    context.events.emit('user:created', user);
    return user;
  }
});

// Execute action
const user = await context.actions.runAction('user:create', {
  name: 'Alice'
});
```

### Run It

```bash
npm run example:03
```

**Key Takeaway**: Actions encapsulate business logic and can be called from UI, other actions, or external code.

---

## Example 04: Event Bus

**File**: `04-event-bus/`  
**Time**: 10 seconds  
**Lines**: ~70

### What You'll Learn

- How to emit events
- How to subscribe to events
- Synchronous vs asynchronous events
- Event-driven communication
- Automatic cleanup

### The Problem

How do plugins communicate without direct dependencies?

### The Solution

Events enable loose coupling. Plugins emit and subscribe without knowing about each other.

```typescript
// Plugin A: Emit event
context.events.emit('user:created', { id: 123, name: 'Alice' });

// Plugin B: Subscribe to event (doesn't know about Plugin A)
context.events.on('user:created', (user) => {
  console.log('New user:', user.name);
  context.actions.runAction('email:send', {
    to: user.email,
    template: 'welcome'
  });
});
```

### Run It

```bash
npm run example:04
```

**Key Takeaway**: Events decouple plugins. Add features by listening to events, not modifying existing code.

---

## Example 05: Runtime Context

**File**: `05-runtime-context/`  
**Time**: 10 seconds  
**Lines**: ~80

### What You'll Learn

- RuntimeContext as unified API
- Accessing all subsystems
- Context in plugin setup
- Context in action handlers
- Immutability guarantees

### The Problem

How do I access screens, actions, events, and plugins from my code?

### The Solution

RuntimeContext provides a unified API for all subsystems.

```typescript
// In plugin setup
setup(context: RuntimeContext) {
  // Access all subsystems
  context.screens.registerScreen({ ... });
  context.actions.registerAction({ ... });
  context.events.on('event', handler);
  context.plugins.getPlugin('other-plugin');
}

// In action handler
handler: async (params, context) => {
  // Context available here too
  const screen = context.screens.getScreen('home');
  context.events.emit('action:executed', params);
}
```

### Run It

```bash
npm run example:05
```

**Key Takeaway**: One API surface (RuntimeContext) provides access to everything.

---

## Learning Path

### Recommended Order

1. **Example 01** - Understand plugins (foundation)
2. **Example 02** - Understand screens (UI abstraction)
3. **Example 03** - Understand actions (business logic)
4. **Example 04** - Understand events (communication)
5. **Example 05** - Understand context (unified API)

### Time Investment

- **Total time**: ~10 minutes (2 min per example)
- **Code to read**: ~350 lines total
- **Concepts learned**: 5 core features

---

## What's Next?

After completing the basics:

1. **Run the playground** - See all features integrated:
   ```bash
   npm run example
   ```
   [Go to playground →](../playground/)

2. **Try the tutorial** - Build a task manager from scratch:
   ```bash
   npm run tutorial:01
   ```
   [Go to tutorial →](../tutorial/)

3. **Explore demos** - See real-world problem-solving:
   [Go to demos →](../../demo/)

---

## Example Structure

Each example follows the same pattern:

```
01-plugin-system/
├── index.ts          # Main entry point (~60 lines)
└── README.md         # Detailed explanation
```

**Minimal code, maximum learning.**

---

## Key Principles

All examples demonstrate:

### 1. Plugin-First Architecture
Everything extends through plugins. No built-in features.

### 2. UI-Agnostic Design
No UI framework dependencies. Screens are data structures.

### 3. Event-Driven Communication
Plugins communicate through events, not direct calls.

### 4. Minimal Core
Runtime provides primitives. Plugins compose them into features.

---

## Troubleshooting

### Examples won't run

```bash
# Build runtime first
npm run build

# Build examples
npm run build:examples

# Then run
npm run example:01
```

### Import errors

Ensure you're using Node.js 18+ with ESM support.

### TypeScript errors

Check that `tsconfig.examples.json` includes `examples/**/*`.

---

## Documentation

- **[Examples Overview](../README.md)** - All examples
- **[Playground](../playground/README.md)** - Complete app
- **[Tutorial](../tutorial/README.md)** - Step-by-step learning
- **[Main README](../../README.md)** - Skeleton Crew Runtime
- **[API Reference](../../docs/api/API.md)** - Complete API

---

**Start with Example 01 and work your way through. Each builds on the previous.**
