/**
 * Unit tests for Cache Plugin
 * 
 * Tests cache storage, retrieval, expiration, and LRU eviction.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Runtime } from 'skeleton-crew-runtime';
import { createCachePlugin } from '../../src/plugins/cache.js';
import type { RuntimeContextWithCache } from '../../src/plugins/cache.js';

describe('Cache Plugin', () => {
  let runtime: Runtime;
  let context: RuntimeContextWithCache;

  beforeEach(async () => {
    runtime = new Runtime();
    
    // Register cache plugin with small maxSize for testing
    runtime.registerPlugin(createCachePlugin({ maxSize: 3, defaultTTL: 1000 }));
    
    await runtime.initialize();
    context = runtime.getContext() as RuntimeContextWithCache;
  });

  describe('Cache Storage', () => {
    it('should store and retrieve cached content', () => {
      const screenId = 'test-screen';
      const html = '<div>Test Content</div>';

      context.cache.set(screenId, html);
      const retrieved = context.cache.get(screenId);

      expect(retrieved).toBe(html);
    });

    it('should check if screen is cached', () => {
      const screenId = 'test-screen';
      const html = '<div>Test Content</div>';

      expect(context.cache.has(screenId)).toBe(false);

      context.cache.set(screenId, html);

      expect(context.cache.has(screenId)).toBe(true);
    });

    it('should clear specific cached screen', () => {
      const screenId = 'test-screen';
      const html = '<div>Test Content</div>';

      context.cache.set(screenId, html);
      expect(context.cache.has(screenId)).toBe(true);

      context.cache.clear(screenId);
      expect(context.cache.has(screenId)).toBe(false);
    });

    it('should clear all cached screens', () => {
      context.cache.set('screen1', '<div>1</div>');
      context.cache.set('screen2', '<div>2</div>');
      context.cache.set('screen3', '<div>3</div>');

      expect(context.cache.has('screen1')).toBe(true);
      expect(context.cache.has('screen2')).toBe(true);
      expect(context.cache.has('screen3')).toBe(true);

      context.cache.clearAll();

      expect(context.cache.has('screen1')).toBe(false);
      expect(context.cache.has('screen2')).toBe(false);
      expect(context.cache.has('screen3')).toBe(false);
    });
  });

  describe('Cache Expiration', () => {
    it('should expire cached content after TTL', async () => {
      const screenId = 'test-screen';
      const html = '<div>Test Content</div>';

      // Set with very short TTL (10ms)
      context.cache.set(screenId, html, 10);

      // Should be available immediately
      expect(context.cache.has(screenId)).toBe(true);
      expect(context.cache.get(screenId)).toBe(html);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 20));

      // Should be expired
      expect(context.cache.has(screenId)).toBe(false);
      expect(context.cache.get(screenId)).toBeUndefined();
    });

    it('should use default TTL when not specified', () => {
      const screenId = 'test-screen';
      const html = '<div>Test Content</div>';

      context.cache.set(screenId, html);

      // Should be available (default TTL is 1000ms in test config)
      expect(context.cache.has(screenId)).toBe(true);
    });
  });

  describe('LRU Eviction', () => {
    it('should evict least recently used entry when cache is full', () => {
      // Fill cache to max size (3)
      context.cache.set('screen1', '<div>1</div>');
      context.cache.set('screen2', '<div>2</div>');
      context.cache.set('screen3', '<div>3</div>');

      // All should be cached
      expect(context.cache.has('screen1')).toBe(true);
      expect(context.cache.has('screen2')).toBe(true);
      expect(context.cache.has('screen3')).toBe(true);

      // Add a 4th screen, should evict screen1 (least recently used)
      context.cache.set('screen4', '<div>4</div>');

      expect(context.cache.has('screen1')).toBe(false);
      expect(context.cache.has('screen2')).toBe(true);
      expect(context.cache.has('screen3')).toBe(true);
      expect(context.cache.has('screen4')).toBe(true);
    });

    it('should update last accessed time on get', () => {
      // Fill cache
      context.cache.set('screen1', '<div>1</div>');
      context.cache.set('screen2', '<div>2</div>');
      context.cache.set('screen3', '<div>3</div>');

      // Access screen3 and screen2 to update their last accessed times
      // This makes screen1 the least recently used
      context.cache.get('screen3');
      context.cache.get('screen2');

      // Add a 4th screen, should evict screen1 (now least recently used)
      context.cache.set('screen4', '<div>4</div>');

      expect(context.cache.has('screen1')).toBe(false);
      expect(context.cache.has('screen2')).toBe(true);
      expect(context.cache.has('screen3')).toBe(true);
      expect(context.cache.has('screen4')).toBe(true);
    });
  });

  describe('Cache Actions', () => {
    it('should execute cache:get action and emit cache:hit event', async () => {
      const screenId = 'test-screen';
      const html = '<div>Test Content</div>';

      // Set up event listener
      const eventData: any[] = [];
      context.events.on('cache:hit', (data) => {
        eventData.push(data);
      });

      // Cache the screen
      context.cache.set(screenId, html);

      // Execute cache:get action
      const result = await context.actions.runAction('cache:get', { screenId });

      expect(result).toEqual({
        screenId,
        html,
        cached: true
      });

      // Check event was emitted
      expect(eventData).toHaveLength(1);
      expect(eventData[0]).toEqual({ screenId });
    });

    it('should execute cache:get action and emit cache:miss event', async () => {
      const screenId = 'non-existent-screen';

      // Set up event listener
      const eventData: any[] = [];
      context.events.on('cache:miss', (data) => {
        eventData.push(data);
      });

      // Execute cache:get action
      const result = await context.actions.runAction('cache:get', { screenId });

      expect(result).toEqual({
        screenId,
        html: undefined,
        cached: false
      });

      // Check event was emitted
      expect(eventData).toHaveLength(1);
      expect(eventData[0]).toEqual({ screenId });
    });

    it('should execute cache:set action', async () => {
      const screenId = 'test-screen';
      const html = '<div>Test Content</div>';

      const result = await context.actions.runAction('cache:set', { screenId, html });

      expect(result).toEqual({
        screenId,
        cached: true
      });

      // Verify it was cached
      expect(context.cache.has(screenId)).toBe(true);
      expect(context.cache.get(screenId)).toBe(html);
    });

    it('should execute cache:clear action for specific screen', async () => {
      const screenId = 'test-screen';
      const html = '<div>Test Content</div>';

      context.cache.set(screenId, html);
      expect(context.cache.has(screenId)).toBe(true);

      const result = await context.actions.runAction('cache:clear', { screenId });

      expect(result).toEqual({
        screenId,
        cleared: true
      });

      expect(context.cache.has(screenId)).toBe(false);
    });

    it('should execute cache:clear action for all screens', async () => {
      context.cache.set('screen1', '<div>1</div>');
      context.cache.set('screen2', '<div>2</div>');

      const result = await context.actions.runAction('cache:clear', {});

      expect(result).toEqual({
        cleared: true
      });

      expect(context.cache.has('screen1')).toBe(false);
      expect(context.cache.has('screen2')).toBe(false);
    });

    it('should execute cache:stats action', async () => {
      context.cache.set('screen1', '<div>1</div>');
      context.cache.set('screen2', '<div>2</div>');

      // Trigger some hits and misses
      context.cache.get('screen1');
      context.cache.get('screen1');
      context.cache.get('non-existent');

      const result = await context.actions.runAction('cache:stats', {});

      expect(result).toEqual({
        size: 2,
        maxSize: 3,
        hits: 2,
        misses: 1
      });
    });
  });

  describe('Error Handling', () => {
    it('should throw error when cache:get is called without screenId', async () => {
      await expect(
        context.actions.runAction('cache:get', {})
      ).rejects.toThrow('cache:get action requires a screenId parameter');
    });

    it('should throw error when cache:set is called without required parameters', async () => {
      await expect(
        context.actions.runAction('cache:set', { screenId: 'test' })
      ).rejects.toThrow('cache:set action requires screenId and html parameters');
    });
  });
});
