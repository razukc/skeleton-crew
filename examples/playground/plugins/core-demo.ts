import { PluginDefinition, RuntimeContext } from '../../../src/types.js';

/**
 * Core Demo Plugin
 * 
 * This plugin demonstrates all core features of Skeleton Crew Runtime:
 * - Plugin System: Registration and lifecycle
 * - Screen Registry: Screen management and lookup
 * - Action Engine: Action registration and execution
 * - Event Bus: Event emission and subscription
 * - Runtime Context: Unified API access to all subsystems
 * 
 * Each demonstration screen provides interactive examples of runtime capabilities.
 * 
 * @see Requirements 2.1, 2.4, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7
 */

// Event log for demonstration purposes
const demoEventLog: Array<{ event: string; data: unknown; timestamp: string }> = [];

/**
 * Core demo plugin definition
 * Provides the home screen and interactive demonstration screens for each runtime feature
 */
export const coreDemoPlugin: PluginDefinition = {
  name: 'core-demo',
  version: '1.0.0',
  
  /**
   * Setup function registers all demonstration screens, actions, and event handlers
   */
  setup(context: RuntimeContext): void {
    // Register home screen
    // This is the landing screen that users see when they start the app
    // @see Requirements 2.1, 2.4, 11.1
    context.screens.registerScreen({
      id: 'home',
      title: 'Welcome to Skeleton Crew Playground',
      component: 'HomeScreen'
    });

    // Register Plugin System Demo screen
    // Demonstrates plugin registration and lifecycle
    // @see Requirements 11.1, 11.2
    context.screens.registerScreen({
      id: 'demo-plugin-system',
      title: 'Plugin System Demo',
      component: 'DemoPluginSystemScreen'
    });

    // Register Screen Registry Demo screen
    // Demonstrates screen management and lookup
    // @see Requirements 11.1, 11.3
    context.screens.registerScreen({
      id: 'demo-screen-registry',
      title: 'Screen Registry Demo',
      component: 'DemoScreenRegistryScreen'
    });

    // Register Action Engine Demo screen
    // Demonstrates action registration and execution
    // @see Requirements 11.1, 11.4
    context.screens.registerScreen({
      id: 'demo-action-engine',
      title: 'Action Engine Demo',
      component: 'DemoActionEngineScreen'
    });

    // Register Event Bus Demo screen
    // Demonstrates event emission and subscription
    // @see Requirements 11.1, 11.5
    context.screens.registerScreen({
      id: 'demo-event-bus',
      title: 'Event Bus Demo',
      component: 'DemoEventBusScreen'
    });

    // Register Runtime Context Demo screen
    // Demonstrates unified context API access
    // @see Requirements 11.1, 11.6
    context.screens.registerScreen({
      id: 'demo-runtime-context',
      title: 'Runtime Context Demo',
      component: 'DemoRuntimeContextScreen'
    });

    // Register demo:greet action (no parameters)
    // Simple action that returns a greeting
    // @see Requirements 11.4
    context.actions.registerAction({
      id: 'demo:greet',
      handler: () => {
        const result = 'Hello from Skeleton Crew Runtime!';
        // Emit demo:action-executed event
        // @see Requirements 11.7
        context.events.emit('demo:action-executed', {
          actionId: 'demo:greet',
          parameters: undefined,
          result,
          timestamp: new Date().toISOString()
        });
        return result;
      }
    });

    // Register demo:greet-user action (with parameters)
    // Demonstrates parameter passing
    // @see Requirements 11.4
    context.actions.registerAction<{ name: string }, string>({
      id: 'demo:greet-user',
      handler: (params: { name: string }) => {
        if (!params || typeof params.name !== 'string' || params.name.trim() === '') {
          throw new Error('Parameter "name" is required and must be a non-empty string');
        }
        const result = `Hello, ${params.name}! Welcome to Skeleton Crew Runtime.`;
        // Emit demo:action-executed event
        // @see Requirements 11.7
        context.events.emit('demo:action-executed', {
          actionId: 'demo:greet-user',
          parameters: params,
          result,
          timestamp: new Date().toISOString()
        });
        return result;
      }
    });

    // Register demo:calculate action (with multiple parameters)
    // Demonstrates parameter validation and calculation
    // @see Requirements 11.4
    context.actions.registerAction<{ a: number; b: number; operation: string }, number>({
      id: 'demo:calculate',
      handler: (params: { a: number; b: number; operation: string }) => {
        if (!params || typeof params.a !== 'number' || typeof params.b !== 'number') {
          throw new Error('Parameters "a" and "b" are required and must be numbers');
        }
        if (!params.operation || typeof params.operation !== 'string') {
          throw new Error('Parameter "operation" is required and must be a string');
        }

        let result: number;
        switch (params.operation) {
          case 'add':
            result = params.a + params.b;
            break;
          case 'subtract':
            result = params.a - params.b;
            break;
          case 'multiply':
            result = params.a * params.b;
            break;
          case 'divide':
            if (params.b === 0) {
              throw new Error('Cannot divide by zero');
            }
            result = params.a / params.b;
            break;
          default:
            throw new Error(`Unknown operation: ${params.operation}. Supported operations: add, subtract, multiply, divide`);
        }

        // Emit demo:action-executed event
        // @see Requirements 11.7
        context.events.emit('demo:action-executed', {
          actionId: 'demo:calculate',
          parameters: params,
          result,
          timestamp: new Date().toISOString()
        });
        return result;
      }
    });

    // Register demo:emit-event action
    // Demonstrates custom event emission
    // @see Requirements 11.5
    context.actions.registerAction<{ message: string; priority?: string }, void>({
      id: 'demo:emit-event',
      handler: (params: { message: string; priority?: string }) => {
        if (!params || typeof params.message !== 'string' || params.message.trim() === '') {
          throw new Error('Parameter "message" is required and must be a non-empty string');
        }
        
        // Emit custom demo event
        context.events.emit('demo:event-emitted', {
          message: params.message,
          priority: params.priority || 'normal',
          timestamp: new Date().toISOString()
        });

        // Also emit demo:action-executed event
        // @see Requirements 11.7
        context.events.emit('demo:action-executed', {
          actionId: 'demo:emit-event',
          parameters: params,
          result: undefined,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Register demo:list-plugins action
    // Retrieves all registered plugins via context.plugins
    // @see Requirements 11.6
    context.actions.registerAction<void, Array<{ name: string; version: string }>>({
      id: 'demo:list-plugins',
      handler: () => {
        const plugins = context.plugins.getAllPlugins();
        const result = plugins.map((p: any) => ({ name: p.name, version: p.version }));
        
        // Emit demo:action-executed event
        // @see Requirements 11.7
        context.events.emit('demo:action-executed', {
          actionId: 'demo:list-plugins',
          parameters: undefined,
          result,
          timestamp: new Date().toISOString()
        });
        return result;
      }
    });

    // Register demo:list-screens action
    // Retrieves all registered screens via context.screens
    // @see Requirements 11.6
    context.actions.registerAction<void, Array<{ id: string; title: string; component: string }>>({
      id: 'demo:list-screens',
      handler: () => {
        const screens = context.screens.getAllScreens();
        const result = screens.map((s: any) => ({ id: s.id, title: s.title, component: s.component }));
        
        // Emit demo:action-executed event
        // @see Requirements 11.7
        context.events.emit('demo:action-executed', {
          actionId: 'demo:list-screens',
          parameters: undefined,
          result,
          timestamp: new Date().toISOString()
        });
        return result;
      }
    });

    // Register demo:list-actions action
    // Note: ActionEngine doesn't expose getAllActions in the public API,
    // so we'll return a list of known demo actions
    // @see Requirements 11.6
    context.actions.registerAction<void, string[]>({
      id: 'demo:list-actions',
      handler: () => {
        // Since we can't access all actions from the context API,
        // we'll return the demo actions we know about
        const result = [
          'demo:greet',
          'demo:greet-user',
          'demo:calculate',
          'demo:emit-event',
          'demo:list-plugins',
          'demo:list-screens',
          'demo:list-actions',
          'increment',
          'decrement',
          'reset',
          'toggle-theme'
        ];
        
        // Emit demo:action-executed event
        // @see Requirements 11.7
        context.events.emit('demo:action-executed', {
          actionId: 'demo:list-actions',
          parameters: undefined,
          result,
          timestamp: new Date().toISOString()
        });
        return result;
      }
    });

    // Subscribe to runtime:initialized event
    // This demonstrates how plugins can react to runtime lifecycle events
    // @see Requirements 2.1
    context.events.on('runtime:initialized', () => {
      console.log('[core-demo] Runtime initialized successfully');
    });

    // Subscribe to demo:event-emitted events
    // Demonstrates event subscription and handling
    // @see Requirements 11.5
    context.events.on('demo:event-emitted', (data: any) => {
      demoEventLog.push({
        event: 'demo:event-emitted',
        data,
        timestamp: new Date().toISOString()
      });
      console.log('[core-demo] Event received:', data);
    });

    // Subscribe to demo:action-executed events
    // Logs all demo action executions
    // @see Requirements 11.7
    context.events.on('demo:action-executed', (data: any) => {
      demoEventLog.push({
        event: 'demo:action-executed',
        data,
        timestamp: new Date().toISOString()
      });
    });
  },

  /**
   * Dispose function cleans up event log
   */
  dispose(): void {
    demoEventLog.length = 0;
  }
};

/**
 * Get demo event log (for testing and UI rendering)
 */
export function getDemoEventLog(): Array<{ event: string; data: unknown; timestamp: string }> {
  return [...demoEventLog];
}

/**
 * Clear demo event log (for testing purposes)
 */
export function clearDemoEventLog(): void {
  demoEventLog.length = 0;
}
