import { Runtime } from '../../../src/runtime.js';
import { PluginDefinition, RuntimeContext } from '../../../src/types.js';

/**
 * Example 04: Event Bus
 * Demonstrates event emission and subscription
 */

const publisherPlugin: PluginDefinition = {
  name: 'publisher',
  version: '1.0.0',
  
  setup(context: RuntimeContext) {
    console.log('[Publisher] Plugin initialized');
    
    // Register an action that emits events
    context.actions.registerAction({
      id: 'send-notification',
      handler: (params: { message: string; priority: string }) => {
        console.log(`\n[Publisher] Emitting notification event...`);
        context.events.emit('notification:sent', {
          message: params.message,
          priority: params.priority,
          timestamp: new Date().toISOString()
        });
        return 'Notification sent';
      }
    });
  }
};

const subscriberPlugin: PluginDefinition = {
  name: 'subscriber',
  version: '1.0.0',
  
  setup(context: RuntimeContext) {
    console.log('[Subscriber] Plugin initialized');
    
    // Subscribe to notification events
    context.events.on('notification:sent', (data: any) => {
      console.log(`[Subscriber] Received notification:`, data);
    });
    
    // Subscribe to the same event (multiple subscribers allowed)
    context.events.on('notification:sent', (data: any) => {
      if (data.priority === 'high') {
        console.log(`[Subscriber] ⚠️  HIGH PRIORITY notification detected!`);
      }
    });
  }
};

const loggerPlugin: PluginDefinition = {
  name: 'logger',
  version: '1.0.0',
  
  setup(context: RuntimeContext) {
    console.log('[Logger] Plugin initialized');
    
    // Logger subscribes to all notification events
    context.events.on('notification:sent', (data: any) => {
      console.log(`[Logger] Logging event to database: ${data.message}`);
    });
  }
};

async function main(): Promise<void> {
  console.log('=== Event Bus Example ===\n');
  
  const runtime = new Runtime();
  
  // Register all plugins
  runtime.registerPlugin(publisherPlugin);
  runtime.registerPlugin(subscriberPlugin);
  runtime.registerPlugin(loggerPlugin);
  
  await runtime.initialize();
  const context = runtime.getContext();
  
  console.log('\n[Demo] All plugins registered and listening for events\n');
  console.log('='.repeat(60));
  
  // Trigger events by executing actions
  console.log('\n[Demo] Sending normal priority notification...');
  await context.actions.runAction('send-notification', {
    message: 'System update available',
    priority: 'normal'
  });
  
  console.log('\n' + '='.repeat(60));
  
  console.log('\n[Demo] Sending high priority notification...');
  await context.actions.runAction('send-notification', {
    message: 'Security alert detected',
    priority: 'high'
  });
  
  console.log('\n' + '='.repeat(60));
  
  // Demonstrate direct event emission
  console.log('\n[Demo] Emitting event directly (without action)...\n');
  context.events.emit('notification:sent', {
    message: 'Direct event emission',
    priority: 'low',
    timestamp: new Date().toISOString()
  });
  
  console.log('\n' + '='.repeat(60));
  console.log('\n[Demo] Notice how multiple subscribers received each event!');
  
  await runtime.shutdown();
}

main().catch(console.error);
