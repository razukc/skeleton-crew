---
inclusion: always
---

# Skeleton Crew Runtime API Guidelines

When working with Skeleton Crew Runtime, follow these patterns and conventions.

## Critical Rules

1. **ESM imports MUST use .js extensions** - `import { X } from './file.js'` not `'./file'`
2. **Access subsystems ONLY via RuntimeContext** - Never instantiate ScreenRegistry, ActionEngine, etc. directly
3. **Register plugins BEFORE runtime.initialize()** - Registration after initialization will fail
4. **Business logic goes in actions** - UI components should call actions, not implement logic
5. **Use namespaced IDs** - Actions: `plugin:action`, Events: `entity:action`

## Standard Plugin Pattern

Every plugin follows this structure:

```typescript
import { PluginDefinition, RuntimeContext } from 'skeleton-crew-runtime';

export const myPlugin: PluginDefinition = {
  name: 'my-plugin',        // Required: unique identifier
  version: '1.0.0',         // Required: semantic version
  
  setup(context: RuntimeContext) {
    // Register screens (optional)
    context.screens.registerScreen({
      id: 'my-screen',
      title: 'My Screen',
      component: 'MyComponent'
    });
    
    // Register actions (business logic)
    context.actions.registerAction({
      id: 'my:action',      // Use namespaced IDs
      handler: async (params, ctx) => {
        // Implementation here
        return result;
      },
      timeout: 5000         // Optional: milliseconds
    });
    
    // Subscribe to events (cross-plugin communication)
    context.events.on('entity:changed', (data) => {
      // React to state changes
    });
  },
  
  dispose(context: RuntimeContext) {
    // Optional: cleanup resources
    // Event listeners auto-unsubscribe on dispose
  }
};
```

## Actions: Business Logic Layer

### Type-Safe Action Registration

Always use TypeScript generics for type safety:

```typescript
interface MyParams { id: string; name: string; }
interface MyResult { success: boolean; data: unknown; }

context.actions.registerAction<MyParams, MyResult>({
  id: 'my:action',
  handler: async (params, ctx) => {
    // params is typed as MyParams
    // return must match MyResult
    return { success: true, data: {} };
  },
  timeout: 5000  // Optional: prevent hanging operations
});
```

### Action Naming: plugin:action

Format: `<plugin-name>:<action-name>`

Examples: `tabs:query`, `tabs:activate`, `sessions:save`, `storage:load`

### Executing Actions

```typescript
// From plugins or other actions
const result = await context.actions.runAction<ParamsType, ResultType>(
  'plugin:action',
  params
);

// Always handle errors
try {
  const result = await context.actions.runAction('my:action', params);
} catch (error) {
  if (error instanceof ActionTimeoutError) {
    // Handle timeout
  } else if (error instanceof ActionExecutionError) {
    // Handle execution failure
  }
}
```

## Events: Cross-Plugin Communication

### Event Naming: entity:action

Format: `<entity>:<action>`

Examples: `tab:created`, `tab:updated`, `session:saved`, `storage:error`

### Emitting Events

```typescript
// Fire-and-forget (synchronous)
context.events.emit('tab:created', { id: 123, title: 'New Tab' });

// Wait for all handlers (asynchronous)
await context.events.emitAsync('session:saved', { sessionId: 'abc' });
```

### Subscribing to Events

```typescript
// In plugin setup - auto-cleanup on dispose
context.events.on('tab:updated', (data) => {
  console.log('Tab updated:', data);
});

// Manual unsubscribe (rarely needed)
const unsubscribe = context.events.on('event', handler);
unsubscribe();
```

### Error Handling in Event Handlers

NEVER let errors propagate - they break other handlers:

```typescript
context.events.on('some:event', (data) => {
  try {
    // Your logic
  } catch (error) {
    console.error('Handler failed:', error);
    // Don't re-throw
  }
});
```

## Runtime Initialization Sequence

Critical order: Create → Register → Initialize → Use

```typescript
import { Runtime } from 'skeleton-crew-runtime';
import { plugin1 } from './plugins/plugin1.js';
import { plugin2 } from './plugins/plugin2.js';

// 1. Create runtime
const runtime = new Runtime();

// 2. Register plugins (BEFORE initialize)
runtime.registerPlugin(plugin1);
runtime.registerPlugin(plugin2);

// 3. Initialize (executes plugin setup callbacks)
await runtime.initialize();

// 4. Get context for application use
const context = runtime.getContext();

// 5. Use context in your application
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'action') {
    context.actions.runAction(message.action, message.params)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

// 6. Cleanup on shutdown
chrome.runtime.onSuspend.addListener(async () => {
  await runtime.shutdown();
});
```

## Screens: Declarative UI Definitions

### Registering Screens

```typescript
context.screens.registerScreen({
  id: 'home',              // Unique identifier
  title: 'Home',           // Display title
  component: 'HomeComponent'  // Any type - string, class, function, etc.
});
```

### Retrieving Screens

```typescript
const screen = context.screens.getScreen('home');  // Single screen or undefined
const allScreens = context.screens.getAllScreens(); // Array of all screens
```

## Error Handling

### Action Errors

```typescript
import { ActionExecutionError, ActionTimeoutError } from 'skeleton-crew-runtime';

try {
  const result = await context.actions.runAction('my:action', params);
} catch (error) {
  if (error instanceof ActionTimeoutError) {
    // Action exceeded timeout limit
    console.error('Timeout:', error.actionId, error.timeoutMs);
  } else if (error instanceof ActionExecutionError) {
    // Action handler threw error
    console.error('Failed:', error.actionId, error.cause);
  }
}
```

### Registration Errors

```typescript
import { ValidationError, DuplicateRegistrationError } from 'skeleton-crew-runtime';

try {
  context.screens.registerScreen(screen);
} catch (error) {
  if (error instanceof ValidationError) {
    // Invalid screen definition
    console.error('Invalid:', error.resourceType, error.field);
  } else if (error instanceof DuplicateRegistrationError) {
    // Screen ID already registered
    console.error('Duplicate:', error.identifier);
  }
}
```

## Browser Extension Integration

### UI to Background Communication

```typescript
// Helper function in popup/content script
async function executeAction(action: string, params?: unknown) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: 'action', action, params },
      (response) => {
        if (response.success) resolve(response.result);
        else reject(new Error(response.error));
      }
    );
  });
}

// Usage in UI
const tabs = await executeAction('tabs:query');
```

### Background to UI Broadcasting

```typescript
// Background script - broadcast events to UI
context.events.on('tab:created', (data) => {
  chrome.runtime.sendMessage({
    type: 'event',
    event: 'tab:created',
    data
  });
});

// UI script - listen for events
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'event') {
    handleEvent(message.event, message.data);
  }
});
```

## Testing with Vitest

### Plugin Test Structure

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
    await runtime.shutdown();  // Always cleanup
  });
  
  it('registers actions', () => {
    const context = runtime.getContext();
    const action = context.actions.getAction('my:action');
    expect(action).toBeDefined();
  });
  
  it('executes actions', async () => {
    const context = runtime.getContext();
    const result = await context.actions.runAction('my:action', { id: '123' });
    expect(result).toBeDefined();
  });
  
  it('emits events', () => {
    const context = runtime.getContext();
    const spy = vi.fn();
    
    context.events.on('my:event', spy);
    context.events.emit('my:event', { data: 'test' });
    
    expect(spy).toHaveBeenCalledWith({ data: 'test' });
  });
});
```

## Common Mistakes

### ❌ Instantiating subsystems directly

```typescript
// WRONG - never do this
import { ScreenRegistry } from 'skeleton-crew-runtime';
const registry = new ScreenRegistry();
```

**Fix:** Use RuntimeContext in plugin setup

```typescript
setup(context: RuntimeContext) {
  context.screens.registerScreen(...);
}
```

### ❌ Missing .js extensions

```typescript
// WRONG - ESM requires extensions
import { myPlugin } from './plugins/my-plugin';
```

**Fix:** Always include .js extension

```typescript
import { myPlugin } from './plugins/my-plugin.js';
```

### ❌ Late plugin registration

```typescript
// WRONG - too late
await runtime.initialize();
runtime.registerPlugin(myPlugin);
```

**Fix:** Register before initialize

```typescript
runtime.registerPlugin(myPlugin);
await runtime.initialize();
```

### ❌ Business logic in UI

```typescript
// WRONG - UI should not contain business logic
function TabList() {
  const handleClose = (tabId) => {
    chrome.tabs.remove(tabId);
  };
}
```

**Fix:** Call actions from UI

```typescript
function TabList() {
  const handleClose = async (tabId) => {
    await executeAction('tabs:close', { tabId });
  };
}
```

### ❌ Unhandled action errors

```typescript
// WRONG - errors will propagate
const result = await context.actions.runAction('my:action');
```

**Fix:** Always use try-catch

```typescript
try {
  const result = await context.actions.runAction('my:action');
} catch (error) {
  console.error('Action failed:', error);
}
```

## Performance Guidelines

- **Set action timeouts** - Prevent hanging operations with timeout parameter
- **Batch events** - Emit multiple changes as single event when possible
- **Trust auto-cleanup** - Event handlers unsubscribe automatically on dispose
- **Leverage O(1) lookups** - All registries use Map-based storage
- **Keep plugin state small** - Avoid storing large objects in memory

## Required TypeScript Configuration

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

## Implementation Checklist

When writing code with Skeleton Crew Runtime:

- [ ] All imports include `.js` extensions
- [ ] Plugins implement PluginDefinition interface
- [ ] Actions use namespaced IDs: `plugin:action`
- [ ] Events use namespaced names: `entity:action`
- [ ] Business logic in actions, not UI components
- [ ] UI calls actions via RuntimeContext
- [ ] State changes emit events for cross-plugin communication
- [ ] Action calls wrapped in try-catch
- [ ] Tests create isolated Runtime instances
- [ ] Tests call runtime.shutdown() in afterEach
