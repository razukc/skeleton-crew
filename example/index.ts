import { Runtime } from '../src/runtime.js';
import { coreDemoPlugin } from './plugins/core-demo.js';
import { counterPlugin } from './plugins/counter.js';
import { settingsPlugin } from './plugins/settings.js';
import { terminalUIProvider } from './ui/terminal-ui-provider.js';

/**
 * Main entry point for the Skeleton Crew Playground example application
 * Demonstrates the full initialization sequence and plugin-driven architecture
 * 
 * This example showcases:
 * - Plugin registration and initialization
 * - Screen-based navigation
 * - Action execution and state management
 * - Event-driven communication between plugins
 * - UI provider integration (terminal-based)
 * 
 * @see Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 10.2, 10.3, 10.4, 10.5
 */

async function main(): Promise<void> {
  // Step 1: Create Runtime instance with default ConsoleLogger
  // The Runtime orchestrates all subsystems (plugins, screens, actions, events)
  // @see Requirements 1.1, 10.2
  const runtime = new Runtime();

  // Step 2: Register all plugins BEFORE initialization
  // Plugins must be registered before runtime.initialize() is called
  // Each plugin will contribute screens, actions, and event handlers
  // @see Requirements 1.2, 10.3
  runtime.registerPlugin(coreDemoPlugin);  // Provides home screen
  runtime.registerPlugin(counterPlugin);   // Provides counter feature
  runtime.registerPlugin(settingsPlugin);  // Provides settings feature

  // Step 3: Initialize the runtime
  // This executes all plugin setup callbacks in registration order
  // After this, all screens and actions are registered and ready to use
  // @see Requirements 1.3, 1.4, 10.4
  await runtime.initialize();

  // Step 4: Get RuntimeContext
  // RuntimeContext provides the API that plugins use to interact with the runtime
  // It exposes screens, actions, events, and plugin registries
  // @see Requirements 1.3, 10.4
  const context = runtime.getContext();

  // Step 5: Register Terminal UI Provider
  // The UI provider is responsible for rendering screens and handling user input
  // This demonstrates the runtime's UI-agnostic design - you could swap this
  // for a React, Vue, or any other UI implementation
  // @see Requirements 10.5
  runtime.setUIProvider(terminalUIProvider);

  // Step 6: Mount the Terminal UI Provider to start user interaction
  // This initializes the terminal interface and displays the screen menu
  // @see Requirements 10.5
  await terminalUIProvider.mount(null, context);

  // Step 7: Handle graceful shutdown on process signals (Ctrl+C, etc.)
  // This ensures proper cleanup of resources when the application exits
  // @see Requirements 1.5
  const shutdownHandler = async () => {
    console.log('\n\nShutting down gracefully...');
    await terminalUIProvider.unmount();  // Cleanup UI resources
    await runtime.shutdown();            // Cleanup runtime and plugins
    process.exit(0);
  };

  // Listen for termination signals
  process.on('SIGINT', shutdownHandler);   // Ctrl+C
  process.on('SIGTERM', shutdownHandler);  // Kill signal
}

// Run the application and handle any fatal errors
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
