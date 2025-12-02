---
title: Plugin Development
description: Learn how to create custom plugins for Documentation Engine
path: /guides/plugins
order: 1
---

# Plugin Development Guide

Plugins are the heart of the Documentation Engine. This guide will teach you how to create powerful, reusable plugins.

## Plugin Architecture

Every plugin follows the same structure:

```typescript
import { PluginDefinition, RuntimeContext } from 'skeleton-crew-runtime';

export const myPlugin: PluginDefinition = {
  name: 'my-plugin',
  version: '1.0.0',
  setup(context: RuntimeContext) {
    // Plugin initialization code
  }
};
```

## Plugin Lifecycle

Plugins are initialized in a specific order:

1. **Registration**: Plugin is registered with the runtime
2. **Setup**: The `setup()` function is called with RuntimeContext
3. **Initialization**: Plugin can register screens, actions, and event listeners
4. **Runtime**: Plugin responds to events and executes actions

<Callout type="info" title="Initialization Order">
Plugins are initialized in the order they are registered. Make sure to register dependencies first!
</Callout>

## RuntimeContext API

The RuntimeContext provides access to all runtime subsystems:

```typescript
interface RuntimeContext {
  screens: ScreenRegistry;    // Register and retrieve screens
  actions: ActionEngine;      // Register and execute actions
  events: EventBus;          // Publish and subscribe to events
  plugins: PluginRegistry;   // Access plugin information
}
```

## Creating a Simple Plugin

Let's create a counter plugin:

```typescript
export const counterPlugin: PluginDefinition = {
  name: 'counter',
  version: '1.0.0',
  setup(context: RuntimeContext) {
    let count = 0;

    // Register a screen
    context.screens.registerScreen({
      id: 'counter',
      title: 'Counter',
      component: 'CounterScreen',
      metadata: { count }
    });

    // Register increment action
    context.actions.registerAction({
      id: 'counter:increment',
      handler: () => {
        count++;
        context.events.emit('counter:changed', { count });
        return { count };
      }
    });

    // Register decrement action
    context.actions.registerAction({
      id: 'counter:decrement',
      handler: () => {
        count--;
        context.events.emit('counter:changed', { count });
        return { count };
      }
    });

    // Listen to reset events
    context.events.on('counter:reset', () => {
      count = 0;
      context.events.emit('counter:changed', { count });
    });
  }
};
```

## Registering Screens

Screens represent pages or views in your application:

```typescript
context.screens.registerScreen({
  id: 'my-screen',           // Unique identifier
  title: 'My Screen',        // Display title
  component: 'MyComponent',  // Component name
  metadata: {                // Custom metadata
    description: 'A custom screen',
    tags: ['example', 'demo']
  }
});
```

## Registering Actions

Actions are executable operations:

```typescript
context.actions.registerAction({
  id: 'my-plugin:do-something',
  handler: async (params) => {
    // Perform action logic
    const result = await doSomething(params);
    
    // Emit event to notify other plugins
    context.events.emit('my-plugin:completed', { result });
    
    // Return result
    return result;
  }
});
```

<Callout type="warning" title="Action Naming">
Use namespaced action IDs (e.g., `plugin-name:action-name`) to avoid conflicts with other plugins.
</Callout>

## Event-Driven Communication

Plugins communicate through events:

```typescript
// Emit an event
context.events.emit('user:logged-in', { 
  userId: 123, 
  username: 'alice' 
});

// Listen to events
context.events.on('user:logged-in', (data) => {
  console.log(`User ${data.username} logged in`);
});

// Listen once
context.events.once('app:initialized', () => {
  console.log('App is ready!');
});

// Remove listener
const handler = (data) => console.log(data);
context.events.on('some:event', handler);
context.events.off('some:event', handler);
```

## Real-World Example: Theme Plugin

Here's a complete theme plugin implementation:

```typescript
export const themePlugin: PluginDefinition = {
  name: 'theme',
  version: '1.0.0',
  setup(context: RuntimeContext) {
    // Load theme from localStorage or default to 'light'
    let currentTheme = localStorage.getItem('theme') || 'light';

    // Apply theme to document
    const applyTheme = (theme: string) => {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('theme', theme);
    };

    // Initialize theme
    applyTheme(currentTheme);

    // Register toggle action
    context.actions.registerAction({
      id: 'theme:toggle',
      handler: () => {
        currentTheme = currentTheme === 'light' ? 'dark' : 'light';
        applyTheme(currentTheme);
        context.events.emit('theme:changed', { theme: currentTheme });
        return { theme: currentTheme };
      }
    });

    // Register set action
    context.actions.registerAction({
      id: 'theme:set',
      handler: ({ theme }) => {
        currentTheme = theme;
        applyTheme(theme);
        context.events.emit('theme:changed', { theme });
        return { theme };
      }
    });

    // Emit initial theme
    context.events.emit('theme:changed', { theme: currentTheme });
  }
};
```

## Plugin Best Practices

### 1. Use Namespaced IDs

Always prefix your action and event IDs with your plugin name:

```typescript
// Good
context.actions.registerAction({ id: 'my-plugin:action' });
context.events.emit('my-plugin:event');

// Bad
context.actions.registerAction({ id: 'action' });
context.events.emit('event');
```

### 2. Clean Up Resources

If your plugin creates resources, clean them up:

```typescript
setup(context: RuntimeContext) {
  const interval = setInterval(() => {
    // Do something periodically
  }, 1000);

  // Clean up on disposal (if supported)
  return () => {
    clearInterval(interval);
  };
}
```

### 3. Handle Errors Gracefully

Don't let errors crash the entire application:

```typescript
context.actions.registerAction({
  id: 'my-plugin:risky-action',
  handler: async (params) => {
    try {
      return await riskyOperation(params);
    } catch (error) {
      context.events.emit('my-plugin:error', { error });
      return { error: error.message };
    }
  }
});
```

### 4. Document Your Plugin

Provide clear documentation for your plugin's API:

```typescript
/**
 * Search Plugin
 * 
 * Provides full-text search across all documentation pages.
 * 
 * Actions:
 * - search:query({ term: string }): SearchResult[]
 * 
 * Events:
 * - search:results: Emitted when search completes
 * - search:indexed: Emitted when a page is indexed
 */
export const searchPlugin: PluginDefinition = {
  // ...
};
```

## Testing Plugins

Test your plugins in isolation:

```typescript
import { describe, it, expect } from 'vitest';
import { Runtime } from 'skeleton-crew-runtime';
import { counterPlugin } from './counter';

describe('Counter Plugin', () => {
  it('should increment counter', async () => {
    const runtime = new Runtime();
    runtime.registerPlugin(counterPlugin);
    await runtime.initialize();

    const result = await runtime.actions.execute('counter:increment');
    expect(result.count).toBe(1);
  });

  it('should emit change events', async () => {
    const runtime = new Runtime();
    runtime.registerPlugin(counterPlugin);
    await runtime.initialize();

    let eventData;
    runtime.events.on('counter:changed', (data) => {
      eventData = data;
    });

    await runtime.actions.execute('counter:increment');
    expect(eventData.count).toBe(1);
  });
});
```

## Advanced Topics

### Plugin Dependencies

If your plugin depends on another plugin:

```typescript
setup(context: RuntimeContext) {
  // Check if dependency is registered
  const hasTheme = context.plugins.getPlugin('theme');
  if (!hasTheme) {
    throw new Error('Theme plugin is required');
  }

  // Use dependency
  context.events.on('theme:changed', (data) => {
    // React to theme changes
  });
}
```

### Async Initialization

If your plugin needs async setup:

```typescript
setup(context: RuntimeContext) {
  // Perform async initialization
  (async () => {
    const data = await fetchInitialData();
    context.events.emit('my-plugin:ready', { data });
  })();
}
```

### Dynamic Screen Registration

Register screens dynamically based on data:

```typescript
setup(context: RuntimeContext) {
  context.events.on('data:loaded', ({ items }) => {
    items.forEach(item => {
      context.screens.registerScreen({
        id: `item-${item.id}`,
        title: item.title,
        component: 'ItemScreen',
        metadata: { item }
      });
    });
  });
}
```

<Callout type="info" title="Next Steps">
Now that you understand plugins, check out the [API Reference](/api/runtime) for detailed documentation of all available APIs.
</Callout>
