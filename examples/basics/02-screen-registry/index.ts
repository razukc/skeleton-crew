import { Runtime } from '../../../src/runtime.js';
import { PluginDefinition, RuntimeContext } from '../../../src/types.js';

/**
 * Example 02: Screen Registry
 * Demonstrates screen registration and retrieval
 */

const screenDemoPlugin: PluginDefinition = {
  name: 'screen-demo',
  version: '1.0.0',
  
  setup(context: RuntimeContext) {
    console.log('[Plugin] Registering screens...\n');
    
    // Register multiple screens
    context.screens.registerScreen({
      id: 'home',
      title: 'Home Screen',
      component: 'HomeComponent'
    });
    
    context.screens.registerScreen({
      id: 'about',
      title: 'About Screen',
      component: 'AboutComponent'
    });
    
    context.screens.registerScreen({
      id: 'profile',
      title: 'User Profile',
      component: 'ProfileComponent'
    });
    
    console.log('[Plugin] Registered 3 screens');
  }
};

async function main(): Promise<void> {
  console.log('=== Screen Registry Example ===\n');
  
  const runtime = new Runtime();
  runtime.registerPlugin(screenDemoPlugin);
  await runtime.initialize();
  
  const context = runtime.getContext();
  
  // Retrieve and display all screens
  console.log('\n[Demo] Retrieving all screens:\n');
  const allScreens = context.screens.getAllScreens();
  
  allScreens.forEach((screen: any) => {
    console.log(`  Screen ID: ${screen.id}`);
    console.log(`  Title: ${screen.title}`);
    console.log(`  Component: ${screen.component}`);
    console.log(`  Component:`, screen.component);
    console.log('');
  });
  
  // Retrieve specific screen
  console.log('[Demo] Retrieving specific screen by ID:\n');
  const homeScreen = context.screens.getScreen('home');
  if (homeScreen) {
    console.log(`  Found: ${homeScreen.title} (${homeScreen.id})`);
  }
  
  // Try to get non-existent screen
  console.log('\n[Demo] Attempting to get non-existent screen:\n');
  const missing = context.screens.getScreen('nonexistent');
  console.log(`  Result: ${missing === null ? 'null (as expected)' : 'unexpected'}`);
  
  await runtime.shutdown();
}

main().catch(console.error);
