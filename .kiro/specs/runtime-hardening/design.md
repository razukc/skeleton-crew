# Design Document

## Overview

The Runtime Hardening feature enhances the Skeleton Crew Runtime's production readiness through improved error handling, plugin fault isolation, and developer experience improvements. This design maintains backward compatibility with the existing core runtime architecture while adding resilience features, better type safety, and observability.

The hardening improvements are implemented as modifications to existing subsystems rather than new subsystems. The changes focus on three key areas: (1) error isolation and recovery, (2) enhanced type safety and validation, and (3) improved observability through logging and state queries.

## Architecture

### Enhanced Error Handling Strategy

The hardening design introduces a layered error handling approach:

1. **Handler Protection Layer**: Wraps all plugin-provided code (event handlers, action handlers) in try-catch blocks
2. **Rollback Layer**: Implements cleanup when initialization fails partway through
3. **Typed Errors Layer**: Provides specific error classes for different failure modes
4. **Logging Layer**: Captures and reports errors through a pluggable logger interface

### Modified Subsystem Architecture

```
Runtime (orchestrator with state tracking)
├── Logger (pluggable logging interface)
├── PluginRegistry (with rollback and reverse disposal)
├── ScreenRegistry (with unregister functions and validation errors)
├── ActionEngine (with handler protection and timeouts)
├── EventBus (with handler protection and async emission)
├── UIBridge (with enhanced lifecycle)
└── RuntimeContext (with state queries and data isolation)
```

## Components and Interfaces

### Logger Interface

A pluggable logging abstraction that allows custom logger implementations.

**Interface Definition:**
```typescript
interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}
```

**Default Implementation:**
```typescript
class ConsoleLogger implements Logger {
  debug(message: string, ...args: unknown[]): void {
    console.debug(message, ...args);
  }
  info(message: string, ...args: unknown[]): void {
    console.info(message, ...args);
  }
  warn(message: string, ...args: unknown[]): void {
    console.warn(message, ...args);
  }
  error(message: string, ...args: unknown[]): void {
    console.error(message, ...args);
  }
}
```

**Integration:**
- Runtime constructor accepts optional `logger?: Logger` parameter
- Logger is passed to all subsystems during construction
- All internal logging uses the logger interface instead of direct console calls

### Error Classes

Typed error classes for different failure scenarios.

**ValidationError:**
```typescript
class ValidationError extends Error {
  constructor(
    public resourceType: string,
    public field: string,
    public resourceId?: string
  ) {
    super(
      `Validation failed for ${resourceType}${resourceId ? ` "${resourceId}"` : ''}: missing or invalid field "${field}"`
    );
    this.name = 'ValidationError';
  }
}
```

**DuplicateRegistrationError:**
```typescript
class DuplicateRegistrationError extends Error {
  constructor(
    public resourceType: string,
    public identifier: string
  ) {
    super(`${resourceType} with identifier "${identifier}" is already registered`);
    this.name = 'DuplicateRegistrationError';
  }
}
```

**ActionTimeoutError:**
```typescript
class ActionTimeoutError extends Error {
  constructor(
    public actionId: string,
    public timeoutMs: number
  ) {
    super(`Action "${actionId}" timed out after ${timeoutMs}ms`);
    this.name = 'ActionTimeoutError';
  }
}
```

**ActionExecutionError:**
```typescript
class ActionExecutionError extends Error {
  constructor(
    public actionId: string,
    public cause: Error
  ) {
    super(`Action "${actionId}" execution failed: ${cause.message}`);
    this.name = 'ActionExecutionError';
    this.cause = cause;
  }
}
```

### Enhanced Type Definitions

**Generic ActionDefinition:**
```typescript
interface ActionDefinition<P = unknown, R = unknown> {
  id: string;
  handler: (params: P, context: RuntimeContext) => Promise<R> | R;
  timeout?: number; // Optional timeout in milliseconds
}
```

**Enhanced UIProvider:**
```typescript
interface UIProvider {
  mount(target: unknown, context: RuntimeContext): void | Promise<void>;
  renderScreen(screen: ScreenDefinition): unknown | Promise<unknown>;
  unmount?(): void | Promise<void>;
}
```

**Runtime State Enum:**
```typescript
enum RuntimeState {
  Uninitialized = 'uninitialized',
  Initializing = 'initializing',
  Initialized = 'initialized',
  ShuttingDown = 'shutting_down',
  Shutdown = 'shutdown'
}
```

### Enhanced PluginRegistry

**Modified Internal State:**
```typescript
class PluginRegistry {
  private plugins: Map<string, PluginDefinition>;
  private initializedPlugins: string[]; // Changed from Set to Array to preserve order
  private logger: Logger;
}
```

**Rollback Implementation:**

The `executeSetup` method now implements rollback on failure:

```typescript
async executeSetup(context: RuntimeContext): Promise<void> {
  const initialized: string[] = [];
  
  try {
    for (const [name, plugin] of this.plugins) {
      await plugin.setup(context);
      initialized.push(name);
      this.initializedPlugins.push(name);
    }
  } catch (error) {
    // Rollback: dispose already-initialized plugins in reverse order
    this.logger.error('Plugin setup failed, rolling back initialized plugins');
    
    for (let i = initialized.length - 1; i >= 0; i--) {
      const pluginName = initialized[i];
      const plugin = this.plugins.get(pluginName);
      
      if (plugin?.dispose) {
        try {
          await plugin.dispose(context);
          this.logger.debug(`Rolled back plugin: ${pluginName}`);
        } catch (disposeError) {
          this.logger.error(`Rollback dispose failed for plugin "${pluginName}"`, disposeError);
        }
      }
      
      // Remove from initialized list
      const idx = this.initializedPlugins.indexOf(pluginName);
      if (idx !== -1) {
        this.initializedPlugins.splice(idx, 1);
      }
    }
    
    // Re-throw with context
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Plugin setup failed: ${errorMessage}`);
  }
}
```

**Reverse Disposal:**

The `executeDispose` method now disposes in reverse order:

```typescript
async executeDispose(context: RuntimeContext): Promise<void> {
  // Dispose in reverse order of initialization
  for (let i = this.initializedPlugins.length - 1; i >= 0; i--) {
    const pluginName = this.initializedPlugins[i];
    const plugin = this.plugins.get(pluginName);
    
    if (plugin?.dispose) {
      try {
        await plugin.dispose(context);
        this.logger.debug(`Disposed plugin: ${pluginName}`);
      } catch (error) {
        this.logger.error(`Plugin "${pluginName}" dispose failed`, error);
      }
    }
  }
}
```

**New Public API:**
```typescript
getInitializedPlugins(): string[] {
  return [...this.initializedPlugins]; // Return copy
}
```

### Enhanced EventBus

**Handler Protection:**

The `emit` method now protects against throwing handlers:

```typescript
emit(event: string, data?: unknown): void {
  const handlers = this.handlers.get(event);
  if (!handlers) return;
  
  for (const handler of handlers) {
    try {
      handler(data);
    } catch (error) {
      this.logger.error(`Event handler for "${event}" threw error`, error);
      // Continue with remaining handlers
    }
  }
}
```

**Async Emission:**

New `emitAsync` method for non-blocking event emission:

```typescript
async emitAsync(event: string, data?: unknown): Promise<void> {
  const handlers = this.handlers.get(event);
  if (!handlers) return;
  
  const promises = Array.from(handlers).map(handler =>
    Promise.resolve()
      .then(() => handler(data))
      .catch(error => {
        this.logger.error(`Async event handler for "${event}" threw error`, error);
      })
  );
  
  await Promise.allSettled(promises);
}
```

**Updated Public API:**
```typescript
interface EventBusAPI {
  emit(event: string, data?: unknown): void;
  emitAsync(event: string, data?: unknown): Promise<void>;
  on(event: string, handler: (data: unknown) => void): () => void;
}
```

### Enhanced ActionEngine

**Handler Protection with Contextual Errors:**

The `runAction` method now wraps errors with context:

```typescript
async runAction<P = unknown, R = unknown>(
  id: string,
  params?: P
): Promise<R> {
  const action = this.actions.get(id);
  if (!action) {
    throw new Error(`Action with id "${id}" not found`);
  }
  
  if (!this.context) {
    throw new Error('RuntimeContext not set in ActionEngine');
  }
  
  try {
    // Handle timeout if specified
    if (action.timeout) {
      const result = await this.runWithTimeout(action, params);
      return result as R;
    }
    
    // Execute without timeout
    const result = await Promise.resolve(action.handler(params, this.context));
    return result as R;
  } catch (error) {
    // Wrap with contextual error
    if (error instanceof ActionTimeoutError) {
      throw error; // Already has context
    }
    throw new ActionExecutionError(id, error as Error);
  }
}
```

**Timeout Implementation:**

```typescript
private async runWithTimeout(
  action: ActionDefinition,
  params: unknown
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new ActionTimeoutError(action.id, action.timeout!));
    }, action.timeout);
    
    Promise.resolve(action.handler(params, this.context!))
      .then(result => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch(error => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}
```

**Unregister Function:**

The `registerAction` method now returns an unregister function:

```typescript
registerAction<P = unknown, R = unknown>(
  action: ActionDefinition<P, R>
): () => void {
  // Validation with typed errors
  if (!action.id || typeof action.id !== 'string') {
    throw new ValidationError('Action', 'id');
  }
  if (!action.handler || typeof action.handler !== 'function') {
    throw new ValidationError('Action', 'handler', action.id);
  }
  
  // Check for duplicate
  if (this.actions.has(action.id)) {
    throw new DuplicateRegistrationError('Action', action.id);
  }
  
  this.actions.set(action.id, action);
  
  // Return unregister function
  return () => {
    this.actions.delete(action.id);
  };
}
```

**Data Isolation:**

The `getAllActions` method returns a copy:

```typescript
getAllActions(): ActionDefinition[] {
  return Array.from(this.actions.values());
}
```

### Enhanced ScreenRegistry

**Unregister Function:**

The `registerScreen` method now returns an unregister function:

```typescript
registerScreen(screen: ScreenDefinition): () => void {
  // Validation with typed errors
  if (!screen.id || typeof screen.id !== 'string') {
    throw new ValidationError('Screen', 'id');
  }
  if (!screen.title || typeof screen.title !== 'string') {
    throw new ValidationError('Screen', 'title', screen.id);
  }
  if (!screen.component || typeof screen.component !== 'string') {
    throw new ValidationError('Screen', 'component', screen.id);
  }
  
  // Check for duplicate
  if (this.screens.has(screen.id)) {
    throw new DuplicateRegistrationError('Screen', screen.id);
  }
  
  this.screens.set(screen.id, screen);
  
  // Return unregister function
  return () => {
    this.screens.delete(screen.id);
  };
}
```

**Data Isolation:**

```typescript
getAllScreens(): ScreenDefinition[] {
  return Array.from(this.screens.values());
}
```

### Enhanced UIBridge

**Lifecycle Methods:**

The UIBridge now supports unmount:

```typescript
async shutdown(): Promise<void> {
  if (this.provider?.unmount) {
    try {
      await Promise.resolve(this.provider.unmount());
      this.logger.debug('UI provider unmounted');
    } catch (error) {
      this.logger.error('UI provider unmount failed', error);
    }
  }
  this.provider = null;
}
```

**Enhanced Validation:**

```typescript
setProvider(provider: UIProvider): void {
  if (this.provider !== null) {
    throw new DuplicateRegistrationError('UIProvider', 'default');
  }
  
  if (typeof provider.mount !== 'function') {
    throw new ValidationError('UIProvider', 'mount');
  }
  
  if (typeof provider.renderScreen !== 'function') {
    throw new ValidationError('UIProvider', 'renderScreen');
  }
  
  this.provider = provider;
}
```

### Enhanced Runtime

**State Tracking:**

```typescript
class Runtime {
  private state: RuntimeState = RuntimeState.Uninitialized;
  private logger: Logger;
  
  // ... existing fields
}
```

**State Query Methods:**

```typescript
isInitialized(): boolean {
  return this.state === RuntimeState.Initialized;
}

getState(): RuntimeState {
  return this.state;
}
```

**Lifecycle Events:**

The `initialize` method emits lifecycle events:

```typescript
async initialize(): Promise<void> {
  if (this.state !== RuntimeState.Uninitialized) {
    throw new Error('Runtime already initialized');
  }
  
  this.state = RuntimeState.Initializing;
  
  try {
    // ... existing initialization logic
    
    this.state = RuntimeState.Initialized;
    
    // Emit lifecycle event
    this.events.emit('runtime:initialized', { context: this.context });
  } catch (error) {
    this.state = RuntimeState.Uninitialized;
    throw error;
  }
}
```

The `shutdown` method emits lifecycle events:

```typescript
async shutdown(): Promise<void> {
  if (this.state === RuntimeState.Shutdown) {
    return; // Idempotent
  }
  
  this.state = RuntimeState.ShuttingDown;
  
  // Emit lifecycle event
  this.events.emit('runtime:shutdown', { context: this.context });
  
  // ... existing shutdown logic
  
  this.state = RuntimeState.Shutdown;
}
```

**Constructor with Logger:**

```typescript
constructor(options?: { logger?: Logger }) {
  this.logger = options?.logger ?? new ConsoleLogger();
  
  // Pass logger to subsystems
  this.plugins = new PluginRegistry(this.logger);
  this.screens = new ScreenRegistry(this.logger);
  this.actions = new ActionEngine(this.logger);
  this.events = new EventBus(this.logger);
  this.ui = new UIBridge(this.logger);
}
```

### Enhanced RuntimeContext

**Updated API with Unregister Functions:**

```typescript
interface RuntimeContext {
  screens: {
    registerScreen(screen: ScreenDefinition): () => void;
    getScreen(id: string): ScreenDefinition | null;
    getAllScreens(): ScreenDefinition[];
  };
  actions: {
    registerAction<P = unknown, R = unknown>(
      action: ActionDefinition<P, R>
    ): () => void;
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
  getRuntime(): Runtime;
}
```

## Data Models

### Updated Type Definitions

All type definitions are updated in `types.ts`:

```typescript
// Error classes
export class ValidationError extends Error { /* ... */ }
export class DuplicateRegistrationError extends Error { /* ... */ }
export class ActionTimeoutError extends Error { /* ... */ }
export class ActionExecutionError extends Error { /* ... */ }

// Logger interface
export interface Logger { /* ... */ }

// Runtime state
export enum RuntimeState { /* ... */ }

// Generic action definition
export interface ActionDefinition<P = unknown, R = unknown> { /* ... */ }

// Enhanced UI provider
export interface UIProvider { /* ... */ }

// Updated RuntimeContext
export interface RuntimeContext { /* ... */ }
```

## Error Handling

### Error Isolation Strategy

1. **Event Handlers**: Wrapped in try-catch, errors logged, execution continues
2. **Action Handlers**: Wrapped in try-catch, errors wrapped with context and re-thrown
3. **Plugin Setup**: Errors trigger rollback of initialized plugins, then re-thrown
4. **Plugin Dispose**: Errors logged but do not prevent other disposals

### Error Propagation

- **Validation Errors**: Thrown immediately before state modification
- **Duplicate Registration Errors**: Thrown immediately before state modification
- **Action Execution Errors**: Wrapped with action ID and re-thrown
- **Timeout Errors**: Thrown when action exceeds timeout
- **Plugin Setup Errors**: Trigger rollback, then thrown with plugin name

### Logging Strategy

All errors are logged through the logger interface:
- **debug**: Detailed operation traces (plugin initialization, disposal)
- **info**: Lifecycle events (initialization complete, shutdown started)
- **warn**: Recoverable issues (handler errors in events)
- **error**: Serious failures (plugin setup failures, action errors)

## Testing Strategy

### Unit Tests

**Error Class Tests:**
- ValidationError construction and properties
- DuplicateRegistrationError construction and properties
- ActionTimeoutError construction and properties
- ActionExecutionError construction and cause chain

**Logger Tests:**
- ConsoleLogger delegates to console methods
- Custom logger integration

**Enhanced Subsystem Tests:**
- EventBus handler protection
- EventBus async emission
- ActionEngine timeout handling
- ActionEngine error wrapping
- PluginRegistry rollback on setup failure
- PluginRegistry reverse disposal order
- Unregister functions for screens and actions
- Data isolation in getAll methods

### Integration Tests

**Rollback Tests:**
- Plugin setup failure triggers rollback
- Rollback disposes in reverse order
- Rollback errors are logged but don't prevent cleanup

**Lifecycle Event Tests:**
- runtime:initialized event emitted after initialization
- runtime:shutdown event emitted before shutdown
- Events include RuntimeContext

**State Tracking Tests:**
- State transitions through lifecycle
- isInitialized returns correct values
- getState returns current state

**Handler Protection Tests:**
- Event handler errors don't prevent other handlers
- Action handler errors are wrapped with context
- Multiple handler errors are all logged

### Error Scenario Tests

**Typed Error Tests:**
- ValidationError thrown for missing fields
- DuplicateRegistrationError thrown for duplicates
- ActionTimeoutError thrown for timeouts
- ActionExecutionError wraps handler errors

**Isolation Tests:**
- One failing event handler doesn't affect others
- Plugin setup failure doesn't leave partial state
- Dispose errors don't prevent other disposals

## Implementation Notes

### Backward Compatibility

All changes maintain backward compatibility:
- Existing code without generics continues to work
- Logger is optional, defaults to console
- Unregister functions are optional return values
- New methods are additions, not replacements

### Performance Considerations

- Handler protection adds minimal overhead (single try-catch per invocation)
- Timeout implementation uses native setTimeout, no polling
- Array copies for data isolation are shallow and fast
- Reverse iteration for disposal is O(n)

### Migration Path

Existing code requires no changes. New features are opt-in:
1. Add logger for better observability
2. Use generic types for type safety
3. Use unregister functions for cleanup
4. Add timeouts to long-running actions
5. Use emitAsync for non-blocking events

### Type Safety Improvements

Generic type parameters provide compile-time safety:
```typescript
// Before: no type checking
const result = await runtime.runAction('myAction', { foo: 'bar' });

// After: full type checking
interface MyParams { foo: string; }
interface MyResult { success: boolean; }
const result = await runtime.runAction<MyParams, MyResult>(
  'myAction',
  { foo: 'bar' }
);
// result is typed as MyResult
```

### Logging Best Practices

The logger interface enables:
- Structured logging with custom loggers
- Log level filtering
- Integration with application logging systems
- Testing with mock loggers

Example custom logger:
```typescript
class StructuredLogger implements Logger {
  debug(message: string, ...args: unknown[]): void {
    this.log('debug', message, args);
  }
  
  private log(level: string, message: string, args: unknown[]): void {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      message,
      data: args
    }));
  }
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Handler Isolation
*For any* event with multiple handlers, if one handler throws an error, all other handlers should still be invoked
**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

### Property 2: Rollback Completeness
*For any* plugin setup sequence that fails, all previously initialized plugins should have their dispose methods called in reverse order
**Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6**

### Property 3: Disposal Order Inverse
*For any* set of successfully initialized plugins, disposal order should be the exact reverse of initialization order
**Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**

### Property 4: Unregister Idempotence
*For any* registered resource (screen or action), calling the unregister function multiple times should be safe and result in the resource being removed
**Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

### Property 5: Data Isolation
*For any* registry getAll method, modifying the returned array should not affect the internal registry state
**Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5**

### Property 6: Timeout Enforcement
*For any* action with a timeout, if execution exceeds the timeout duration, an ActionTimeoutError should be thrown
**Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5**

### Property 7: Error Context Preservation
*For any* action handler that throws an error, the error should be wrapped in an ActionExecutionError that includes the action ID and original error
**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

### Property 8: State Transition Validity
*For any* runtime instance, state transitions should follow the valid sequence: uninitialized → initializing → initialized → shutting_down → shutdown
**Validates: Requirements 16.1, 16.2, 16.3, 16.4, 16.5**

### Property 9: Lifecycle Event Emission
*For any* successful initialization, a runtime:initialized event should be emitted; for any shutdown, a runtime:shutdown event should be emitted
**Validates: Requirements 17.1, 17.2, 17.3, 17.4, 17.5**

### Property 10: Validation Before Mutation
*For any* registration operation, validation errors should be thrown before any state modification occurs
**Validates: Requirements 18.5, 19.5, 20.5**

## MLP Scope Confirmation

This hardening feature maintains MLP scope by:
- Not adding new subsystems
- Not adding routing, navigation, or state management
- Not adding UI components
- Not adding persistence or external dependencies
- Focusing solely on robustness and developer experience improvements

All changes are internal improvements to existing subsystems that enhance production readiness without expanding scope.
