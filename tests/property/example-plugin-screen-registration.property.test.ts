import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { Runtime } from '../../src/runtime.js';
import { PluginDefinition } from '../../src/types.js';
import { coreDemoPlugin } from '../../examples/playground/plugins/core-demo.js';
import { counterPlugin } from '../../examples/playground/plugins/counter.js';
import { settingsPlugin } from '../../examples/playground/plugins/settings.js';

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

  it('should register screens from all example app plugins', async () => {
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
    
    // Verify we have at least 3 screens (core-demo registers multiple)
    expect(screens.length).toBeGreaterThanOrEqual(3);
    
    // Verify key screens from each plugin are registered
    const screenIds = screens.map(s => s.id);
    expect(screenIds).toContain('home'); // from core-demo
    expect(screenIds).toContain('counter'); // from counter
    expect(screenIds).toContain('settings'); // from settings
    
    // Cleanup
    await runtime.shutdown();
  });
});
