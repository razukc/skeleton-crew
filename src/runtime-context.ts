import type { RuntimeContext, ScreenDefinition, ActionDefinition, PluginDefinition } from './types.js';
import type { ScreenRegistry } from './screen-registry.js';
import type { ActionEngine } from './action-engine.js';
import type { PluginRegistry } from './plugin-registry.js';
import type { EventBus } from './event-bus.js';
import type { Runtime } from './types.js';

/**
 * Deep freeze utility - recursively freezes an object and all nested objects.
 * Internal use only, not exported.
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 * 
 * @param obj - The object to deep freeze
 * @returns The frozen object with proper typing
 */
function deepFreeze<T>(obj: T): Readonly<T> {
  // Freeze the object itself (Requirement 7.1)
  Object.freeze(obj);

  // Iterate over all properties (Requirement 7.2)
  Object.getOwnPropertyNames(obj).forEach(prop => {
    const value = (obj as any)[prop];

    // Skip functions (Requirement 7.4)
    if (typeof value === 'function') {
      return;
    }

    // Skip already frozen objects (Requirement 7.5)
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      // Recursively freeze nested objects and arrays (Requirements 7.2, 7.3)
      deepFreeze(value);
    }
  });

  return obj as Readonly<T>;
}

/**
 * RuntimeContext provides a safe API facade for subsystems.
 * Passed to plugins and action handlers without exposing internal mutable structures.
 * 
 * Requirements: 1.2, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 */
export class RuntimeContextImpl implements RuntimeContext {
  private screenRegistry: ScreenRegistry;
  private actionEngine: ActionEngine;
  private pluginRegistry: PluginRegistry;
  private eventBus: EventBus;
  private runtime: Runtime;
  private hostContext: Record<string, unknown>;

  constructor(
    screenRegistry: ScreenRegistry,
    actionEngine: ActionEngine,
    pluginRegistry: PluginRegistry,
    eventBus: EventBus,
    runtime: Runtime,
    hostContext: Record<string, unknown>
  ) {
    this.screenRegistry = screenRegistry;
    this.actionEngine = actionEngine;
    this.pluginRegistry = pluginRegistry;
    this.eventBus = eventBus;
    this.runtime = runtime;
    this.hostContext = hostContext;
  }

  /**
   * Screens API - exposes Screen Registry operations
   * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 10.1, 10.2, 10.3, 10.4, 10.5
   */
  get screens() {
    return {
      registerScreen: (screen: ScreenDefinition): (() => void) => {
        return this.screenRegistry.registerScreen(screen);
      },
      getScreen: (id: string): ScreenDefinition | null => {
        return this.screenRegistry.getScreen(id);
      },
      getAllScreens: (): ScreenDefinition[] => {
        return this.screenRegistry.getAllScreens();
      }
    };
  }

  /**
   * Actions API - exposes Action Engine operations
   * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
   */
  get actions() {
    return {
      registerAction: <P = unknown, R = unknown>(action: ActionDefinition<P, R>): (() => void) => {
        return this.actionEngine.registerAction(action);
      },
      runAction: <P = unknown, R = unknown>(id: string, params?: P): Promise<R> => {
        return this.actionEngine.runAction(id, params);
      }
    };
  }

  /**
   * Plugins API - exposes Plugin Registry operations
   * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5
   */
  get plugins() {
    return {
      registerPlugin: (plugin: PluginDefinition): void => {
        this.pluginRegistry.registerPlugin(plugin);
      },
      getPlugin: (name: string): PluginDefinition | null => {
        return this.pluginRegistry.getPlugin(name);
      },
      getAllPlugins: (): PluginDefinition[] => {
        return this.pluginRegistry.getAllPlugins();
      },
      getInitializedPlugins: (): string[] => {
        return this.pluginRegistry.getInitializedPlugins();
      }
    };
  }

  /**
   * Events API - exposes Event Bus operations
   * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5
   */
  get events() {
    return {
      emit: (event: string, data?: unknown): void => {
        this.eventBus.emit(event, data);
      },
      emitAsync: (event: string, data?: unknown): Promise<void> => {
        return this.eventBus.emitAsync(event, data);
      },
      on: (event: string, handler: (data: unknown) => void): (() => void) => {
        return this.eventBus.on(event, handler);
      }
    };
  }

  /**
   * Returns the Runtime instance
   * Requirement: 9.6
   */
  getRuntime(): Runtime {
    return this.runtime;
  }

  /**
   * Host context - readonly access to injected host services
   * Requirements: 1.2, 1.3, 1.4
   * 
   * Returns a frozen shallow copy of the host context to prevent mutation.
   * This ensures plugins can access host services but cannot modify them.
   */
  get host(): Readonly<Record<string, unknown>> {
    return Object.freeze({ ...this.hostContext });
  }

  /**
   * Introspection API - query runtime metadata
   * Requirements: 3.1, 4.1, 5.1, 6.1
   */
  get introspect() {
    return {
      /**
       * List all registered action IDs
       * Requirements: 3.1
       */
      listActions: (): string[] => {
        return this.actionEngine.getAllActions().map(action => action.id);
      },

      /**
       * Get action metadata by ID (excludes handler function)
       * Requirements: 3.2, 3.3, 3.4, 3.5
       */
      getActionDefinition: (id: string) => {
        const action = this.actionEngine.getAction(id);
        if (!action) return null;
        
        // Extract only id and timeout (exclude handler function)
        const metadata = {
          id: action.id,
          timeout: action.timeout
        };
        
        // Deep freeze the metadata
        return deepFreeze(metadata);
      },

      /**
       * List all registered plugin names
       * Requirements: 4.1
       */
      listPlugins: (): string[] => {
        return this.pluginRegistry.getAllPlugins().map(plugin => plugin.name);
      },

      /**
       * Get plugin metadata by name (excludes setup/dispose functions)
       * Requirements: 4.2, 4.3, 4.4, 4.5
       */
      getPluginDefinition: (name: string) => {
        const plugin = this.pluginRegistry.getPlugin(name);
        if (!plugin) return null;
        
        // Extract only name and version (exclude setup/dispose functions)
        const metadata = {
          name: plugin.name,
          version: plugin.version
        };
        
        // Deep freeze the metadata
        return deepFreeze(metadata);
      },

      /**
       * List all registered screen IDs
       * Requirements: 5.1
       */
      listScreens: (): string[] => {
        return this.screenRegistry.getAllScreens().map(screen => screen.id);
      },

      /**
       * Get screen definition by ID (includes all properties)
       * Requirements: 5.2, 5.3, 5.4, 5.5
       */
      getScreenDefinition: (id: string) => {
        const screen = this.screenRegistry.getScreen(id);
        if (!screen) return null;
        
        // Include all screen properties
        const metadata = {
          id: screen.id,
          title: screen.title,
          component: screen.component
        };
        
        // Deep freeze the metadata
        return deepFreeze(metadata);
      },

      /**
       * Get runtime metadata with statistics
       * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
       */
      getMetadata: () => {
        const metadata = {
          runtimeVersion: '0.1.0',
          totalActions: this.actionEngine.getAllActions().length,
          totalPlugins: this.pluginRegistry.getAllPlugins().length,
          totalScreens: this.screenRegistry.getAllScreens().length
        };
        
        // Deep freeze the metadata
        return deepFreeze(metadata);
      }
    };
  }
}
