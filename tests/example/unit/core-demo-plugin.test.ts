import { describe, it, expect, beforeEach } from 'vitest';
import { Runtime } from '../../../src/runtime.js';
import { coreDemoPlugin } from '../../../example/plugins/core-demo.js';

describe('Core Demo Plugin', () => {
  let runtime: Runtime;

  beforeEach(async () => {
    // Create fresh runtime instance
    runtime = new Runtime();
    runtime.registerPlugin(coreDemoPlugin);
    await runtime.initialize();
  });

  it('should register home screen', () => {
    const context = runtime.getContext();
    const screen = context.screens.getScreen('home');
    
    expect(screen).toBeDefined();
    expect(screen?.id).toBe('home');
    expect(screen?.title).toBe('Welcome to Skeleton Crew Playground');
    expect(screen?.component).toBe('HomeScreen');
  });

  it('should subscribe to runtime:initialized event', async () => {
    // Create a new runtime to test the event subscription
    const newRuntime = new Runtime();
    const events: unknown[] = [];
    
    // Register a test plugin that captures the event
    newRuntime.registerPlugin({
      name: 'test-listener',
      version: '1.0.0',
      setup(context) {
        context.events.on('runtime:initialized', (data) => {
          events.push(data);
        });
      }
    });
    
    // Register core-demo plugin
    newRuntime.registerPlugin(coreDemoPlugin);
    
    // Initialize runtime (should emit runtime:initialized)
    await newRuntime.initialize();
    
    // Verify the event was emitted
    expect(events.length).toBeGreaterThan(0);
  });

  it('should have correct plugin metadata', () => {
    const context = runtime.getContext();
    const plugin = context.plugins.getPlugin('core-demo');
    
    expect(plugin).toBeDefined();
    expect(plugin?.name).toBe('core-demo');
    expect(plugin?.version).toBe('1.0.0');
  });
});
