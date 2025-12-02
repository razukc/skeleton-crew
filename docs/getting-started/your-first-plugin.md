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
import { PluginDefinition, RuntimeContext } from 'skeleton-crew-runtime';

export const notificationsPlugin: PluginDefinition = {
  name: 'notifications',
  version: '1.0.0',
  
  setup(ctx: RuntimeContext) {
    // Register an action
    ctx.actions.registerAction({
      id: 'notifications:send',
      handler: async (params: { message: string; userId: string }) => {
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
import { Runtime } from 'skeleton-crew-runtime';
import { notificationsPlugin } from './plugins/notifications.js';

async function main() {
  // Create runtime
  const runtime = new Runtime();
  
  // Register plugin
  runtime.registerPlugin(notificationsPlugin);
  
  // Initialize
  await runtime.initialize();
  
  // Get context
  const ctx = runtime.getContext();
  
  // Use the plugin
  const result = await ctx.actions.runAction('notifications:send', {
    userId: '123',
    message: 'Hello, World!'
  });
  
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
const loggerPlugin: PluginDefinition = {
  name: 'logger',
  version: '1.0.0',
  setup(ctx) {
    ctx.events.on('notification:sent', (data: any) => {
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
