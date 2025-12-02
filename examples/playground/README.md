# Playground - Complete Interactive App

**See all Skeleton Crew features working together in a real application.**

## The Problem

You've learned individual features (plugins, actions, events, screens). But how do they work together in a real application?

**Traditional learning**:
- Read documentation (abstract concepts)
- Study isolated examples (missing context)
- Guess how to integrate (trial and error)
- **Result**: Hours of confusion before building anything useful

## The Solution

An interactive terminal app demonstrating all features integrated:

- **3 plugins** working together (core-demo, counter, settings)
- **3 screens** with navigation (Home, Counter, Settings)
- **6 actions** triggered by user input
- **Real-time events** logged as they happen
- **~300 lines** total (vs 1000+ traditional)

**Run it in 10 seconds, understand integration in 5 minutes.**

## Quick Start

```bash
# Build first
npm run build
npm run build:examples

# Run playground
npm run example
```

**What you'll see**:
- Interactive terminal UI
- Screen navigation menu
- Action execution (increment, decrement, toggle theme)
- Real-time event logging
- Plugin-driven architecture in action

## What You'll Learn

### 1. Plugin Composition
How multiple plugins work together without knowing about each other:

```typescript
// Each plugin is independent
runtime.registerPlugin(coreDemoPlugin);   // Home screen
runtime.registerPlugin(counterPlugin);    // Counter feature
runtime.registerPlugin(settingsPlugin);   // Settings feature

await runtime.initialize();  // All plugins set up
```

**Key Insight**: Plugins don't import each other. They communicate through events.

### 2. Screen Navigation
How screens are registered and rendered by UI providers:

```typescript
// Plugin registers screen
context.screens.registerScreen({
  id: 'counter',
  title: 'Counter',
  component: 'CounterScreen'
});

// UI provider renders it
const screen = context.screens.getScreen('counter');
renderScreen(screen);  // UI-specific rendering
```

**Key Insight**: Screens are data. UI providers decide how to render them.

### 3. Action Execution
How actions encapsulate business logic:

```typescript
// Plugin registers action
context.actions.registerAction({
  id: 'increment',
  handler: () => {
    count++;
    context.events.emit('counter:changed', { value: count });
    return count;
  }
});

// UI calls action
const newCount = await context.actions.runAction('increment');
```

**Key Insight**: Actions are called from UI, but logic lives in plugins.

### 4. Event-Driven Updates
How plugins react to changes without tight coupling:

```typescript
// Counter plugin emits event
context.events.emit('counter:changed', { value: count });

// UI listens to event (doesn't know about counter plugin)
context.events.on('counter:changed', (data) => {
  console.log(`Counter changed to ${data.value}`);
  updateDisplay();
});
```

**Key Insight**: Events decouple plugins. Add features by listening, not modifying.

### 5. UI Provider Pattern
How UI is swappable without changing plugins:

```typescript
// Terminal UI provider
class TerminalUIProvider implements UIProvider {
  mount(target, context) {
    // Render in terminal
  }
}

// Could swap for React UI provider
class ReactUIProvider implements UIProvider {
  mount(target, context) {
    // Render in React
  }
}
```

**Key Insight**: Same plugins work with any UI provider.

## Architecture

```
examples/playground/
├── index.ts                      # Runtime initialization (30 lines)
├── plugins/
│   ├── core-demo.ts             # Home screen plugin (60 lines)
│   ├── counter.ts               # Counter feature (80 lines)
│   └── settings.ts              # Settings feature (70 lines)
└── ui/
    └── terminal-ui-provider.ts  # Terminal UI (160 lines)
```

**Total**: ~300 lines for complete interactive app

## Code Walkthrough

### 1. Runtime Initialization (index.ts)

```typescript
import { Runtime } from '../../src/index.js';
import { coreDemoPlugin } from './plugins/core-demo.js';
import { counterPlugin } from './plugins/counter.js';
import { settingsPlugin } from './plugins/settings.js';
import { terminalUIProvider } from './ui/terminal-ui-provider.js';

// Create runtime
const runtime = new Runtime();

// Register plugins (before initialization)
runtime.registerPlugin(coreDemoPlugin);
runtime.registerPlugin(counterPlugin);
runtime.registerPlugin(settingsPlugin);

// Initialize (calls plugin setup methods)
await runtime.initialize();

// Connect UI provider
runtime.setUIProvider(terminalUIProvider);

// Mount UI (start interaction)
await terminalUIProvider.mount(null, runtime.getContext());
```

**Pattern**: Create → Register → Initialize → Connect UI → Mount

### 2. Plugin Structure (counter.ts)

```typescript
export const counterPlugin: PluginDefinition = {
  name: 'counter',
  version: '1.0.0',
  
  setup(context: RuntimeContext) {
    let count = 0;
    
    // Register screen
    context.screens.registerScreen({
      id: 'counter',
      title: 'Counter',
      component: 'CounterScreen'
    });
    
    // Register actions
    context.actions.registerAction({
      id: 'increment',
      handler: () => {
        count++;
        context.events.emit('counter:changed', { value: count });
        return count;
      }
    });
    
    context.actions.registerAction({
      id: 'decrement',
      handler: () => {
        count--;
        context.events.emit('counter:changed', { value: count });
        return count;
      }
    });
    
    context.actions.registerAction({
      id: 'reset',
      handler: () => {
        count = 0;
        context.events.emit('counter:changed', { value: count });
        return count;
      }
    });
    
    // Expose getter for UI
    context.actions.registerAction({
      id: 'get-count',
      handler: () => count
    });
  }
};
```

**Pattern**: State → Screens → Actions → Events

### 3. UI Provider (terminal-ui-provider.ts)

```typescript
export const terminalUIProvider: UIProvider = {
  async mount(target: unknown, context: RuntimeContext) {
    // Show screen menu
    const screens = context.screens.getAllScreens();
    screens.forEach((screen, index) => {
      console.log(`${index + 1}. ${screen.title}`);
    });
    
    // Handle user input
    process.stdin.on('data', async (data) => {
      const input = data.toString().trim();
      
      if (input === '1') {
        renderScreen(context.screens.getScreen('home'));
      } else if (input === '2') {
        renderScreen(context.screens.getScreen('counter'));
      } else if (input === 'i') {
        await context.actions.runAction('increment');
      }
      // ... more input handling
    });
  },
  
  renderScreen(screen: ScreenDefinition) {
    console.log(`\n=== ${screen.title} ===\n`);
    // Render based on screen.component
  },
  
  async unmount() {
    process.stdin.removeAllListeners();
  }
};
```

**Pattern**: Menu → Input → Actions → Render

## Try It Out

### 1. Run the playground

```bash
npm run example
```

### 2. Navigate screens

```
1. Home
2. Counter
3. Settings
0. Exit

Select: 2
```

### 3. Execute actions

```
=== Counter ===

Current count: 0

Actions:
  i - Increment
  d - Decrement
  r - Reset
  b - Back to menu

Action: i
```

### 4. Watch events

```
[EVENT] counter:changed { value: 1 }
```

### 5. Explore code

Open `examples/playground/` and read:
- `index.ts` - See initialization
- `plugins/counter.ts` - See plugin structure
- `ui/terminal-ui-provider.ts` - See UI rendering

## Key Takeaways

### 1. Plugins Are Independent
Each plugin registers its own screens, actions, and events. No imports between plugins.

### 2. Events Enable Communication
Plugins emit events, other plugins listen. No direct dependencies.

### 3. UI Is Swappable
Same plugins work with terminal UI, React UI, or any UI provider.

### 4. Actions Encapsulate Logic
Business logic in actions, UI just calls them. Easy to test.

### 5. Context Is the API
RuntimeContext provides access to everything. One API surface.

## What's Next?

### 1. Modify the playground

Try adding a new plugin:

```typescript
// examples/playground/plugins/todo.ts
export const todoPlugin: PluginDefinition = {
  name: 'todo',
  version: '1.0.0',
  setup(ctx) {
    let todos = [];
    
    ctx.screens.registerScreen({
      id: 'todos',
      title: 'Todo List',
      component: 'TodoScreen'
    });
    
    ctx.actions.registerAction({
      id: 'add-todo',
      handler: (params: { text: string }) => {
        todos.push(params.text);
        ctx.events.emit('todo:added', { text: params.text });
        return todos.length;
      }
    });
  }
};
```

Register it in `index.ts`:
```typescript
import { todoPlugin } from './plugins/todo.js';
runtime.registerPlugin(todoPlugin);
```

### 2. Build your own app

Use the playground as a template:
- Copy the structure
- Replace plugins with your features
- Keep the same patterns

### 3. Try the tutorial

Build a task manager from scratch:

```bash
npm run tutorial:01
```

[Go to tutorial →](../tutorial/)

### 4. Explore demos

See real-world problem-solving:

[Go to demos →](../../demo/)

## Comparison: Traditional vs Playground

### Traditional Approach (1000+ lines)

**Manual integration**:
- Set up readline interface (50+ lines)
- Implement screen navigation (100+ lines)
- Wire up action handlers (150+ lines)
- Manage state manually (100+ lines)
- Handle events manually (100+ lines)
- Implement UI rendering (200+ lines)
- Connect everything together (300+ lines)

**Result**: Tightly coupled, hard to test, difficult to extend.

### Playground Approach (300 lines)

**Plugin-driven**:
- Runtime handles initialization (0 lines you write)
- Plugins register screens (1 line per screen)
- Plugins register actions (5 lines per action)
- Events handled by runtime (0 lines you write)
- UI provider implements interface (160 lines, reusable)

**Result**: Loosely coupled, easy to test, simple to extend.

## Real-World Use Cases

This architecture works for:

- **Internal tools**: Admin panels, dashboards, dev tools
- **CLI applications**: Task runners, deployment tools, monitoring
- **Terminal UIs**: Interactive command-line apps
- **Prototypes**: Validate ideas quickly
- **Learning**: Understand plugin architectures

## Documentation

- **[Examples Overview](../README.md)** - All examples
- **[Basics](../basics/README.md)** - Focused feature demos
- **[Tutorial](../tutorial/README.md)** - Step-by-step learning
- **[Main README](../../README.md)** - Skeleton Crew Runtime
- **[API Reference](../../docs/api/API.md)** - Complete API

## Testing

The playground includes tests:

```bash
npm test
```

Tests demonstrate:
- Plugin registration and initialization
- Action execution
- Event emission and subscription
- Screen registration and retrieval

See `tests/example/` for test examples.

---

**Run `npm run example` to see everything working together. Then explore the code to understand how it's built.**
