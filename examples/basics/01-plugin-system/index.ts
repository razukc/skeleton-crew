import { Runtime } from '../../../src/runtime.js';
import { PluginDefinition, RuntimeContext } from '../../../src/types.js';

/**
 * Example 01: Plugin System
 * Demonstrates plugin registration, initialization, and lifecycle
 */

// Simple plugin that logs its lifecycle
const loggingPlugin: PluginDefinition = {
  name: 'logging-plugin',
  version: '1.0.0',
  
  setup(context: RuntimeContext) {
    console.log('[Plugin] logging-plugin.setup() called');
    console.log('[Plugin] I can access runtime context:', {
      hasScreens: !!context.screens,
      hasActions: !!context.actions,
      hasEvents: !!context.events,
    });
  },
  
  dispose() {
    console.log('[Plugin] logging-plugin.dispose() called');
  }
};

// Another plugin to show multiple plugins working together
const greetingPlugin: PluginDefinition = {
  name: 'greeting-plugin',
  version: '1.0.0',
  
  setup(_context: RuntimeContext) {
    console.log('[Plugin] greeting-plugin.setup() called');
    console.log('[Plugin] Hello from greeting plugin!');
  },
  
  dispose() {
    console.log('[Plugin] greeting-plugin.dispose() called');
  }
};

async function main(): Promise<void> {
  console.log('=== Plugin System Example ===\n');
  
  // Step 1: Create runtime
  console.log('[Runtime] Creating runtime instance...');
  const runtime = new Runtime();
  
  // Step 2: Register plugins BEFORE initialization
  console.log('[Runtime] Registering plugins...');
  runtime.registerPlugin(loggingPlugin);
  runtime.registerPlugin(greetingPlugin);
  
  // Step 3: Initialize runtime (this calls setup() on all plugins)
  console.log('[Runtime] Initializing runtime...\n');
  await runtime.initialize();
  
  console.log('\n[Runtime] Runtime initialized successfully!');
  console.log('[Runtime] All plugin setup callbacks have been executed.\n');
  
  // Step 4: Shutdown (this calls dispose() on all plugins)
  console.log('[Runtime] Shutting down...\n');
  await runtime.shutdown();
  
  console.log('\n[Runtime] Shutdown complete!');
}

main().catch(console.error);
