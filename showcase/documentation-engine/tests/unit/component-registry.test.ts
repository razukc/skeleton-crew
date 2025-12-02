/**
 * Unit tests for Component Registry Plugin
 * 
 * Tests the core functionality of component registration, retrieval,
 * and error handling.
 * 
 * @see Requirements 7.2, 7.3, 7.4
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createComponentRegistryPlugin } from '../../src/plugins/component-registry.js';
import type { RuntimeContext } from 'skeleton-crew-runtime';
import type { ComponentType } from 'react';

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

// Mock React components for testing
const MockComponent1: ComponentType<any> = () => null;
const MockComponent2: ComponentType<any> = () => null;

describe('Component Registry Plugin', () => {
  let context: any;
  let plugin: ReturnType<typeof createComponentRegistryPlugin>;

  beforeEach(() => {
    context = createMockContext();
    plugin = createComponentRegistryPlugin();
    plugin.setup(context);
  });

  describe('register', () => {
    it('should register a component successfully', () => {
      expect(() => {
        context.componentRegistry.register('TestComponent', MockComponent1);
      }).not.toThrow();
    });

    it('should throw error when registering duplicate component', () => {
      context.componentRegistry.register('TestComponent', MockComponent1);
      
      expect(() => {
        context.componentRegistry.register('TestComponent', MockComponent2);
      }).toThrow('Component "TestComponent" is already registered');
    });

    it('should throw error when component name is empty', () => {
      expect(() => {
        context.componentRegistry.register('', MockComponent1);
      }).toThrow('Component name must be a non-empty string');
    });

    it('should throw error when component name is not a string', () => {
      expect(() => {
        context.componentRegistry.register(null as any, MockComponent1);
      }).toThrow('Component name must be a non-empty string');
    });

    it('should throw error when component is not provided', () => {
      expect(() => {
        context.componentRegistry.register('TestComponent', null as any);
      }).toThrow('Component implementation is required');
    });
  });

  describe('get', () => {
    it('should retrieve a registered component', () => {
      context.componentRegistry.register('TestComponent', MockComponent1);
      const retrieved = context.componentRegistry.get('TestComponent');
      
      expect(retrieved).toBe(MockComponent1);
    });

    it('should return undefined for unregistered component', () => {
      const retrieved = context.componentRegistry.get('NonExistent');
      
      expect(retrieved).toBeUndefined();
    });

    it('should retrieve correct component when multiple are registered', () => {
      context.componentRegistry.register('Component1', MockComponent1);
      context.componentRegistry.register('Component2', MockComponent2);
      
      expect(context.componentRegistry.get('Component1')).toBe(MockComponent1);
      expect(context.componentRegistry.get('Component2')).toBe(MockComponent2);
    });
  });

  describe('has', () => {
    it('should return true for registered component', () => {
      context.componentRegistry.register('TestComponent', MockComponent1);
      
      expect(context.componentRegistry.has('TestComponent')).toBe(true);
    });

    it('should return false for unregistered component', () => {
      expect(context.componentRegistry.has('NonExistent')).toBe(false);
    });

    it('should return correct status for multiple components', () => {
      context.componentRegistry.register('Component1', MockComponent1);
      
      expect(context.componentRegistry.has('Component1')).toBe(true);
      expect(context.componentRegistry.has('Component2')).toBe(false);
    });
  });

  describe('getAll', () => {
    it('should return empty map when no components registered', () => {
      const all = context.componentRegistry.getAll();
      
      expect(all.size).toBe(0);
    });

    it('should return all registered components', () => {
      context.componentRegistry.register('Component1', MockComponent1);
      context.componentRegistry.register('Component2', MockComponent2);
      
      const all = context.componentRegistry.getAll();
      
      expect(all.size).toBe(2);
      expect(all.get('Component1')).toBe(MockComponent1);
      expect(all.get('Component2')).toBe(MockComponent2);
    });

    it('should return a copy that does not affect internal state', () => {
      context.componentRegistry.register('Component1', MockComponent1);
      
      const all = context.componentRegistry.getAll();
      all.set('Component2', MockComponent2);
      
      // Original registry should not be affected
      expect(context.componentRegistry.has('Component2')).toBe(false);
      expect(context.componentRegistry.getAll().size).toBe(1);
    });
  });

  describe('plugin integration', () => {
    it('should extend RuntimeContext with componentRegistry', () => {
      expect(context.componentRegistry).toBeDefined();
      expect(typeof context.componentRegistry.register).toBe('function');
      expect(typeof context.componentRegistry.get).toBe('function');
      expect(typeof context.componentRegistry.has).toBe('function');
      expect(typeof context.componentRegistry.getAll).toBe('function');
    });

    it('should have correct plugin metadata', () => {
      expect(plugin.name).toBe('component-registry');
      expect(plugin.version).toBe('1.0.0');
      expect(typeof plugin.setup).toBe('function');
    });
  });
});
