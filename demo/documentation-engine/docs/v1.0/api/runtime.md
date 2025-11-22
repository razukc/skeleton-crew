---
title: Runtime API (v1.0)
description: API reference for Skeleton Crew Runtime v1.0
path: /v1.0/api/runtime
order: 1
---

# Runtime API Reference (v1.0)

> **Note:** You are viewing documentation for version 1.0. [View latest version](/api/runtime) for updated API.

The Runtime is the core orchestrator of Skeleton Crew applications.

## Constructor

### `new Runtime()`

Creates a new Runtime instance.

```typescript
const runtime = new Runtime();
```

**Returns:** `Runtime` instance

## Methods

### `registerPlugin(plugin: PluginDefinition): void`

Registers a plugin with the runtime. Must be called before `initialize()`.

```typescript
runtime.registerPlugin(myPlugin);
```

**Parameters:**
- `plugin`: Plugin definition object

**Throws:** Error if called after initialization

---

### `initialize(): Promise<void>`

Initializes the runtime and all registered plugins.

```typescript
await runtime.initialize();
```

**Returns:** Promise that resolves when initialization is complete

**Throws:** Error if already initialized

---

### `getContext(): RuntimeContext`

Returns the runtime context for accessing subsystems.

```typescript
const context = runtime.getContext();
```

**Returns:** `RuntimeContext` object

---

## RuntimeContext

The context provides access to runtime subsystems.

### Properties

#### `screens: ScreenRegistry`

Access to the screen registry.

```typescript
context.screens.registerScreen({
  id: 'my-screen',
  title: 'My Screen',
  component: MyComponent
});
```

#### `actions: ActionEngine`

Access to the action engine.

```typescript
context.actions.registerAction({
  id: 'my-action',
  handler: async (params) => {
    return result;
  }
});
```

#### `events: EventBus`

Access to the event bus.

```typescript
// Listen to events
context.events.on('event-name', (data) => {
  console.log(data);
});

// Emit events
context.events.emit('event-name', { message: 'Hello' });
```

## PluginDefinition

Interface for plugin definitions.

```typescript
interface PluginDefinition {
  name: string;
  version: string;
  setup(context: RuntimeContext): void | Promise<void>;
}
```

### Properties

- `name`: Unique plugin identifier
- `version`: Plugin version (semver)
- `setup`: Function called during initialization

## ScreenDefinition

Interface for screen definitions.

```typescript
interface ScreenDefinition {
  id: string;
  title: string;
  component: any;
  metadata?: Record<string, any>;
}
```

### Properties

- `id`: Unique screen identifier
- `title`: Display title
- `component`: Component to render
- `metadata`: Optional metadata object

## ActionDefinition

Interface for action definitions.

```typescript
interface ActionDefinition {
  id: string;
  handler: (params: any) => Promise<any>;
}
```

### Properties

- `id`: Unique action identifier
- `handler`: Async function that executes the action

## Example Usage

```typescript
import { Runtime } from 'skeleton-crew-runtime';

// Create runtime
const runtime = new Runtime();

// Define plugin
const plugin = {
  name: 'example',
  version: '1.0.0',
  setup(context) {
    // Register screen
    context.screens.registerScreen({
      id: 'home',
      title: 'Home',
      component: HomeScreen
    });
    
    // Register action
    context.actions.registerAction({
      id: 'greet',
      handler: async ({ name }) => {
        return `Hello, ${name}!`;
      }
    });
    
    // Listen to events
    context.events.on('user:login', (data) => {
      console.log('User logged in:', data.username);
    });
  }
};

// Register and initialize
runtime.registerPlugin(plugin);
await runtime.initialize();

// Get context
const context = runtime.getContext();

// Execute action
const result = await context.actions.runAction('greet', { name: 'World' });
console.log(result); // "Hello, World!"
```

## Limitations in v1.0

<Callout type="warning">
  The following features are not available in v1.0:
  - Plugin hot-reloading
  - Plugin unregistration
  - UI Bridge subsystem
  - Advanced error recovery
</Callout>

## See Also

- [Getting Started](/v1.0/getting-started)
- [Plugin Guide](/v1.0/guides/plugins)
