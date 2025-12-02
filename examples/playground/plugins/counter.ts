import { PluginDefinition, RuntimeContext } from '../../../src/types.js';

/**
 * Counter Plugin
 * 
 * This plugin demonstrates the core concepts of Skeleton Crew plugins:
 * 1. State Management - Plugins manage their own state
 * 2. Screen Registration - Plugins contribute screens to the application
 * 3. Action Registration - Plugins provide executable operations
 * 4. Event Emission - Plugins communicate state changes through events
 * 
 * @see Requirements 2.2, 4.1, 4.2, 4.3, 4.4
 */

// Plugin State
// Each plugin manages its own state using simple JavaScript variables
// State is not shared between plugins except through events
let count = 0;

/**
 * Counter plugin definition
 * 
 * The plugin exports a PluginDefinition object with:
 * - name: Unique identifier for the plugin
 * - version: Semantic version
 * - setup: Function called during runtime initialization
 * - dispose: Optional cleanup function called during shutdown
 */
export const counterPlugin: PluginDefinition = {
  name: 'counter',
  version: '1.0.0',
  
  /**
   * Setup function is called during runtime initialization
   * This is where plugins register screens, actions, and event handlers
   * 
   * @param context - RuntimeContext provides access to all runtime subsystems
   */
  setup(context: RuntimeContext): void {
    // Register a screen definition
    // Screens are declarative - they describe what should be rendered
    // The UI provider is responsible for actually rendering the screen
    // @see Requirements 2.2, 4.1
    context.screens.registerScreen({
      id: 'counter',              // Unique identifier for the screen
      title: 'Counter',           // Display title
      component: 'CounterScreen'  // Component identifier (used by UI provider)
    });

    // Register increment action
    // Actions are executable operations with handlers
    // They can modify state and emit events to notify other plugins
    // @see Requirements 4.2, 4.4
    context.actions.registerAction({
      id: 'increment',
      handler: () => {
        count += 1;
        // Emit event to notify other plugins of state change
        context.events.emit('counter:changed', { value: count });
        return count;
      }
    });

    // Register decrement action
    // Similar to increment, but decreases the count
    // @see Requirements 4.3, 4.4
    context.actions.registerAction({
      id: 'decrement',
      handler: () => {
        count -= 1;
        // Events enable loose coupling between plugins
        context.events.emit('counter:changed', { value: count });
        return count;
      }
    });

    // Register reset action
    // Resets the counter to its initial state
    // @see Requirements 4.4
    context.actions.registerAction({
      id: 'reset',
      handler: () => {
        count = 0;
        context.events.emit('counter:changed', { value: count });
        return count;
      }
    });
  },

  /**
   * Dispose function is called during runtime shutdown
   * This is where plugins clean up resources and reset state
   */
  dispose(): void {
    // Reset counter state on disposal
    count = 0;
  }
};

/**
 * Get current counter value (for testing and UI rendering)
 */
export function getCounterValue(): number {
  return count;
}

/**
 * Set counter value (for testing purposes)
 */
export function setCounterValue(value: number): void {
  count = value;
}
