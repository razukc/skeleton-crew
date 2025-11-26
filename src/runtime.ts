import type { RuntimeContext, UIProvider, PluginDefinition, RuntimeOptions, Logger } from './types.js';
import { ConsoleLogger, RuntimeState } from './types.js';
import { PluginRegistry } from './plugin-registry.js';
import { ScreenRegistry } from './screen-registry.js';
import { ActionEngine } from './action-engine.js';
import { EventBus } from './event-bus.js';
import { UIBridge } from './ui-bridge.js';
import { RuntimeContextImpl } from './runtime-context.js';

/**
 * Runtime is the main orchestrator that coordinates all subsystems.
 * Handles initialization, shutdown, and lifecycle state tracking.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.5, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 9.7, 9.9, 15.1, 15.3, 15.5, 16.1, 16.2, 16.3, 16.4, 16.5
 */
export class Runtime {
  private plugins!: PluginRegistry;
  private screens!: ScreenRegistry;
  private actions!: ActionEngine;
  private events!: EventBus;
  private ui!: UIBridge;
  private context!: RuntimeContext;
  private initialized: boolean = false;
  private pendingPlugins: PluginDefinition[] = [];
  private logger: Logger;
  private state: RuntimeState = RuntimeState.Uninitialized;
  private hostContext: Record<string, unknown>;

  /**
   * Creates a new Runtime instance with optional configuration.
   * 
   * @param options - Optional configuration object
   * @param options.logger - Custom logger implementation (defaults to ConsoleLogger)
   * @param options.hostContext - Host application services to inject (defaults to empty object)
   * 
   * Requirements: 1.1, 1.5, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
   */
  constructor(options?: RuntimeOptions) {
    this.logger = options?.logger ?? new ConsoleLogger();
    this.hostContext = options?.hostContext ?? {};
    this.validateHostContext(this.hostContext);
  }

  /**
   * Validates host context and logs warnings for common mistakes.
   * Does not throw errors or modify the context.
   * 
   * @param context - The host context to validate
   * 
   * Requirements: 2.1, 2.2, 2.3, 2.4
   */
  private validateHostContext(context: Record<string, unknown>): void {
    // Fast path for empty context
    if (Object.keys(context).length === 0) {
      return;
    }

    // Check each key in the context
    Object.entries(context).forEach(([key, value]) => {
      // Check for large objects (> 1MB)
      try {
        const size = JSON.stringify(value).length;
        if (size > 1024 * 1024) {
          this.logger.warn(`Host context key "${key}" is large (${size} bytes)`);
        }
      } catch (error) {
        // JSON.stringify can fail for circular references or other issues
        // Log but don't fail validation
        this.logger.warn(`Host context key "${key}" could not be serialized for size check`);
      }

      // Check for function values
      if (typeof value === 'function') {
        this.logger.warn(`Host context key "${key}" is a function. Consider wrapping it in an object.`);
      }
    });
  }

  /**
   * Registers a plugin before initialization.
   * Plugins registered this way will have their setup callbacks executed during initialize().
   * 
   * @param plugin - The plugin definition to register
   * @throws Error if runtime is already initialized
   */
  registerPlugin(plugin: PluginDefinition): void {
    if (this.initialized) {
      throw new Error('Cannot register plugins after initialization. Use context.plugins.registerPlugin() instead.');
    }
    this.pendingPlugins.push(plugin);
  }

  /**
   * Initializes the runtime following the strict initialization sequence.
   * Creates all subsystems in order, then executes plugin setup callbacks.
   * Emits runtime:initialized event after successful initialization.
   * 
   * @throws Error if initialize is called twice
   * @throws Error if any plugin setup fails
   * 
   * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.5, 15.1, 15.3, 15.5, 16.1, 16.2, 16.3, 16.4, 16.5, 17.1, 17.2, 17.3
   */
  async initialize(): Promise<void> {
    // Throw error if initialize called twice (Requirement 15.1)
    if (this.initialized) {
      throw new Error('Runtime already initialized');
    }

    // Set state to Initializing (Requirement 16.2)
    this.state = RuntimeState.Initializing;

    try {
      // Strict initialization sequence (Requirements 2.1, 2.2, 2.3, 2.4)
      
      // 1. Create PluginRegistry (Requirement 2.1)
      this.plugins = new PluginRegistry(this.logger);
      
      // Register pending plugins
      for (const plugin of this.pendingPlugins) {
        this.plugins.registerPlugin(plugin);
      }
      this.pendingPlugins = [];
      
      // 2. Create ScreenRegistry (Requirement 2.2)
      this.screens = new ScreenRegistry(this.logger);
      
      // 3. Create ActionEngine (Requirement 2.3)
      this.actions = new ActionEngine(this.logger);
      
      // 4. Create EventBus (Requirement 2.4)
      this.events = new EventBus(this.logger);
      
      // 5. Create UIBridge
      this.ui = new UIBridge(this.logger);
      
      // 6. Create RuntimeContext after all subsystems (Requirements 1.2, 2.4, 9.7)
      this.context = new RuntimeContextImpl(
        this.screens,
        this.actions,
        this.plugins,
        this.events,
        this,
        this.hostContext
      );
      
      // 7. Pass RuntimeContext to ActionEngine (Requirement 9.9)
      this.actions.setContext(this.context);
      
      // 8. Execute plugin setup callbacks in registration order (Requirements 2.5, 2.6, 3.1)
      // This will abort on first plugin setup failure (Requirement 3.1)
      await this.plugins.executeSetup(this.context);
      
      // Mark as initialized
      this.initialized = true;
      
      // Set state to Initialized (Requirement 16.2)
      this.state = RuntimeState.Initialized;
      
      // Emit runtime:initialized event (Requirements 17.1, 17.2, 17.3)
      this.events.emit('runtime:initialized', { context: this.context });
    } catch (error) {
      // Reset state to Uninitialized on failure (Requirement 16.5)
      this.state = RuntimeState.Uninitialized;
      throw error;
    }
  }

  /**
   * Shuts down the runtime following the strict shutdown sequence.
   * Emits runtime:shutdown event at start of shutdown.
   * Disposes initialized plugins, shuts down UI provider, clears all registries, and releases resources.
   * Safe to call multiple times (idempotent).
   * 
   * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 9.5, 15.2, 15.4, 15.6, 16.1, 16.2, 16.3, 16.4, 16.5, 17.4, 17.5
   */
  async shutdown(): Promise<void> {
    // Make shutdown idempotent - safe to call multiple times (Requirement 4.5)
    if (!this.initialized) {
      return;
    }

    // Set state to ShuttingDown (Requirement 16.4)
    this.state = RuntimeState.ShuttingDown;
    
    // Emit runtime:shutdown event (Requirements 17.4, 17.5)
    this.events.emit('runtime:shutdown', { context: this.context });

    // 1. Execute dispose callbacks only for initialized plugins (Requirements 4.2, 4.3)
    // Dispose errors are logged but do not prevent cleanup (Requirement 4.4)
    await this.plugins.executeDispose(this.context);

    // 2. Shutdown UI provider before clearing registries (Requirement 9.5)
    // Handle shutdown errors gracefully - errors are logged but do not prevent cleanup
    try {
      await this.ui.shutdown();
    } catch (error) {
      this.logger.error('UIBridge shutdown failed', error);
    }

    // 3. Clear all registries (Requirement 4.5)
    this.screens.clear();
    this.actions.clear();
    this.events.clear();
    this.plugins.clear();

    // 4. Set initialized flag to false (Requirement 4.5)
    this.initialized = false;
    
    // Set state to Shutdown (Requirement 16.4)
    this.state = RuntimeState.Shutdown;
  }

  /**
   * Returns the RuntimeContext for this runtime instance.
   * 
   * @returns The RuntimeContext
   * @throws Error if runtime is not initialized
   * 
   * Requirement: 9.1
   */
  getContext(): RuntimeContext {
    if (!this.initialized) {
      throw new Error('Runtime not initialized');
    }
    return this.context;
  }

  /**
   * Returns whether the runtime has been initialized.
   * 
   * @returns true if runtime is initialized, false otherwise
   * 
   * Requirements: 16.1, 16.2, 16.3
   */
  isInitialized(): boolean {
    return this.state === RuntimeState.Initialized;
  }

  /**
   * Returns the current lifecycle state of the runtime.
   * 
   * @returns The current RuntimeState
   * 
   * Requirements: 16.1, 16.2, 16.3, 16.4, 16.5
   */
  getState(): RuntimeState {
    return this.state;
  }

  /**
   * Registers a UI provider with the runtime.
   * Delegates to UIBridge subsystem.
   * Can be called after initialization completes.
   * 
   * @param provider - The UI provider implementation
   * @throws Error if provider is invalid or already registered
   * 
   * Requirements: 10.3, 10.9
   */
  setUIProvider(provider: UIProvider): void {
    this.ui.setProvider(provider);
  }

  /**
   * Returns the registered UI provider.
   * Delegates to UIBridge subsystem.
   * 
   * @returns The registered UIProvider or null if none registered
   * 
   * Requirement: 10.4
   */
  getUIProvider(): UIProvider | null {
    return this.ui.getProvider();
  }

  /**
   * Renders a screen by looking it up in the ScreenRegistry and delegating to UIBridge.
   * 
   * @param screenId - The screen identifier to render
   * @returns The result from the UI provider's render method
   * @throws Error if screen is not found
   * @throws Error if no UI provider is registered
   * 
   * Requirement: 10.5
   */
  renderScreen(screenId: string): unknown {
    // Look up the screen in the registry
    const screen = this.screens.getScreen(screenId);
    
    // Throw if screen not found
    if (screen === null) {
      throw new Error(`Screen with id "${screenId}" not found`);
    }

    // Delegate to UIBridge to render the screen
    return this.ui.renderScreen(screen);
  }
}
