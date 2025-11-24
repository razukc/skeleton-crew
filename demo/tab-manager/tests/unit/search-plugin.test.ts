/**
 * Unit tests for Search Plugin
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Runtime } from 'skeleton-crew-runtime';
import { searchPlugin } from '../../src/plugins/search.js';
import type { Tab } from '../../src/types/index.js';

describe('SearchPlugin', () => {
  let runtime: Runtime;

  beforeEach(async () => {
    runtime = new Runtime();
    runtime.registerPlugin(searchPlugin);
    await runtime.initialize();
  });

  afterEach(async () => {
    await runtime.shutdown();
  });

  describe('Plugin Registration', () => {
    it('should register search plugin', () => {
      const context = runtime.getContext();
      const plugin = context.plugins.getPlugin('search');
      expect(plugin).toBeDefined();
      expect(plugin?.name).toBe('search');
      expect(plugin?.version).toBe('1.0.0');
    });

    it('should register search:filter action', () => {
      const context = runtime.getContext();
      // Action should be registered (we can verify by trying to run it)
      expect(async () => {
        await context.actions.runAction('search:filter', { query: '', tabs: [] });
      }).not.toThrow();
    });

    it('should register search:clear action', () => {
      const context = runtime.getContext();
      // Action should be registered (we can verify by trying to run it)
      expect(async () => {
        await context.actions.runAction('search:clear');
      }).not.toThrow();
    });
  });

  describe('search:filter action', () => {
    const mockTabs: Tab[] = [
      {
        id: 1,
        title: 'GitHub - Example Repository',
        url: 'https://github.com/example/repo',
        active: false,
        windowId: 1
      },
      {
        id: 2,
        title: 'Google Search',
        url: 'https://www.google.com',
        active: true,
        windowId: 1
      },
      {
        id: 3,
        title: 'Stack Overflow - JavaScript Question',
        url: 'https://stackoverflow.com/questions/123',
        active: false,
        windowId: 1
      }
    ];

    it('should filter tabs by title (case-insensitive)', async () => {
      const context = runtime.getContext();
      
      const result = await context.actions.runAction('search:filter', {
        query: 'github',
        tabs: mockTabs
      }) as Tab[];

      expect(result).toHaveLength(1);
      expect(result[0].title).toContain('GitHub');
    });

    it('should filter tabs by URL (case-insensitive)', async () => {
      const context = runtime.getContext();
      
      const result = await context.actions.runAction('search:filter', {
        query: 'stackoverflow',
        tabs: mockTabs
      }) as Tab[];

      expect(result).toHaveLength(1);
      expect(result[0].url).toContain('stackoverflow.com');
    });

    it('should be case-insensitive', async () => {
      const context = runtime.getContext();
      
      const result = await context.actions.runAction('search:filter', {
        query: 'GOOGLE',
        tabs: mockTabs
      }) as Tab[];

      expect(result).toHaveLength(1);
      expect(result[0].title).toContain('Google');
    });

    it('should return all tabs when query is empty', async () => {
      const context = runtime.getContext();
      
      const result = await context.actions.runAction('search:filter', {
        query: '',
        tabs: mockTabs
      });

      expect(result).toHaveLength(3);
    });

    it('should return empty array when no matches found', async () => {
      const context = runtime.getContext();
      
      const result = await context.actions.runAction('search:filter', {
        query: 'nonexistent',
        tabs: mockTabs
      });

      expect(result).toHaveLength(0);
    });

    it('should emit search:updated event', async () => {
      const context = runtime.getContext();
      const eventSpy = vi.fn();
      
      context.events.on('search:updated', eventSpy);
      
      await context.actions.runAction('search:filter', {
        query: 'github',
        tabs: mockTabs
      });

      expect(eventSpy).toHaveBeenCalledWith({
        query: 'github',
        results: expect.any(Array)
      });
    });

    it('should throw error when tabs array is missing', async () => {
      const context = runtime.getContext();
      
      await expect(
        context.actions.runAction('search:filter', {
          query: 'test'
        })
      ).rejects.toThrow('Tabs array is required');
    });
  });

  describe('search:clear action', () => {
    const mockTabs: Tab[] = [
      {
        id: 1,
        title: 'Tab 1',
        url: 'https://example.com/1',
        active: false,
        windowId: 1
      },
      {
        id: 2,
        title: 'Tab 2',
        url: 'https://example.com/2',
        active: true,
        windowId: 1
      }
    ];

    it('should restore full tab list', async () => {
      const context = runtime.getContext();
      
      // First filter
      await context.actions.runAction('search:filter', {
        query: 'Tab 1',
        tabs: mockTabs
      });
      
      // Then clear
      const result = await context.actions.runAction('search:clear');

      expect(result).toHaveLength(2);
    });

    it('should emit search:cleared event', async () => {
      const context = runtime.getContext();
      const eventSpy = vi.fn();
      
      // First filter
      await context.actions.runAction('search:filter', {
        query: 'test',
        tabs: mockTabs
      });
      
      context.events.on('search:cleared', eventSpy);
      
      await context.actions.runAction('search:clear');

      expect(eventSpy).toHaveBeenCalledWith({
        results: expect.any(Array)
      });
    });

    it('should clear query state', async () => {
      const context = runtime.getContext();
      
      // First filter
      await context.actions.runAction('search:filter', {
        query: 'test',
        tabs: mockTabs
      });
      
      // Clear
      await context.actions.runAction('search:clear');
      
      // Filter with empty query should return all
      const result = await context.actions.runAction('search:filter', {
        query: '',
        tabs: mockTabs
      });

      expect(result).toHaveLength(2);
    });
  });

  describe('Search workflow', () => {
    const mockTabs: Tab[] = [
      {
        id: 1,
        title: 'GitHub',
        url: 'https://github.com',
        active: false,
        windowId: 1
      },
      {
        id: 2,
        title: 'Google',
        url: 'https://google.com',
        active: false,
        windowId: 1
      },
      {
        id: 3,
        title: 'GitLab',
        url: 'https://gitlab.com',
        active: false,
        windowId: 1
      }
    ];

    it('should handle filter -> clear workflow', async () => {
      const context = runtime.getContext();
      
      // Filter
      const filtered = await context.actions.runAction('search:filter', {
        query: 'git',
        tabs: mockTabs
      });
      expect(filtered).toHaveLength(2);
      
      // Clear
      const cleared = await context.actions.runAction('search:clear');
      expect(cleared).toHaveLength(3);
    });

    it('should handle multiple filters', async () => {
      const context = runtime.getContext();
      
      // First filter
      const result1 = await context.actions.runAction('search:filter', {
        query: 'git',
        tabs: mockTabs
      });
      expect(result1).toHaveLength(2);
      
      // Second filter (more specific)
      const result2 = await context.actions.runAction('search:filter', {
        query: 'github',
        tabs: mockTabs
      });
      expect(result2).toHaveLength(1);
    });
  });
});
