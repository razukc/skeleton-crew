/**
 * Groups Plugin Unit Tests
 * 
 * Tests the groups plugin functionality including:
 * - Feature detection and graceful degradation
 * - Group creation with tab assignment
 * - Group property updates
 * - Tab ungrouping
 * - Event emission
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Runtime } from 'skeleton-crew-runtime';
import { groupsPlugin } from '../../src/plugins/groups.js';

describe('Groups Plugin', () => {
  let runtime: Runtime;

  beforeEach(async () => {
    // Use the global chrome mock from setup.ts
    // Just need to set up the runtime
    runtime = new Runtime();
    runtime.registerPlugin(groupsPlugin);
    await runtime.initialize();
  });

  afterEach(async () => {
    await runtime.shutdown();
    vi.clearAllMocks();
  });

  describe('Feature Detection', () => {
    it('should register actions when Tab Groups API is available', async () => {
      const context = runtime.getContext();
      
      // Try to run an action - it should not throw "not found" error
      try {
        await context.actions.runAction('groups:create', { tabIds: [1] });
      } catch (error: any) {
        // It might throw for other reasons, but not "not found"
        expect(error.message).not.toContain('not found');
      }
    });

    it('should skip registration when Tab Groups API is not available', async () => {
      // Save original tabGroups
      const originalTabGroups = (global.chrome as any).tabGroups;
      
      // Remove tabGroups API
      delete (global.chrome as any).tabGroups;
      
      const testRuntime = new Runtime();
      testRuntime.registerPlugin(groupsPlugin);
      await testRuntime.initialize();
      
      const context = testRuntime.getContext();
      
      // Actions should not be registered
      await expect(
        context.actions.runAction('groups:create', { tabIds: [1] })
      ).rejects.toThrow('not found');
      
      await testRuntime.shutdown();
      
      // Restore tabGroups for other tests
      (global.chrome as any).tabGroups = originalTabGroups;
    });
  });

  describe('groups:create action', () => {
    it('should create a group with specified tabs', async () => {
      const context = runtime.getContext();
      
      const result = await context.actions.runAction('groups:create', {
        tabIds: [1, 2, 3]
      });
      
      expect(result).toEqual({
        success: true,
        groupId: 1,
        group: {
          id: 1,
          title: 'Test Group',
          color: 'blue',
          collapsed: false
        }
      });
      
      expect(chrome.tabs.group).toHaveBeenCalledWith({ tabIds: [1, 2, 3] }, expect.any(Function));
    });

    it('should create a group with title and color', async () => {
      const context = runtime.getContext();
      
      const result = await context.actions.runAction('groups:create', {
        tabIds: [1, 2],
        title: 'My Group',
        color: 'red'
      });
      
      expect(result.success).toBe(true);
      expect(chrome.tabGroups.update).toHaveBeenCalledWith(
        1,
        { title: 'My Group', color: 'red' },
        expect.any(Function)
      );
    });

    it('should emit group:created event', async () => {
      const context = runtime.getContext();
      const eventSpy = vi.fn();
      
      context.events.on('group:created', eventSpy);
      
      await context.actions.runAction('groups:create', {
        tabIds: [1, 2]
      });
      
      expect(eventSpy).toHaveBeenCalledWith({
        groupId: 1,
        tabIds: [1, 2],
        group: expect.objectContaining({
          id: 1
        })
      });
    });

    it('should throw error if tabIds is empty', async () => {
      const context = runtime.getContext();
      
      await expect(
        context.actions.runAction('groups:create', { tabIds: [] })
      ).rejects.toThrow('Tab IDs array is required and must not be empty');
    });

    it('should throw error if tabIds is missing', async () => {
      const context = runtime.getContext();
      
      await expect(
        context.actions.runAction('groups:create', {})
      ).rejects.toThrow('Tab IDs array is required and must not be empty');
    });
  });

  describe('groups:update action', () => {
    it('should update group title', async () => {
      const context = runtime.getContext();
      
      const result = await context.actions.runAction('groups:update', {
        groupId: 1,
        title: 'Updated Title'
      });
      
      expect(result).toEqual({
        success: true,
        groupId: 1,
        group: {
          id: 1,
          title: 'Updated Title',
          color: 'blue',
          collapsed: false
        }
      });
      
      expect(chrome.tabGroups.update).toHaveBeenCalledWith(
        1,
        { title: 'Updated Title' },
        expect.any(Function)
      );
    });

    it('should update group color', async () => {
      const context = runtime.getContext();
      
      await context.actions.runAction('groups:update', {
        groupId: 1,
        color: 'green'
      });
      
      expect(chrome.tabGroups.update).toHaveBeenCalledWith(
        1,
        { color: 'green' },
        expect.any(Function)
      );
    });

    it('should update group collapsed state', async () => {
      const context = runtime.getContext();
      
      await context.actions.runAction('groups:update', {
        groupId: 1,
        collapsed: true
      });
      
      expect(chrome.tabGroups.update).toHaveBeenCalledWith(
        1,
        { collapsed: true },
        expect.any(Function)
      );
    });

    it('should emit group:updated event', async () => {
      const context = runtime.getContext();
      const eventSpy = vi.fn();
      
      context.events.on('group:updated', eventSpy);
      
      await context.actions.runAction('groups:update', {
        groupId: 1,
        title: 'New Title'
      });
      
      expect(eventSpy).toHaveBeenCalledWith({
        groupId: 1,
        group: expect.objectContaining({
          id: 1,
          title: 'New Title'
        })
      });
    });

    it('should throw error if groupId is missing', async () => {
      const context = runtime.getContext();
      
      await expect(
        context.actions.runAction('groups:update', { title: 'Test' })
      ).rejects.toThrow('Group ID is required');
    });

    it('should throw error if no properties provided', async () => {
      const context = runtime.getContext();
      
      await expect(
        context.actions.runAction('groups:update', { groupId: 1 })
      ).rejects.toThrow('At least one property (title, color, or collapsed) must be provided');
    });
  });

  describe('groups:ungroup action', () => {
    it('should ungroup specified tabs', async () => {
      const context = runtime.getContext();
      
      const result = await context.actions.runAction('groups:ungroup', {
        tabIds: [1, 2]
      });
      
      expect(result.success).toBe(true);
      expect(result.tabIds).toEqual([1, 2]);
      // Note: chrome.tabs.ungroup is called internally by the browser adapter
    });

    it('should emit group:removed event', async () => {
      const context = runtime.getContext();
      const eventSpy = vi.fn();
      
      context.events.on('group:removed', eventSpy);
      
      await context.actions.runAction('groups:ungroup', {
        tabIds: [1, 2]
      });
      
      expect(eventSpy).toHaveBeenCalled();
    });

    it('should throw error if tabIds is empty', async () => {
      const context = runtime.getContext();
      
      await expect(
        context.actions.runAction('groups:ungroup', { tabIds: [] })
      ).rejects.toThrow('Tab IDs array is required and must not be empty');
    });

    it('should throw error if tabIds is missing', async () => {
      const context = runtime.getContext();
      
      await expect(
        context.actions.runAction('groups:ungroup', {})
      ).rejects.toThrow('Tab IDs array is required and must not be empty');
    });
  });

  describe('Cross-plugin Integration', () => {
    it('should work with other plugins via events', async () => {
      const context = runtime.getContext();
      const eventLog: string[] = [];
      
      context.events.on('group:created', () => eventLog.push('created'));
      context.events.on('group:updated', () => eventLog.push('updated'));
      context.events.on('group:removed', () => eventLog.push('removed'));
      
      await context.actions.runAction('groups:create', { tabIds: [1] });
      await context.actions.runAction('groups:update', { groupId: 1, title: 'Test' });
      await context.actions.runAction('groups:ungroup', { tabIds: [1] });
      
      expect(eventLog).toEqual(['created', 'updated', 'removed']);
    });
  });
});
