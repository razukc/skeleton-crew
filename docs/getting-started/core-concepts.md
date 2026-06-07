# Core Concepts

Understand the fundamental concepts of the Skeleton Crew Runtime: Plugins, Actions, Events, and Screens.

## 1. Plugin Discovery (v0.2.1): Automatic Loading

No more manual plugin registration! The runtime can automatically discover and load plugins:

```typescript
import { Runtime } from 'skeleton-crew';

const runtime = new Runtime<MyConfig>({
  config: myConfig,
  
  // Discover plugins from file system
  pluginPaths: [
    './src/plugins',        // Directory: loads all .js/.mjs files
    './auth-plugin.js',     // Single file: loads specific plugin
    './dist/plugins'        // Works with compiled TypeScript too!
  ],
  
  // Discover plugins from npm packages
  pluginPackages: [
    '@my-org/auth-plugin',  // npm package with plugin export
    'my-logging-plugin'     // Any package that exports a plugin
  ]
});

await runtime.initialize();
// ✅ All plugins auto-loaded and sorted by dependencies!
```

**Dependency Resolution:** Plugins are automatically sorted by their `dependencies` array, so they initialize in the correct order.

## 2. Plugins: Isolated Features

A plugin is just an object with a name and a setup function. It encapsulates a feature.

```typescript
import type { PluginDefinition, RuntimeContext } from 'skeleton-crew';

// Define your config type
interface MyAppConfig {
  apiUrl: string;
  features: { analytics: boolean };
}

export const myPlugin: PluginDefinition<MyAppConfig> = {
  name: 'my-plugin',
  version: '1.0.0',
  dependencies: ['config'], // Explicit dependencies
  
  setup(ctx: RuntimeContext<MyAppConfig>) {
    // ✅ Fully typed config access
    const { apiUrl, features } = ctx.config;
    
    if (features.analytics) {
      ctx.logger.info(`Plugin initialized for ${apiUrl}`);
    }
    
    // Register your feature here
  },
  
  dispose(ctx: RuntimeContext<MyAppConfig>) {
    // Optional: cleanup resources when plugin is removed
    // Use this for: closing connections, clearing timers, releasing memory
    // Event listeners auto-cleanup, so you usually don't need this
  }
};
```

## 3. Actions: Business Logic

Actions are named functions that perform specific tasks. They are type-safe and testable.

```typescript
// Define types
interface CreateOrderParams {
  customerId: string;
  items: Array<{ id: string; quantity: number }>;
}

interface Order {
  id: string;
  customerId: string;
  total: number;
  status: 'pending' | 'confirmed';
}

// Register an action
ctx.actions.registerAction<CreateOrderParams, Order>({
  id: 'orders:create',
  handler: async (orderData, ctx) => {
    // ✅ Typed config access
    const { apiUrl } = ctx.config;
    
    // ✅ Typed parameters
    const { customerId, items } = orderData;
    
    const order = await createOrder(customerId, items);
    
    // Notify others
    ctx.events.emit('order:created', order);
    
    ctx.logger.info(`Order created: ${order.id}`);
    return order; // ✅ Typed return value
  },
  timeout: 10000 // Optional timeout
});
```

## 4. Events: Decouple Features

Plugins communicate without knowing about each other using the Event Bus.

```typescript
// Plugin A: Emit event
ctx.events.emit('order:created', order);

// Plugin B: React (doesn't know about Plugin A)
ctx.events.on('order:created', (order) => {
  sendConfirmationEmail(order);
});

// Async event handling
await ctx.events.emitAsync('order:created', order); // Wait for all handlers
```

## 5. Configuration: Type-Safe Access

Direct synchronous access to typed configuration throughout your application.

```typescript
// In plugins: direct typed access
setup(ctx: RuntimeContext<AppConfig>) {
  // ✅ Fully typed, synchronous access
  const { database, api, features } = ctx.config;
  
  if (features.caching) {
    initializeCache();
  }
}
```

## 6. Service Locator: Inter-plugin Communication

Plugins can register and consume shared services without hard dependency coupling.

```typescript
// Plugin A: Register a service
setup(ctx) {
  const myService = {
    doSomething: () => console.log('Service in action!')
  };
  ctx.services.register('my-api', myService);
}

// Plugin B: Consume the service
setup(ctx) {
  // Wait for the providing plugin to initialize first!
  const api = ctx.services.get<MyApiType>('my-api');
  api.doSomething();
}
```

## 7. Screens: UI Definitions (Optional)

Define screens that any UI framework can render. This allows business logic to drive UI without binding to a specific framework like React or Vue.

```typescript
ctx.screens.registerScreen({
  id: 'orders:list',
  title: 'Orders',
  component: 'OrderListComponent'  // string, class, function, or any type
});
```
