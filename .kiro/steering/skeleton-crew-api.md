---
inclusion: always
---

# Skeleton Crew Runtime API Guidelines

This steering file ensures proper usage of the Skeleton Crew Runtime API when building applications and extensions.

## Core Principles

1. **Use ESM imports with .js extensions** - All imports must include `.js` extension
2. **Follow plugin lifecycle** - Always implement setup, optionally implement dispose
3. **Use RuntimeContext for all subsystem access** - Never access subsystems directly
4. **Emit events for state changes** - Keep plugins loosely coupled via events
5. **Register actions for business logic** - UI should call actions, not implement logic

## Plugin Definition Pattern

```typescript
import { PluginDefinition, RuntimeContext } from 'skeleton-crew-runtime';

export const myPlugin: PluginDefinition = {
  name: 'my-plugin',
  version: '1.0.0',
  
  setup(context: RuntimeContext) {
    // Register screens
    context.screens.registerScreen({
      id: 'my-screen',
      title: 'My Screen',
      component: 'MyComponent'
    });
    
    // Register actions
    context.actions.registerAction({
      id: 'my-action',
      handler: async (params, ctx) => {
        // Business logic here
        return result;
      },
      timeout: 5000 // Optional timeout
    });
    
    // Subscribe to events
    context.events.on('some:event', (data) => {
      // Handle event
    });
  },
  
  dispose(context: RuntimeContext) {
    // Cleanup logic
    // Note: Event listeners are auto-unsubscribed
  }
};
```

## Action Registration Best Practices

### Type-Safe Actions

```typescript
interface MyParams {
  id: string;
  name: string;
}

interface MyResult {
  success: boolean;
  data: unknown;
}

context.actions.registerAction<MyParams, MyResult>({
  id: 'my:action',
  handler: async (params, ctx) => {
    // params is typed as MyParams
    // return type must match MyResult
    return { success: true, data: {} };
  }
});
```

### Action Naming Convention

Use namespaced action IDs: `<plugin-name>:<action-name>`

Examples:
- `tabs:query`
- `tabs:activate`
- `sessions:save`
- `storage:load`

### Action Execution

```typescript
// From within a plugin or action handler
const result = await context.actions.runAction<ParamsType, ResultType>(
  'action:id',
  params
);
```

## Event Bus Best Practices

### Event Naming Convention

Use namespaced event names: `<entity>:<action>`

Examples:
- `tab:created`
- `tab:updated`
- `session:saved`
- `storage:error`

### Emitting Events

```typescript
// Synchronous emit
context.events.emit('tab:created', { id: 123, title: 'New Tab' });

// Asynchronous emit (waits for all handlers)
await context.events.emitAsync('session:saved', { sessionId: 'abc' });
```

### Subscribing to Events

```typescript
// In plugin setup
const unsubscribe = context.events.on('tab:updated', (data) => {
  console.log('Tab updated:', data);
});

// Manual cleanup (usually not needed - auto-cleaned on dispose)
// unsubscribe();
```

### Event Handler Error Isolation

Event handlers should never throw errors that break other handlers:

```typescript
context.events.on('some:event', (data) => {
  try {
    // Your logic
  } catch (error) {
    console.error('Handler failed:', error);
    // Don't re-throw - let other handlers run
  }
});
```

## Runtime Initialization Pattern

### Background Script / Service Worker

```typescript
import { Runtime } from 'skeleton-crew-runtime';
import { plugin1 } from './plugins/plugin1.js';
import { plugin2 } from './plugins/plugin2.js';

// Create runtime instance
const runtime = new Runtime();

// Register plugins BEFORE initialization
runtime.registerPlugin(plugin1);
runtime.registerPlugin(plugin2);

// Initialize runtime (executes plugin setup callbacks)
await runtime.initialize();

// Get context for use in message handlers
const context = runtime.getContext();

// Handle messages from UI
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'action') {
    context.actions.runAction(message.action, message.params)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Async response
  }
});

// Cleanup on shutdown
chrome.runtime.onSuspend.addListener(async () => {
  await runtime.shutdown();
});
```

## Screen Registry Usage

### Registering Screens

```typescript
context.screens.registerScreen({
  id: 'home',
  title: 'Home',
  component: 'HomeComponent' // Can be string or any type
});
```

### Retrieving Screens

```typescript
const screen = context.screens.getScreen('home');
const allScreens = context.screens.getAllScreens();
```

## Error Handling Patterns

### Action Errors

```typescript
import { ActionExecutionError, ActionTimeoutError } from 'skeleton-crew-runtime';

try {
  const result = await context.actions.runAction('my:action', params);
} catch (error) {
  if (error instanceof ActionTimeoutError) {
    console.error('Action timed out:', error.actionId, error.timeoutMs);
  } else if (error instanceof ActionExecutionError) {
    console.error('Action failed:', error.actionId, error.cause);
  } else {
    console.error('Unknown error:', error);
  }
}
```

### Validation Errors

```typescript
import { ValidationError, DuplicateRegistrationError } from 'skeleton-crew-runtime';

try {
  context.screens.registerScreen(screen);
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Invalid screen:', error.resourceType, error.field);
  } else if (error instanceof DuplicateRegistrationError) {
    console.error('Duplicate screen:', error.identifier);
  }
}
```

## Browser Extension Specific Patterns

### Message Passing to Background

```typescript
// From popup/content script
async function executeAction(action: string, params?: unknown) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: 'action', action, params },
      (response) => {
        if (response.success) {
          resolve(response.result);
        } else {
          reject(new Error(response.error));
        }
      }
    );
  });
}

// Usage
const tabs = await executeAction('tabs:query');
```

### Event Broadcasting from Background

```typescript
// In background script
context.events.on('tab:created', (data) => {
  // Broadcast to all extension contexts
  chrome.runtime.sendMessage({
    type: 'event',
    event: 'tab:created',
    data
  });
});
```

### Event Listening in UI

```typescript
// In popup/content script
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'event') {
    // Update UI based on event
    handleEvent(message.event, message.data);
  }
});
```

## Testing Patterns

### Plugin Testing

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Runtime } from 'skeleton-crew-runtime';
import { myPlugin } from './my-plugin.js';

describe('MyPlugin', () => {
  let runtime: Runtime;
  
  beforeEach(async () => {
    runtime = new Runtime();
    runtime.registerPlugin(myPlugin);
    await runtime.initialize();
  });
  
  afterEach(async () => {
    await runtime.shutdown();
  });
  
  it('should register actions', () => {
    const context = runtime.getContext();
    const action = context.actions.getAction('my:action');
    expect(action).toBeDefined();
  });
  
  it('should execute action', async () => {
    const context = runtime.getContext();
    const result = await context.actions.runAction('my:action', { id: '123' });
    expect(result).toBeDefined();
  });
});
```

### Event Testing

```typescript
it('should emit events', async () => {
  const context = runtime.getContext();
  const eventSpy = vi.fn();
  
  context.events.on('my:event', eventSpy);
  context.events.emit('my:event', { data: 'test' });
  
  expect(eventSpy).toHaveBeenCalledWith({ data: 'test' });
});
```

## Common Mistakes to Avoid

### ❌ Don't access subsystems directly

```typescript
// WRONG
import { ScreenRegistry } from 'skeleton-crew-runtime';
const registry = new ScreenRegistry();
```

### ✅ Use RuntimeContext

```typescript
// CORRECT
setup(context: RuntimeContext) {
  context.screens.registerScreen(...);
}
```

### ❌ Don't forget .js extensions

```typescript
// WRONG
import { myPlugin } from './plugins/my-plugin';
```

### ✅ Include .js extensions

```typescript
// CORRECT
import { myPlugin } from './plugins/my-plugin.js';
```

### ❌ Don't register plugins after initialization

```typescript
// WRONG
await runtime.initialize();
runtime.registerPlugin(myPlugin); // Too late!
```

### ✅ Register before initialization

```typescript
// CORRECT
runtime.registerPlugin(myPlugin);
await runtime.initialize();
```

### ❌ Don't implement business logic in UI

```typescript
// WRONG - in React component
function TabList() {
  const handleClose = (tabId) => {
    chrome.tabs.remove(tabId); // Business logic in UI!
  };
}
```

### ✅ Call actions from UI

```typescript
// CORRECT - in React component
function TabList() {
  const handleClose = async (tabId) => {
    await executeAction('tabs:close', { tabId });
  };
}
```

### ❌ Don't forget to handle action errors

```typescript
// WRONG
const result = await context.actions.runAction('my:action');
```

### ✅ Always handle errors

```typescript
// CORRECT
try {
  const result = await context.actions.runAction('my:action');
} catch (error) {
  console.error('Action failed:', error);
  // Handle error appropriately
}
```

## Performance Best Practices

1. **Use action timeouts** for long-running operations
2. **Batch event emissions** when possible
3. **Unregister unused handlers** (though auto-cleanup happens on dispose)
4. **Use O(1) lookups** - all registries use Map-based storage
5. **Avoid storing large objects** in plugin state

## TypeScript Configuration

Ensure your tsconfig.json includes:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true
  }
}
```

## Summary Checklist

When implementing with Skeleton Crew Runtime:

- [ ] All imports use `.js` extensions
- [ ] Plugins follow PluginDefinition interface
- [ ] Actions are namespaced (`plugin:action`)
- [ ] Events are namespaced (`entity:action`)
- [ ] Business logic is in plugins, not UI
- [ ] UI calls actions via RuntimeContext
- [ ] State changes emit events
- [ ] Error handling is implemented
- [ ] Tests use isolated Runtime instances
- [ ] Runtime is properly shut down in tests
