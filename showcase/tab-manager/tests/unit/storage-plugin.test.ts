/**
 * Storage Plugin Unit Tests
 * 
 * Tests the storage plugin's actions and event emissions.
 * Validates Requirements: 9.1, 11.1, 12.1, 12.2, 12.3, 12.4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Runtime } from 'skeleton-crew-runtime';
import { storagePlugin } from '../../src/plugins/storage.js';
import { browserAPI } from '../../src/utils/browser-adapter.js';

describe('Storage Plugin', () => {
  let runtime: Runtime;

  beforeEach(async () => {
    // Create fresh runtime instance
    runtime = new Runtime();
    runtime.registerPlugin(storagePlugin);
    await runtime.initialize();
    
    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await runtime.shutdown();
  });

  describe('Plugin Registration', () => {
    it('should register storage plugin', () => {
      const context = runtime.getContext();
      const plugin = context.plugins.getPlugin('storage');
      expect(plugin).toBeDefined();
      expect(plugin?.name).toBe('storage');
      expect(plugin?.version).toBe('1.0.0');
    });

    it('should register storage actions', () => {
      const context = runtime.getContext();
      
      // Verify actions are registered by attempting to run them
      expect(async () => {
        await context.actions.runAction('storage:save', { key: 'test', data: 'value' });
      }).not.toThrow();
    });
  });

  describe('storage:save action', () => {
    it('should save data to storage', async () => {
      const context = runtime.getContext();
      
      // Mock storage.set
      browserAPI.storage.local.set = vi.fn((items, callback) => {
        callback?.();
      });

      const result = await context.actions.runAction('storage:save', {
        key: 'testKey',
        data: { value: 'testData' }
      });

      expect(result).toEqual({ success: true, key: 'testKey' });
      expect(browserAPI.storage.local.set).toHaveBeenCalledWith(
        { testKey: { value: 'testData' } },
        expect.any(Function)
      );
    });

    it('should emit storage:saved event on success', async () => {
      const context = runtime.getContext();
      const eventSpy = vi.fn();
      
      context.events.on('storage:saved', eventSpy);
      
      browserAPI.storage.local.set = vi.fn((items, callback) => {
        callback?.();
      });

      await context.actions.runAction('storage:save', {
        key: 'testKey',
        data: 'testData'
      });

      expect(eventSpy).toHaveBeenCalledWith({
        key: 'testKey',
        data: 'testData'
      });
    });

    it('should throw error if key is missing', async () => {
      const context = runtime.getContext();

      await expect(
        context.actions.runAction('storage:save', { key: '', data: 'test' })
      ).rejects.toThrow('Storage key is required');
    });

    it('should emit storage:error event on failure', async () => {
      const context = runtime.getContext();
      const eventSpy = vi.fn();
      
      context.events.on('storage:error', eventSpy);
      
      browserAPI.storage.local.set = vi.fn(() => {
        throw new Error('Storage error');
      });

      await expect(
        context.actions.runAction('storage:save', { key: 'test', data: 'value' })
      ).rejects.toThrow();

      expect(eventSpy).toHaveBeenCalledWith({
        operation: 'save',
        error: 'Storage error',
        key: 'test'
      });
    });

    it('should handle quota exceeded error', async () => {
      const context = runtime.getContext();
      const eventSpy = vi.fn();
      
      context.events.on('storage:error', eventSpy);
      
      browserAPI.storage.local.set = vi.fn(() => {
        throw new Error('QUOTA_BYTES exceeded');
      });

      await expect(
        context.actions.runAction('storage:save', { key: 'test', data: 'value' })
      ).rejects.toThrow('Storage quota exceeded');

      expect(eventSpy).toHaveBeenCalledWith({
        operation: 'save',
        error: 'Storage quota exceeded',
        key: 'test'
      });
    });
  });

  describe('storage:load action', () => {
    it('should load data from storage', async () => {
      const context = runtime.getContext();
      
      browserAPI.storage.local.get = vi.fn((keys, callback) => {
        callback({ testKey: 'testData' });
      });

      const result = await context.actions.runAction('storage:load', {
        key: 'testKey'
      });

      expect(result).toEqual({
        success: true,
        key: 'testKey',
        data: 'testData'
      });
      expect(browserAPI.storage.local.get).toHaveBeenCalledWith(
        'testKey',
        expect.any(Function)
      );
    });

    it('should emit storage:loaded event on success', async () => {
      const context = runtime.getContext();
      const eventSpy = vi.fn();
      
      context.events.on('storage:loaded', eventSpy);
      
      browserAPI.storage.local.get = vi.fn((keys, callback) => {
        callback({ testKey: 'testData' });
      });

      await context.actions.runAction('storage:load', {
        key: 'testKey'
      });

      expect(eventSpy).toHaveBeenCalledWith({
        key: 'testKey',
        data: 'testData'
      });
    });

    it('should return default value if key does not exist', async () => {
      const context = runtime.getContext();
      
      browserAPI.storage.local.get = vi.fn((keys, callback) => {
        callback({});
      });

      const result = await context.actions.runAction('storage:load', {
        key: 'nonexistent',
        defaultValue: 'default'
      });

      expect(result).toEqual({
        success: true,
        key: 'nonexistent',
        data: 'default'
      });
    });

    it('should return null as default if no default value provided', async () => {
      const context = runtime.getContext();
      
      browserAPI.storage.local.get = vi.fn((keys, callback) => {
        callback({});
      });

      const result = await context.actions.runAction('storage:load', {
        key: 'nonexistent'
      });

      expect(result).toEqual({
        success: true,
        key: 'nonexistent',
        data: null
      });
    });

    it('should return default value on error (graceful degradation)', async () => {
      const context = runtime.getContext();
      const eventSpy = vi.fn();
      
      context.events.on('storage:error', eventSpy);
      
      browserAPI.storage.local.get = vi.fn(() => {
        throw new Error('Storage error');
      });

      const result = await context.actions.runAction('storage:load', {
        key: 'test',
        defaultValue: 'fallback'
      });

      expect(result).toEqual({
        success: false,
        key: 'test',
        data: 'fallback'
      });

      expect(eventSpy).toHaveBeenCalledWith({
        operation: 'load',
        error: 'Storage error',
        key: 'test'
      });
    });

    it('should handle missing key gracefully', async () => {
      const context = runtime.getContext();
      const eventSpy = vi.fn();
      
      context.events.on('storage:error', eventSpy);

      const result = await context.actions.runAction('storage:load', { key: '' });

      // Should return default value instead of throwing
      expect(result).toEqual({
        success: false,
        key: '',
        data: null
      });
      
      // Should emit error event
      expect(eventSpy).toHaveBeenCalledWith({
        operation: 'load',
        error: 'Storage key is required',
        key: ''
      });
    });
  });

  describe('storage:clear action', () => {
    it('should clear all storage', async () => {
      const context = runtime.getContext();
      
      browserAPI.storage.local.clear = vi.fn((callback) => {
        callback?.();
      });

      const result = await context.actions.runAction('storage:clear');

      expect(result).toEqual({ success: true });
      expect(browserAPI.storage.local.clear).toHaveBeenCalled();
    });

    it('should emit storage:cleared event on success', async () => {
      const context = runtime.getContext();
      const eventSpy = vi.fn();
      
      context.events.on('storage:cleared', eventSpy);
      
      browserAPI.storage.local.clear = vi.fn((callback) => {
        callback?.();
      });

      await context.actions.runAction('storage:clear');

      expect(eventSpy).toHaveBeenCalledWith({});
    });

    it('should emit storage:error event on failure', async () => {
      const context = runtime.getContext();
      const eventSpy = vi.fn();
      
      context.events.on('storage:error', eventSpy);
      
      browserAPI.storage.local.clear = vi.fn(() => {
        throw new Error('Clear failed');
      });

      await expect(
        context.actions.runAction('storage:clear')
      ).rejects.toThrow('Clear failed');

      expect(eventSpy).toHaveBeenCalledWith({
        operation: 'clear',
        error: 'Clear failed'
      });
    });
  });

  describe('Event Emission', () => {
    it('should emit events for all storage operations', async () => {
      const context = runtime.getContext();
      const savedSpy = vi.fn();
      const loadedSpy = vi.fn();
      const clearedSpy = vi.fn();
      
      context.events.on('storage:saved', savedSpy);
      context.events.on('storage:loaded', loadedSpy);
      context.events.on('storage:cleared', clearedSpy);
      
      // Mock storage APIs
      browserAPI.storage.local.set = vi.fn((items, callback) => callback?.());
      browserAPI.storage.local.get = vi.fn((keys, callback) => callback({ test: 'data' }));
      browserAPI.storage.local.clear = vi.fn((callback) => callback?.());

      // Execute actions
      await context.actions.runAction('storage:save', { key: 'test', data: 'value' });
      await context.actions.runAction('storage:load', { key: 'test' });
      await context.actions.runAction('storage:clear');

      // Verify events were emitted
      expect(savedSpy).toHaveBeenCalled();
      expect(loadedSpy).toHaveBeenCalled();
      expect(clearedSpy).toHaveBeenCalled();
    });
  });
});
