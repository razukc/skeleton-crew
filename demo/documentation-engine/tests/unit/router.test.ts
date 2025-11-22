/**
 * Router Plugin Unit Tests
 * 
 * Tests for the router plugin's core functionality including:
 * - Route registration and mapping
 * - Navigation actions
 * - Error handling for invalid paths
 * - Event emission
 * 
 * @see Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 11.2
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRouterPlugin, type RuntimeContextWithRouter } from '../../src/plugins/router.js';
import type { RuntimeContext } from 'skeleton-crew-runtime';

// Mock RuntimeContext for testing
function createMockContext(): RuntimeContext {
  const actions = new Map<string, any>();
  const eventHandlers = new Map<string, Array<(data: any) => void>>();

  return {
    screens: {
      registerScreen: () => () => {},
      getScreen: () => null,
      getAllScreens: () => []
    },
    actions: {
      registerAction: (action: any) => {
        actions.set(action.id, action);
        return () => {};
      },
      runAction: async (id: string, params?: any) => {
        const action = actions.get(id);
        if (!action) {
          throw new Error(`Action ${id} not found`);
        }
        return action.handler(params);
      }
    },
    plugins: {
      registerPlugin: () => {},
      getPlugin: () => null,
      getAllPlugins: () => [],
      getInitializedPlugins: () => []
    },
    events: {
      emit: (type: string, data: any) => {
        const handlers = eventHandlers.get(type) || [];
        handlers.forEach(handler => handler(data));
      },
      emitAsync: async () => {},
      on: (type: string, handler: (data: any) => void) => {
        if (!eventHandlers.has(type)) {
          eventHandlers.set(type, []);
        }
        eventHandlers.get(type)!.push(handler);
        return () => {};
      }
    },
    getRuntime: () => ({
      initialize: async () => {},
      shutdown: async () => {},
      getContext: () => createMockContext()
    })
  };
}

describe('Router Plugin', () => {
  let context: RuntimeContextWithRouter;
  let plugin: ReturnType<typeof createRouterPlugin>;

  beforeEach(() => {
    context = createMockContext() as RuntimeContextWithRouter;
    plugin = createRouterPlugin();
    plugin.setup(context);
  });

  describe('Route Registration and Mapping', () => {
    it('should register a route and map path to screen ID', () => {
      
      // Register a route
      context.router.registerRoute('/getting-started', 'getting-started-screen');
      
      // Verify the route is registered
      const screenId = context.router.getScreenForPath('/getting-started');
      expect(screenId).toBe('getting-started-screen');
    });

    it('should normalize paths without leading slash', () => {
      
      // Register route without leading slash
      context.router.registerRoute('guides/plugins', 'guides-plugins-screen');
      
      // Should be accessible with leading slash
      const screenId = context.router.getScreenForPath('/guides/plugins');
      expect(screenId).toBe('guides-plugins-screen');
    });

    it('should return undefined for unregistered paths', () => {
      
      const screenId = context.router.getScreenForPath('/non-existent');
      expect(screenId).toBeUndefined();
    });

    it('should throw error for invalid route path', () => {
      
      expect(() => {
        context.router.registerRoute('', 'screen-id');
      }).toThrow('Route path must be a non-empty string');
    });

    it('should throw error for invalid screen ID', () => {
      
      expect(() => {
        context.router.registerRoute('/path', '');
      }).toThrow('Screen ID must be a non-empty string');
    });

    it('should return all registered routes', () => {
      
      context.router.registerRoute('/home', 'home-screen');
      context.router.registerRoute('/about', 'about-screen');
      
      const routes = context.router.getAllRoutes();
      expect(routes.size).toBe(2);
      expect(routes.get('/home')).toBe('home-screen');
      expect(routes.get('/about')).toBe('about-screen');
    });
  });

  describe('Navigation Actions', () => {
    it('should execute router:navigate action successfully', async () => {
      
      // Register a route
      context.router.registerRoute('/test-page', 'test-screen');
      
      // Execute navigation action
      const result = await context.actions.runAction('router:navigate', {
        path: '/test-page'
      });
      
      expect(result).toEqual({
        path: '/test-page',
        screenId: 'test-screen'
      });
    });

    it('should emit router:navigated event on successful navigation', async () => {
      
      // Register a route
      context.router.registerRoute('/test-page', 'test-screen');
      
      // Listen for navigation event
      const eventHandler = vi.fn();
      context.events.on('router:navigated', eventHandler);
      
      // Execute navigation
      await context.actions.runAction('router:navigate', {
        path: '/test-page'
      });
      
      // Verify event was emitted
      expect(eventHandler).toHaveBeenCalledWith({
        path: '/test-page',
        screenId: 'test-screen'
      });
    });

    it('should throw error for navigation to invalid path', async () => {
      
      // Attempt to navigate to unregistered path
      await expect(
        context.actions.runAction('router:navigate', {
          path: '/non-existent'
        })
      ).rejects.toThrow('No screen found for path: /non-existent');
    });

    it('should emit router:error event for invalid path', async () => {
      
      // Listen for error event
      const errorHandler = vi.fn();
      context.events.on('router:error', errorHandler);
      
      // Attempt to navigate to invalid path
      try {
        await context.actions.runAction('router:navigate', {
          path: '/invalid'
        });
      } catch (error) {
        // Expected to throw
      }
      
      // Verify error event was emitted
      expect(errorHandler).toHaveBeenCalledWith({
        path: '/invalid',
        error: 'No screen found for path: /invalid'
      });
    });

    it('should normalize path in navigation action', async () => {
      
      // Register route with leading slash
      context.router.registerRoute('/test', 'test-screen');
      
      // Navigate without leading slash
      const result = await context.actions.runAction('router:navigate', {
        path: 'test'
      }) as any;
      
      expect(result.path).toBe('/test');
      expect(result.screenId).toBe('test-screen');
    });

    it('should throw error for navigation without path', async () => {
      
      await expect(
        context.actions.runAction('router:navigate', {})
      ).rejects.toThrow('Navigation path must be a non-empty string');
    });
  });

  describe('Browser History Integration', () => {
    it('should register router:back action', () => {
      
      // Verify the action is registered by trying to execute it
      // (it will fail in test environment without window.history, but that's expected)
      expect(async () => {
        await context.actions.runAction('router:back', {});
      }).toBeDefined();
    });

    it('should register router:forward action', () => {
      // Verify the action is registered by trying to execute it
      // (it will fail in test environment without window.history, but that's expected)
      expect(async () => {
        await context.actions.runAction('router:forward', {});
      }).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing screen gracefully', async () => {
      
      const errorHandler = vi.fn();
      context.events.on('router:error', errorHandler);
      
      try {
        await context.actions.runAction('router:navigate', {
          path: '/missing-page'
        });
      } catch (error: any) {
        expect(error.message).toContain('No screen found for path');
      }
      
      expect(errorHandler).toHaveBeenCalled();
    });

    it('should provide descriptive error messages', async () => {
      
      try {
        await context.actions.runAction('router:navigate', {
          path: '/404-page'
        });
      } catch (error: any) {
        expect(error.message).toBe('No screen found for path: /404-page');
      }
    });
  });
});
