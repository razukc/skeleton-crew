import { Runtime } from '../../src/runtime.js';
import { PluginDefinition } from '../../src/types.js';

/**
 * Example 05: Runtime Context
 * Demonstrates the unified RuntimeContext API
 */

const contextDemoPlugin: PluginDefinition = {
  name: 'context-demo',
  version: '1.0.0',
  
  setup(context) {
    console.log('[Plugin] Exploring RuntimeContext API...\n');
    
    // RuntimeContext provides access to all subsystems
    console.log('[Plugin] Available subsystems:');
    console.log(`  - context.screens (ScreenRegistry)`);
    console.log(`  - context.actions (ActionEngine)`);
    console.log(`  - context.events (EventBus)`);
    console.log(`  - context.plugins (PluginRegistry)`);
    console.log(`  - context.getRuntime() (Runtime instance)\n`);
    
    // Register a screen
    context.screens.registerScreen({
      id: 'dashboard',
      title: 'Dashboard',
      component: 'DashboardComponent'
    });
    
    // Register an action
    context.actions.registerAction({
      id: 'refresh-data',
      handler: () => {
        console.log('[Action] Refreshing data...');
        context.events.emit('data:refreshed', { timestamp: Date.now() });
        return 'Data refreshed';
      }
    });
    
    // Subscribe to events
    context.events.on('data:refreshed', (data) => {
      console.log('[Event] Data refresh completed at:', new Date(data.timestamp).toISOString());
    });
    
    // Access plugin registry
    const allPlugins = context.plugins.getAllPlugins();
    console.log(`[Plugin] Total plugins registered: ${allPlugins.length}`);
    
    // Access runtime instance
    const runtime = context.getRuntime();
    console.log(`[Plugin] Runtime instance accessible: ${!!runtime}\n`);
  }
};

async function main(): Promise<void> {
  console.log('=== Runtime Context Example ===\n');
  
  const runtime = new Runtime();
  runtime.registerPlugin(contextDemoPlugin);
  await runtime.initialize();
  
  // Get context from runtime
  const context = runtime.getContext();
  
  console.log('[Demo] RuntimeContext provides unified access to all subsystems\n');
  
  // Demonstrate accessing subsystems through context
  console.log('[Demo] Accessing screens through context:');
  const screens = context.screens.getAllScreens();
  console.log(`  Found ${screens.length} screen(s): ${screens.map(s => s.id).join(', ')}\n`);
  
  console.log('[Demo] Accessing actions through context:');
  console.log(`  Actions can be executed via context.actions.runAction()\n`);
  
  console.log('[Demo] Executing action through context:');
  const result = await context.actions.runAction('refresh-data', {});
  console.log(`  Action result: "${result}"\n`);
  
  console.log('[Demo] Accessing plugins through context:');
  const plugins = context.plugins.getAllPlugins();
  plugins.forEach(plugin => {
    console.log(`  - ${plugin.name} v${plugin.version}`);
  });
  
  console.log('\n[Demo] RuntimeContext is the single API surface for plugin authors!');
  
  await runtime.shutdown();
}

main().catch(console.error);
