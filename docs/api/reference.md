# Skeleton Crew Runtime - API Reference v0.3.2

Complete API documentation for Skeleton Crew Runtime v0.3.2 including all TypeScript interfaces, classes, methods, and types with full generic support.

## What's New in v0.3.2+

- **Service Locator (v0.3.1)** - Type-safe inter-plugin communication via `ctx.services`
- **Config Validation (v0.3.0)** - Validate plugin configuration with detailed error reporting
- **Introspection (v0.3.0)** - Enhanced runtime metadata and discovery API
- **Plugin Discovery (v0.2.1)** - Automatic plugin loading from file paths and npm packages
- **Dependency Resolution (v0.2.1)** - Automatic topological sorting for plugin initialization
- **Generic Runtime/Context** - Full TypeScript generic support for type-safe configuration
- **Sync Config Access** - Direct synchronous access to configuration via `ctx.config`


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
- [v0.2.0 Migration Examples](#v020-migration-examples)

---

## Core Classes

### Runtime

The main orchestrator that coordinates all subsystems. Handles initialization, shutdown, and lifecycle state tracking. **v0.2.0 adds full generic support for type-safe configuration.**

#### Constructor

```typescript
constructor<TConfig = Record<string, unknown>>(options?: RuntimeOptions<TConfig>)
```

Creates a new Runtime instance with optional configuration.

**Type Parameters:**
- `TConfig`: Configuration object type (defaults to `Record<string, unknown>`)

**Parameters:**
- `options` (optional): Runtime configuration options
  - `options.logger` (optional): Custom logger implementation (defaults to `ConsoleLogger`)
  - `options.hostContext` (optional): Host application services to inject (defaults to empty object)
  - `options.config` (optional): **[NEW v0.2.0]** Runtime configuration object
  - `options.enablePerformanceMonitoring` (optional): Enable performance monitoring
  - `options.pluginPaths` (optional): **[NEW v0.2.1]** Paths to plugin files or directories
  - `options.pluginPackages` (optional): **[NEW v0.2.1]** npm package names to load as plugins

**Example:**
```typescript
import { Runtime, ConsoleLogger } from "skeleton-crew";

// v0.2.0: Define your config interface
interface MyAppConfig {
  apiUrl: string;
  apiKey: string;
  features: {
    analytics: boolean;
    debugging: boolean;
  };
}

// v0.2.0: Create typed runtime
const runtime = new Runtime<MyAppConfig>({
  config: {
    apiUrl: 'https://api.example.com',
    apiKey: process.env.API_KEY!,
    features: {
      analytics: true,
      debugging: process.env.NODE_ENV === 'development'
    }
  },
  logger: new ConsoleLogger()
});

// Legacy usage still works (backward compatible)
const legacyRuntime = new Runtime({
  hostContext: {
    db: databaseConnection,
    logger: applicationLogger
  }
});
```

#### Methods

##### `registerPlugin(plugin: PluginDefinition<TConfig>): void`

Registers a plugin before initialization. Plugins registered this way will have their setup callbacks executed during `initialize()`. **v0.2.0 adds dependency resolution.**

**Parameters:**
- `plugin`: The plugin definition to register (now with optional dependencies)

**Throws:**
- `Error` if runtime is already initialized
- `Error` if plugin dependencies cannot be resolved

**Example:**
```typescript
// v0.2.0: Plugin with dependencies
runtime.registerPlugin({
  name: "data-plugin",
  version: "1.0.0",
  dependencies: ['config', 'logger'], // Will initialize after these plugins
  setup(ctx: RuntimeContext<MyAppConfig>) {
    // ctx.config is fully typed!
    const { apiUrl, apiKey } = ctx.config;
    ctx.logger.info(`Data plugin connecting to ${apiUrl}`);
  }
});

// Legacy plugin still works
runtime.registerPlugin({
  name: "legacy-plugin",
  version: "1.0.0",
  setup(ctx) {
    // Works without types
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

##### `getContext(): RuntimeContext<TConfig>`

Returns the RuntimeContext for this runtime instance. **v0.2.0 returns fully typed context.**

**Returns:** The RuntimeContext with full type information

**Throws:**
- `Error` if runtime is not initialized

**Example:**
```typescript
const ctx = runtime.getContext(); // Fully typed in v0.2.0
const config = ctx.config; // Type-safe access to configuration
```

##### `getConfig(): Readonly<TConfig>`

**[NEW v0.2.0]** Returns the runtime configuration object.

**Returns:** Readonly configuration object

**Example:**
```typescript
const config = runtime.getConfig();
// config is typed as Readonly<MyAppConfig>
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

##### `services`
**[NEW v0.3.1]**

Exposes the Service Locator API for type-safe inter-plugin communication.

**Methods:**
- `register<T>(name: string, service: T): void` - Registers a service
- `get<T>(name: string): T` - Retrieves a service (throws if not found)
- `has(name: string): boolean` - Checks if a service exists
- `list(): string[]` - Lists all registered services

**Example:**
```typescript
// Register a service
ctx.services.register('my-api', {
  doSomething: () => console.log('Hello')
});

// Consume a service
if (ctx.services.has('my-api')) {
  const api = ctx.services.get<MyApi>('my-api');
  api.doSomething();
}
```

##### `introspect`

Exposes the introspection API for querying runtime metadata. **v0.3.0 adds enhanced metadata including `getMetadata()` override.**

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

### DirectoryPluginLoader

**[NEW v0.2.1]** Handles automatic plugin discovery and loading from file paths and npm packages.

#### Constructor

```typescript
constructor(logger: Logger)
```

Creates a new DirectoryPluginLoader instance with the specified logger.

#### Methods

##### loadPlugins

```typescript
async loadPlugins(
  pluginPaths?: string[], 
  pluginPackages?: string[]
): Promise<PluginDefinition[]>
```

Loads plugins from specified paths and packages.

**Parameters:**
- `pluginPaths` (optional): Array of file paths or directory paths to scan for plugins
- `pluginPackages` (optional): Array of npm package names to load as plugins

**Returns:** Promise resolving to array of loaded plugin definitions

**Example:**

```typescript
import { DirectoryPluginLoader, ConsoleLogger } from 'skeleton-crew';

const loader = new DirectoryPluginLoader(new ConsoleLogger());

// Load from paths and packages
const plugins = await loader.loadPlugins(
  ['./plugins', './custom/auth-plugin.js'],
  ['@my-org/plugin-auth', 'shared-utils-plugin']
);

// Register loaded plugins
for (const plugin of plugins) {
  runtime.registerPlugin(plugin);
}
```

**Plugin Discovery Rules:**

1. **File Extensions**: Recognizes `.js`, `.mjs`, and `.ts` files as potential plugins
2. **Directory Scanning**: Recursively scans directories for plugin files
3. **Exclusions**: Ignores `node_modules`, `dist`, test files (`*.test.*`, `*.spec.*`)
4. **Export Patterns**: Looks for plugins in `default`, `plugin`, or module root exports
5. **Validation**: Validates plugin structure (name, version, setup function required)
6. **Error Handling**: Logs errors but continues loading other plugins

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
interface PluginDefinition<TConfig = Record<string, unknown>> {
  name: string;
  version: string;
  dependencies?: string[];
  configKeys?: string[];
  validateConfig?: (config: TConfig) => boolean | ConfigValidationResult | Promise<boolean | ConfigValidationResult>;
  setup: (context: RuntimeContext<TConfig>) => void | Promise<void>;
  dispose?: (context: RuntimeContext<TConfig>) => void | Promise<void>;
}
```

**Properties:**
- `name` (required): Unique plugin identifier
- `version` (required): Plugin version string
- `dependencies` (optional): **[NEW v0.2.1]** Array of plugin names this plugin depends on (auto-sorted)
- `configKeys` (optional): **[NEW v0.3.0]** Array of config keys this plugin uses (for documentation)
- `validateConfig` (optional): **[NEW v0.3.0]** Function to validate configuration before setup
- `setup` (required): Setup callback executed during initialization
- `dispose` (optional): Cleanup callback executed during shutdown

**Example:**
```typescript
const myPlugin: PluginDefinition<MyConfig> = {
  name: "my-plugin",
  version: "1.0.0",
  dependencies: ["auth"], // Wait for auth plugin
  
  // v0.3.0: Validate config
  validateConfig(config) {
    if (!config.apiKey) {
      return { valid: false, errors: ["Missing API Key"] };
    }
    return true;
  },

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
interface RuntimeOptions<TConfig = Record<string, unknown>> {
  logger?: Logger;
  hostContext?: Record<string, unknown>;
  config?: TConfig;
  enablePerformanceMonitoring?: boolean;
  
  // Plugin Discovery Options (v0.2.1)
  pluginPaths?: string[];
  pluginPackages?: string[];
}
```

**Properties:**
- `logger` (optional): Custom logger implementation (defaults to `ConsoleLogger`)
- `hostContext` (optional): Host application services to inject into the runtime (defaults to empty object)
- `config` (optional): **[NEW v0.2.0]** Runtime configuration object for type-safe access
- `enablePerformanceMonitoring` (optional): Enable performance monitoring and metrics collection
- `pluginPaths` (optional): **[NEW v0.2.1]** Array of file paths or directories to load plugins from
- `pluginPackages` (optional): **[NEW v0.2.1]** Array of npm package names to load as plugins

**Host Context Usage:**

The `hostContext` option enables legacy applications to inject existing services into the runtime, allowing plugins to access these services without tight coupling. This is particularly useful for incremental migration scenarios.

**Plugin Discovery Options (v0.2.1):**

The `pluginPaths` and `pluginPackages` options enable automatic plugin discovery and loading:

- `pluginPaths`: Specify file paths or directories containing plugin files. The runtime will automatically load and register plugins from these locations.
- `pluginPackages`: Specify npm package names to load as plugins. Useful for loading published plugin packages.

**Plugin Discovery Examples:**

```typescript
// Load plugins from directories and files
const runtime = new Runtime({
  pluginPaths: [
    './plugins',                    // Load all plugins from directory
    './custom-plugins/auth.js',     // Load specific plugin file
    '../shared/plugins'             // Load from relative path
  ]
});

// Load plugins from npm packages
const runtime = new Runtime({
  pluginPackages: [
    '@my-org/plugin-auth',          // Scoped package
    'my-custom-plugin',             // Regular package
    '@company/shared-plugins'       // Organization package
  ]
});

// Combine both approaches
const runtime = new Runtime({
  pluginPaths: ['./local-plugins'],
  pluginPackages: ['@my-org/plugin-auth'],
  config: { apiUrl: 'https://api.example.com' }
});

await runtime.initialize(); // Plugins loaded automatically
```

**Plugin Discovery Behavior:**

1. **File Discovery**: For `pluginPaths`, the runtime scans for `.js`, `.mjs`, and `.ts` files
2. **Package Loading**: For `pluginPackages`, the runtime uses dynamic imports to load npm packages
3. **Validation**: All discovered plugins are validated before registration
4. **Error Handling**: Invalid plugins are logged but don't stop the initialization process
5. **Load Order**: Discovered plugins are loaded before manually registered plugins
- `pluginPackages`: Specify npm package names that export plugins. The runtime will dynamically import and register these packages as plugins.

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
  },
  
  // v0.2.1: Automatic plugin discovery
  pluginPaths: [
    './plugins/core-plugin.js',
    './plugins/custom/',  // Load all plugins from directory
    '/absolute/path/to/plugin.js'
  ],
  pluginPackages: [
    '@myorg/analytics-plugin',
    'skeleton-crew-ui-plugin',
    'my-custom-plugin-package'
  ],
  
  // v0.2.0: Type-safe configuration
  config: {
    apiUrl: 'https://api.example.com',
    features: {
      analytics: true,
      debugging: process.env.NODE_ENV === 'development'
    }
  },
  
  enablePerformanceMonitoring: true
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

**Plugin Discovery Best Practices (v0.2.1):**
- ✅ DO use relative paths for project-local plugins: `'./plugins/my-plugin.js'`
- ✅ DO use absolute paths for system-wide plugins: `'/usr/local/lib/plugins/system-plugin.js'`
- ✅ DO specify directories to load all plugins: `'./plugins/'` (loads all `.js` files)
- ✅ DO use published npm packages: `'@myorg/analytics-plugin'`
- ❌ DON'T mix plugin discovery with manual registration (choose one approach)
- ❌ DON'T use plugin discovery in production without proper validation
- ❌ DON'T load untrusted plugins from arbitrary paths

**Host Context Best Practices:**
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

### ConfigValidationResult

**[NEW v0.3.0]**

Result interface for the `validateConfig` plugin hook.

```typescript
interface ConfigValidationResult {
  valid: boolean;
  errors?: string[];
}
```

**Properties:**
- `valid` (required): Boolean indicating if configuration is valid
- `errors` (optional): Array of error message strings if invalid

**Example:**
```typescript
const result: ConfigValidationResult = {
  valid: false,
  errors: ["Missing API Key", "Invalid timeout value"]
};
```

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

## Plugin Discovery (v0.2.1)

Skeleton Crew Runtime v0.2.1 introduces automatic plugin discovery capabilities, allowing you to load plugins from file paths and npm packages without manual registration.

### Plugin Discovery Options

#### `pluginPaths: string[]`

Automatically load plugins from specified file paths or directories.

**Supported Formats:**
- **Single File**: `'./plugins/my-plugin.js'` - Load specific plugin file
- **Directory**: `'./plugins/'` - Load all `.js` files from directory (non-recursive)
- **Absolute Path**: `'/usr/local/lib/plugins/system-plugin.js'` - Load from absolute path
- **Glob Patterns**: `'./plugins/**/*.plugin.js'` - Load files matching pattern

**Example:**
```typescript
const runtime = new Runtime({
  pluginPaths: [
    './plugins/core-plugin.js',        // Single file
    './plugins/custom/',               // Directory (all .js files)
    '/absolute/path/to/plugin.js',     // Absolute path
    './plugins/**/*.plugin.js'         // Glob pattern
  ]
});
```

#### `pluginPackages: string[]`

Automatically load plugins from npm packages.

**Supported Formats:**
- **Package Name**: `'my-plugin-package'` - Load from node_modules
- **Scoped Package**: `'@myorg/analytics-plugin'` - Load scoped package
- **Version Specific**: `'plugin-name@1.2.3'` - Load specific version (if available)

**Example:**
```typescript
const runtime = new Runtime({
  pluginPackages: [
    '@myorg/analytics-plugin',
    'skeleton-crew-ui-plugin',
    'my-custom-plugin-package'
  ]
});
```

### Plugin Discovery Workflow

1. **Discovery Phase** (during `runtime.initialize()`):
   - Resolve all paths in `pluginPaths`
   - Import all packages in `pluginPackages`
   - Validate plugin exports
   - Register discovered plugins

2. **Registration Phase**:
   - Manually registered plugins (via `registerPlugin()`)
   - Auto-discovered plugins (from paths and packages)
   - Dependency resolution across all plugins

3. **Initialization Phase**:
   - Execute plugin setup callbacks in dependency order

### Plugin Export Requirements

For automatic discovery, plugins must export a default plugin definition:

**ES Module Export:**
```typescript
// my-plugin.js
import { PluginDefinition } from 'skeleton-crew';

const myPlugin: PluginDefinition = {
  name: 'my-plugin',
  version: '1.0.0',
  setup(ctx) {
    // Plugin logic
  }
};

export default myPlugin;
```

**CommonJS Export:**
```javascript
// my-plugin.js
module.exports = {
  name: 'my-plugin',
  version: '1.0.0',
  setup(ctx) {
    // Plugin logic
  }
};
```

### Complete Plugin Discovery Example

```typescript
import { Runtime } from 'skeleton-crew';

// Create runtime with mixed plugin loading strategies
const runtime = new Runtime({
  // Automatic discovery
  pluginPaths: [
    './plugins/core/',              // Load all plugins from directory
    './plugins/analytics.plugin.js', // Specific analytics plugin
    './custom/special-plugin.js'    // Custom plugin
  ],
  
  pluginPackages: [
    '@myorg/ui-plugin',            // Organization plugin
    'skeleton-crew-logger-plugin', // Community plugin
    'my-data-plugin'               // Custom npm package
  ],
  
  // Configuration for discovered plugins
  config: {
    analytics: {
      enabled: true,
      apiKey: process.env.ANALYTICS_KEY
    },
    ui: {
      theme: 'dark',
      animations: true
    }
  }
});

// Manual plugin registration (optional - can mix with discovery)
const customPlugin = {
  name: 'custom-manual-plugin',
  version: '1.0.0',
  dependencies: ['analytics'], // Can depend on discovered plugins
  setup(ctx) {
    ctx.logger.info('Manual plugin initialized');
  }
};

runtime.registerPlugin(customPlugin);

// Initialize - discovers and registers all plugins
await runtime.initialize();

const ctx = runtime.getContext();

// All plugins (discovered + manual) are now available
console.log('Loaded plugins:', ctx.introspect.listPlugins());
// ['analytics', 'ui-plugin', 'logger-plugin', 'data-plugin', 'custom-manual-plugin']
```

### Security Considerations

**File System Access:**
- Plugin discovery requires file system access
- Only load plugins from trusted directories
- Validate plugin sources in production environments
- Consider using allowlists for production deployments

**Package Loading:**
- npm packages are loaded from `node_modules`
- Ensure packages are from trusted sources
- Use package-lock.json to pin versions
- Audit dependencies regularly

---

## Performance Monitoring

Skeleton Crew Runtime includes optional performance monitoring utilities designed to have near-zero overhead when not in use.

### PerformanceMonitor Interface

```typescript
interface PerformanceMonitor {
  startTimer(label: string): () => number;
  recordMetric(name: string, value: number): void;
  getMetrics(): Record<string, number>;
}
```

**Methods:**
- `startTimer(label: string)`: Returns a function that, when called, records the elapsed time
- `recordMetric(name: string, value: number)`: Records a custom metric value
- `getMetrics()`: Returns all recorded metrics as a key-value object

### Performance Monitor Implementations

#### NoOpPerformanceMonitor

Production-ready no-op implementation with zero overhead.

```typescript
import { NoOpPerformanceMonitor } from 'skeleton-crew';

const monitor = new NoOpPerformanceMonitor();
const timer = monitor.startTimer('operation'); // No-op
timer(); // Returns 0
monitor.recordMetric('custom', 123); // No-op
console.log(monitor.getMetrics()); // {}
```

#### SimplePerformanceMonitor

Development implementation that records actual performance metrics.

```typescript
import { SimplePerformanceMonitor } from 'skeleton-crew';

const monitor = new SimplePerformanceMonitor();

// Time an operation
const timer = monitor.startTimer('database-query');
await performDatabaseQuery();
const duration = timer(); // Returns actual duration in milliseconds

// Record custom metrics
monitor.recordMetric('users-loaded', 150);
monitor.recordMetric('cache-hits', 42);

// Get all metrics
console.log(monitor.getMetrics());
// { 'database-query': 245.67, 'users-loaded': 150, 'cache-hits': 42 }
```

### Factory Function

#### createPerformanceMonitor(enabled?: boolean)

Creates the appropriate performance monitor based on environment.

```typescript
import { createPerformanceMonitor } from 'skeleton-crew';

// Development - enabled monitoring
const devMonitor = createPerformanceMonitor(true);
// Returns SimplePerformanceMonitor

// Production - disabled monitoring (default)
const prodMonitor = createPerformanceMonitor(false);
// Returns NoOpPerformanceMonitor

// Auto-detect from environment
const monitor = createPerformanceMonitor(process.env.NODE_ENV === 'development');
```

### Runtime Integration

Enable performance monitoring via RuntimeOptions:

```typescript
import { Runtime, createPerformanceMonitor } from 'skeleton-crew';

const runtime = new Runtime({
  enablePerformanceMonitoring: true, // Enables SimplePerformanceMonitor
  
  // Or provide custom monitor
  performanceMonitor: createPerformanceMonitor(process.env.ENABLE_METRICS === 'true')
});
```

### Usage in Plugins

Access performance monitoring through the runtime context:

```typescript
const myPlugin: PluginDefinition = {
  name: 'data-plugin',
  version: '1.0.0',
  setup(ctx) {
    ctx.actions.registerAction({
      id: 'data:load',
      handler: async (params) => {
        // Time the operation (works with both monitor types)
        const timer = ctx.performance?.startTimer('data-load');
        
        try {
          const data = await loadData(params);
          
          // Record custom metrics
          ctx.performance?.recordMetric('records-loaded', data.length);
          
          return data;
        } finally {
          // Record timing
          const duration = timer?.() ?? 0;
          ctx.logger.debug(`Data load took ${duration}ms`);
        }
      }
    });
  }
};
```

### Best Practices

**Development:**
```typescript
// ✅ Enable monitoring in development
const runtime = new Runtime({
  enablePerformanceMonitoring: process.env.NODE_ENV === 'development'
});
```

**Production:**
```typescript
// ✅ Disable monitoring in production (default)
const runtime = new Runtime({
  enablePerformanceMonitoring: false // or omit entirely
});
```

**Plugin Usage:**
```typescript
// ✅ Safe usage - works with both monitor types
const timer = ctx.performance?.startTimer('operation');
const result = await performOperation();
const duration = timer?.() ?? 0;

// ✅ Conditional metrics
if (ctx.performance) {
  ctx.performance.recordMetric('custom-metric', value);
}
```

**Performance Impact:**
- **NoOpPerformanceMonitor**: Zero overhead, all methods are no-ops
- **SimplePerformanceMonitor**: Minimal overhead, uses `performance.now()`
- **Memory Usage**: SimplePerformanceMonitor stores metrics in memory
- **Thread Safety**: Both implementations are safe for single-threaded JavaScript

---

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

## v0.2.0 Migration Examples

### Complete Migration Example: Browser Extension

This example shows migrating from v0.1.x to v0.2.0 with full type safety and modern patterns.

#### Before (v0.1.x)

```typescript
// Old way - no types, host context injection
import { Runtime } from 'skeleton-crew';

const runtime = new Runtime({
  hostContext: {
    config: {
      host: 'localhost:3000',
      jobId: 'job-123',
      workDir: '/tmp/work',
      token: 'abc123'
    }
  }
});

const downloaderPlugin = {
  name: 'downloader',
  version: '1.0.0',
  setup(ctx) {
    // ❌ No type safety - requires casting
    const config = (ctx.host.config as any);
    const { jobId, workDir } = config;
    
    ctx.actions.registerAction({
      id: 'download:start',
      handler: async (params) => {
        // ❌ No type safety on params or return
        console.log(`Downloading to ${workDir}`);
        return { success: true };
      }
    });
  }
};

runtime.registerPlugin(downloaderPlugin);
await runtime.initialize();
```

#### After (v0.2.0)

```typescript
// New way - full type safety, clean architecture
import { Runtime, PluginDefinition, RuntimeContext } from 'skeleton-crew';

// ✅ Define your config interface
interface PreviewConfig {
  host: string;
  jobId: string;
  workDir: string;
  token?: string;
}

// ✅ Define typed parameters and results
interface DownloadParams {
  url: string;
  filename: string;
}

interface DownloadResult {
  success: boolean;
  path: string;
  size: number;
}

// ✅ Create typed runtime
const runtime = new Runtime<PreviewConfig>({
  config: {
    host: 'localhost:3000',
    jobId: 'job-123',
    workDir: '/tmp/work',
    token: 'abc123'
  }
});

// ✅ Fully typed plugin
const downloaderPlugin: PluginDefinition<PreviewConfig> = {
  name: 'downloader',
  version: '1.0.0',
  dependencies: ['config'], // ✅ Explicit dependencies
  setup(ctx: RuntimeContext<PreviewConfig>) {
    // ✅ Full type safety - no casting needed!
    const { jobId, workDir, token } = ctx.config;
    ctx.logger.info(`Downloader initialized for job: ${jobId}`);
    
    // ✅ Type-safe action registration
    ctx.actions.registerAction<DownloadParams, DownloadResult>({
      id: 'download:start',
      handler: async (params, ctx) => {
        // ✅ params is typed as DownloadParams
        // ✅ return must match DownloadResult
        const { url, filename } = params;
        const fullPath = `${ctx.config.workDir}/${filename}`;
        
        ctx.logger.info(`Downloading ${url} to ${fullPath}`);
        
        // Simulate download
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return {
          success: true,
          path: fullPath,
          size: 1024
        };
      },
      timeout: 30000
    });
  }
};

runtime.registerPlugin(downloaderPlugin);
await runtime.initialize();

// ✅ Type-safe action execution
const result = await runtime.getContext().actions.runAction<DownloadParams, DownloadResult>(
  'download:start',
  { url: 'https://example.com/file.zip', filename: 'download.zip' }
);

console.log(`Downloaded ${result.size} bytes to ${result.path}`);
```

### Plugin Dependencies Example

```typescript
interface AppConfig {
  database: {
    url: string;
    maxConnections: number;
  };
  cache: {
    ttl: number;
    maxSize: number;
  };
}

const runtime = new Runtime<AppConfig>({
  config: {
    database: {
      url: 'postgresql://localhost:5432/myapp',
      maxConnections: 10
    },
    cache: {
      ttl: 3600,
      maxSize: 1000
    }
  }
});

// Base plugin - no dependencies
const configPlugin: PluginDefinition<AppConfig> = {
  name: 'config',
  version: '1.0.0',
  setup(ctx) {
    ctx.logger.info('Config plugin initialized');
    
    ctx.actions.registerAction({
      id: 'config:get',
      handler: () => ctx.config
    });
  }
};

// Database plugin - depends on config
const databasePlugin: PluginDefinition<AppConfig> = {
  name: 'database',
  version: '1.0.0',
  dependencies: ['config'], // ✅ Will initialize after config
  setup(ctx) {
    const { database } = ctx.config;
    ctx.logger.info(`Connecting to database: ${database.url}`);
    
    ctx.actions.registerAction({
      id: 'db:query',
      handler: async (sql: string) => {
        // Database query logic
        return [];
      }
    });
  }
};

// Cache plugin - depends on config
const cachePlugin: PluginDefinition<AppConfig> = {
  name: 'cache',
  version: '1.0.0',
  dependencies: ['config'], // ✅ Will initialize after config
  setup(ctx) {
    const { cache } = ctx.config;
    ctx.logger.info(`Cache initialized with TTL: ${cache.ttl}s`);
    
    ctx.actions.registerAction({
      id: 'cache:get',
      handler: async (key: string) => {
        // Cache get logic
        return null;
      }
    });
  }
};

// Data service - depends on both database and cache
const dataServicePlugin: PluginDefinition<AppConfig> = {
  name: 'data-service',
  version: '1.0.0',
  dependencies: ['database', 'cache'], // ✅ Will initialize after both
  setup(ctx) {
    ctx.logger.info('Data service initialized');
    
    ctx.actions.registerAction({
      id: 'data:getUser',
      handler: async (userId: string) => {
        // Try cache first
        const cached = await ctx.actions.runAction('cache:get', `user:${userId}`);
        if (cached) return cached;
        
        // Query database
        const user = await ctx.actions.runAction('db:query', `SELECT * FROM users WHERE id = '${userId}'`);
        
        // Cache result
        await ctx.actions.runAction('cache:set', { key: `user:${userId}`, value: user });
        
        return user;
      }
    });
  }
};

// Register in any order - dependencies will be resolved
runtime.registerPlugin(dataServicePlugin);  // Depends on database, cache
runtime.registerPlugin(cachePlugin);        // Depends on config
runtime.registerPlugin(configPlugin);       // No dependencies
runtime.registerPlugin(databasePlugin);     // Depends on config

// ✅ Initialization order will be: config → database, cache → data-service
await runtime.initialize();
```

### Sync vs Async Access Patterns

```typescript
interface MyConfig {
  apiUrl: string;
  retryCount: number;
  timeout: number;
}

const myPlugin: PluginDefinition<MyConfig> = {
  name: 'api-client',
  version: '1.0.0',
  setup(ctx) {
    // ✅ v0.2.0: Synchronous config access
    const { apiUrl, retryCount, timeout } = ctx.config;
    
    // ✅ No need for async config loading
    const client = new ApiClient({
      baseURL: apiUrl,
      timeout: timeout,
      retries: retryCount
    });
    
    ctx.actions.registerAction({
      id: 'api:request',
      handler: async (params: { endpoint: string; data?: any }) => {
        // Config is always available synchronously
        ctx.logger.info(`Making request to ${ctx.config.apiUrl}${params.endpoint}`);
        return await client.request(params.endpoint, params.data);
      }
    });
    
    // ✅ Config access in event handlers
    ctx.events.on('api:error', (error) => {
      ctx.logger.error(`API error (${ctx.config.apiUrl}):`, error);
    });
  }
};
```

### Real-World Migration: Express.js Application

```typescript
// v0.2.0: Clean, typed Express integration
interface ServerConfig {
  port: number;
  cors: {
    origins: string[];
    credentials: boolean;
  };
  database: {
    url: string;
    pool: {
      min: number;
      max: number;
    };
  };
  auth: {
    jwtSecret: string;
    tokenExpiry: string;
  };
}

const runtime = new Runtime<ServerConfig>({
  config: {
    port: parseInt(process.env.PORT || '3000'),
    cors: {
      origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true
    },
    database: {
      url: process.env.DATABASE_URL!,
      pool: {
        min: 2,
        max: 10
      }
    },
    auth: {
      jwtSecret: process.env.JWT_SECRET!,
      tokenExpiry: '24h'
    }
  }
});

// Database plugin
const databasePlugin: PluginDefinition<ServerConfig> = {
  name: 'database',
  version: '1.0.0',
  setup(ctx) {
    const { database } = ctx.config;
    
    // Initialize database with typed config
    const pool = new Pool({
      connectionString: database.url,
      min: database.pool.min,
      max: database.pool.max
    });
    
    ctx.actions.registerAction({
      id: 'db:query',
      handler: async (sql: string, params?: any[]) => {
        const client = await pool.connect();
        try {
          const result = await client.query(sql, params);
          return result.rows;
        } finally {
          client.release();
        }
      }
    });
  }
};

// Auth plugin
const authPlugin: PluginDefinition<ServerConfig> = {
  name: 'auth',
  version: '1.0.0',
  dependencies: ['database'],
  setup(ctx) {
    const { auth } = ctx.config;
    
    ctx.actions.registerAction({
      id: 'auth:login',
      handler: async (credentials: { email: string; password: string }) => {
        const users = await ctx.actions.runAction('db:query', 
          'SELECT * FROM users WHERE email = $1', [credentials.email]);
        
        if (users.length === 0) {
          throw new Error('User not found');
        }
        
        // Verify password, generate JWT with typed config
        const token = jwt.sign({ userId: users[0].id }, auth.jwtSecret, {
          expiresIn: auth.tokenExpiry
        });
        
        return { token, user: users[0] };
      }
    });
  }
};

// API routes plugin
const apiPlugin: PluginDefinition<ServerConfig> = {
  name: 'api',
  version: '1.0.0',
  dependencies: ['database', 'auth'],
  setup(ctx) {
    const { cors } = ctx.config;
    
    // Configure CORS with typed config
    const corsOptions = {
      origin: cors.origins,
      credentials: cors.credentials
    };
    
    ctx.actions.registerAction({
      id: 'api:setup',
      handler: (app: Express) => {
        app.use(cors(corsOptions));
        
        app.post('/api/login', async (req, res) => {
          try {
            const result = await ctx.actions.runAction('auth:login', req.body);
            res.json(result);
          } catch (error) {
            res.status(401).json({ error: error.message });
          }
        });
        
        app.get('/api/users', async (req, res) => {
          const users = await ctx.actions.runAction('db:query', 'SELECT * FROM users');
          res.json(users);
        });
      }
    });
  }
};

// Initialize and start server
runtime.registerPlugin(databasePlugin);
runtime.registerPlugin(authPlugin);
runtime.registerPlugin(apiPlugin);

await runtime.initialize();

const app = express();
app.use(express.json());

// Setup API routes
await runtime.getContext().actions.runAction('api:setup', app);

// Start server with typed config
const { port } = runtime.getConfig();
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
```

### Migration Benefits Summary

**v0.1.x → v0.2.0 Benefits:**

1. **Type Safety**
   - ❌ Before: `(ctx.host.config as any).apiUrl`
   - ✅ After: `ctx.config.apiUrl` (fully typed)

2. **Developer Experience**
   - ❌ Before: No IDE autocomplete, runtime errors
   - ✅ After: Full IntelliSense, compile-time errors

3. **Plugin Dependencies**
   - ❌ Before: Manual initialization order management
   - ✅ After: Automatic dependency resolution

4. **Configuration Access**
   - ❌ Before: Async host context access
   - ✅ After: Synchronous typed config access

5. **Error Prevention**
   - ❌ Before: Runtime type errors, missing properties
   - ✅ After: Compile-time validation, required properties

**Migration Effort:** Minimal - mostly adding type annotations and moving from `hostContext` to `config`.

---

**For more examples, see the `/example` folder in the repository.**
