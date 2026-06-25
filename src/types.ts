// Core type definitions will be implemented in task 2

import type { Violation, JsonSchema } from './contract-validator.js';

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

/**
 * Error thrown when an action exceeds its memory limit
 */
export class ActionMemoryError extends Error {
  constructor(
    public actionId: string,
    public limitMb: number,
    public usedMb: number
  ) {
    super(`Action "${actionId}" exceeded memory limit of ${limitMb}MB (used ~${usedMb.toFixed(1)}MB)`);
    this.name = 'ActionMemoryError';
  }
}

/**
 * Error thrown when a plugin hot-swap is rejected.
 */
export class PluginSwapError extends Error {
  constructor(
    public pluginName: string,
    reason: string
  ) {
    super(`Cannot swap plugin "${pluginName}": ${reason}`);
    this.name = 'PluginSwapError';
  }
}

/**
 * Thrown when an action's input fails its declared contract. Carries the FULL
 * batched violation set so an agent can fix every problem in one cycle.
 */
export class ContractViolationError extends Error {
  public readonly code = 'CONTRACT_INPUT_VIOLATION' as const;
  constructor(
    public actionId: string,
    public violations: Violation[],
  ) {
    super(
      `Action "${actionId}" input violated its contract:\n` +
      violations.map((v) => `  ${v.path}: expected ${v.expected}, got ${v.actual}`).join('\n'),
    );
    this.name = 'ContractViolationError';
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

/**
 * Result of plugin config validation
 * @see v0.3 Config Validation Feature
 */
export interface ConfigValidationResult {
  valid: boolean;
  errors?: string[];
}

/**
 * Plugin definition with optional config validation
 * @template TConfig - Configuration type (defaults to Record<string, unknown>)
 * @see Requirements 13.1, 13.2, 13.3
 */
export interface PluginDefinition<TConfig = Record<string, unknown>> {
  name: string;
  version: string;
  /** Human-readable description of what this plugin does */
  description?: string;
  dependencies?: string[];

  /**
   * Optional: Keys this plugin reads from config.
   * Used for documentation and introspection purposes.
   */
  configKeys?: string[];

  /**
   * Optional: Validate config before plugin setup.
   * Called during initialization, before setup().
   * Return true/false or a ConfigValidationResult object for detailed errors.
   * @param config - Current runtime configuration
   * @returns Validation result
   * @see v0.3 Config Validation Feature
   */
  validateConfig?: (config: TConfig) => boolean | ConfigValidationResult | Promise<boolean | ConfigValidationResult>;

  setup: (context: RuntimeContext<TConfig>) => void | Promise<void>;
  dispose?: (context: RuntimeContext<TConfig>) => void | Promise<void>;
}

/**
 * Interface for loading plugins from various sources (files, packages, etc.)
 * Decouples Runtime from specific loading strategies (like Node.js file system)
 * @see Requirements 1.3, 1.4
 */
export interface PluginLoader {
  loadPlugins(
    pluginPaths: string[],
    pluginPackages: string[]
  ): Promise<PluginDefinition[]>;
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
export interface ActionDefinition<P = unknown, R = unknown, TConfig = Record<string, unknown>> {
  id: string;
  handler: (params: P, context: RuntimeContext<TConfig>) => Promise<R> | R;
  /** Optional timeout in milliseconds */
  timeout?: number;
  /**
   * Number of times to retry on failure (not applied to timeout/memory errors).
   * Retries use exponential backoff: attempt n waits 2^(n-1) * 100ms.
   * Default: 0 (no retries).
   */
  retry?: number;
  /**
   * Approximate heap memory limit in megabytes.
   * Measured as heap delta before/after execution.
   * No-op in browser environments where process.memoryUsage is unavailable.
   */
  memoryLimitMb?: number;
  /** Human-readable description for documentation and introspection */
  description?: string;
  /** JSON-Schema for the action's input. `null` = declared-none (takes no
   *  input; any params rejected). Absent = undeclared (no enforcement). */
  input?: JsonSchema | null;
  /** JSON-Schema for the action's output. Declared+served+swap-checked; NOT
   *  hot-path validated in v1. */
  output?: JsonSchema | null;
}

/**
 * UIProvider interface with enhanced lifecycle methods
 * @see Requirements 9.1, 9.2, 9.3, 9.4, 9.5
 */
export interface UIProvider<TConfig = Record<string, unknown>> {
  mount(target: unknown, context: RuntimeContext<TConfig>): void | Promise<void>;
  renderScreen(screen: ScreenDefinition): unknown | Promise<unknown>;
  unmount?(): void | Promise<void>;
}

/**
 * RuntimeContext provides a safe API facade for subsystems.
 * @see Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 10.1, 10.2, 10.3, 10.4, 10.5, 12.1, 12.2, 12.3, 12.4, 12.5, 13.1, 13.2, 13.3, 13.4, 13.5
 */
export interface RuntimeContext<TConfig = Record<string, unknown>> {
  screens: {
    registerScreen(screen: ScreenDefinition): () => void;
    getScreen(id: string): ScreenDefinition | null;
    getAllScreens(): ScreenDefinition[];
  };
  actions: {
    registerAction<P = unknown, R = unknown>(action: ActionDefinition<P, R, TConfig>): () => void;
    runAction<P = unknown, R = unknown>(id: string, params?: P): Promise<R>;
    /** Check if an action is registered without executing it */
    hasAction(id: string): boolean;
  };
  plugins: {
    registerPlugin(plugin: PluginDefinition<TConfig>): void;
    getPlugin(name: string): PluginDefinition<TConfig> | null;
    getAllPlugins(): PluginDefinition<TConfig>[];
    getInitializedPlugins(): string[];
    /** Returns true if the named plugin has completed setup */
    isInitialized(name: string): boolean;
  };
  events: {
    emit(event: string, data?: unknown): void;
    emitAsync(event: string, data?: unknown): Promise<void>;
    on(event: string, handler: (data: unknown) => void): () => void;
  };

  /**
   * Service Locator API for typed inter-plugin communication.
   * Plugins can register services that other plugins can then consume.
   * @see v0.3 Service Locator Feature
   */
  services: {
    /**
     * Registers a service by name.
     * @param name - Unique service identifier
     * @param service - Service implementation
     * @throws DuplicateRegistrationError if service name is already taken
     */
    register<T>(name: string, service: T): void;

    /**
     * Retrieves a service by name.
     * @param name - Unique service identifier
     * @returns The registered service implementation
     * @throws Error if service is not found
     */
    get<T>(name: string): T;

    /**
     * Checks if a service is registered.
     * @param name - Unique service identifier
     * @returns true if service exists, false otherwise
     */
    has(name: string): boolean;

    /**
     * Lists all registered service names.
     * @returns Array of service identifiers
     */
    list(): string[];

    /**
     * Unregisters a service by name. Intended for use in plugin dispose.
     * No-op if the service is not registered.
     * @param name - Unique service identifier
     */
    unregister(name: string): void;
  };

  getRuntime(): Runtime<TConfig>;

  /**
   * Logger instance for plugins to use
   */
  readonly logger: Logger;

  /**
   * Execution recorder — observe every action run.
   * Provides run_id, input, output, status, duration for each execution.
   */
  readonly trace: ExecutionRecorder;

  /**
   * Synchronous access to runtime configuration.
   * @see SCR v0.2.0 Requirement
   */
  readonly config: Readonly<TConfig>;

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

export interface Runtime<TConfig = Record<string, unknown>> {
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  getContext(): RuntimeContext<TConfig>;
  getConfig(): Readonly<TConfig>;
  updateConfig(config: Partial<TConfig>): void;
  /**
   * Hot-swaps a running plugin with a new version.
   * The new plugin must have the same name and a strictly higher semver version.
   * Calls dispose() on the old plugin, tears down its registered resources,
   * then calls setup() on the new plugin.
   * Emits `plugin:swapped` on success.
   * @throws PluginSwapError if the plugin is not initialized or the version is not an upgrade.
   */
  swapPlugin(newPlugin: PluginDefinition<TConfig>): Promise<void>;
}

// Migration Support Types

/**
 * Runtime initialization options
 * @see Requirements 1.1, 9.1
 */
export interface RuntimeOptions<TConfig = Record<string, unknown>> {
  logger?: Logger;
  hostContext?: Record<string, unknown>;
  config?: TConfig; // [NEW] Sync Config
  enablePerformanceMonitoring?: boolean;

  // Plugin Discovery Options (v0.2.1)
  pluginPaths?: string[]; // Paths to plugin files or directories
  pluginPackages?: string[]; // npm package names to load as plugins
  pluginLoader?: PluginLoader; // [NEW] Optional plugin loader for discovery
}

/**
 * Action metadata returned by introspection (excludes handler function)
 * @see Requirements 3.2, 3.4, 3.5, 9.3
 */
export interface ActionMetadata {
  id: string;
  timeout?: number;
  retry?: number;
  memoryLimitMb?: number;
  description?: string;
  input?: JsonSchema | null;
  output?: JsonSchema | null;
  inputState: 'declared' | 'none' | 'undeclared';
  outputState: 'declared' | 'none' | 'undeclared';
}

// ─── Execution Recorder (Priority 2) ─────────────────────────────────────────

export type TraceStatus = 'success' | 'error' | 'timeout' | 'memory' | 'contract';

/**
 * Immutable record of a single action execution.
 */
export interface TraceEntry {
  readonly runId: string;
  readonly actionId: string;
  readonly input: unknown;
  readonly output: unknown;
  readonly status: TraceStatus;
  readonly durationMs: number;
  readonly startedAt: number;
  readonly error?: string;
  readonly attempt: number;
}

/**
 * Execution recorder — first-class observability for action runs.
 * Accessible via ctx.trace.
 */
export interface ExecutionRecorder {
  /** All recorded trace entries (most recent last). */
  getEntries(): readonly TraceEntry[];
  /** Entries for a specific action ID. */
  getEntriesFor(actionId: string): readonly TraceEntry[];
  /** Clear all recorded entries. */
  clear(): void;
}

/**
 * Plugin metadata returned by introspection (excludes setup/dispose functions)
 * @see Requirements 4.2, 4.4, 4.5, 9.4
 */
export interface PluginMetadata {
  name: string;
  version: string;
  description?: string;
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
  getContractVocabulary(): { schemaVersion: string; supportedKeywords: string[] };
}
