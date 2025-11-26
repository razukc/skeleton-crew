import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Runtime } from '../../src/runtime.js';
import type { PluginDefinition, RuntimeContext, ScreenDefinition, ActionDefinition } from '../../src/types.js';

/**
 * Integration tests for backward compatibility with migration support features.
 * Verifies that all existing APIs work unchanged when runtime is created without hostContext.
 * 
 * Tests Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */
describe('Backward compatibility integration tests', () => {
  let runtime: Runtime;

  beforeEach(() => {
    // Create runtime without hostContext (default behavior)
    runtime = new Runtime();
  });

  afterEach(async () => {
    if (runtime.isInitialized()) {
      await runtime.shutdown();
    }
  });

  describe('Runtime initialization without hostContext', () => {
    it('should initialize successfully without hostContext option (Requirement 8.1)', async () => {
      // Runtime created without hostContext should initialize normally
      await expect(runtime.initialize()).resolves.not.toThrow();
      expect(runtime.isInitialized()).toBe(true);
    });

    it('should initialize with empty object logger option only', async () => {
      // Create runtime with logger but no hostContext
      const customLogger = {
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {}
      };
      
      const runtimeWithLogger = new Runtime({ logger: customLogger });
      await expect(runtimeWithLogger.initialize()).resolves.not.toThrow();
      expect(runtimeWithLogger.isInitialized()).toBe(true);
      
      await runtimeWithLogger.shutdown();
    });

    it('should provide default empty frozen object for context.host (Requirement 8.1)', async () => {
      await runtime.initialize();
      const context = runtime.getContext();
      
      // context.host should exist
      expect(context.host).toBeDefined();
      
      // Should be an empty object
      expect(Object.keys(context.host)).toHaveLength(0);
      
      // Should be frozen
      expect(Object.isFrozen(context.host)).toBe(true);
    });
  });

  describe('Plugin registration and lifecycle', () => {
    it('should register plugins before initialization (Requirement 8.2)', async () => {
      const setupCalled = { value: false };
      
      const plugin: PluginDefinition = {
        name: 'test-plugin',
        version: '1.0.0',
        setup: () => {
          setupCalled.value = true;
        }
      };

      // Register plugin before initialization
      runtime.registerPlugin(plugin);
      await runtime.initialize();
      
      // Plugin setup should have been called
      expect(setupCalled.value).toBe(true);
      
      // Plugin should be retrievable
      const context = runtime.getContext();
      const retrievedPlugin = context.plugins.getPlugin('test-plugin');
      expect(retrievedPlugin).not.toBeNull();
      expect(retrievedPlugin?.name).toBe('test-plugin');
    });

    it('should execute plugin setup callbacks in order (Requirement 8.2)', async () => {
      const executionOrder: string[] = [];
      
      const plugin1: PluginDefinition = {
        name: 'plugin1',
        version: '1.0.0',
        setup: () => {
          executionOrder.push('plugin1');
        }
      };

      const plugin2: PluginDefinition = {
        name: 'plugin2',
        version: '1.0.0',
        setup: () => {
          executionOrder.push('plugin2');
        }
      };

      runtime.registerPlugin(plugin1);
      runtime.registerPlugin(plugin2);
      await runtime.initialize();
      
      expect(executionOrder).toEqual(['plugin1', 'plugin2']);
    });

    it('should execute plugin dispose callbacks on shutdown (Requirement 8.2)', async () => {
      const disposeCalled = { value: false };
      
      const plugin: PluginDefinition = {
        name: 'test-plugin',
        version: '1.0.0',
        setup: () => {},
        dispose: () => {
          disposeCalled.value = true;
        }
      };

      runtime.registerPlugin(plugin);
      await runtime.initialize();
      await runtime.shutdown();
      
      expect(disposeCalled.value).toBe(true);
    });
  });

  describe('Screen registry operations', () => {
    it('should register and retrieve screens (Requirement 8.2, 8.3)', async () => {
      await runtime.initialize();
      const context = runtime.getContext();
      
      const screen: ScreenDefinition = {
        id: 'test-screen',
        title: 'Test Screen',
        component: 'TestComponent'
      };

      // Register screen
      context.screens.registerScreen(screen);
      
      // Retrieve screen
      const retrieved = context.screens.getScreen('test-screen');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe('test-screen');
      expect(retrieved?.title).toBe('Test Screen');
      expect(retrieved?.component).toBe('TestComponent');
    });

    it('should get all registered screens (Requirement 8.2, 8.3)', async () => {
      await runtime.initialize();
      const context = runtime.getContext();
      
      context.screens.registerScreen({
        id: 'screen1',
        title: 'Screen 1',
        component: 'Component1'
      });
      
      context.screens.registerScreen({
        id: 'screen2',
        title: 'Screen 2',
        component: 'Component2'
      });
      
      const allScreens = context.screens.getAllScreens();
      expect(allScreens).toHaveLength(2);
      expect(allScreens.map(s => s.id)).toContain('screen1');
      expect(allScreens.map(s => s.id)).toContain('screen2');
    });

    it('should return null for non-existent screen (Requirement 8.2, 8.3)', async () => {
      await runtime.initialize();
      const context = runtime.getContext();
      
      const screen = context.screens.getScreen('non-existent');
      expect(screen).toBeNull();
    });
  });

  describe('Action engine operations', () => {
    it('should register and execute actions (Requirement 8.2, 8.3)', async () => {
      await runtime.initialize();
      const context = runtime.getContext();
      
      const action: ActionDefinition = {
        id: 'test-action',
        handler: async (params: unknown) => {
          return `processed-${params}`;
        }
      };

      // Register action
      context.actions.registerAction(action);
      
      // Execute action
      const result = await context.actions.runAction('test-action', 'data');
      expect(result).toBe('processed-data');
    });

    it('should pass RuntimeContext to action handlers (Requirement 8.2, 8.3)', async () => {
      await runtime.initialize();
      const context = runtime.getContext();
      
      let receivedContext: RuntimeContext | null = null;
      
      const action: ActionDefinition = {
        id: 'context-action',
        handler: async (params: unknown, ctx: RuntimeContext) => {
          receivedContext = ctx;
          return 'done';
        }
      };

      context.actions.registerAction(action);
      await context.actions.runAction('context-action');
      
      expect(receivedContext).toBe(context);
    });

    it('should support action timeout (Requirement 8.2, 8.3)', async () => {
      await runtime.initialize();
      const context = runtime.getContext();
      
      const action: ActionDefinition = {
        id: 'timeout-action',
        handler: async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return 'completed';
        },
        timeout: 50
      };

      context.actions.registerAction(action);
      
      // Action should timeout
      await expect(context.actions.runAction('timeout-action')).rejects.toThrow();
    });

    it('should throw for non-existent action (Requirement 8.2, 8.3)', async () => {
      await runtime.initialize();
      const context = runtime.getContext();
      
      await expect(context.actions.runAction('non-existent')).rejects.toThrow();
    });
  });

  describe('Event bus operations', () => {
    it('should emit and receive events (Requirement 8.2, 8.3)', async () => {
      await runtime.initialize();
      const context = runtime.getContext();
      
      const receivedEvents: string[] = [];
      
      // Subscribe to event
      context.events.on('test-event', (data: unknown) => {
        receivedEvents.push(data as string);
      });
      
      // Emit event
      context.events.emit('test-event', 'event-data');
      
      expect(receivedEvents).toEqual(['event-data']);
    });

    it('should support multiple handlers for same event (Requirement 8.2, 8.3)', async () => {
      await runtime.initialize();
      const context = runtime.getContext();
      
      const handler1Events: string[] = [];
      const handler2Events: string[] = [];
      
      context.events.on('shared-event', (data: unknown) => {
        handler1Events.push(`handler1-${data}`);
      });
      
      context.events.on('shared-event', (data: unknown) => {
        handler2Events.push(`handler2-${data}`);
      });
      
      context.events.emit('shared-event', 'test');
      
      expect(handler1Events).toEqual(['handler1-test']);
      expect(handler2Events).toEqual(['handler2-test']);
    });

    it('should support unsubscribe from events (Requirement 8.2, 8.3)', async () => {
      await runtime.initialize();
      const context = runtime.getContext();
      
      let eventCount = 0;
      
      const unsubscribe = context.events.on('test-event', () => {
        eventCount++;
      });
      
      context.events.emit('test-event');
      expect(eventCount).toBe(1);
      
      unsubscribe();
      context.events.emit('test-event');
      expect(eventCount).toBe(1); // Should not increment
    });

    it('should support async event emission (Requirement 8.2, 8.3)', async () => {
      await runtime.initialize();
      const context = runtime.getContext();
      
      const receivedEvents: string[] = [];
      
      context.events.on('async-event', async (data: unknown) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        receivedEvents.push(data as string);
      });
      
      await context.events.emitAsync('async-event', 'async-data');
      
      expect(receivedEvents).toEqual(['async-data']);
    });
  });

  describe('RuntimeContext API', () => {
    it('should provide access to runtime instance (Requirement 8.3)', async () => {
      await runtime.initialize();
      const context = runtime.getContext();
      
      const retrievedRuntime = context.getRuntime();
      expect(retrievedRuntime).toBe(runtime);
    });

    it('should provide all subsystem APIs (Requirement 8.3)', async () => {
      await runtime.initialize();
      const context = runtime.getContext();
      
      // Verify all subsystem APIs exist
      expect(context.screens).toBeDefined();
      expect(context.screens.registerScreen).toBeDefined();
      expect(context.screens.getScreen).toBeDefined();
      expect(context.screens.getAllScreens).toBeDefined();
      
      expect(context.actions).toBeDefined();
      expect(context.actions.registerAction).toBeDefined();
      expect(context.actions.runAction).toBeDefined();
      
      expect(context.plugins).toBeDefined();
      expect(context.plugins.registerPlugin).toBeDefined();
      expect(context.plugins.getPlugin).toBeDefined();
      expect(context.plugins.getAllPlugins).toBeDefined();
      expect(context.plugins.getInitializedPlugins).toBeDefined();
      
      expect(context.events).toBeDefined();
      expect(context.events.emit).toBeDefined();
      expect(context.events.emitAsync).toBeDefined();
      expect(context.events.on).toBeDefined();
      
      expect(context.getRuntime).toBeDefined();
    });

    it('should provide new migration support APIs (Requirement 8.3, 8.5)', async () => {
      await runtime.initialize();
      const context = runtime.getContext();
      
      // Verify new APIs exist
      expect(context.host).toBeDefined();
      expect(context.introspect).toBeDefined();
      
      // Verify introspection methods exist
      expect(context.introspect.listActions).toBeDefined();
      expect(context.introspect.getActionDefinition).toBeDefined();
      expect(context.introspect.listPlugins).toBeDefined();
      expect(context.introspect.getPluginDefinition).toBeDefined();
      expect(context.introspect.listScreens).toBeDefined();
      expect(context.introspect.getScreenDefinition).toBeDefined();
      expect(context.introspect.getMetadata).toBeDefined();
    });
  });

  describe('Runtime lifecycle', () => {
    it('should support full initialize-shutdown cycle (Requirement 8.2)', async () => {
      await runtime.initialize();
      expect(runtime.isInitialized()).toBe(true);
      
      await runtime.shutdown();
      expect(runtime.isInitialized()).toBe(false);
    });

    it('should throw when accessing context before initialization (Requirement 8.2)', () => {
      expect(() => runtime.getContext()).toThrow('Runtime not initialized');
    });

    it('should throw when accessing context after shutdown (Requirement 8.2)', async () => {
      await runtime.initialize();
      await runtime.shutdown();
      
      expect(() => runtime.getContext()).toThrow('Runtime not initialized');
    });

    it('should throw when initializing twice (Requirement 8.2)', async () => {
      await runtime.initialize();
      
      await expect(runtime.initialize()).rejects.toThrow('Runtime already initialized');
    });

    it('should be idempotent for shutdown (Requirement 8.2)', async () => {
      await runtime.initialize();
      
      await runtime.shutdown();
      await expect(runtime.shutdown()).resolves.not.toThrow();
    });
  });

  describe('Cross-subsystem integration', () => {
    it('should allow plugins to register screens during setup (Requirement 8.2, 8.3)', async () => {
      const plugin: PluginDefinition = {
        name: 'screen-plugin',
        version: '1.0.0',
        setup: (context: RuntimeContext) => {
          context.screens.registerScreen({
            id: 'plugin-screen',
            title: 'Plugin Screen',
            component: 'PluginComponent'
          });
        }
      };

      runtime.registerPlugin(plugin);
      await runtime.initialize();
      
      const context = runtime.getContext();
      const screen = context.screens.getScreen('plugin-screen');
      expect(screen).not.toBeNull();
      expect(screen?.id).toBe('plugin-screen');
    });

    it('should allow plugins to register actions during setup (Requirement 8.2, 8.3)', async () => {
      const plugin: PluginDefinition = {
        name: 'action-plugin',
        version: '1.0.0',
        setup: (context: RuntimeContext) => {
          context.actions.registerAction({
            id: 'plugin-action',
            handler: async () => 'plugin-result'
          });
        }
      };

      runtime.registerPlugin(plugin);
      await runtime.initialize();
      
      const context = runtime.getContext();
      const result = await context.actions.runAction('plugin-action');
      expect(result).toBe('plugin-result');
    });

    it('should allow plugins to subscribe to events during setup (Requirement 8.2, 8.3)', async () => {
      const receivedEvents: string[] = [];
      
      const plugin: PluginDefinition = {
        name: 'event-plugin',
        version: '1.0.0',
        setup: (context: RuntimeContext) => {
          context.events.on('plugin-event', (data: unknown) => {
            receivedEvents.push(data as string);
          });
        }
      };

      runtime.registerPlugin(plugin);
      await runtime.initialize();
      
      const context = runtime.getContext();
      context.events.emit('plugin-event', 'test-data');
      
      expect(receivedEvents).toEqual(['test-data']);
    });

    it('should allow action handlers to access all subsystems (Requirement 8.2, 8.3)', async () => {
      await runtime.initialize();
      const context = runtime.getContext();
      
      // Register a screen
      context.screens.registerScreen({
        id: 'test-screen',
        title: 'Test Screen',
        component: 'TestComponent'
      });
      
      // Register an action that accesses screens
      let screenFromAction: any = null;
      context.actions.registerAction({
        id: 'access-screen',
        handler: async (params: unknown, ctx: RuntimeContext) => {
          screenFromAction = ctx.screens.getScreen('test-screen');
          return screenFromAction;
        }
      });
      
      await context.actions.runAction('access-screen');
      
      expect(screenFromAction).not.toBeNull();
      expect(screenFromAction.id).toBe('test-screen');
    });
  });

  describe('UI provider integration', () => {
    it('should support UI provider registration (Requirement 8.2)', async () => {
      await runtime.initialize();
      
      const provider = {
        mount: () => {},
        renderScreen: () => 'rendered'
      };
      
      runtime.setUIProvider(provider);
      
      const retrievedProvider = runtime.getUIProvider();
      expect(retrievedProvider).toBe(provider);
    });

    it('should support screen rendering with UI provider (Requirement 8.2)', async () => {
      await runtime.initialize();
      const context = runtime.getContext();
      
      const provider = {
        mount: () => {},
        renderScreen: (screen: ScreenDefinition) => `rendered-${screen.id}`
      };
      
      runtime.setUIProvider(provider);
      
      context.screens.registerScreen({
        id: 'test-screen',
        title: 'Test Screen',
        component: 'TestComponent'
      });
      
      const result = runtime.renderScreen('test-screen');
      expect(result).toBe('rendered-test-screen');
    });
  });

  describe('Type safety', () => {
    it('should support generic type parameters for actions (Requirement 8.2, 8.3)', async () => {
      await runtime.initialize();
      const context = runtime.getContext();
      
      interface TestParams {
        id: string;
        value: number;
      }
      
      interface TestResult {
        success: boolean;
        data: string;
      }
      
      const action: ActionDefinition<TestParams, TestResult> = {
        id: 'typed-action',
        handler: async (params: TestParams) => {
          return {
            success: true,
            data: `${params.id}-${params.value}`
          };
        }
      };
      
      context.actions.registerAction(action);
      
      const result = await context.actions.runAction<TestParams, TestResult>(
        'typed-action',
        { id: 'test', value: 42 }
      );
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('test-42');
    });
  });

  describe('Error handling', () => {
    it('should throw ValidationError for invalid screen (Requirement 8.2)', async () => {
      await runtime.initialize();
      const context = runtime.getContext();
      
      // Missing required fields should throw ValidationError
      expect(() => {
        context.screens.registerScreen({} as any);
      }).toThrow();
    });

    it('should throw DuplicateRegistrationError for duplicate screen (Requirement 8.2)', async () => {
      await runtime.initialize();
      const context = runtime.getContext();
      
      const screen: ScreenDefinition = {
        id: 'duplicate-screen',
        title: 'Test Screen',
        component: 'TestComponent'
      };
      
      context.screens.registerScreen(screen);
      
      // Registering same screen again should throw
      expect(() => {
        context.screens.registerScreen(screen);
      }).toThrow();
    });

    it('should throw ActionExecutionError when action handler fails (Requirement 8.2)', async () => {
      await runtime.initialize();
      const context = runtime.getContext();
      
      const action: ActionDefinition = {
        id: 'failing-action',
        handler: async () => {
          throw new Error('Action failed');
        }
      };
      
      context.actions.registerAction(action);
      
      await expect(context.actions.runAction('failing-action')).rejects.toThrow();
    });
  });
});
