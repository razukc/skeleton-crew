/**
 * Background Service Worker Tests
 * 
 * Tests the background script initialization, message handling, and event broadcasting.
 * 
 * Requirements: 9.1, 9.2, 10.4, 11.2
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Runtime } from 'skeleton-crew-runtime';
import { storagePlugin } from '../../src/plugins/storage.js';
import { tabsPlugin } from '../../src/plugins/tabs.js';
import { searchPlugin } from '../../src/plugins/search.js';
import { groupsPlugin } from '../../src/plugins/groups.js';
import { sessionsPlugin } from '../../src/plugins/sessions.js';

describe('Background Service Worker', () => {
  let runtime: Runtime;

  beforeEach(async () => {
    // Create a fresh runtime instance
    runtime = new Runtime();
  });

  afterEach(async () => {
    // Clean up
    if (runtime) {
      await runtime.shutdown();
    }
  });

  describe('Plugin Registration', () => {
    it('should register all plugins in correct order', async () => {
      // Register plugins in the same order as background script
      runtime.registerPlugin(storagePlugin);
      runtime.registerPlugin(tabsPlugin);
      runtime.registerPlugin(searchPlugin);
      runtime.registerPlugin(groupsPlugin);
      runtime.registerPlugin(sessionsPlugin);

      // Initialize runtime
      await runtime.initialize();

      const context = runtime.getContext();

      // Verify storage plugin actions work
      await expect(
        context.actions.runAction('storage:save', { key: 'test', data: {} })
      ).resolves.toBeDefined();

      // Verify tabs plugin actions work
      await expect(
        context.actions.runAction('tabs:query', {})
      ).resolves.toBeDefined();

      // Verify search plugin actions work
      await expect(
        context.actions.runAction('search:filter', { query: '', tabs: [] })
      ).resolves.toBeDefined();

      // Verify sessions plugin actions work
      await expect(
        context.actions.runAction('sessions:list', {})
      ).resolves.toBeDefined();
    });

    it('should initialize runtime successfully', async () => {
      runtime.registerPlugin(storagePlugin);
      runtime.registerPlugin(tabsPlugin);
      runtime.registerPlugin(searchPlugin);
      runtime.registerPlugin(groupsPlugin);
      runtime.registerPlugin(sessionsPlugin);

      // Should not throw
      await expect(runtime.initialize()).resolves.not.toThrow();
    });
  });

  describe('Message Handling', () => {
    beforeEach(async () => {
      runtime.registerPlugin(storagePlugin);
      runtime.registerPlugin(tabsPlugin);
      runtime.registerPlugin(searchPlugin);
      runtime.registerPlugin(groupsPlugin);
      runtime.registerPlugin(sessionsPlugin);
      await runtime.initialize();
    });

    it('should execute action via message handler pattern', async () => {
      const context = runtime.getContext();

      // Simulate message handler behavior
      const message = {
        type: 'action' as const,
        action: 'storage:save',
        params: { key: 'test', data: { value: 'test-data' } }
      };

      // Execute action
      const result = await context.actions.runAction<any, any>(message.action, message.params);

      // Verify result
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.key).toBe('test');
    });

    it('should handle action errors gracefully', async () => {
      const context = runtime.getContext();

      // Try to execute action with invalid params
      await expect(
        context.actions.runAction('storage:save', { key: '', data: {} })
      ).rejects.toThrow('Storage key is required');
    });

    it('should return error for unknown action', async () => {
      const context = runtime.getContext();

      // Try to execute non-existent action
      await expect(
        context.actions.runAction('unknown:action', {})
      ).rejects.toThrow();
    });
  });

  describe('Event Broadcasting', () => {
    beforeEach(async () => {
      runtime.registerPlugin(storagePlugin);
      runtime.registerPlugin(tabsPlugin);
      runtime.registerPlugin(searchPlugin);
      runtime.registerPlugin(groupsPlugin);
      runtime.registerPlugin(sessionsPlugin);
      await runtime.initialize();
    });

    it('should emit events when actions are executed', async () => {
      const context = runtime.getContext();
      const eventSpy = vi.fn();

      // Subscribe to storage:saved event
      context.events.on('storage:saved', eventSpy);

      // Execute action that emits event
      await context.actions.runAction('storage:save', {
        key: 'test',
        data: { value: 'test-data' }
      });

      // Verify event was emitted
      expect(eventSpy).toHaveBeenCalledWith({
        key: 'test',
        data: { value: 'test-data' }
      });
    });

    it('should emit multiple events for different operations', async () => {
      const context = runtime.getContext();
      const savedSpy = vi.fn();
      const loadedSpy = vi.fn();

      // Subscribe to events
      context.events.on('storage:saved', savedSpy);
      context.events.on('storage:loaded', loadedSpy);

      // Execute save action
      await context.actions.runAction('storage:save', {
        key: 'test',
        data: { value: 'test-data' }
      });

      // Execute load action
      await context.actions.runAction('storage:load', {
        key: 'test',
        defaultValue: null
      });

      // Verify both events were emitted
      expect(savedSpy).toHaveBeenCalled();
      expect(loadedSpy).toHaveBeenCalled();
    });

    it('should broadcast tab events', async () => {
      const context = runtime.getContext();
      const eventSpy = vi.fn();

      // Subscribe to tab:closed event
      context.events.on('tab:closed', eventSpy);

      // Execute tab close action
      await context.actions.runAction('tabs:close', { tabId: 1 });

      // Verify event was emitted
      expect(eventSpy).toHaveBeenCalledWith({ tabId: 1 });
    });
  });

  describe('Cross-Plugin Communication', () => {
    beforeEach(async () => {
      runtime.registerPlugin(storagePlugin);
      runtime.registerPlugin(tabsPlugin);
      runtime.registerPlugin(searchPlugin);
      runtime.registerPlugin(groupsPlugin);
      runtime.registerPlugin(sessionsPlugin);
      await runtime.initialize();
    });

    it('should allow sessions plugin to use storage plugin', async () => {
      const context = runtime.getContext();

      // Sessions plugin should be able to save via storage plugin
      const session = await context.actions.runAction<any, any>('sessions:save', {
        name: 'Test Session'
      });

      expect(session).toBeDefined();
      expect(session.name).toBe('Test Session');
      expect(session.id).toBeDefined();
      expect(session.tabs).toBeDefined();
    });

    it('should allow search plugin to filter tabs from tabs plugin', async () => {
      const context = runtime.getContext();

      // Get tabs
      const tabs = await context.actions.runAction('tabs:query', {});

      // Filter tabs
      const filtered = await context.actions.runAction('search:filter', {
        query: 'test',
        tabs
      });

      expect(filtered).toBeDefined();
      expect(Array.isArray(filtered)).toBe(true);
    });
  });

  describe('Runtime Lifecycle', () => {
    it('should initialize and shutdown cleanly', async () => {
      runtime.registerPlugin(storagePlugin);
      runtime.registerPlugin(tabsPlugin);
      runtime.registerPlugin(searchPlugin);
      runtime.registerPlugin(groupsPlugin);
      runtime.registerPlugin(sessionsPlugin);

      // Initialize
      await runtime.initialize();
      expect(runtime.getContext()).toBeDefined();

      // Shutdown
      await runtime.shutdown();

      // After shutdown, runtime is no longer initialized
      expect(runtime.isInitialized()).toBe(false);
    });

    it('should handle multiple initialize calls gracefully', async () => {
      runtime.registerPlugin(storagePlugin);

      // First initialize
      await runtime.initialize();

      // Second initialize should throw or be idempotent
      // Based on Runtime implementation, this might throw
      await expect(runtime.initialize()).rejects.toThrow();
    });
  });
});

