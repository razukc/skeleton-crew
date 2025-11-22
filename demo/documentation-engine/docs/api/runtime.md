---
title: Runtime API Reference
description: Complete API documentation for Skeleton Crew Runtime
path: /api/runtime
order: 1
---

# Runtime API Reference

Complete reference documentation for the Skeleton Crew Runtime and all its subsystems.

## Runtime

The main orchestrator that initializes and coordinates all subsystems.

### Constructor

```typescript
const runtime = new Runtime(options?: RuntimeOptions);
```

**Options:**

```typescript
interface RuntimeOptions {
  logger?: Logger;           // Custom logger implementation
  environment?: Environment; // Environment configuration
}
```

### Methods

#### `registerPlugin(plugin: PluginDefinition): void`

Registers a plugin with the runtime.

```typescript
runtime.registerPlugin({
  name: 'my-plugin',
  version: '1.0.0',
  setup(context) {
    // Plugin setup
  }
});
```

**Throws:** Error if plugin with same name is already registered.

#### `initialize(): Promise<void>`

Initializes the runtime and all registered plugins.

```typescript
await runtime.initialize();
```

**Throws:** Error if already initialized or if plugin setup fails.

#### `dispose(): Promise<void>`

Disposes the runtime and cleans up resources.

```typescript
await runtime.dispose();
```

### Properties

```typescript
runtime.screens: ScreenRegistry;  // Access screen registry
runtime.actions: ActionEngine;    // Access action engine
runtime.events: EventBus;         // Access event bus
runtime.plugins: PluginRegistry;  // Access plugin registry
```

## RuntimeContext

Unified API provided to plugins during setup.

```typescript
interface RuntimeContext {
  screens: ScreenRegistry;
  actions: ActionEngine;
  events: EventBus;
  plugins: PluginRegistry;
}
```

## ScreenRegistry

Manages screen definitions.

### Methods

#### `registerScreen(screen: ScreenDefinition): void`

Registers a new screen.

```typescript
context.screens.registerScreen({
  id: 'home',
  title: 'Home Page',
  component: 'HomePage',
  metadata: {
    description: 'Welcome page',
    icon: '🏠'
  }
});
```

**Parameters:**

```typescript
interface ScreenDefinition {
  id: string;                    // Unique identifier
  title: string;                 // Display title
  component: string | Component; // Component reference
  metadata?: Record<string, any>; // Custom metadata
}
```

**Throws:** Error if screen with same ID already exists.

#### `getScreen(id: string): ScreenDefinition | undefined`

Retrieves a screen by ID.

```typescript
const screen = context.screens.getScreen('home');
if (screen) {
  console.log(screen.title);
}
```

#### `getAllScreens(): ScreenDefinition[]`

Returns all registered screens.

```typescript
const screens = context.screens.getAllScreens();
console.log(`Total screens: ${screens.length}`);
```

#### `hasScreen(id: string): boolean`

Checks if a screen exists.

```typescript
if (context.screens.hasScreen('home')) {
  // Screen exists
}
```

## ActionEngine

Manages and executes actions.

### Methods

#### `registerAction(action: ActionDefinition): void`

Registers a new action.

```typescript
context.actions.registerAction({
  id: 'user:login',
  handler: async ({ username, password }) => {
    const user = await authenticate(username, password);
    return { user };
  }
});
```

**Parameters:**

```typescript
interface ActionDefinition {
  id: string;                           // Unique identifier
  handler: (params: any) => any | Promise<any>; // Action handler
}
```

**Throws:** Error if action with same ID already exists.

#### `execute(id: string, params?: any): Promise<any>`

Executes an action by ID.

```typescript
const result = await context.actions.execute('user:login', {
  username: 'alice',
  password: 'secret123'
});

console.log(result.user);
```

**Throws:** Error if action doesn't exist or handler throws.

#### `hasAction(id: string): boolean`

Checks if an action exists.

```typescript
if (context.actions.hasAction('user:login')) {
  // Action exists
}
```

#### `getAllActions(): string[]`

Returns all registered action IDs.

```typescript
const actions = context.actions.getAllActions();
console.log('Available actions:', actions);
```

## EventBus

Pub/sub event system for cross-plugin communication.

### Methods

#### `emit(type: string, data?: any): void`

Emits an event to all listeners.

```typescript
context.events.emit('user:logged-in', {
  userId: 123,
  username: 'alice',
  timestamp: Date.now()
});
```

#### `on(type: string, handler: EventHandler): void`

Registers an event listener.

```typescript
context.events.on('user:logged-in', (data) => {
  console.log(`Welcome, ${data.username}!`);
});
```

**Handler Signature:**

```typescript
type EventHandler = (data: any) => void;
```

#### `once(type: string, handler: EventHandler): void`

Registers a one-time event listener.

```typescript
context.events.once('app:initialized', () => {
  console.log('App is ready!');
});
```

#### `off(type: string, handler: EventHandler): void`

Removes an event listener.

```typescript
const handler = (data) => console.log(data);
context.events.on('some:event', handler);
// Later...
context.events.off('some:event', handler);
```

#### `removeAllListeners(type?: string): void`

Removes all listeners for an event type, or all listeners if no type specified.

```typescript
// Remove all listeners for specific event
context.events.removeAllListeners('user:logged-in');

// Remove all listeners for all events
context.events.removeAllListeners();
```

## PluginRegistry

Manages plugin registration and lifecycle.

### Methods

#### `getPlugin(name: string): PluginDefinition | undefined`

Retrieves a plugin by name.

```typescript
const plugin = context.plugins.getPlugin('theme');
if (plugin) {
  console.log(`Version: ${plugin.version}`);
}
```

#### `getAllPlugins(): PluginDefinition[]`

Returns all registered plugins.

```typescript
const plugins = context.plugins.getAllPlugins();
plugins.forEach(p => {
  console.log(`${p.name} v${p.version}`);
});
```

#### `hasPlugin(name: string): boolean`

Checks if a plugin is registered.

```typescript
if (context.plugins.hasPlugin('theme')) {
  // Theme plugin is available
}
```

## Type Definitions

### PluginDefinition

```typescript
interface PluginDefinition {
  name: string;                          // Plugin name
  version: string;                       // Semantic version
  setup: (context: RuntimeContext) => void | Promise<void>; // Setup function
}
```

### Logger

```typescript
interface Logger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}
```

### Environment

```typescript
interface Environment {
  mode: 'development' | 'production' | 'test';
  [key: string]: any;
}
```

## Common Patterns

### Action with Validation

```typescript
context.actions.registerAction({
  id: 'user:update',
  handler: async (params) => {
    // Validate input
    if (!params.userId) {
      throw new Error('userId is required');
    }

    // Perform action
    const user = await updateUser(params);

    // Emit event
    context.events.emit('user:updated', { user });

    return { user };
  }
});
```

### Event-Driven State Sync

```typescript
let state = { count: 0 };

// Listen to state changes from other plugins
context.events.on('state:updated', (newState) => {
  state = { ...state, ...newState };
});

// Emit state changes
context.actions.registerAction({
  id: 'state:increment',
  handler: () => {
    state.count++;
    context.events.emit('state:updated', { count: state.count });
    return state;
  }
});
```

### Async Plugin Initialization

```typescript
export const dataPlugin: PluginDefinition = {
  name: 'data',
  version: '1.0.0',
  setup(context: RuntimeContext) {
    // Start async initialization
    (async () => {
      try {
        const data = await fetchData();
        
        // Register screens based on data
        data.items.forEach(item => {
          context.screens.registerScreen({
            id: `item-${item.id}`,
            title: item.title,
            component: 'ItemScreen',
            metadata: { item }
          });
        });

        context.events.emit('data:ready', { data });
      } catch (error) {
        context.events.emit('data:error', { error });
      }
    })();
  }
};
```

### Cross-Plugin Communication

```typescript
// Plugin A: Emits events
export const pluginA: PluginDefinition = {
  name: 'plugin-a',
  version: '1.0.0',
  setup(context) {
    context.actions.registerAction({
      id: 'plugin-a:do-something',
      handler: () => {
        const result = performOperation();
        context.events.emit('plugin-a:completed', { result });
        return result;
      }
    });
  }
};

// Plugin B: Listens to events
export const pluginB: PluginDefinition = {
  name: 'plugin-b',
  version: '1.0.0',
  setup(context) {
    context.events.on('plugin-a:completed', (data) => {
      console.log('Plugin A completed:', data.result);
      // React to Plugin A's completion
    });
  }
};
```

## Error Handling

### Action Errors

```typescript
try {
  const result = await context.actions.execute('risky:action', params);
} catch (error) {
  console.error('Action failed:', error.message);
  // Handle error
}
```

### Event Handler Errors

Event handlers should handle their own errors:

```typescript
context.events.on('some:event', (data) => {
  try {
    processData(data);
  } catch (error) {
    console.error('Event handler error:', error);
    context.events.emit('error:occurred', { error });
  }
});
```

### Plugin Setup Errors

If a plugin's setup fails, the runtime initialization will fail:

```typescript
export const myPlugin: PluginDefinition = {
  name: 'my-plugin',
  version: '1.0.0',
  setup(context) {
    if (!checkRequirements()) {
      throw new Error('Requirements not met');
    }
    // Continue setup...
  }
};
```

<Callout type="warning" title="Error Propagation">
Errors thrown in action handlers will be propagated to the caller. Errors in event handlers should be caught and handled within the handler to prevent affecting other listeners.
</Callout>

## Examples

### Complete Plugin Example

```typescript
import { PluginDefinition, RuntimeContext } from 'skeleton-crew-runtime';

interface TodoItem {
  id: number;
  text: string;
  completed: boolean;
}

export const todoPlugin: PluginDefinition = {
  name: 'todo',
  version: '1.0.0',
  setup(context: RuntimeContext) {
    const todos: TodoItem[] = [];
    let nextId = 1;

    // Register screen
    context.screens.registerScreen({
      id: 'todo-list',
      title: 'Todo List',
      component: 'TodoListScreen',
      metadata: { todos }
    });

    // Add todo action
    context.actions.registerAction({
      id: 'todo:add',
      handler: ({ text }) => {
        const todo: TodoItem = {
          id: nextId++,
          text,
          completed: false
        };
        todos.push(todo);
        context.events.emit('todo:added', { todo });
        return { todo };
      }
    });

    // Toggle todo action
    context.actions.registerAction({
      id: 'todo:toggle',
      handler: ({ id }) => {
        const todo = todos.find(t => t.id === id);
        if (!todo) {
          throw new Error(`Todo ${id} not found`);
        }
        todo.completed = !todo.completed;
        context.events.emit('todo:toggled', { todo });
        return { todo };
      }
    });

    // Delete todo action
    context.actions.registerAction({
      id: 'todo:delete',
      handler: ({ id }) => {
        const index = todos.findIndex(t => t.id === id);
        if (index === -1) {
          throw new Error(`Todo ${id} not found`);
        }
        const [deleted] = todos.splice(index, 1);
        context.events.emit('todo:deleted', { todo: deleted });
        return { todo: deleted };
      }
    });

    // Get all todos action
    context.actions.registerAction({
      id: 'todo:get-all',
      handler: () => {
        return { todos: [...todos] };
      }
    });
  }
};
```

<Callout type="info" title="More Examples">
Check out the [Plugin Development Guide](/guides/plugins) for more examples and best practices.
</Callout>
