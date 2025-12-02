/**
 * Theme Plugin Unit Tests
 * 
 * Tests theme state management, actions, and persistence.
 * 
 * @see Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 11.4
 * 
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createThemePlugin, type RuntimeContextWithTheme } from '../../src/plugins/theme.js';
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
      runAction: async <P = unknown, R = unknown>(id: string, params?: P): Promise<R> => {
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
      emitAsync: async (type: string, data: any) => {
        const handlers = eventHandlers.get(type) || [];
        for (const handler of handlers) {
          await handler(data);
        }
      },
      on: (type: string, handler: (data: any) => void) => {
        if (!eventHandlers.has(type)) {
          eventHandlers.set(type, []);
        }
        eventHandlers.get(type)!.push(handler);
        return () => {
          const handlers = eventHandlers.get(type);
          if (handlers) {
            const index = handlers.indexOf(handler);
            if (index > -1) {
              handlers.splice(index, 1);
            }
          }
        };
      }
    },
    getRuntime: () => ({
      initialize: async () => {},
      shutdown: async () => {},
      getContext: () => createMockContext()
    })
  };
}

// Mock localStorage for tests
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] || null,
  };
})();

global.localStorage = localStorageMock as Storage;

describe('Theme Plugin', () => {
  let context: RuntimeContextWithTheme;
  let plugin: ReturnType<typeof createThemePlugin>;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorageMock.clear();
    
    // Remove any theme attributes from document
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.classList.remove('theme-light', 'theme-dark');

    // Create mock context and setup plugin
    context = createMockContext() as RuntimeContextWithTheme;
    plugin = createThemePlugin();
    plugin.setup(context);
  });

  describe('Initialization', () => {
    it('should initialize with light theme by default', () => {
      expect(context.theme.getCurrentTheme()).toBe('light');
    });

    it('should apply theme to document on initialization', () => {
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      expect(document.documentElement.classList.contains('theme-light')).toBe(true);
    });

    it('should load theme from localStorage if available', () => {
      // Set theme in localStorage
      localStorage.setItem('docs-theme', 'dark');

      // Create new context and plugin
      const newContext = createMockContext() as RuntimeContextWithTheme;
      const newPlugin = createThemePlugin();
      newPlugin.setup(newContext);
      
      expect(newContext.theme.getCurrentTheme()).toBe('dark');
    });
  });

  describe('Theme State Management', () => {
    it('should get current theme', () => {
      const theme = context.theme.getCurrentTheme();
      expect(theme).toBe('light');
    });

    it('should set theme to dark', () => {
      context.theme.setTheme('dark');
      expect(context.theme.getCurrentTheme()).toBe('dark');
    });

    it('should set theme to light', () => {
      context.theme.setTheme('dark');
      context.theme.setTheme('light');
      expect(context.theme.getCurrentTheme()).toBe('light');
    });

    it('should ignore invalid theme values', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // @ts-expect-error - Testing invalid input
      context.theme.setTheme('invalid');
      
      // Theme should remain unchanged
      expect(context.theme.getCurrentTheme()).toBe('light');
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should toggle theme from light to dark', () => {
      const newTheme = context.theme.toggleTheme();
      expect(newTheme).toBe('dark');
      expect(context.theme.getCurrentTheme()).toBe('dark');
    });

    it('should toggle theme from dark to light', () => {
      context.theme.setTheme('dark');
      const newTheme = context.theme.toggleTheme();
      expect(newTheme).toBe('light');
      expect(context.theme.getCurrentTheme()).toBe('light');
    });
  });

  describe('Theme Persistence', () => {
    it('should save theme to localStorage when set', () => {
      context.theme.setTheme('dark');
      expect(localStorage.getItem('docs-theme')).toBe('dark');
    });

    it('should save theme to localStorage when toggled', () => {
      context.theme.toggleTheme();
      expect(localStorage.getItem('docs-theme')).toBe('dark');
    });

    it('should persist theme across multiple changes', () => {
      context.theme.setTheme('dark');
      expect(localStorage.getItem('docs-theme')).toBe('dark');
      
      context.theme.setTheme('light');
      expect(localStorage.getItem('docs-theme')).toBe('light');
      
      context.theme.toggleTheme();
      expect(localStorage.getItem('docs-theme')).toBe('dark');
    });
  });

  describe('Theme Actions', () => {
    it('should register theme:toggle action', async () => {
      // Verify action is registered by attempting to execute it
      const result = await context.actions.runAction<{}, { theme: string }>('theme:toggle', {});
      expect(result).toBeDefined();
    });

    it('should register theme:set action', async () => {
      // Verify action is registered by attempting to execute it
      const result = await context.actions.runAction<{ theme: string }, { theme: string }>('theme:set', { theme: 'dark' });
      expect(result).toBeDefined();
    });

    it('should toggle theme via action', async () => {
      const result = await context.actions.runAction<{}, { theme: string }>('theme:toggle', {});
      expect(result.theme).toBe('dark');
      expect(context.theme.getCurrentTheme()).toBe('dark');
    });

    it('should set theme via action', async () => {
      const result = await context.actions.runAction<{ theme: string }, { theme: string }>('theme:set', { theme: 'dark' });
      expect(result.theme).toBe('dark');
      expect(context.theme.getCurrentTheme()).toBe('dark');
    });

    it('should throw error when theme:set called without theme parameter', async () => {
      await expect(
        context.actions.runAction('theme:set', {})
      ).rejects.toThrow('theme:set action requires a theme parameter');
    });

    it('should throw error when theme:set called with invalid theme', async () => {
      await expect(
        context.actions.runAction('theme:set', { theme: 'invalid' })
      ).rejects.toThrow('Invalid theme');
    });
  });

  describe('Theme Events', () => {
    it('should emit theme:changed event when toggling', async () => {
      const eventSpy = vi.fn();
      context.events.on('theme:changed', eventSpy);

      await context.actions.runAction('theme:toggle', {});

      expect(eventSpy).toHaveBeenCalledWith({ theme: 'dark' });
    });

    it('should emit theme:changed event when setting theme', async () => {
      const eventSpy = vi.fn();
      context.events.on('theme:changed', eventSpy);

      await context.actions.runAction('theme:set', { theme: 'dark' });

      expect(eventSpy).toHaveBeenCalledWith({ theme: 'dark' });
    });

    it('should emit correct theme value in event', async () => {
      const eventSpy = vi.fn();
      context.events.on('theme:changed', eventSpy);

      // Toggle to dark
      await context.actions.runAction('theme:toggle', {});
      expect(eventSpy).toHaveBeenCalledWith({ theme: 'dark' });

      // Toggle back to light
      await context.actions.runAction('theme:toggle', {});
      expect(eventSpy).toHaveBeenCalledWith({ theme: 'light' });
    });
  });

  describe('Document Integration', () => {
    it('should apply theme to document data attribute', () => {
      context.theme.setTheme('dark');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('should apply theme to document class', () => {
      context.theme.setTheme('dark');
      expect(document.documentElement.classList.contains('theme-dark')).toBe(true);
      expect(document.documentElement.classList.contains('theme-light')).toBe(false);
    });

    it('should update document when theme changes', () => {
      context.theme.setTheme('dark');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      
      context.theme.setTheme('light');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });
  });
});
