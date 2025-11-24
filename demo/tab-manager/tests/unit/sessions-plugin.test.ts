/**
 * Sessions Plugin Unit Tests
 * 
 * Tests the sessions plugin's actions and event emissions.
 * Validates Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5, 9.1, 11.1
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Runtime } from 'skeleton-crew-runtime';
import { sessionsPlugin } from '../../src/plugins/sessions.js';
import { storagePlugin } from '../../src/plugins/storage.js';
import { tabsPlugin } from '../../src/plugins/tabs.js';
import { browserAPI } from '../../src/utils/browser-adapter.js';
import type { SavedSession } from '../../src/types/index.js';

describe('Sessions Plugin', () => {
  let runtime: Runtime;

  beforeEach(async () => {
    // Create fresh runtime instance
    runtime = new Runtime();
    
    // Register required plugins
    runtime.registerPlugin(storagePlugin);
    runtime.registerPlugin(tabsPlugin);
    runtime.registerPlugin(sessionsPlugin);
    
    await runtime.initialize();
    
    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await runtime.shutdown();
  });

  describe('Plugin Registration', () => {
    it('should register sessions plugin', () => {
      const context = runtime.getContext();
      const plugin = context.plugins.getPlugin('sessions');
      expect(plugin).toBeDefined();
      expect(plugin?.name).toBe('sessions');
      expect(plugin?.version).toBe('1.0.0');
    });

    it('should register session actions', async () => {
      const context = runtime.getContext();
      
      // Verify actions are registered by attempting to run them
      // We expect these to throw errors due to missing params, but not "action not found"
      await expect(
        context.actions.runAction('sessions:save', { name: '' })
      ).rejects.toThrow('Session name is required');
      
      await expect(
        context.actions.runAction('sessions:restore', { sessionId: 'nonexistent' })
      ).rejects.toThrow('Session not found');
      
      // List should work without params
      await expect(
        context.actions.runAction('sessions:list')
      ).resolves.toBeDefined();
      
      await expect(
        context.actions.runAction('sessions:delete', { sessionId: 'nonexistent' })
      ).rejects.toThrow('Session not found');
    });
  });

  describe('sessions:save action', () => {
    it('should save current tab session', async () => {
      const context = runtime.getContext();
      
      // Mock tabs query
      browserAPI.tabs.query = vi.fn((info, callback) => {
        callback([
          { id: 1, title: 'Tab 1', url: 'https://example.com/1', active: true, windowId: 1 },
          { id: 2, title: 'Tab 2', url: 'https://example.com/2', active: false, windowId: 1 }
        ] as chrome.tabs.Tab[]);
      });
      
      // Mock storage
      browserAPI.storage.local.set = vi.fn((items, callback) => callback?.());
      browserAPI.storage.local.get = vi.fn((keys, callback) => callback({}));

      const result = await context.actions.runAction<any, SavedSession>('sessions:save', {
        name: 'Test Session'
      });

      expect(result).toBeDefined();
      expect(result.name).toBe('Test Session');
      expect(result.tabs).toHaveLength(2);
      expect(result.tabs[0].title).toBe('Tab 1');
      expect(result.tabs[0].url).toBe('https://example.com/1');
      expect(result.tabs[1].title).toBe('Tab 2');
      expect(result.tabs[1].url).toBe('https://example.com/2');
      expect(result.id).toMatch(/^session_/);
      expect(result.createdAt).toBeGreaterThan(0);
    });

    it('should emit session:saved event', async () => {
      const context = runtime.getContext();
      const eventSpy = vi.fn();
      
      context.events.on('session:saved', eventSpy);
      
      browserAPI.tabs.query = vi.fn((info, callback) => {
        callback([
          { id: 1, title: 'Tab 1', url: 'https://example.com/1', active: true, windowId: 1 }
        ] as chrome.tabs.Tab[]);
      });
      
      browserAPI.storage.local.set = vi.fn((items, callback) => callback?.());
      browserAPI.storage.local.get = vi.fn((keys, callback) => callback({}));

      await context.actions.runAction('sessions:save', { name: 'Test Session' });

      expect(eventSpy).toHaveBeenCalled();
      const emittedSession = eventSpy.mock.calls[0][0];
      expect(emittedSession.name).toBe('Test Session');
    });

    it('should throw error if name is missing', async () => {
      const context = runtime.getContext();

      await expect(
        context.actions.runAction('sessions:save', { name: '' })
      ).rejects.toThrow('Session name is required');
    });

    it('should capture tab groups if present', async () => {
      const context = runtime.getContext();
      
      browserAPI.tabs.query = vi.fn((info, callback) => {
        callback([
          { id: 1, title: 'Tab 1', url: 'https://example.com/1', active: true, windowId: 1, groupId: 5 },
          { id: 2, title: 'Tab 2', url: 'https://example.com/2', active: false, windowId: 1, groupId: 5 }
        ] as chrome.tabs.Tab[]);
      });
      
      browserAPI.storage.local.set = vi.fn((items, callback) => callback?.());
      browserAPI.storage.local.get = vi.fn((keys, callback) => callback({}));

      const result = await context.actions.runAction<any, SavedSession>('sessions:save', {
        name: 'Grouped Session'
      });

      expect(result.groups).toHaveLength(1);
      expect(result.groups[0].id).toBe(5);
      expect(result.tabs[0].groupId).toBe(5);
      expect(result.tabs[1].groupId).toBe(5);
    });

    it('should save to storage via storage plugin', async () => {
      const context = runtime.getContext();
      
      browserAPI.tabs.query = vi.fn((info, callback) => {
        callback([
          { id: 1, title: 'Tab 1', url: 'https://example.com/1', active: true, windowId: 1 }
        ] as chrome.tabs.Tab[]);
      });
      
      const setSpy = vi.fn((items, callback) => callback?.());
      browserAPI.storage.local.set = setSpy;
      browserAPI.storage.local.get = vi.fn((keys, callback) => callback({}));

      await context.actions.runAction('sessions:save', { name: 'Test Session' });

      expect(setSpy).toHaveBeenCalled();
      const savedData = setSpy.mock.calls[0][0];
      expect(savedData.sessions).toBeDefined();
      expect(Array.isArray(savedData.sessions)).toBe(true);
    });
  });

  describe('sessions:restore action', () => {
    it('should restore a saved session', async () => {
      const context = runtime.getContext();
      
      // First save a session
      browserAPI.tabs.query = vi.fn((info, callback) => {
        callback([
          { id: 1, title: 'Tab 1', url: 'https://example.com/1', active: true, windowId: 1 }
        ] as chrome.tabs.Tab[]);
      });
      
      browserAPI.storage.local.set = vi.fn((items, callback) => callback?.());
      browserAPI.storage.local.get = vi.fn((keys, callback) => callback({}));

      const savedSession = await context.actions.runAction<any, SavedSession>('sessions:save', {
        name: 'Test Session'
      });

      // Mock tab creation
      browserAPI.tabs.create = vi.fn((props, callback) => {
        callback({ id: 100, url: props.url, title: 'Restored Tab', active: false, windowId: 1 } as chrome.tabs.Tab);
      });

      const result = await context.actions.runAction('sessions:restore', {
        sessionId: savedSession.id
      });

      expect(result.success).toBe(true);
      expect(result.tabsRestored).toBe(1);
      expect(browserAPI.tabs.create).toHaveBeenCalledWith(
        { url: 'https://example.com/1', active: false },
        expect.any(Function)
      );
    });

    it('should emit session:restored event', async () => {
      const context = runtime.getContext();
      const eventSpy = vi.fn();
      
      context.events.on('session:restored', eventSpy);
      
      // Save a session first
      browserAPI.tabs.query = vi.fn((info, callback) => {
        callback([
          { id: 1, title: 'Tab 1', url: 'https://example.com/1', active: true, windowId: 1 }
        ] as chrome.tabs.Tab[]);
      });
      
      browserAPI.storage.local.set = vi.fn((items, callback) => callback?.());
      browserAPI.storage.local.get = vi.fn((keys, callback) => callback({}));

      const savedSession = await context.actions.runAction<any, SavedSession>('sessions:save', {
        name: 'Test Session'
      });

      // Mock tab creation
      browserAPI.tabs.create = vi.fn((props, callback) => {
        callback({ id: 100, url: props.url, title: 'Restored Tab', active: false, windowId: 1 } as chrome.tabs.Tab);
      });

      await context.actions.runAction('sessions:restore', { sessionId: savedSession.id });

      expect(eventSpy).toHaveBeenCalled();
      const emittedData = eventSpy.mock.calls[0][0];
      expect(emittedData.sessionId).toBe(savedSession.id);
    });

    it('should throw error if session not found', async () => {
      const context = runtime.getContext();

      await expect(
        context.actions.runAction('sessions:restore', { sessionId: 'nonexistent' })
      ).rejects.toThrow('Session not found');
    });

    it('should handle partial restore failures', async () => {
      const context = runtime.getContext();
      const eventSpy = vi.fn();
      
      context.events.on('session:restore-partial', eventSpy);
      
      // Save a session with multiple tabs
      browserAPI.tabs.query = vi.fn((info, callback) => {
        callback([
          { id: 1, title: 'Tab 1', url: 'https://example.com/1', active: true, windowId: 1 },
          { id: 2, title: 'Tab 2', url: 'https://example.com/2', active: false, windowId: 1 }
        ] as chrome.tabs.Tab[]);
      });
      
      browserAPI.storage.local.set = vi.fn((items, callback) => callback?.());
      browserAPI.storage.local.get = vi.fn((keys, callback) => callback({}));

      const savedSession = await context.actions.runAction<any, SavedSession>('sessions:save', {
        name: 'Test Session'
      });

      // Mock tab creation - first succeeds, second fails
      let callCount = 0;
      browserAPI.tabs.create = vi.fn((props, callback) => {
        callCount++;
        if (callCount === 1) {
          callback({ id: 100, url: props.url, title: 'Restored Tab', active: false, windowId: 1 } as chrome.tabs.Tab);
        } else {
          throw new Error('Failed to create tab');
        }
      });

      const result = await context.actions.runAction('sessions:restore', {
        sessionId: savedSession.id
      });

      expect(result.success).toBe(true);
      expect(result.tabsRestored).toBe(1);
      expect(result.failures).toBeDefined();
      expect(result.failures).toHaveLength(1);
      expect(eventSpy).toHaveBeenCalled();
    });
  });

  describe('sessions:list action', () => {
    it('should list all saved sessions', async () => {
      const context = runtime.getContext();
      
      // Mock storage to return sessions
      browserAPI.storage.local.get = vi.fn((keys, callback) => {
        callback({
          sessions: [
            {
              id: 'session1',
              name: 'Session 1',
              createdAt: Date.now(),
              tabs: [],
              groups: []
            },
            {
              id: 'session2',
              name: 'Session 2',
              createdAt: Date.now(),
              tabs: [],
              groups: []
            }
          ]
        });
      });

      const result = await context.actions.runAction<any, SavedSession[]>('sessions:list');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Session 1');
      expect(result[1].name).toBe('Session 2');
    });

    it('should return empty array if no sessions exist', async () => {
      const context = runtime.getContext();
      
      browserAPI.storage.local.get = vi.fn((keys, callback) => {
        callback({});
      });

      const result = await context.actions.runAction<any, SavedSession[]>('sessions:list');

      expect(result).toEqual([]);
    });
  });

  describe('sessions:delete action', () => {
    it('should delete a saved session', async () => {
      const context = runtime.getContext();
      
      // Save a session first
      browserAPI.tabs.query = vi.fn((info, callback) => {
        callback([
          { id: 1, title: 'Tab 1', url: 'https://example.com/1', active: true, windowId: 1 }
        ] as chrome.tabs.Tab[]);
      });
      
      browserAPI.storage.local.set = vi.fn((items, callback) => callback?.());
      browserAPI.storage.local.get = vi.fn((keys, callback) => callback({}));

      const savedSession = await context.actions.runAction<any, SavedSession>('sessions:save', {
        name: 'Test Session'
      });

      const result = await context.actions.runAction('sessions:delete', {
        sessionId: savedSession.id
      });

      expect(result.success).toBe(true);
      expect(result.sessionId).toBe(savedSession.id);
      expect(result.deletedSession).toBeDefined();
    });

    it('should emit session:deleted event', async () => {
      const context = runtime.getContext();
      const eventSpy = vi.fn();
      
      context.events.on('session:deleted', eventSpy);
      
      // Save a session first
      browserAPI.tabs.query = vi.fn((info, callback) => {
        callback([
          { id: 1, title: 'Tab 1', url: 'https://example.com/1', active: true, windowId: 1 }
        ] as chrome.tabs.Tab[]);
      });
      
      browserAPI.storage.local.set = vi.fn((items, callback) => callback?.());
      browserAPI.storage.local.get = vi.fn((keys, callback) => callback({}));

      const savedSession = await context.actions.runAction<any, SavedSession>('sessions:save', {
        name: 'Test Session'
      });

      await context.actions.runAction('sessions:delete', { sessionId: savedSession.id });

      expect(eventSpy).toHaveBeenCalled();
      const emittedData = eventSpy.mock.calls[0][0];
      expect(emittedData.sessionId).toBe(savedSession.id);
    });

    it('should throw error if session not found', async () => {
      const context = runtime.getContext();

      await expect(
        context.actions.runAction('sessions:delete', { sessionId: 'nonexistent' })
      ).rejects.toThrow('Session not found');
    });

    it('should update storage after deletion', async () => {
      const context = runtime.getContext();
      
      // Save a session first
      browserAPI.tabs.query = vi.fn((info, callback) => {
        callback([
          { id: 1, title: 'Tab 1', url: 'https://example.com/1', active: true, windowId: 1 }
        ] as chrome.tabs.Tab[]);
      });
      
      const setSpy = vi.fn((items, callback) => callback?.());
      browserAPI.storage.local.set = setSpy;
      browserAPI.storage.local.get = vi.fn((keys, callback) => callback({}));

      const savedSession = await context.actions.runAction<any, SavedSession>('sessions:save', {
        name: 'Test Session'
      });

      // Clear the spy to check delete call
      setSpy.mockClear();

      await context.actions.runAction('sessions:delete', { sessionId: savedSession.id });

      // Verify storage was updated
      expect(setSpy).toHaveBeenCalled();
      const savedData = setSpy.mock.calls[0][0];
      expect(savedData.sessions).toBeDefined();
      expect(savedData.sessions).toHaveLength(0);
    });
  });
});
