import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { Runtime } from '../../../src/runtime.js';
import { PluginDefinition } from '../../../src/types.js';
import { coreDemoPlugin } from '../../../example/plugins/core-demo.js';
import { counterPlugin } from '../../../example/plugins/counter.js';
import { settingsPlugin } from '../../../example/plugins/settings.js';

/**
 * Property 1: Plugin screen registration completeness
 * 
 * Feature: example-app, Property 1: Plugin screen registration completeness
 * 
 * For any initialized example application, each plugin should register at least
 * one screen, resulting in a screen count that equals or exceeds the plugin count
 * 
 * Validates: Requirements 2.4
 */
describe('Property 1: Plugin screen registration completeness', () => {
  it('should have screen count >= plugin count for any subset of plugins', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random subsets of plugins (at least 1 plugin)
        fc.subarray([coreDemoPlugin, counterPlugin, settingsPlugin], { minLength: 1 }),
        async (plugins) => {
          // Create fresh runtime instance
          const runtime = new Runtime();
          
          // Register the randomly selected plugins
          for (const plugin of plugins) {
            runtime.registerPlugin(plugin);
          }
          
          // Initialize runtime
          await runtime.initialize();
          
          const context = runtime.getContext();
          
          // Get all registered screens
          const screens = context.screens.getAllScreens();
          
          // Verify screen count >= plugin count
          // Each plugin should register at least one screen
          expect(screens.length).toBeGreaterThanOrEqual(plugins.length);
          
          // Cleanup
          await runtime.shutdown();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should register exactly one screen per plugin for example app plugins', async () => {
    // Create fresh runtime instance
    const runtime = new Runtime();
    
    // Register all three example plugins
    runtime.registerPlugin(coreDemoPlugin);
    runtime.registerPlugin(counterPlugin);
    runtime.registerPlugin(settingsPlugin);
    
    // Initialize runtime
    await runtime.initialize();
    
    const context = runtime.getContext();
    
    // Get all registered screens
    const screens = context.screens.getAllScreens();
    
    // Verify we have exactly 3 screens (one per plugin)
    expect(screens.length).toBe(3);
    
    // Verify each expected screen is registered
    const screenIds = screens.map(s => s.id);
    expect(screenIds).toContain('home');
    expect(screenIds).toContain('counter');
    expect(screenIds).toContain('settings');
    
    // Cleanup
    await runtime.shutdown();
  });
});
