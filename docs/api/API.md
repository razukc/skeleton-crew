# Skeleton Crew Runtime - API Reference

Complete API documentation for Skeleton Crew Runtime including all TypeScript interfaces, classes, methods, and types.

## Table of Contents

- [Core Classes](#core-classes)
  - [Runtime](#runtime)
  - [RuntimeContextImpl](#runtimecontextimpl)
  - [PluginRegistry](#pluginregistry)
  - [ScreenRegistry](#screenregistry)
  - [ActionEngine](#actionengine)
  - [EventBus](#eventbus)
  - [UIBridge](#uibridge)
- [Interfaces](#interfaces)
  - [PluginDefinition](#plugindefinition)
  - [ScreenDefinition](#screendefinition)
  - [ActionDefinition](#actiondefinition)
  - [UIProvider](#uiprovider)
  - [RuntimeContext](#runtimecontext)
  - [Logger](#logger)
- [Error Classes](#error-classes)
- [Enums](#enums)
- [Type Parameters](#type-parameters)

---

## Core Classes

### Runtime

The main orchestrator that coordinates all subsystems. Handles initialization, shutdown, and lifecycle state tracking.

#### Constructor

```typescript
constructor(options?: RuntimeOptions)
```

Creates a new Runtime instance with optional configuration.

**Parameters:**
- `options` (optional): Runtime configuration options
  - `options.logger` (optional): Custom logger implementation (defaults to `ConsoleLogger`)
  - `options.hostContext` (optional): Host application services to inject (defaults to empty object)

**Example:**
```typescript
import { Runtime, ConsoleLogger } from "skeleton-crew";

// Basic usage
const runtime = new Runtime();

// With custom logger
const runtime = new Runtime({ logger: new ConsoleLogger() });

// With host context (for migration scenarios)
const runtime = new Runtime({
  hostContext: {
    db: databaseConnection,
    logger: applicationLogger,
    cache: cacheInstance
  }
});
```

#### Methods

##### `registerPlugin(plugin: PluginDefinition): void`

Registers a plugin before initialization. Plugins registered this way will have their setup callbacks executed during `initialize()`.

**Parameters:**
- `plugin`: The plugin definition to register

**Throws:**
- `Error` if runtime is already initialized

**Example:**
```typescript
runtime.registerPlugin({
  name: "my-plugin",
  version: "1.0.0",
  setup(ctx) {
    // Plugin setup logic
  }
});
```


##### `initialize(): Promise<void>`

Initializes the runtime following the strict initialization sequence. Creates all subsystems in order, then executes plugin setup callbacks. Emits `runtime:initialized` event after successful initialization.

**Throws:**
- `Error` if initialize is called twice
- `Error` if any plugin setup fails

**Initialization Sequence:**
1. Create PluginRegistry
2. Create ScreenRegistry
3. Create ActionEngine
4. Create EventBus
5. Create UIBridge
6. Create RuntimeContext
7. Execute plugin setup callbacks

**Example:**
```typescript
await runtime.initialize();
```

##### `shutdown(): Promise<void>`

Shuts down the runtime following the strict shutdown sequence. Emits `runtime:shutdown` event at start of shutdown. Disposes initialized plugins, shuts down UI provider, clears all registries, and releases resources. Safe to call multiple times (idempotent).

**Shutdown Sequence:**
1. Execute dispose callbacks for initialized plugins (in reverse order)
2. Shutdown UI provider
3. Clear all registries
4. Set initialized flag to false

**Example:**
```typescript
await runtime.shutdown();
```

##### `getContext(): RuntimeContext`

Returns the RuntimeContext for this runtime instance.

**Returns:** The RuntimeContext

**Throws:**
- `Error` if runtime is not initialized

**Example:**
```typescript
const ctx = runtime.getContext();
```

##### `isInitialized(): boolean`

Returns whether the runtime has been initialized.

**Returns:** `true` if runtime is initialized, `false` otherwise

**Example:**
```typescript
if (runtime.isInitialized()) {
  // Runtime is ready
}
```

##### `getState(): RuntimeState`

Returns the current lifecycle state of the runtime.

**Returns:** The current `RuntimeState` enum value

**Example:**
```typescript
const state = runtime.getState();
// state can be: Uninitialized, Initializing, Initialized, ShuttingDown, or Shutdown
```

##### `setUIProvider(provider: UIProvider): void`

Registers a UI provider with the runtime. Can be called after initialization completes.

**Parameters:**
- `provider`: The UI provider implementation

**Throws:**
- `Error` if provider is invalid or already registered

**Example:**
```typescript
runtime.setUIProvider({
  mount(target, ctx) {
    // Initialize UI framework
  },
  renderScreen(screen) {
    // Render screen
    return renderedOutput;
  }
});
```

##### `getUIProvider(): UIProvider | null`

Returns the registered UI provider.

**Returns:** The registered `UIProvider` or `null` if none registered

**Example:**
```typescript
const provider = runtime.getUIProvider();
```

##### `renderScreen(screenId: string): unknown`

Renders a screen by looking it up in the ScreenRegistry and delegating to UIBridge.

**Parameters:**
- `screenId`: The screen identifier to render

**Returns:** The result from the UI provider's render method

**Throws:**
- `Error` if screen is not found
- `Error` if no UI provider is registered

**Example:**
```typescript
const result = runtime.renderScreen("home");
```

---

### RuntimeContextImpl

Provides a safe API facade for subsystems. Passed to plugins and action handlers without exposing internal mutable structures.

#### Constructor

```typescript
constructor(
  screenRegistry: ScreenRegistry,
  actionEngine: ActionEngine,
  pluginRegistry: PluginRegistry,
  eventBus: EventBus,
  runtime: Runtime
)
```

**Note:** This is typically created internally by the Runtime. You don't need to instantiate it directly.

#### Properties

##### `screens`

Exposes Screen Registry operations.

**Methods:**
- `registerScreen(screen: ScreenDefinition): () => void` - Registers a screen and returns an unregister function
- `getScreen(id: string): ScreenDefinition | null` - Retrieves a screen by ID
- `getAllScreens(): ScreenDefinition[]` - Returns all registered screens

**Example:**
```typescript
const unregister = ctx.screens.registerScreen({
  id: "home",
  title: "Home",
  component: HomeComponent
});

const screen = ctx.screens.getScreen("home");
const allScreens = ctx.screens.getAllScreens();

// Unregister when done
unregister();
```

##### `actions`

Exposes Action Engine operations.

**Methods:**
- `registerAction<P, R>(action: ActionDefinition<P, R>): () => void` - Registers an action and returns an unregister function
- `runAction<P, R>(id: string, params?: P): Promise<R>` - Executes an action by ID

**Example:**
```typescript
const unregister = ctx.actions.registerAction({
  id: "loadUsers",
  handler: async () => {
    return await fetchUsers();
  }
});

const users = await ctx.actions.runAction("loadUsers");

// Unregister when done
unregister();
```

##### `plugins`

Exposes Plugin Registry operations.

**Methods:**
- `registerPlugin(plugin: PluginDefinition): void` - Registers a plugin
- `getPlugin(name: string): PluginDefinition | null` - Retrieves a plugin by name
- `getAllPlugins(): PluginDefinition[]` - Returns all registered plugins
- `getInitializedPlugins(): string[]` - Returns names of initialized plugins

**Example:**
```typescript
ctx.plugins.registerPlugin({
  name: "my-plugin",
  version: "1.0.0",
  setup(ctx) {
    // Setup logic
  }
});

const plugin = ctx.plugins.getPlugin("my-plugin");
const allPlugins = ctx.plugins.getAllPlugins();
const initialized = ctx.plugins.getInitializedPlugins();
```

##### `events`

Exposes Event Bus operations.

**Methods:**
- `emit(event: string, data?: unknown): void` - Emits an event synchronously
- `emitAsync(event: string, data?: unknown): Promise<void>` - Emits an event asynchronously
- `on(event: string, handler: (data: unknown) => void): () => void` - Registers an event handler and returns an unsubscribe function

**Example:**
```typescript
// Subscribe to events
const unsubscribe = ctx.events.on("user:created", (data) => {
  console.log("User created:", data);
});

// Emit events
ctx.events.emit("user:created", { id: 123, name: "Alice" });

// Async emit
await ctx.events.emitAsync("user:created", { id: 124, name: "Bob" });

// Unsubscribe when done
unsubscribe();
```

##### `host`

Exposes the host context as a readonly object. Returns a frozen copy of the host context provided during runtime initialization.

**Type:** `Readonly<Record<string, unknown>>`

**Example:**
```typescript
// Access injected services
const db = ctx.host.db;
const logger = ctx.host.logger;
const config = ctx.host.config;

// Attempt to mutate throws TypeError
ctx.host.newKey = 'value'; // ❌ TypeError: Cannot add property
```

**Use Cases:**
- Accessing legacy application services from plugins
- Reading configuration injected by host application
- Using existing database connections, HTTP clients, etc.

**Security:** The returned object is frozen to prevent mutation. Plugins receive a shallow copy, ensuring isolation between plugins.

##### `introspect`

Exposes the introspection API for querying runtime metadata.

**Type:** `IntrospectionAPI`

**Example:**
```typescript
// List all registered resources
const actions = ctx.introspect.listActions();
const plugins = ctx.introspect.listPlugins();
const screens = ctx.introspect.listScreens();

// Get specific metadata
const actionMeta = ctx.introspect.getActionDefinition('users:load');
const pluginMeta = ctx.introspect.getPluginDefinition('users');
const screenMeta = ctx.introspect.getScreenDefinition('users:list');

// Get runtime statistics
const stats = ctx.introspect.getMetadata();
console.log(`Runtime v${stats.runtimeVersion} with ${stats.totalPlugins} plugins`);
```

**Use Cases:**
- Building admin dashboards
- Development and debugging tools
- Dynamic UI generation based on available resources
- Runtime monitoring and health checks

**Security:** All returned metadata is deeply frozen to prevent mutation of internal state.

##### `getRuntime(): Runtime`

Returns the Runtime instance.

**Returns:** The `Runtime` instance

**Example:**
```typescript
const runtime = ctx.getRuntime();
```

---

### PluginRegistry

Manages plugin registration and lifecycle.

#### Constructor

```typescript
constructor(logger: Logger)
```

**Note:** Typically created internally by the Runtime.

#### Methods

##### `registerPlugin(plugin: PluginDefinition): void`

Registers a plugin definition.

**Parameters:**
- `plugin`: The plugin definition to register

**Throws:**
- `ValidationError` if plugin is missing required fields (name, version, setup)
- `DuplicateRegistrationError` if a plugin with the same name is already registered

**Example:**
```typescript
pluginRegistry.registerPlugin({
  name: "my-plugin",
  version: "1.0.0",
  setup(ctx) {
    // Setup logic
  }
});
```

##### `getPlugin(name: string): PluginDefinition | null`

Retrieves a plugin definition by name.

**Parameters:**
- `name`: The plugin name

**Returns:** The plugin definition or `null` if not found

##### `getAllPlugins(): PluginDefinition[]`

Retrieves all registered plugin definitions.

**Returns:** Array copy of all registered plugins

##### `getInitializedPlugins(): string[]`

Returns the names of all successfully initialized plugins in initialization order.

**Returns:** Array of initialized plugin names

##### `executeSetup(context: RuntimeContext): Promise<void>`

Executes plugin setup callbacks sequentially in registration order. Aborts on first failure and rolls back already-initialized plugins.

**Parameters:**
- `context`: The RuntimeContext to pass to setup callbacks

**Throws:**
- `Error` if any plugin setup fails

**Note:** This is called internally by Runtime during initialization.

##### `executeDispose(context: RuntimeContext): Promise<void>`

Executes plugin dispose callbacks in reverse order of initialization. Logs errors but continues cleanup.

**Parameters:**
- `context`: The RuntimeContext to pass to dispose callbacks

**Note:** This is called internally by Runtime during shutdown.

##### `clear(): void`

Clears all registered plugins. Used during shutdown.

---

### ScreenRegistry

Manages screen definitions with O(1) lookup performance.

#### Constructor

```typescript
constructor(logger: Logger)
```

**Note:** Typically created internally by the Runtime.

#### Methods

##### `registerScreen(screen: ScreenDefinition): () => void`

Registers a screen definition. Validates required fields and rejects duplicate IDs.

**Parameters:**
- `screen`: The screen definition to register

**Returns:** An unregister function that removes the screen when called

**Throws:**
- `ValidationError` if screen is missing required fields (id, title, component)
- `DuplicateRegistrationError` if a screen with the same ID is already registered

**Example:**
```typescript
const unregister = screenRegistry.registerScreen({
  id: "home",
  title: "Home",
  component: "HomeComponent"
});

// Later, unregister
unregister();
```

##### `getScreen(id: string): ScreenDefinition | null`

Retrieves a screen definition by ID.

**Parameters:**
- `id`: The screen identifier

**Returns:** The screen definition or `null` if not found

##### `getAllScreens(): ScreenDefinition[]`

Retrieves all registered screen definitions.

**Returns:** Array copy of all registered screens

##### `clear(): void`

Clears all registered screens. Used during shutdown.

---

### ActionEngine

Manages action registration and execution with O(1) lookup performance.

#### Constructor

```typescript
constructor(logger: Logger)
```

**Note:** Typically created internally by the Runtime.

#### Methods

##### `setContext(context: RuntimeContext): void`

Sets the RuntimeContext for this ActionEngine. Must be called after RuntimeContext is created during initialization.

**Parameters:**
- `context`: The RuntimeContext to pass to action handlers

**Note:** This is called internally by Runtime during initialization.

##### `registerAction<P, R>(action: ActionDefinition<P, R>): () => void`

Registers an action definition. Rejects duplicate action IDs.

**Type Parameters:**
- `P`: Parameter type (defaults to `unknown`)
- `R`: Return type (defaults to `unknown`)

**Parameters:**
- `action`: The action definition to register

**Returns:** An unregister function that removes the action when called

**Throws:**
- `ValidationError` if required fields are missing or invalid
- `DuplicateRegistrationError` if an action with the same ID is already registered

**Example:**
```typescript
const unregister = actionEngine.registerAction({
  id: "loadUsers",
  handler: async (params, ctx) => {
    return await fetchUsers();
  },
  timeout: 5000 // Optional timeout in milliseconds
});

// Later, unregister
unregister();
```

##### `runAction<P, R>(id: string, params?: P): Promise<R>`

Executes an action by ID with optional parameters. Passes the RuntimeContext to the action handler. Handles both synchronous and asynchronous handlers. Enforces timeout if specified.

**Type Parameters:**
- `P`: Parameter type (defaults to `unknown`)
- `R`: Return type (defaults to `unknown`)

**Parameters:**
- `id`: The action identifier
- `params`: Optional parameters to pass to the action handler

**Returns:** The result from the action handler

**Throws:**
- `Error` if the action ID does not exist
- `ActionExecutionError` if the handler throws an error
- `ActionTimeoutError` if the action exceeds its timeout

**Example:**
```typescript
const result = await actionEngine.runAction("loadUsers");
const result2 = await actionEngine.runAction("createUser", { name: "Alice" });
```

##### `getAction(id: string): ActionDefinition | null`

Retrieves an action definition by ID. For internal use.

**Parameters:**
- `id`: The action identifier

**Returns:** The action definition or `null` if not found

##### `getAllActions(): ActionDefinition[]`

Retrieves all registered action definitions.

**Returns:** Array copy of all registered actions

##### `clear(): void`

Clears all registered actions. Used during shutdown.

---

### EventBus

Provides publish-subscribe event communication with O(1) lookup performance.

#### Constructor

```typescript
constructor(logger: Logger)
```

**Note:** Typically created internally by the Runtime.

#### Methods

##### `emit(event: string, data?: unknown): void`

Emits an event to all registered handlers synchronously. Handlers are invoked in registration order. Handler errors are caught, logged, and do not prevent other handlers from executing.

**Parameters:**
- `event`: The event name
- `data`: Optional data to pass to handlers

**Example:**
```typescript
eventBus.emit("user:created", { id: 123, name: "Alice" });
```

##### `emitAsync(event: string, data?: unknown): Promise<void>`

Emits an event to all registered handlers asynchronously. Returns a Promise that resolves when all handlers complete or fail. Uses `Promise.allSettled` to ensure all handlers are invoked even if some fail.

**Parameters:**
- `event`: The event name
- `data`: Optional data to pass to handlers

**Returns:** Promise that resolves when all handlers complete

**Example:**
```typescript
await eventBus.emitAsync("user:created", { id: 123, name: "Alice" });
```

##### `on(event: string, handler: (data: unknown) => void): () => void`

Registers an event handler for a specific event.

**Parameters:**
- `event`: The event name
- `handler`: The handler function to invoke when the event is emitted

**Returns:** An unsubscribe function that removes the handler when called

**Example:**
```typescript
const unsubscribe = eventBus.on("user:created", (data) => {
  console.log("User created:", data);
});

// Later, unsubscribe
unsubscribe();
```

##### `clear(): void`

Clears all registered event handlers. Used during shutdown.

---

### UIBridge

Manages optional UI provider registration and screen rendering.

#### Constructor

```typescript
constructor(logger: Logger)
```

**Note:** Typically created internally by the Runtime.

#### Methods

##### `setProvider(provider: UIProvider): void`

Registers a UI provider with the runtime.

**Parameters:**
- `provider`: The UI provider implementation

**Throws:**
- `ValidationError` if provider is missing required methods (mount, renderScreen)
- `DuplicateRegistrationError` if provider is already registered

**Example:**
```typescript
uiBridge.setProvider({
  mount(target, ctx) {
    // Initialize UI
  },
  renderScreen(screen) {
    // Render screen
    return output;
  }
});
```

##### `getProvider(): UIProvider | null`

Returns the registered UI provider.

**Returns:** The registered `UIProvider` or `null` if none registered

##### `renderScreen(screen: ScreenDefinition): unknown`

Renders a screen using the registered UI provider.

**Parameters:**
- `screen`: The screen definition to render

**Returns:** The result from the UI provider's renderScreen method

**Throws:**
- `Error` if no UI provider is registered

##### `shutdown(): Promise<void>`

Shuts down the UI provider by calling unmount if it exists.

**Note:** This is called internally by Runtime during shutdown.

##### `clear(): void`

Clears the UI provider. Used during shutdown.

---

## Interfaces

### PluginDefinition

Defines a plugin that can extend the runtime.

```typescript
interface PluginDefinition {
  name: string;
  version: string;
  setup: (context: RuntimeContext) => void | Promise<void>;
  dispose?: (context: RuntimeContext) => void | Promise<void>;
}
```

**Properties:**
- `name` (required): Unique plugin identifier
- `version` (required): Plugin version string
- `setup` (required): Setup callback executed during initialization
- `dispose` (optional): Cleanup callback executed during shutdown

**Example:**
```typescript
const myPlugin: PluginDefinition = {
  name: "my-plugin",
  version: "1.0.0",
  setup(ctx) {
    ctx.screens.registerScreen({
      id: "my-screen",
      title: "My Screen",
      component: "MyComponent"
    });
  },
  dispose(ctx) {
    // Cleanup logic
  }
};
```

---

### ScreenDefinition

Defines a screen that can be rendered by a UI provider.

```typescript
interface ScreenDefinition {
  id: string;
  title: string;
  component: string;
}
```

**Properties:**
- `id` (required): Unique screen identifier
- `title` (required): Human-readable screen title
- `component` (required): Component reference (string or any type)

**Example:**
```typescript
const homeScreen: ScreenDefinition = {
  id: "home",
  title: "Home",
  component: "HomeComponent"
};
```

---

### ActionDefinition

Defines an action that can be executed by the runtime.

```typescript
interface ActionDefinition<P = unknown, R = unknown> {
  id: string;
  handler: (params: P, context: RuntimeContext) => Promise<R> | R;
  timeout?: number;
}
```

**Type Parameters:**
- `P`: Parameter type (defaults to `unknown`)
- `R`: Return type (defaults to `unknown`)

**Properties:**
- `id` (required): Unique action identifier
- `handler` (required): Action handler function (sync or async)
- `timeout` (optional): Timeout in milliseconds

**Example:**
```typescript
const loadUsersAction: ActionDefinition<void, User[]> = {
  id: "loadUsers",
  handler: async (params, ctx) => {
    return await fetchUsers();
  },
  timeout: 5000
};

const createUserAction: ActionDefinition<{ name: string }, User> = {
  id: "createUser",
  handler: async (params, ctx) => {
    return await createUser(params.name);
  }
};
```

---

### UIProvider

Defines a UI provider that can render screens.

```typescript
interface UIProvider {
  mount(target: unknown, context: RuntimeContext): void | Promise<void>;
  renderScreen(screen: ScreenDefinition): unknown | Promise<unknown>;
  unmount?(): void | Promise<void>;
}
```

**Properties:**
- `mount` (required): Initialize the UI framework
- `renderScreen` (required): Render a screen
- `unmount` (optional): Cleanup callback during shutdown

**Example:**
```typescript
const reactUIProvider: UIProvider = {
  mount(target, ctx) {
    // Initialize React
  },
  renderScreen(screen) {
    // Render React component
    return <Component />;
  },
  unmount() {
    // Cleanup React
  }
};
```

---

### RuntimeContext

Provides a safe API facade for subsystems. Passed to plugins and action handlers.

```typescript
interface RuntimeContext {
  screens: {
    registerScreen(screen: ScreenDefinition): () => void;
    getScreen(id: string): ScreenDefinition | null;
    getAllScreens(): ScreenDefinition[];
  };
  actions: {
    registerAction<P = unknown, R = unknown>(action: ActionDefinition<P, R>): () => void;
    runAction<P = unknown, R = unknown>(id: string, params?: P): Promise<R>;
  };
  plugins: {
    registerPlugin(plugin: PluginDefinition): void;
    getPlugin(name: string): PluginDefinition | null;
    getAllPlugins(): PluginDefinition[];
    getInitializedPlugins(): string[];
  };
  events: {
    emit(event: string, data?: unknown): void;
    emitAsync(event: string, data?: unknown): Promise<void>;
    on(event: string, handler: (data: unknown) => void): () => void;
  };
  readonly host: Readonly<Record<string, unknown>>;
  readonly introspect: IntrospectionAPI;
  getRuntime(): Runtime;
}
```

See [RuntimeContextImpl](#runtimecontextimpl) for detailed method documentation.

---

### Logger

Interface for pluggable logging implementations.

```typescript
interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}
```

**Methods:**
- `debug`: Log debug messages
- `info`: Log informational messages
- `warn`: Log warning messages
- `error`: Log error messages

**Example:**
```typescript
class CustomLogger implements Logger {
  debug(message: string, ...args: unknown[]): void {
    console.debug(`[DEBUG] ${message}`, ...args);
  }
  info(message: string, ...args: unknown[]): void {
    console.info(`[INFO] ${message}`, ...args);
  }
  warn(message: string, ...args: unknown[]): void {
    console.warn(`[WARN] ${message}`, ...args);
  }
  error(message: string, ...args: unknown[]): void {
    console.error(`[ERROR] ${message}`, ...args);
  }
}
```

---

### RuntimeOptions

Configuration options for Runtime initialization.

```typescript
interface RuntimeOptions {
  logger?: Logger;
  hostContext?: Record<string, unknown>;
}
```

**Properties:**
- `logger` (optional): Custom logger implementation (defaults to `ConsoleLogger`)
- `hostContext` (optional): Host application services to inject into the runtime (defaults to empty object)

**Host Context Usage:**

The `hostContext` option enables legacy applications to inject existing services into the runtime, allowing plugins to access these services without tight coupling. This is particularly useful for incremental migration scenarios.

**Example:**
```typescript
// Inject existing services for plugins to use
const runtime = new Runtime({
  hostContext: {
    db: legacyApp.database,
    logger: legacyApp.logger,
    cache: legacyApp.cacheService,
    config: {
      apiKey: process.env.API_KEY,
      apiUrl: 'https://api.example.com'
    }
  }
});

await runtime.initialize();

// Plugins can now access these services via context.host
const myPlugin = {
  name: 'data-plugin',
  version: '1.0.0',
  setup(context) {
    const db = context.host.db;
    const config = context.host.config;
    
    context.actions.registerAction({
      id: 'data:load',
      handler: async () => {
        return await db.query('SELECT * FROM users');
      }
    });
  }
};
```

**Validation Warnings:**

The runtime validates host context and logs warnings for common issues:
- Objects larger than 1MB (may impact performance)
- Function values (should be wrapped in objects)

These are warnings only - initialization continues normally.

**Best Practices:**
- ✅ DO inject: Database connections, HTTP clients, loggers, configuration objects
- ✅ DO inject: Stateless services and utilities
- ❌ DON'T inject: Request-scoped data (user sessions, request objects)
- ❌ DON'T inject: Large objects (> 1MB)
- ❌ DON'T inject: Functions directly (wrap in objects instead)

---

### IntrospectionAPI

Interface for querying runtime metadata. Accessible via `context.introspect`.

```typescript
interface IntrospectionAPI {
  // Action introspection
  listActions(): string[];
  getActionDefinition(id: string): ActionMetadata | null;
  
  // Plugin introspection
  listPlugins(): string[];
  getPluginDefinition(name: string): PluginMetadata | null;
  
  // Screen introspection
  listScreens(): string[];
  getScreenDefinition(id: string): ScreenDefinition | null;
  
  // Runtime introspection
  getMetadata(): IntrospectionMetadata;
}
```

**Methods:**

##### `listActions(): string[]`

Returns an array of all registered action IDs.

**Example:**
```typescript
const actionIds = context.introspect.listActions();
// ['users:load', 'users:create', 'reports:generate']
```

##### `getActionDefinition(id: string): ActionMetadata | null`

Returns metadata for a specific action, or null if not found. Handler function is excluded.

**Returns:** `ActionMetadata` object or `null`

**Example:**
```typescript
const metadata = context.introspect.getActionDefinition('users:load');
// { id: 'users:load', timeout: 5000 }
```

##### `listPlugins(): string[]`

Returns an array of all registered plugin names.

**Example:**
```typescript
const pluginNames = context.introspect.listPlugins();
// ['users', 'reports', 'analytics']
```

##### `getPluginDefinition(name: string): PluginMetadata | null`

Returns metadata for a specific plugin, or null if not found. Setup and dispose functions are excluded.

**Returns:** `PluginMetadata` object or `null`

**Example:**
```typescript
const metadata = context.introspect.getPluginDefinition('users');
// { name: 'users', version: '1.0.0' }
```

##### `listScreens(): string[]`

Returns an array of all registered screen IDs.

**Example:**
```typescript
const screenIds = context.introspect.listScreens();
// ['users:list', 'users:detail', 'reports:overview']
```

##### `getScreenDefinition(id: string): ScreenDefinition | null`

Returns the full screen definition, or null if not found.

**Returns:** `ScreenDefinition` object or `null`

**Example:**
```typescript
const screen = context.introspect.getScreenDefinition('users:list');
// { id: 'users:list', title: 'User List', component: UserListComponent }
```

##### `getMetadata(): IntrospectionMetadata`

Returns overall runtime statistics.

**Returns:** `IntrospectionMetadata` object

**Example:**
```typescript
const metadata = context.introspect.getMetadata();
// {
//   runtimeVersion: '0.1.0',
//   totalActions: 15,
//   totalPlugins: 5,
//   totalScreens: 8
// }
```

**Use Cases:**
- Building admin dashboards
- Debugging and development tools
- Dynamic UI generation
- Runtime monitoring
- Plugin discovery

**Security Note:** All returned objects are deeply frozen to prevent mutation of internal runtime state.

---

### ActionMetadata

Metadata for an action definition (excludes handler function).

```typescript
interface ActionMetadata {
  id: string;
  timeout?: number;
}
```

**Properties:**
- `id`: Unique action identifier
- `timeout` (optional): Timeout in milliseconds

**Note:** The handler function is intentionally excluded from metadata for security and encapsulation.

---

### PluginMetadata

Metadata for a plugin definition (excludes setup and dispose functions).

```typescript
interface PluginMetadata {
  name: string;
  version: string;
}
```

**Properties:**
- `name`: Unique plugin identifier
- `version`: Plugin version string

**Note:** Setup and dispose functions are intentionally excluded from metadata for security and encapsulation.

---

### IntrospectionMetadata

Overall runtime statistics and metadata.

```typescript
interface IntrospectionMetadata {
  runtimeVersion: string;
  totalActions: number;
  totalPlugins: number;
  totalScreens: number;
}
```

**Properties:**
- `runtimeVersion`: Version of the runtime (from package.json)
- `totalActions`: Count of registered actions
- `totalPlugins`: Count of registered plugins
- `totalScreens`: Count of registered screens

---

## Error Classes

### ValidationError

Error thrown when validation fails for a resource.

```typescript
class ValidationError extends Error {
  constructor(
    public resourceType: string,
    public field: string,
    public resourceId?: string
  )
}
```

**Properties:**
- `resourceType`: Type of resource (e.g., "Plugin", "Screen", "Action")
- `field`: Name of the missing or invalid field
- `resourceId`: Optional identifier of the resource

**Example:**
```typescript
throw new ValidationError("Plugin", "name");
// Error: Validation failed for Plugin: missing or invalid field "name"

throw new ValidationError("Screen", "title", "home");
// Error: Validation failed for Screen "home": missing or invalid field "title"
```

---

### DuplicateRegistrationError

Error thrown when attempting to register a duplicate resource.

```typescript
class DuplicateRegistrationError extends Error {
  constructor(
    public resourceType: string,
    public identifier: string
  )
}
```

**Properties:**
- `resourceType`: Type of resource (e.g., "Plugin", "Screen", "Action")
- `identifier`: The duplicate identifier

**Example:**
```typescript
throw new DuplicateRegistrationError("Plugin", "my-plugin");
// Error: Plugin with identifier "my-plugin" is already registered
```

---

### ActionTimeoutError

Error thrown when an action execution exceeds its timeout.

```typescript
class ActionTimeoutError extends Error {
  constructor(
    public actionId: string,
    public timeoutMs: number
  )
}
```

**Properties:**
- `actionId`: The action identifier
- `timeoutMs`: The timeout value in milliseconds

**Example:**
```typescript
throw new ActionTimeoutError("loadUsers", 5000);
// Error: Action "loadUsers" timed out after 5000ms
```

---

### ActionExecutionError

Error thrown when an action handler throws an error.

```typescript
class ActionExecutionError extends Error {
  constructor(
    public actionId: string,
    public cause: Error
  )
}
```

**Properties:**
- `actionId`: The action identifier
- `cause`: The original error from the handler

**Example:**
```typescript
throw new ActionExecutionError("loadUsers", new Error("Network error"));
// Error: Action "loadUsers" execution failed: Network error
```

---

### ConsoleLogger

Default console-based logger implementation.

```typescript
class ConsoleLogger implements Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}
```

**Example:**
```typescript
const logger = new ConsoleLogger();
logger.info("Runtime initialized");
```

---

## Enums

### RuntimeState

Runtime lifecycle states.

```typescript
enum RuntimeState {
  Uninitialized = 'uninitialized',
  Initializing = 'initializing',
  Initialized = 'initialized',
  ShuttingDown = 'shutting_down',
  Shutdown = 'shutdown'
}
```

**Values:**
- `Uninitialized`: Runtime has been created but not initialized
- `Initializing`: Runtime is currently initializing
- `Initialized`: Runtime is fully initialized and ready
- `ShuttingDown`: Runtime is currently shutting down
- `Shutdown`: Runtime has been shut down

**Example:**
```typescript
const state = runtime.getState();
if (state === RuntimeState.Initialized) {
  // Runtime is ready
}
```

---

## Type Parameters

### Generic Action Types

Actions support generic type parameters for type-safe parameter and return types.

```typescript
// Action with no parameters, returns string
const action1: ActionDefinition<void, string> = {
  id: "getMessage",
  handler: async () => "Hello"
};

// Action with typed parameters, returns typed result
interface CreateUserParams {
  name: string;
  email: string;
}

interface User {
  id: number;
  name: string;
  email: string;
}

const action2: ActionDefinition<CreateUserParams, User> = {
  id: "createUser",
  handler: async (params, ctx) => {
    return {
      id: 123,
      name: params.name,
      email: params.email
    };
  }
};

// Type-safe execution
const user = await ctx.actions.runAction<CreateUserParams, User>(
  "createUser",
  { name: "Alice", email: "alice@example.com" }
);
```

---

## Complete Usage Example

```typescript
import {
  Runtime,
  PluginDefinition,
  ScreenDefinition,
  ActionDefinition,
  UIProvider,
  RuntimeContext
} from "skeleton-crew";

// Define a plugin
const myPlugin: PluginDefinition = {
  name: "my-plugin",
  version: "1.0.0",
  setup(ctx: RuntimeContext) {
    // Register a screen
    ctx.screens.registerScreen({
      id: "home",
      title: "Home",
      component: "HomeComponent"
    });

    // Register an action
    ctx.actions.registerAction({
      id: "loadData",
      handler: async (params, ctx) => {
        return { data: "loaded" };
      },
      timeout: 5000
    });

    // Subscribe to events
    ctx.events.on("data:loaded", (data) => {
      console.log("Data loaded:", data);
    });
  },
  dispose(ctx: RuntimeContext) {
    console.log("Cleaning up plugin");
  }
};

// Define a UI provider
const uiProvider: UIProvider = {
  mount(target, ctx) {
    console.log("UI mounted");
  },
  renderScreen(screen) {
    console.log(`Rendering screen: ${screen.title}`);
    return screen.component;
  },
  unmount() {
    console.log("UI unmounted");
  }
};

// Create and initialize runtime
const runtime = new Runtime();
runtime.registerPlugin(myPlugin);
await runtime.initialize();

// Set UI provider
runtime.setUIProvider(uiProvider);

// Get context and use it
const ctx = runtime.getContext();

// Execute action
const result = await ctx.actions.runAction("loadData");

// Emit event
ctx.events.emit("data:loaded", result);

// Render screen
runtime.renderScreen("home");

// Shutdown when done
await runtime.shutdown();
```

---

## Migration Support Example

Complete example showing how to use host context injection and introspection for migrating legacy applications:

```typescript
import { Runtime } from "skeleton-crew";

// Legacy application with existing services
class LegacyApp {
  constructor() {
    this.database = {
      query: async (sql) => {
        // Existing database logic
        return [];
      }
    };
    
    this.logger = {
      log: (message) => console.log(`[Legacy] ${message}`)
    };
    
    this.cache = new Map();
  }
}

// Create legacy app instance
const legacyApp = new LegacyApp();

// Create runtime with host context
const runtime = new Runtime({
  hostContext: {
    db: legacyApp.database,
    logger: legacyApp.logger,
    cache: legacyApp.cache,
    config: {
      apiUrl: 'https://api.example.com',
      apiKey: process.env.API_KEY
    }
  }
});

// Plugin that uses injected services
const dataPlugin = {
  name: 'data-plugin',
  version: '1.0.0',
  setup(context) {
    // Access host services
    const db = context.host.db;
    const logger = context.host.logger;
    const config = context.host.config;
    
    // Register action using legacy database
    context.actions.registerAction({
      id: 'data:load',
      handler: async (params) => {
        logger.log('Loading data...');
        const results = await db.query('SELECT * FROM users');
        return results;
      }
    });
    
    // Use introspection for debugging
    context.actions.registerAction({
      id: 'debug:info',
      handler: () => {
        const metadata = context.introspect.getMetadata();
        logger.log(`Runtime v${metadata.runtimeVersion}`);
        logger.log(`Actions: ${metadata.totalActions}`);
        logger.log(`Plugins: ${metadata.totalPlugins}`);
        
        const actions = context.introspect.listActions();
        logger.log(`Available actions: ${actions.join(', ')}`);
        
        return metadata;
      }
    });
  }
};

// Initialize runtime
runtime.registerPlugin(dataPlugin);
await runtime.initialize();

const context = runtime.getContext();

// Use the plugin
const data = await context.actions.runAction('data:load');
const debugInfo = await context.actions.runAction('debug:info');

// Introspection from outside plugins
console.log('All registered actions:', context.introspect.listActions());
console.log('All registered plugins:', context.introspect.listPlugins());

const actionMeta = context.introspect.getActionDefinition('data:load');
console.log('Action metadata:', actionMeta);
// { id: 'data:load', timeout: undefined }

// Host context is immutable
try {
  context.host.newService = {}; // ❌ Throws TypeError
} catch (error) {
  console.log('Host context is immutable:', error.message);
}

// Cleanup
await runtime.shutdown();
```

**Key Points:**

1. **Host Context Injection**: Legacy services are injected via `hostContext` option
2. **Plugin Access**: Plugins access services via `context.host`
3. **Immutability**: Host context is frozen to prevent mutation
4. **Introspection**: Query runtime state via `context.introspect`
5. **Metadata Only**: Introspection returns metadata without function implementations
6. **Deep Freeze**: All introspection results are deeply frozen

---

## Event Reference

### Built-in Events

The runtime emits the following built-in events:

#### `runtime:initialized`

Emitted after successful runtime initialization.

**Data:**
```typescript
{
  context: RuntimeContext
}
```

**Example:**
```typescript
ctx.events.on("runtime:initialized", (data) => {
  console.log("Runtime initialized");
});
```

#### `runtime:shutdown`

Emitted at the start of runtime shutdown.

**Data:**
```typescript
{
  context: RuntimeContext
}
```

**Example:**
```typescript
ctx.events.on("runtime:shutdown", (data) => {
  console.log("Runtime shutting down");
});
```

---

## Best Practices

### Plugin Development

1. **Always provide a dispose callback** for cleanup
2. **Use unregister functions** returned from registration methods
3. **Handle errors gracefully** in event handlers
4. **Use typed actions** for better type safety
5. **Namespace your screen and action IDs** (e.g., "myplugin:screen-name")

### Host Context Injection

1. **DO inject stateless services**: Database connections, HTTP clients, loggers, configuration
2. **DON'T inject request-scoped data**: User sessions, request objects, temporary state
3. **DON'T inject large objects**: Keep host context under 1MB for performance
4. **Wrap functions in objects**: Instead of `{ fn: () => {} }`, use `{ service: { fn: () => {} } }`
5. **Treat as immutable**: Never attempt to modify `context.host` in plugins

### Introspection Usage

1. **Use for debugging and tooling**: Admin dashboards, development tools, monitoring
2. **Don't rely on implementation details**: Metadata excludes functions intentionally
3. **Handle null returns**: Resources may not exist, always check for null
4. **Leverage deep freeze**: Returned objects are safe to pass around without copying
5. **Query efficiently**: Introspection is fast (< 1ms) but avoid unnecessary queries in hot paths

### Error Handling

1. **Catch specific error types** for better error handling
2. **Use try-catch** around action execution
3. **Log errors** appropriately
4. **Provide context** in error messages

### Performance

1. **Use O(1) lookups** - all registries use Map-based storage
2. **Unregister unused handlers** to prevent memory leaks
3. **Use action timeouts** for long-running operations
4. **Batch event emissions** when possible

### Testing

1. **Create isolated runtime instances** for each test
2. **Always shutdown** runtime after tests
3. **Test plugin lifecycle** (setup and dispose)
4. **Mock UI providers** for testing
5. **Test error scenarios** explicitly

---

## TypeScript Configuration

For best TypeScript experience, ensure your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true
  }
}
```

---

## Module System

Skeleton Crew uses **ESM (ES Modules)**. All imports must use `.js` extensions:

```typescript
// Correct
import { Runtime } from "./runtime.js";

// Incorrect
import { Runtime } from "./runtime";
```

---

**For more examples, see the `/example` folder in the repository.**
