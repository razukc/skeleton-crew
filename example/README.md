# Skeleton Crew Playground

A minimal, plugin-driven example application that demonstrates all core capabilities of the Skeleton Crew Runtime.

## Overview

The Skeleton Crew Playground is an interactive terminal-based application that showcases:

- **Plugin-driven architecture** - All features are contributed through plugins
- **Screen registration and navigation** - Multiple screens with dynamic content
- **Action execution** - User-triggered operations that modify state
- **Event-driven communication** - Plugins communicate through events
- **UI-agnostic design** - Terminal UI can be swapped for React, Vue, or any other framework

## Quick Start

Run the example application:

```bash
npm run example
```

This will start the interactive terminal interface where you can:
1. Navigate between screens (Home, Counter, Settings)
2. Execute actions (increment/decrement counter, toggle theme)
3. Observe events in real-time

## Architecture

### Application Structure

```
example/
├── index.ts                      # Main entry point
├── ui/
│   └── terminal-ui-provider.ts   # Terminal UI implementation
└── plugins/
    ├── core-demo.ts              # Home screen plugin
    ├── counter.ts                # Counter feature plugin
    └── settings.ts               # Settings feature plugin
```

### Initialization Flow

The application follows a strict initialization sequence:

1. **Create Runtime** - Instantiate the Skeleton Crew Runtime
2. **Register Plugins** - Add all plugins before initialization
3. **Initialize Runtime** - Execute plugin setup callbacks
4. **Register UI Provider** - Connect the terminal UI
5. **Mount UI** - Start user interaction

```typescript
const runtime = new Runtime();
runtime.registerPlugin(coreDemoPlugin);
runtime.registerPlugin(counterPlugin);
runtime.registerPlugin(settingsPlugin);
await runtime.initialize();
runtime.setUIProvider(terminalUIProvider);
await terminalUIProvider.mount(null, runtime.getContext());
```

## Plugins

### Core Demo Plugin

**Purpose**: Provides the home/welcome screen and demonstrates basic plugin structure.

**Features**:
- Registers the home screen
- Subscribes to `runtime:initialized` event
- Displays application overview

**File**: `example/plugins/core-demo.ts`

### Counter Plugin

**Purpose**: Demonstrates state management, actions, and event emission.

**Features**:
- Manages counter state (starts at 0)
- Provides three actions:
  - `increment` - Increases count by 1
  - `decrement` - Decreases count by 1
  - `reset` - Sets count to 0
- Emits `counter:changed` event on state changes

**File**: `example/plugins/counter.ts`

**State**:
```typescript
let count = 0;
```

**Events**:
- `counter:changed` - Emitted with `{ value: number }` when count changes

### Settings Plugin

**Purpose**: Demonstrates configuration management with theme toggle.

**Features**:
- Manages theme setting (light/dark)
- Provides `toggle-theme` action
- Emits `settings:changed` event on changes

**File**: `example/plugins/settings.ts`

**State**:
```typescript
let theme: 'light' | 'dark' = 'light';
```

**Events**:
- `settings:changed` - Emitted with `{ setting: string, value: unknown }` when settings change

## Terminal UI Provider

The Terminal UI Provider implements the `UIProvider` interface to render screens in a terminal environment.

**File**: `example/ui/terminal-ui-provider.ts`

### Key Features

- **Screen Menu** - Lists all registered screens
- **Screen Rendering** - Displays screen content with formatted headers
- **Action Menu** - Shows available actions for each screen
- **Event Logging** - Displays recent events in real-time
- **User Input Handling** - Processes commands and triggers actions

### UI Methods

```typescript
interface UIProvider {
  mount(target: unknown, context: RuntimeContext): Promise<void>;
  renderScreen(screen: ScreenDefinition): void;
  unmount(): Promise<void>;
}
```

### Navigation Commands

- **Number (1-3)** - Select a screen from the menu
- **0** - Exit the application
- **b** - Back to screen menu
- **x** - Exit the application

### Action Commands

**Counter Screen**:
- **i** - Increment counter
- **d** - Decrement counter
- **r** - Reset counter

**Settings Screen**:
- **t** - Toggle theme

## Creating Your Own Plugin

Plugins follow a standard structure with three main components:

### 1. Plugin Definition

```typescript
import { PluginDefinition, RuntimeContext } from '../src/types.js';

export const myPlugin: PluginDefinition = {
  name: 'my-plugin',
  version: '1.0.0',
  
  setup(context: RuntimeContext): void {
    // Plugin initialization code
  },
  
  dispose(): void {
    // Cleanup code (optional)
  }
};
```

### 2. Register Screens

Screens are declarative UI definitions that can be rendered by any UI provider:

```typescript
context.screens.registerScreen({
  id: 'my-screen',
  title: 'My Screen Title',
  component: 'MyScreenComponent'
});
```

### 3. Register Actions

Actions are executable operations with handlers:

```typescript
context.actions.registerAction({
  id: 'my-action',
  handler: (params) => {
    // Action logic
    return result;
  }
});
```

### 4. Emit and Subscribe to Events

Events enable cross-plugin communication:

```typescript
// Emit an event
context.events.emit('my-event', { data: 'value' });

// Subscribe to an event
context.events.on('other-event', (data) => {
  console.log('Event received:', data);
});
```

## Extending the Example

### Adding a New Plugin

1. Create a new file in `example/plugins/`:

```typescript
// example/plugins/todo.ts
import { PluginDefinition, RuntimeContext } from '../../src/types.js';

let todos: string[] = [];

export const todoPlugin: PluginDefinition = {
  name: 'todo',
  version: '1.0.0',
  
  setup(context: RuntimeContext): void {
    // Register screen
    context.screens.registerScreen({
      id: 'todos',
      title: 'Todo List',
      component: 'TodoScreen'
    });
    
    // Register actions
    context.actions.registerAction({
      id: 'add-todo',
      handler: (params: { text: string }) => {
        todos.push(params.text);
        context.events.emit('todo:added', { text: params.text });
        return todos.length;
      }
    });
  },
  
  dispose(): void {
    todos = [];
  }
};

export function getTodos(): string[] {
  return todos;
}
```

2. Register the plugin in `example/index.ts`:

```typescript
import { todoPlugin } from './plugins/todo.js';

runtime.registerPlugin(todoPlugin);
```

3. Add screen rendering logic in `terminal-ui-provider.ts`:

```typescript
case 'TodoScreen':
  this.renderTodoScreen();
  break;

// ...

private renderTodoScreen(): void {
  const todos = getTodos();
  console.log('Your Todos:');
  todos.forEach((todo, index) => {
    console.log(`  ${index + 1}. ${todo}`);
  });
  console.log('');
}
```

### Creating a Different UI Provider

The runtime is UI-agnostic. You can create a React, Vue, or web-based UI provider:

```typescript
// example/ui/react-ui-provider.tsx
import { UIProvider, ScreenDefinition, RuntimeContext } from '../../src/types.js';

export class ReactUIProvider implements UIProvider {
  async mount(target: HTMLElement, context: RuntimeContext): Promise<void> {
    // Initialize React app
    // Render screen menu
  }
  
  renderScreen(screen: ScreenDefinition): void {
    // Render React components based on screen.component
  }
  
  async unmount(): Promise<void> {
    // Cleanup React app
  }
}
```

## Key Concepts

### Plugin-First Architecture

All functionality is contributed through plugins. The runtime provides primitives (screens, actions, events), and plugins compose them into features.

### UI-Agnostic Core

The runtime has no UI dependencies. UI providers implement the `UIProvider` interface and can use any rendering technology (terminal, React, Vue, CLI, etc.).

### Event-Driven Communication

Plugins communicate through events, enabling loose coupling. Plugins don't need to know about each other - they just emit and subscribe to events.

### RuntimeContext API

Plugins interact with the runtime through the `RuntimeContext` API, which provides access to all subsystems:

```typescript
interface RuntimeContext {
  screens: ScreenRegistry;
  actions: ActionEngine;
  events: EventBus;
  plugins: PluginRegistry;
  getRuntime(): Runtime;
}
```

## Testing

The example app includes comprehensive tests:

### Unit Tests

Located in `tests/example/unit/`:
- `core-demo-plugin.test.ts` - Tests core demo plugin
- `settings-plugin.test.ts` - Tests settings plugin

### Property-Based Tests

Located in `tests/example/property/`:
- `plugin-screen-registration.property.test.ts` - Verifies all plugins register screens
- `counter-increment.property.test.ts` - Tests increment behavior across random values
- `counter-decrement.property.test.ts` - Tests decrement behavior across random values
- `counter-change-events.property.test.ts` - Verifies events are emitted on changes
- `theme-toggle-idempotence.property.test.ts` - Tests toggle twice returns to original

Run tests:

```bash
npm test
```

## Troubleshooting

### Application Won't Start

- Ensure dependencies are installed: `npm install`
- Build the runtime: `npm run build`
- Check that all plugins are registered before `runtime.initialize()`

### Actions Not Working

- Verify action IDs match between registration and execution
- Check that actions are registered in plugin `setup()` method
- Ensure runtime is initialized before executing actions

### Events Not Firing

- Confirm event subscriptions happen in plugin `setup()` method
- Verify event names match exactly (case-sensitive)
- Check that events are emitted after state changes

## Next Steps

- Explore the plugin code to understand the patterns
- Modify existing plugins to add new features
- Create your own plugin following the examples
- Experiment with different UI providers (React, Vue, etc.)
- Build a real application using Skeleton Crew Runtime

## Resources

- [Skeleton Crew Runtime Documentation](../README.md)
- [Plugin API Reference](../src/types.ts)
- [Testing Guide](../tests/README.md)

---

**Happy Building! 🚀**
