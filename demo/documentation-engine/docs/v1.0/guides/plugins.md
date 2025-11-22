---
title: Plugin Guide (v1.0)
description: Learn how to create plugins in Skeleton Crew v1.0
path: /v1.0/guides/plugins
order: 1
---

# Plugin Development Guide (v1.0)

> **Note:** You are viewing documentation for version 1.0. [View latest version](/guides/plugins) for updated features.

Plugins are the primary way to extend Skeleton Crew functionality.

## Plugin Structure

A basic plugin has this structure:

```typescript
export const myPlugin = {
  name: 'plugin-name',
  version: '1.0.0',
  setup(context) {
    // Plugin initialization code
  }
};
```

## Plugin Lifecycle

1. **Registration**: Plugin is registered with the runtime
2. **Setup**: The `setup` function is called during initialization
3. **Runtime**: Plugin interacts with the runtime via context

## Using the Context

The context provides access to runtime subsystems:

### Registering Screens

```typescript
setup(context) {
  context.screens.registerScreen({
    id: 'my-screen',
    title: 'My Screen',
    component: MyComponent
  });
}
```

### Registering Actions

```typescript
setup(context) {
  context.actions.registerAction({
    id: 'my-action',
    handler: async (params) => {
      // Action logic
      return result;
    }
  });
}
```

### Listening to Events

```typescript
setup(context) {
  context.events.on('event-name', (data) => {
    // Handle event
  });
}
```

### Emitting Events

```typescript
setup(context) {
  context.events.emit('custom-event', { 
    message: 'Hello from plugin' 
  });
}
```

## Example Plugin

Here's a complete example of a counter plugin:

```typescript
export const counterPlugin = {
  name: 'counter',
  version: '1.0.0',
  setup(context) {
    let count = 0;
    
    // Register screen
    context.screens.registerScreen({
      id: 'counter',
      title: 'Counter',
      component: CounterScreen,
      metadata: { count }
    });
    
    // Register increment action
    context.actions.registerAction({
      id: 'counter:increment',
      handler: async () => {
        count++;
        context.events.emit('counter:changed', { count });
        return count;
      }
    });
    
    // Register decrement action
    context.actions.registerAction({
      id: 'counter:decrement',
      handler: async () => {
        count--;
        context.events.emit('counter:changed', { count });
        return count;
      }
    });
  }
};
```

## Best Practices

1. **Use descriptive names**: Choose clear plugin and action names
2. **Handle errors**: Wrap action handlers in try-catch blocks
3. **Document your plugin**: Include JSDoc comments
4. **Emit events**: Let other plugins know about state changes
5. **Keep it simple**: Each plugin should have a single responsibility

<Callout type="warning">
  In v1.0, plugins cannot be unregistered after initialization.
</Callout>

## Next Steps

- Explore the [Runtime API](/v1.0/api/runtime)
- Learn about [Screens and Actions](/v1.0/getting-started)
