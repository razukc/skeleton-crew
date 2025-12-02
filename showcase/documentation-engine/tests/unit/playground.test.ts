/**
 * Unit tests for Playground Plugin
 * 
 * Tests the playground plugin initialization and component registration.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createComponentRegistryPlugin } from '../../src/plugins/component-registry.js';
import { createPlaygroundPlugin } from '../../src/plugins/playground.js';
import type { RuntimeContext } from 'skeleton-crew-runtime';

// Mock RuntimeContext for testing
function createMockContext(): RuntimeContext {
  return {
    screens: {
      registerScreen: () => () => {},
      getScreen: () => null,
      getAllScreens: () => []
    },
    actions: {
      registerAction: () => () => {},
      runAction: async <R>(): Promise<R> => undefined as R
    },
    plugins: {
      registerPlugin: () => {},
      getPlugin: () => null,
      getAllPlugins: () => [],
      getInitializedPlugins: () => []
    },
    events: {
      emit: () => {},
      emitAsync: async () => {},
      on: () => () => {}
    },
    getRuntime: () => ({
      initialize: async () => {},
      shutdown: async () => {},
      getContext: () => createMockContext()
    })
  };
}

describe('Playground Plugin', () => {
  let context: any;
  let componentRegistryPlugin: ReturnType<typeof createComponentRegistryPlugin>;
  let playgroundPlugin: ReturnType<typeof createPlaygroundPlugin>;

  beforeEach(() => {
    context = createMockContext();
    
    // Setup component registry first (required dependency)
    componentRegistryPlugin = createComponentRegistryPlugin();
    componentRegistryPlugin.setup(context);
    
    // Setup playground plugin
    playgroundPlugin = createPlaygroundPlugin();
    playgroundPlugin.setup(context);
  });

  it('should have correct plugin metadata', () => {
    expect(playgroundPlugin.name).toBe('playground');
    expect(playgroundPlugin.version).toBe('1.0.0');
    expect(typeof playgroundPlugin.setup).toBe('function');
  });

  it('should register the Playground component', () => {
    expect(context.componentRegistry).toBeDefined();
    expect(context.componentRegistry.has('Playground')).toBe(true);
  });

  it('should retrieve the Playground component', () => {
    const PlaygroundComponent = context.componentRegistry.get('Playground');
    expect(PlaygroundComponent).toBeDefined();
    expect(typeof PlaygroundComponent).toBe('function');
  });

  it('should be listed in all registered components', () => {
    const allComponents = context.componentRegistry.getAll();
    expect(allComponents.has('Playground')).toBe(true);
  });

  it('should handle missing component registry gracefully', () => {
    const contextWithoutRegistry = createMockContext();
    const plugin = createPlaygroundPlugin();
    
    // Should not throw when component registry is not available
    expect(() => {
      plugin.setup(contextWithoutRegistry);
    }).not.toThrow();
  });
});
