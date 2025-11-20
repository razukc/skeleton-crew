import { PluginDefinition, RuntimeContext } from '../../src/types.js';

/**
 * Core Demo Plugin
 * 
 * This plugin demonstrates the minimal plugin structure:
 * - Registering a screen (home/welcome screen)
 * - Subscribing to runtime events
 * - Providing informational content
 * 
 * This is the simplest type of plugin - it doesn't manage state or provide actions,
 * it just contributes a screen and listens to events.
 * 
 * @see Requirements 2.1, 2.4
 */

/**
 * Core demo plugin definition
 * Provides the home/welcome screen and demonstrates event subscription
 */
export const coreDemoPlugin: PluginDefinition = {
  name: 'core-demo',
  version: '1.0.0',
  
  /**
   * Setup function registers the home screen and subscribes to events
   */
  setup(context: RuntimeContext): void {
    // Register home screen
    // This is the landing screen that users see when they start the app
    // @see Requirements 2.1, 2.4
    context.screens.registerScreen({
      id: 'home',
      title: 'Welcome to Skeleton Crew Playground',
      component: 'HomeScreen'
    });

    // Subscribe to runtime:initialized event
    // This demonstrates how plugins can react to runtime lifecycle events
    // The runtime emits this event after all plugins have been initialized
    // @see Requirements 2.1
    context.events.on('runtime:initialized', () => {
      console.log('[core-demo] Runtime initialized successfully');
    });
  }
};
