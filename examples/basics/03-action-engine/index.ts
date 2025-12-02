import { Runtime } from '../../../src/runtime.js';
import { PluginDefinition, RuntimeContext } from '../../../src/types.js';

/**
 * Example 03: Action Engine
 * Demonstrates action registration and execution
 */

const actionDemoPlugin: PluginDefinition = {
  name: 'action-demo',
  version: '1.0.0',
  
  setup(context: RuntimeContext) {
    console.log('[Plugin] Registering actions...\n');
    
    // Simple action with no parameters
    context.actions.registerAction({
      id: 'greet',
      handler: () => {
        return 'Hello, World!';
      }
    });
    
    // Action with parameters
    context.actions.registerAction({
      id: 'greet-user',
      handler: (params: { name: string }) => {
        return `Hello, ${params.name}!`;
      }
    });
    
    // Action that performs calculation
    context.actions.registerAction({
      id: 'calculate',
      handler: (params: { a: number; b: number; operation: string }) => {
        switch (params.operation) {
          case 'add': return params.a + params.b;
          case 'subtract': return params.a - params.b;
          case 'multiply': return params.a * params.b;
          case 'divide': return params.a / params.b;
          default: throw new Error(`Unknown operation: ${params.operation}`);
        }
      }
    });
    
    console.log('[Plugin] Registered 3 actions');
  }
};

async function main(): Promise<void> {
  console.log('=== Action Engine Example ===\n');
  
  const runtime = new Runtime();
  runtime.registerPlugin(actionDemoPlugin);
  await runtime.initialize();
  
  const context = runtime.getContext();
  
  // Execute simple action
  console.log('\n[Demo] Executing simple action:\n');
  const greeting = await context.actions.runAction('greet', {});
  console.log(`  Result: "${greeting}"`);
  
  // Execute action with parameters
  console.log('\n[Demo] Executing action with parameters:\n');
  const userGreeting = await context.actions.runAction('greet-user', { name: 'Alice' });
  console.log(`  Result: "${userGreeting}"`);
  
  // Execute calculation actions
  console.log('\n[Demo] Executing calculation actions:\n');
  const sum = await context.actions.runAction('calculate', { a: 10, b: 5, operation: 'add' });
  console.log(`  10 + 5 = ${sum}`);
  
  const product = await context.actions.runAction('calculate', { a: 10, b: 5, operation: 'multiply' });
  console.log(`  10 × 5 = ${product}`);
  
  console.log('\n[Demo] Actions are registered and ready to execute!');
  console.log('[Demo] Try running different calculations or greetings.');
  
  await runtime.shutdown();
}

main().catch(console.error);
