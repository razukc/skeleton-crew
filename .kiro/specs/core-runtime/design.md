# Design Document

## Overview

The Core Runtime is implemented as a class-based system that orchestrates four required subsystems and one optional subsystem. The design prioritizes instance isolation, deterministic initialization, and zero UI dependencies. Each subsystem is implemented as an independent module with a well-defined API surface exposed through the Runtime Context.

The runtime follows a strict initialization sequence with fail-fast error handling during setup and graceful degradation during shutdown. All registries use Map-based storage for O(1) lookup performance. Plugin lifecycle is managed through async-aware sequential execution with careful tracking of successfully initialized plugins.

## Architecture

### High-Level Structure

```
Runtime (main orchestrator)
├── PluginRegistry (manages plugin definitions and lifecycle)
├── ScreenRegistry (stores and retrieves screen definitions)
├── ActionEngine (stores actions and executes handlers)
├── EventBus (publish-subscribe event system)
├── UIBridge (optional, manages UI Provider)
└── RuntimeContext (API facade for subsystems)
```

### Module and Class Structure

The implementation consists of the following core classes:

**Runtime**: Central orchestrator that holds references to all subsystems, handles initialization, shutdown, and lifecycle state tracking.

**RuntimeContext**: Safe access layer passed to actions and plugins. Provides scoped APIs without exposing internal mutable structures.

**PluginRegistry**: Stores plugin definitions and coordinates setup() and dispose() in strict order.

**ScreenRegistry**: Stores screen definitions with duplicate rejection.

**ActionEngine**: Stores and executes action handlers with runtime context propagation.

**EventBus**: Minimal synchronous pub/sub system scoped to runtime instance.

**UIBridge**: Optional subsystem that stores a UI provider implementation and delegates rendering.

### Instance Isolation

Each Runtime instance maintains its own subsystem instances. No global state is shared between instances. Multiple runtime instances can coexist without interference.

```typescript
class Runtime {
  private plugins: PluginRegistry;
  private screens: ScreenRegistry;
  private actions: ActionEngine;
  private events: EventBus;
  private ui: UIBridge;
  private context: RuntimeContext;
  private initialized: boolean;
}
```

## Components and Interfaces

### Runtime

The main orchestrator class responsible for initialization, shutdown, and subsystem coordination.

**Public API:**
- `initialize(): Promise<void>` - Executes initialization sequence
- `shutdown(): Promise<void>` - Executes shutdown sequence
- `getContext(): RuntimeContext` - Returns the runtime context

**Behavioral Rules:**
- initialize() MUST be idempotent and throw if called twice
- shutdown() MUST be idempotent and safe to call multiple times
- Runtime MUST reject plugin registration after initialization completes

**Responsibilities:**
- Create and initialize all subsystems in correct order
- Execute plugin setup callbacks sequentially
- Track successfully initialized plugins
- Handle initialization failures with abort
- Coordinate shutdown sequence with selective disposal
- Manage UI provider registration

### Initialization Sequence

The following steps MUST occur in this strict order:

1. Create PluginRegistry
2. Create ScreenRegistry
3. Create ActionEngine
4. Create EventBus
5. Create RuntimeContext
6. Execute all plugin setup() callbacks in registration order
7. Register UI provider if provided

**Failure Handling:**
- If any plugin fails during setup, initialization aborts immediately
- No subsequent plugin setup occurs after a failure
- Shutdown MUST NOT attempt to dispose plugins that did not successfully initialize

### Shutdown Sequence

Shutdown MUST follow this strict order:

1. Call dispose() ONLY on plugins that successfully completed setup
2. Call disposers in the REVERSE ORDER plugins were set up
3. Clear all registries
4. All subsystem API calls after shutdown MUST throw.
5. Leave runtime in a terminal state

**Error Handling:**
- Errors in disposal MUST NOT interrupt the rest of the shutdown
- Each disposal error is logged but cleanup continues

### PluginRegistry

Manages plugin registration and lifecycle execution.

**Public API:**
```typescript
interface PluginRegistryAPI {
  registerPlugin(plugin: PluginDefinition): void;
  getPlugin(name: string): PluginDefinition | null;
  getAllPlugins(): PluginDefinition[];
}
```

**Internal State:**
- `Map<string, PluginDefinition>` - Plugin storage keyed by name
- `Set<string>` - Tracks successfully initialized plugins (initializedPlugins)

**Responsibilities:**
- Store plugin definitions
- Execute plugin.setup() in registration order
- Allow plugins to register additional plugins during setup
- Track which plugins initialized successfully
- Execute disposal only for initialized plugins

**Important Notes:**
- Plugins may call registerPlugin() during setup (requirement-compliant)
- Plugin initialization is sequential; async setup is awaited
- Disposal MUST occur only for plugins in initializedPlugins set

### ScreenRegistry

Stores and retrieves screen definitions.

**Public API:**
```typescript
interface ScreenRegistryAPI {
  registerScreen(screen: ScreenDefinition): void;
  getScreen(id: string): ScreenDefinition | null;
  getAllScreens(): ScreenDefinition[];
}
```

**Internal State:**
- `Map<string, ScreenDefinition>` - Screen storage keyed by ID

**Responsibilities:**
- Store screen definitions
- Reject duplicate screen IDs
- Provide O(1) lookups
- Clear all screens during shutdown

### ActionEngine

Stores action definitions and executes action handlers.

**Public API:**
```typescript
interface ActionEngineAPI {
  registerAction(action: ActionDefinition): void;
  runAction(id: string, params?: unknown): Promise<unknown>;
}
```

**Internal State:**
- `Map<string, ActionDefinition>` - Action storage keyed by ID
- Reference to RuntimeContext for passing to handlers

**Responsibilities:**
- Store action definitions
- Reject duplicate action IDs
- Execute actions by ID
- Propagate RuntimeContext into handler
- Provide O(1) lookups
- Clear all actions during shutdown

### EventBus

Provides publish-subscribe event communication within a runtime instance.

**Public API:**
```typescript
interface EventBusAPI {
  emit(event: string, data?: unknown): void;
  on(event: string, handler: (data: unknown) => void): () => void;
}
```

**Internal State:**
- `Map<string, Set<Function>>` - Event handlers keyed by event name

**Responsibilities:**
- Minimal synchronous event system local to the runtime
- Emit events to all registered handlers
- Return unsubscribe function from on()
- Ensure handlers are scoped to runtime instance
- Clear all handlers during shutdown

**Behavioral Rules:**
- Event handlers MUST be invoked synchronously when emit is called
- Event Bus MUST NOT buffer or queue events (MLP simplicity)
- Handlers are invoked in registration order

### UIBridge

Manages optional UI provider registration and screen rendering.

**Public API:**
```typescript
interface UIBridgeAPI {
  setProvider(provider: UIProvider): void;
  getProvider(): UIProvider | null;
  renderScreen(screen: ScreenDefinition): unknown;
}
```

**Internal State:**
- `UIProvider | null` - Single UI provider instance

**Responsibilities:**
- Accept a UI provider
- Validate provider implements required methods (mount, render)
- Enable rendering of screens
- Reject duplicate provider registration

**Validation Rules:**
- Duplicate provider registration MUST throw
- Missing render() or mount() MUST throw
- UI provider registration is final; runtime SHALL NOT allow replacement
- renderScreen() without provider MUST throw

### RuntimeContext

Facade that exposes subsystem APIs to plugins and action handlers.

**Public API:**
```typescript
interface RuntimeContext {
  screens: ScreenRegistryAPI;
  actions: ActionEngineAPI;
  plugins: PluginRegistryAPI;
  events: EventBusAPI;
  getRuntime(): Runtime;
}
```

**Rules:**
- Context MUST NOT expose internal maps
- Context is safe to pass to plugins and actions
- Context MUST remain stable after initialization
- Context is passed to plugin.setup(), plugin.dispose(), and action.handler()

## Data Models

### PluginDefinition

```typescript
interface PluginDefinition {
  name: string;
  version: string;
  setup: (context: RuntimeContext) => void | Promise<void>;
  dispose?: (context: RuntimeContext) => void | Promise<void>;
}
```

### ScreenDefinition

```typescript
interface ScreenDefinition {
  id: string;
  title: string;
  component: string;
}
```

### ActionDefinition

```typescript
interface ActionDefinition {
  id: string;
  handler: (params: unknown, context: RuntimeContext) => Promise<unknown> | unknown;
}
```

### UIProvider

```typescript
interface UIProvider {
  mount(target: HTMLElement): void;
  render(screen: ScreenDefinition): unknown;
}
```

## Error Handling

### Initialization Errors

- Duplicate IDs (screens, actions, plugins) MUST throw immediately
- Plugin setup errors abort initialization and throw with plugin name context
- Validation errors throw before state modification
- Partial initialization is prevented through fail-fast approach
- No subsequent plugin setup occurs after a failure

### Runtime Errors

- Missing action execution throws with action ID
- Missing UI provider for renderScreen throws with clear message
- Invalid parameters throw with validation details
- Duplicate registration attempts throw with resource identifier

### Shutdown Errors

- Plugin dispose errors are logged but do not prevent shutdown continuation
- Registry clear operations are fail-safe
- Resource cleanup continues even if individual steps fail
- Shutdown is idempotent and safe to call multiple times

## Testing Strategy

### Unit Tests

- Plugin registration and duplicate rejection
- Screen registration and lookup
- Action registration and execution
- Event Bus emission and subscription
- UI provider validation
- Registry operations (register, get, getAll, clear)
- RuntimeContext API surface

### Integration Tests

- Full initialization sequence
- Plugin setup execution with context
- Cross-subsystem interactions (plugin registers screen/action)
- Shutdown sequence and cleanup
- UI provider registration and rendering
- Instance isolation with multiple runtimes
- Plugin setup and disposal ordering

### Error Scenario Tests

- Initialization failure and abort
- Duplicate registration errors
- Missing resource errors (action, screen, UI provider)
- Plugin setup failure handling
- Plugin disposal error handling
- Multiple initialization attempts
- Shutdown after failed initialization

### Environment Tests

- Node.js execution
- Browser execution
- No DOM dependencies in core
- No UI framework dependencies

## Implementation Notes

### Plugin Execution Order

Plugins are executed sequentially in registration order. Async plugin setup callbacks are awaited before proceeding to the next plugin. This ensures deterministic initialization and allows plugins to depend on earlier plugins' contributions.

Plugins may register additional plugins during their setup() callback. These newly registered plugins will be initialized after the current plugin completes setup.

### Successfully Initialized Plugin Tracking

The PluginRegistry maintains a Set of successfully initialized plugin names. Only plugins in this set will have their dispose() callbacks invoked during shutdown. This prevents disposal of partially initialized plugins.

### Registry Implementation

All registries use Map for O(1) lookup performance. Keys are strings (IDs or names), and values are definition objects. Duplicate keys are rejected with errors before any state modification occurs.

### Event Bus Simplicity

The MLP event bus is synchronous and does not buffer events. Handlers are invoked immediately when emit is called in registration order. This keeps the implementation minimal while providing basic pub-sub functionality.

### UI Provider Optional

The runtime operates fully without a UI provider. UI-related methods (renderScreen) throw clear errors when called without a provider. This maintains the UI-agnostic design while enabling UI integration when needed.

UI provider registration is final and cannot be replaced once set. This simplifies the design and prevents runtime UI switching complexity.

### Error Messages

All errors include context (IDs, names, subsystem) to aid debugging. Initialization errors include the failing plugin name. Runtime errors include the missing resource identifier. Duplicate registration errors include the conflicting identifier.

### Idempotency

- initialize() throws if called twice on the same runtime instance
- shutdown() is safe to call multiple times and becomes a no-op after the first call
- Plugin registration is rejected after initialization completes

## MLP Scope Confirmation

The design intentionally excludes all non-MLP features:

- No routing/navigation layer
- No state management library
- No UI components in core
- No plugin marketplace
- No CLI
- No data persistence
- No hot reload
- No cross-runtime execution graph
- No permission system
- No theming engine

These MUST NOT appear anywhere in the implementation.
