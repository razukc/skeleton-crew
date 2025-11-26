// Core type definitions will be implemented in task 2

// Error Classes

/**
 * Error thrown when validation fails for a resource
 * @see Requirements 14.1, 14.2, 14.3, 14.4, 14.5, 14.6
 */
export class ValidationError extends Error {
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

/**
 * Error thrown when attempting to register a duplicate resource
 * @see Requirements 15.1, 15.2, 15.3, 15.4, 15.5
 */
export class DuplicateRegistrationError extends Error {
  constructor(
    public resourceType: string,
    public identifier: string
  ) {
    super(`${resourceType} with identifier "${identifier}" is already registered`);
    this.name = 'DuplicateRegistrationError';
  }
}

/**
 * Error thrown when an action execution exceeds its timeout
 * @see Requirements 11.1, 11.2, 11.3, 11.4, 11.5
 */
export class ActionTimeoutError extends Error {
  constructor(
    public actionId: string,
    public timeoutMs: number
  ) {
    super(`Action "${actionId}" timed out after ${timeoutMs}ms`);
    this.name = 'ActionTimeoutError';
  }
}

/**
 * Error thrown when an action handler throws an error
 * @see Requirements 3.1, 3.2, 3.3, 3.4, 3.5
 */
export class ActionExecutionError extends Error {
  constructor(
    public actionId: string,
    public cause: Error
  ) {
    super(`Action "${actionId}" execution failed: ${cause.message}`);
    this.name = 'ActionExecutionError';
    this.cause = cause;
  }
}

// Logger Interface

/**
 * Logger interface for pluggable logging implementations
 * @see Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */
export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

/**
 * Default console-based logger implementation
 * @see Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */
export class ConsoleLogger implements Logger {
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

// Runtime State Enum

/**
 * Runtime lifecycle states
 * @see Requirements 16.1, 16.2, 16.3, 16.4, 16.5
 */
export enum RuntimeState {
  Uninitialized = 'uninitialized',
  Initializing = 'initializing',
  Initialized = 'initialized',
  ShuttingDown = 'shutting_down',
  Shutdown = 'shutdown'
}

export interface PluginDefinition {
  name: string;
  version: string;
  setup: (context: RuntimeContext) => void | Promise<void>;
  dispose?: (context: RuntimeContext) => void | Promise<void>;
}

export interface ScreenDefinition {
  id: string;
  title: string;
  component: string;
}

/**
 * Action definition with generic type parameters for type-safe action handling
 * @template P - Payload type (defaults to unknown for backward compatibility)
 * @template R - Return type (defaults to unknown for backward compatibility)
 * @see Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 11.1, 11.2, 11.3, 11.4, 11.5
 */
export interface ActionDefinition<P = unknown, R = unknown> {
  id: string;
  handler: (params: P, context: RuntimeContext) => Promise<R> | R;
  timeout?: number; // Optional timeout in milliseconds
}

/**
 * UIProvider interface with enhanced lifecycle methods
 * @see Requirements 9.1, 9.2, 9.3, 9.4, 9.5
 */
export interface UIProvider {
  mount(target: unknown, context: RuntimeContext): void | Promise<void>;
  renderScreen(screen: ScreenDefinition): unknown | Promise<unknown>;
  unmount?(): void | Promise<void>;
}

/**
 * RuntimeContext provides a safe API facade for subsystems.
 * @see Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 10.1, 10.2, 10.3, 10.4, 10.5, 12.1, 12.2, 12.3, 12.4, 12.5, 13.1, 13.2, 13.3, 13.4, 13.5
 */
export interface RuntimeContext {
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
  getRuntime(): Runtime;
  
  // Migration Support
  /**
   * Readonly access to host context injected at runtime initialization
   * @see Requirements 1.3, 1.4, 9.2
   */
  readonly host: Readonly<Record<string, unknown>>;
  
  /**
   * Introspection API for querying runtime metadata
   * @see Requirements 3.1, 4.1, 5.1, 6.1, 9.2
   */
  readonly introspect: IntrospectionAPI;
}

export interface Runtime {
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  getContext(): RuntimeContext;
}

// Migration Support Types

/**
 * Runtime initialization options
 * @see Requirements 1.1, 9.1
 */
export interface RuntimeOptions {
  logger?: Logger;
  hostContext?: Record<string, unknown>;
}

/**
 * Action metadata returned by introspection (excludes handler function)
 * @see Requirements 3.2, 3.4, 3.5, 9.3
 */
export interface ActionMetadata {
  id: string;
  timeout?: number;
}

/**
 * Plugin metadata returned by introspection (excludes setup/dispose functions)
 * @see Requirements 4.2, 4.4, 4.5, 9.4
 */
export interface PluginMetadata {
  name: string;
  version: string;
}

/**
 * Runtime metadata with overall statistics
 * @see Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 9.5
 */
export interface IntrospectionMetadata {
  runtimeVersion: string;
  totalActions: number;
  totalPlugins: number;
  totalScreens: number;
}

/**
 * Introspection API for querying runtime metadata
 * @see Requirements 3.1, 4.1, 5.1, 6.1, 9.2
 */
export interface IntrospectionAPI {
  listActions(): string[];
  getActionDefinition(id: string): ActionMetadata | null;
  listPlugins(): string[];
  getPluginDefinition(name: string): PluginMetadata | null;
  listScreens(): string[];
  getScreenDefinition(id: string): ScreenDefinition | null;
  getMetadata(): IntrospectionMetadata;
}
