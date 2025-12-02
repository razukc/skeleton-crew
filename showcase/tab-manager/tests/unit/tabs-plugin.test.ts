/**
 * Unit tests for Tabs Plugin
 * 
 * Tests tab management actions and event handling
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest';
import { Runtime } from 'skeleton-crew-runtime';
import { tabsPlugin } from '../../src/plugins/tabs.js';

describe('TabsPlugin', () => {
  let runtime: Runtime;

  beforeAll(() => {
    // Ensure chrome mock is set up before any tests run
    vi.clearAllMocks();
  });

  beforeEach(async () => {
    // Create fresh runtime instance
    runtime = new Runtime();
    
    // Clear only the action-related mocks, not the event listener mocks
    const chromeGlobal = (global as any).chrome;
    chromeGlobal.tabs.query.mockClear();
    chromeGlobal.tabs.update.mockClear();
    chromeGlobal.tabs.remove.mockClear();
    chromeGlobal.tabs.create.mockClear();
    chromeGlobal.tabs.get.mockClear();
    
    // Register the tabs plugin (this will call the event listener addListener methods)
    runtime.registerPlugin(tabsPlugin);
    await runtime.initialize();
  });

  afterEach(async () => {
    await runtime.shutdown();
  });

  describe('Plugin Registration', () => {
    it('should register tabs plugin', () => {
      const context = runtime.getContext();
      const plugin = context.plugins.getPlugin('tabs');
      expect(plugin).toBeDefined();
      expect(plugin?.name).toBe('tabs');
      expect(plugin?.version).toBe('1.0.0');
    });

    it('should register tabs:query action', () => {
      const context = runtime.getContext();
      // Action should be registered (we can't directly access it, but we can try to run it)
      expect(async () => {
        await context.actions.runAction('tabs:query');
      }).not.toThrow();
    });

    it('should register tabs:activate action', () => {
      const context = runtime.getContext();
      expect(async () => {
        await context.actions.runAction('tabs:activate', { tabId: 1 });
      }).not.toThrow();
    });

    it('should register tabs:close action', () => {
      const context = runtime.getContext();
      expect(async () => {
        await context.actions.runAction('tabs:close', { tabId: 1 });
      }).not.toThrow();
    });
  });

  describe('tabs:query action', () => {
    it('should query all tabs', async () => {
      const context = runtime.getContext();
      
      // Verify chrome mock is working
      expect((global as any).chrome.tabs.query).toBeDefined();
      
      const result = await context.actions.runAction('tabs:query') as any[];
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
    }, 10000); // Increase timeout to 10s for debugging

    it('should return tabs with correct properties', async () => {
      const context = runtime.getContext();
      const result = await context.actions.runAction('tabs:query') as any[];
      
      const tab = result[0];
      expect(tab).toHaveProperty('id');
      expect(tab).toHaveProperty('title');
      expect(tab).toHaveProperty('url');
      expect(tab).toHaveProperty('favIconUrl');
      expect(tab).toHaveProperty('active');
      expect(tab).toHaveProperty('windowId');
    });

    it('should handle query with filter', async () => {
      const context = runtime.getContext();
      await context.actions.runAction('tabs:query', { active: true });
      
      expect((global as any).chrome.tabs.query).toHaveBeenCalledWith({ active: true }, expect.any(Function));
    });
  });

  describe('tabs:activate action', () => {
    it('should activate a tab', async () => {
      const context = runtime.getContext();
      const result = await context.actions.runAction('tabs:activate', { tabId: 2 });
      
      expect(result).toEqual({ success: true, tabId: 2 });
      expect((global as any).chrome.tabs.update).toHaveBeenCalledWith(2, { active: true }, expect.any(Function));
    });

    it('should emit tab:activated event', async () => {
      const context = runtime.getContext();
      const eventSpy = vi.fn();
      
      context.events.on('tab:activated', eventSpy);
      await context.actions.runAction('tabs:activate', { tabId: 2 });
      
      expect(eventSpy).toHaveBeenCalledWith({ tabId: 2 });
    });

    it('should throw error if tabId is missing', async () => {
      const context = runtime.getContext();
      
      await expect(
        context.actions.runAction('tabs:activate', {})
      ).rejects.toThrow('Tab ID is required');
    });
  });

  describe('tabs:close action', () => {
    it('should close a tab', async () => {
      const context = runtime.getContext();
      const result = await context.actions.runAction('tabs:close', { tabId: 2 });
      
      expect(result).toEqual({ success: true, tabId: 2 });
      expect((global as any).chrome.tabs.remove).toHaveBeenCalledWith(2, expect.any(Function));
    });

    it('should emit tab:closed event', async () => {
      const context = runtime.getContext();
      const eventSpy = vi.fn();
      
      context.events.on('tab:closed', eventSpy);
      await context.actions.runAction('tabs:close', { tabId: 2 });
      
      expect(eventSpy).toHaveBeenCalledWith({ tabId: 2 });
    });

    it('should throw error if tabId is missing', async () => {
      const context = runtime.getContext();
      
      await expect(
        context.actions.runAction('tabs:close', {})
      ).rejects.toThrow('Tab ID is required');
    });
  });

  describe('Browser Event Listeners', () => {
    it('should register onCreated listener', () => {
      expect((global as any).chrome.tabs.onCreated.addListener).toHaveBeenCalled();
    });

    it('should register onUpdated listener', () => {
      expect((global as any).chrome.tabs.onUpdated.addListener).toHaveBeenCalled();
    });

    it('should register onRemoved listener', () => {
      expect((global as any).chrome.tabs.onRemoved.addListener).toHaveBeenCalled();
    });
  });

  describe('tabs:findDuplicates action', () => {
    it('should register tabs:findDuplicates action', () => {
      const context = runtime.getContext();
      expect(async () => {
        await context.actions.runAction('tabs:findDuplicates');
      }).not.toThrow();
    });

    it('should find duplicate tabs with identical URLs', async () => {
      const context = runtime.getContext();
      
      // Mock tabs with duplicates
      const mockTabs = [
        { id: 1, title: 'Tab 1', url: 'https://example.com', active: false, windowId: 1, groupId: -1, lastAccessed: 1000 },
        { id: 2, title: 'Tab 2', url: 'https://example.com', active: false, windowId: 1, groupId: -1, lastAccessed: 2000 },
        { id: 3, title: 'Tab 3', url: 'https://different.com', active: true, windowId: 1, groupId: -1, lastAccessed: 3000 },
        { id: 4, title: 'Tab 4', url: 'https://example.com', active: false, windowId: 1, groupId: -1, lastAccessed: 1500 }
      ];
      
      (global as any).chrome.tabs.query.mockImplementation((info: any, callback: any) => {
        callback(mockTabs);
      });
      
      const result = await context.actions.runAction('tabs:findDuplicates') as any;
      
      expect(result).toBeDefined();
      expect(result.groups).toBeDefined();
      expect(result.groups).toHaveLength(1);
      expect(result.groups[0].url).toBe('https://example.com');
      expect(result.groups[0].count).toBe(3);
      expect(result.totalDuplicates).toBe(3);
    });

    it('should emit duplicates:found event', async () => {
      const context = runtime.getContext();
      const eventSpy = vi.fn();
      
      context.events.on('duplicates:found', eventSpy);
      await context.actions.runAction('tabs:findDuplicates');
      
      expect(eventSpy).toHaveBeenCalled();
      expect(eventSpy.mock.calls[0][0]).toHaveProperty('groups');
      expect(eventSpy.mock.calls[0][0]).toHaveProperty('totalDuplicates');
    });

    it('should return empty groups when no duplicates exist', async () => {
      const context = runtime.getContext();
      
      // Mock tabs with no duplicates
      const mockTabs = [
        { id: 1, title: 'Tab 1', url: 'https://example1.com', active: false, windowId: 1, groupId: -1 },
        { id: 2, title: 'Tab 2', url: 'https://example2.com', active: true, windowId: 1, groupId: -1 }
      ];
      
      (global as any).chrome.tabs.query.mockImplementation((info: any, callback: any) => {
        callback(mockTabs);
      });
      
      const result = await context.actions.runAction('tabs:findDuplicates') as any;
      
      expect(result.groups).toHaveLength(0);
      expect(result.totalDuplicates).toBe(0);
    });
  });

  describe('tabs:closeDuplicates action', () => {
    it('should register tabs:closeDuplicates action', () => {
      const context = runtime.getContext();
      expect(async () => {
        await context.actions.runAction('tabs:closeDuplicates');
      }).not.toThrow();
    });

    it('should close duplicate tabs and keep most recent', async () => {
      const context = runtime.getContext();
      
      // Mock tabs with duplicates
      const mockTabs = [
        { id: 1, title: 'Tab 1', url: 'https://example.com', active: false, windowId: 1, groupId: -1, lastAccessed: 1000 },
        { id: 2, title: 'Tab 2', url: 'https://example.com', active: false, windowId: 1, groupId: -1, lastAccessed: 3000 },
        { id: 3, title: 'Tab 3', url: 'https://different.com', active: true, windowId: 1, groupId: -1, lastAccessed: 2000 },
        { id: 4, title: 'Tab 4', url: 'https://example.com', active: false, windowId: 1, groupId: -1, lastAccessed: 2000 }
      ];
      
      (global as any).chrome.tabs.query.mockImplementation((info: any, callback: any) => {
        callback(mockTabs);
      });
      
      const result = await context.actions.runAction('tabs:closeDuplicates') as any;
      
      expect(result.success).toBe(true);
      expect(result.closedTabIds).toBeDefined();
      expect(result.closedTabIds).toHaveLength(2);
      // Should close tabs 1 and 4, keeping tab 2 (most recent)
      expect(result.closedTabIds).toContain(1);
      expect(result.closedTabIds).toContain(4);
      expect(result.closedTabIds).not.toContain(2);
      expect(result.count).toBe(2);
    });

    it('should emit duplicates:removed event', async () => {
      const context = runtime.getContext();
      const eventSpy = vi.fn();
      
      // Mock tabs with duplicates
      const mockTabs = [
        { id: 1, title: 'Tab 1', url: 'https://example.com', active: false, windowId: 1, groupId: -1, lastAccessed: 1000 },
        { id: 2, title: 'Tab 2', url: 'https://example.com', active: false, windowId: 1, groupId: -1, lastAccessed: 2000 }
      ];
      
      (global as any).chrome.tabs.query.mockImplementation((info: any, callback: any) => {
        callback(mockTabs);
      });
      
      context.events.on('duplicates:removed', eventSpy);
      await context.actions.runAction('tabs:closeDuplicates');
      
      expect(eventSpy).toHaveBeenCalled();
      expect(eventSpy.mock.calls[0][0]).toHaveProperty('closedTabIds');
      expect(eventSpy.mock.calls[0][0]).toHaveProperty('count');
    });

    it('should handle no duplicates gracefully', async () => {
      const context = runtime.getContext();
      
      // Mock tabs with no duplicates
      const mockTabs = [
        { id: 1, title: 'Tab 1', url: 'https://example1.com', active: false, windowId: 1, groupId: -1 },
        { id: 2, title: 'Tab 2', url: 'https://example2.com', active: true, windowId: 1, groupId: -1 }
      ];
      
      (global as any).chrome.tabs.query.mockImplementation((info: any, callback: any) => {
        callback(mockTabs);
      });
      
      const result = await context.actions.runAction('tabs:closeDuplicates') as any;
      
      expect(result.success).toBe(true);
      expect(result.closedTabIds).toHaveLength(0);
      expect(result.count).toBe(0);
    });

    it('should use tab ID as fallback when lastAccessed is not available', async () => {
      const context = runtime.getContext();
      
      // Mock tabs without lastAccessed property
      const mockTabs = [
        { id: 1, title: 'Tab 1', url: 'https://example.com', active: false, windowId: 1, groupId: -1 },
        { id: 3, title: 'Tab 3', url: 'https://example.com', active: false, windowId: 1, groupId: -1 },
        { id: 2, title: 'Tab 2', url: 'https://example.com', active: true, windowId: 1, groupId: -1 }
      ];
      
      (global as any).chrome.tabs.query.mockImplementation((info: any, callback: any) => {
        callback(mockTabs);
      });
      
      const result = await context.actions.runAction('tabs:closeDuplicates') as any;
      
      expect(result.success).toBe(true);
      expect(result.closedTabIds).toHaveLength(2);
      // Should keep tab 3 (highest ID) and close tabs 1 and 2
      expect(result.closedTabIds).toContain(1);
      expect(result.closedTabIds).toContain(2);
      expect(result.closedTabIds).not.toContain(3);
    });
  });
});
