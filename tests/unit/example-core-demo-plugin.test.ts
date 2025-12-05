import { describe, it, expect, beforeEach } from 'vitest';
import { Runtime } from '../../src/runtime.js';
import { coreDemoPlugin, getDemoEventLog, clearDemoEventLog } from '../../examples/playground/plugins/core-demo.js';

describe('Core Demo Plugin', () => {
  let runtime: Runtime;

  beforeEach(async () => {
    // Clear event log before each test
    clearDemoEventLog();
    
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

  it('should register all demonstration screens', () => {
    const context = runtime.getContext();
    
    // Check plugin system demo screen
    const pluginScreen = context.screens.getScreen('demo-plugin-system');
    expect(pluginScreen).toBeDefined();
    expect(pluginScreen?.title).toBe('Plugin System Demo');
    
    // Check screen registry demo screen
    const screenScreen = context.screens.getScreen('demo-screen-registry');
    expect(screenScreen).toBeDefined();
    expect(screenScreen?.title).toBe('Screen Registry Demo');
    
    // Check action engine demo screen
    const actionScreen = context.screens.getScreen('demo-action-engine');
    expect(actionScreen).toBeDefined();
    expect(actionScreen?.title).toBe('Action Engine Demo');
    
    // Check event bus demo screen
    const eventScreen = context.screens.getScreen('demo-event-bus');
    expect(eventScreen).toBeDefined();
    expect(eventScreen?.title).toBe('Event Bus Demo');
    
    // Check runtime context demo screen
    const contextScreen = context.screens.getScreen('demo-runtime-context');
    expect(contextScreen).toBeDefined();
    expect(contextScreen?.title).toBe('Runtime Context Demo');
  });

  it('should execute demo:greet action', async () => {
    const context = runtime.getContext();
    const result = await context.actions.runAction('demo:greet');
    
    expect(result).toBe('Hello from Skeleton Crew Runtime!');
  });

  it('should execute demo:greet-user action with valid parameters', async () => {
    const context = runtime.getContext();
    const result = await context.actions.runAction<{ name: string }, string>('demo:greet-user', { name: 'Alice' });
    
    expect(result).toBe('Hello, Alice! Welcome to Skeleton Crew Runtime.');
  });

  it('should throw error for demo:greet-user with invalid parameters', async () => {
    const context = runtime.getContext();
    
    await expect(
      context.actions.runAction('demo:greet-user', { name: '' })
    ).rejects.toThrow('Parameter "name" is required and must be a non-empty string');
  });

  it('should execute demo:calculate action with valid parameters', async () => {
    const context = runtime.getContext();
    
    const addResult = await context.actions.runAction<{ a: number; b: number; operation: string }, number>(
      'demo:calculate',
      { a: 5, b: 3, operation: 'add' }
    );
    expect(addResult).toBe(8);
    
    const subtractResult = await context.actions.runAction<{ a: number; b: number; operation: string }, number>(
      'demo:calculate',
      { a: 10, b: 4, operation: 'subtract' }
    );
    expect(subtractResult).toBe(6);
    
    const multiplyResult = await context.actions.runAction<{ a: number; b: number; operation: string }, number>(
      'demo:calculate',
      { a: 6, b: 7, operation: 'multiply' }
    );
    expect(multiplyResult).toBe(42);
    
    const divideResult = await context.actions.runAction<{ a: number; b: number; operation: string }, number>(
      'demo:calculate',
      { a: 20, b: 4, operation: 'divide' }
    );
    expect(divideResult).toBe(5);
  });

  it('should throw error for demo:calculate with invalid operation', async () => {
    const context = runtime.getContext();
    
    await expect(
      context.actions.runAction('demo:calculate', { a: 5, b: 3, operation: 'invalid' })
    ).rejects.toThrow('Unknown operation: invalid');
  });

  it('should throw error for demo:calculate with division by zero', async () => {
    const context = runtime.getContext();
    
    await expect(
      context.actions.runAction('demo:calculate', { a: 5, b: 0, operation: 'divide' })
    ).rejects.toThrow('Cannot divide by zero');
  });

  it('should emit demo:event-emitted when demo:emit-event is executed', async () => {
    const context = runtime.getContext();
    const events: unknown[] = [];
    
    context.events.on('demo:event-emitted', (data) => {
      events.push(data);
    });
    
    await context.actions.runAction('demo:emit-event', { message: 'Test event', priority: 'high' });
    
    expect(events.length).toBe(1);
    expect(events[0]).toMatchObject({
      message: 'Test event',
      priority: 'high'
    });
  });

  it('should execute demo:list-plugins action', async () => {
    const context = runtime.getContext();
    const result = await context.actions.runAction<void, Array<{ name: string; version: string }>>('demo:list-plugins');
    
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result).toContainEqual({ name: 'core-demo', version: '1.0.0' });
  });

  it('should execute demo:list-screens action', async () => {
    const context = runtime.getContext();
    const result = await context.actions.runAction<void, Array<{ id: string; title: string; component: string }>>('demo:list-screens');
    
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result).toContainEqual({ id: 'home', title: 'Welcome to Skeleton Crew Playground', component: 'HomeScreen' });
  });

  it('should execute demo:list-actions action', async () => {
    const context = runtime.getContext();
    const result = await context.actions.runAction<void, string[]>('demo:list-actions');
    
    expect(Array.isArray(result)).toBe(true);
    expect(result).toContain('demo:greet');
    expect(result).toContain('demo:greet-user');
    expect(result).toContain('demo:calculate');
  });

  it('should emit demo:action-executed event when actions are executed', async () => {
    const context = runtime.getContext();
    
    await context.actions.runAction('demo:greet');
    
    const eventLog = getDemoEventLog();
    const actionExecutedEvents = eventLog.filter(e => e.event === 'demo:action-executed');
    
    expect(actionExecutedEvents.length).toBeGreaterThan(0);
    expect(actionExecutedEvents[0].data).toMatchObject({
      actionId: 'demo:greet',
      result: 'Hello from Skeleton Crew Runtime!'
    });
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
