  # Your First Plugin

**Build a working plugin in 15 minutes.**

## What You'll Build

A simple notification plugin that:
- Registers an action to send notifications
- Emits events when notifications are sent
- Demonstrates core plugin patterns

## Step 1: Create Plugin File

Create `plugins/notifications.ts`:

```typescript
import type { PluginDefinition, RuntimeContext } from 'skeleton-crew';

// Define your config
interface AppConfig {
  notifications: { enabled: boolean };
}

export const notificationsPlugin: PluginDefinition<AppConfig> = {
  name: 'notifications',
  version: '1.0.0',
  
  setup(ctx: RuntimeContext<AppConfig>) {
    // Register an action
    ctx.actions.registerAction<{ message: string; userId: string }, { success: boolean }>({
      id: 'notifications:send',
      handler: async (params, context) => { // context is fully typed
        console.log(`Sending notification to ${params.userId}: ${params.message}`);
        
        // Emit event
        ctx.events.emit('notification:sent', {
          userId: params.userId,
          message: params.message,
          timestamp: Date.now()
        });
        
        return { success: true };
      }
    });
  }
};
```

## Step 2: Use the Plugin

Create `index.ts`:

```typescript
import { Runtime } from 'skeleton-crew';
import { notificationsPlugin } from './plugins/notifications.js';

// Define config type
interface AppConfig {
  notifications: { enabled: boolean };
}

async function main() {
  // Create typed runtime
  const runtime = new Runtime<AppConfig>({
    config: {
      notifications: { enabled: true }
    }
  });
  
  // Register plugin (before initialization)
  runtime.registerPlugin(notificationsPlugin);
  
  // Initialize
  await runtime.initialize();
  
  // Get context
  const ctx = runtime.getContext();
  
  // Use the plugin - fully typed!
  const result = await ctx.actions.runAction<{ message: string; userId: string }, { success: boolean }>(
    'notifications:send', 
    {
      userId: '123',
      message: 'Hello, World!'
    }
  );
  
  console.log('Result:', result);
  
  // Cleanup
  await runtime.shutdown();
}

main().catch(console.error);
```

## Step 3: Run It

```bash
npm run build
node dist/index.js
```

**Output**:
```
Sending notification to 123: Hello, World!
Result: { success: true }
```

## Understanding the Code

### Plugin Structure

```typescript
{
  name: 'notifications',      // Unique identifier
  version: '1.0.0',           // Semantic version
  setup(ctx) {                // Setup callback
    // Register resources here
  }
}
```

### Registering Actions

```typescript
ctx.actions.registerAction({
  id: 'notifications:send',   // Namespaced ID
  handler: async (params) => {
    // Business logic
    return result;
  }
});
```

### Emitting Events

```typescript
ctx.events.emit('notification:sent', {
  // Event data
});
```

## Next Steps

### Add Event Listener

```typescript
const loggerPlugin: PluginDefinition<AppConfig> = {
  name: 'logger',
  version: '1.0.0',
  setup(ctx) {
    ctx.events.on('notification:sent', (data) => {
      console.log('Logger: Notification sent', data);
    });
  }
};

runtime.registerPlugin(loggerPlugin);
```

### Add Error Handling

```typescript
handler: async (params) => {
  if (!params.message) {
    throw new Error('Message is required');
  }
  // ... rest of handler
}
```

### Add Timeout

```typescript
ctx.actions.registerAction({
  id: 'notifications:send',
  timeout: 5000,  // 5 seconds
  handler: async (params) => {
    // ...
  }
});
```

---

**Next**: [Core Concepts →](core-concepts.md)
