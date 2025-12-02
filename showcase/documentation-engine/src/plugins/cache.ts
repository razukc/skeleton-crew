/**
 * Cache Plugin
 * 
 * Provides screen caching with TTL and LRU eviction.
 * Stores rendered screen output to improve performance.
 * 
 * @see Requirements 14.1, 14.2, 14.3, 14.4, 14.5
 */

import type { PluginDefinition, RuntimeContext } from 'skeleton-crew-runtime';

/**
 * Cached screen entry
 */
export interface CachedScreen {
  html: string;
  timestamp: number;
  ttl: number;
  lastAccessed: number;
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  maxSize: number;
  defaultTTL: number;
}

/**
 * Cache plugin interface
 */
export interface CachePlugin {
  /**
   * Store a screen in the cache
   * @param screenId - Screen identifier
   * @param html - Rendered HTML content
   * @param ttl - Time to live in milliseconds (optional, uses default if not provided)
   */
  set(screenId: string, html: string, ttl?: number): void;

  /**
   * Retrieve a screen from the cache
   * @param screenId - Screen identifier
   * @returns Cached HTML content or undefined if not found or expired
   */
  get(screenId: string): string | undefined;

  /**
   * Check if a screen is cached and valid
   * @param screenId - Screen identifier
   * @returns True if cached and not expired
   */
  has(screenId: string): boolean;

  /**
   * Clear a specific screen from the cache
   * @param screenId - Screen identifier
   */
  clear(screenId: string): void;

  /**
   * Clear all cached screens
   */
  clearAll(): void;

  /**
   * Get cache statistics
   * @returns Cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hits: number;
    misses: number;
  };
}

/**
 * Extended RuntimeContext with cache plugin
 */
export interface RuntimeContextWithCache extends RuntimeContext {
  cache: CachePlugin;
}

/**
 * Default cache configuration
 */
const DEFAULT_CONFIG: CacheConfig = {
  maxSize: 100, // Maximum number of cached screens
  defaultTTL: 5 * 60 * 1000 // 5 minutes in milliseconds
};

/**
 * Create the cache plugin
 * 
 * This plugin provides screen caching with TTL and LRU eviction.
 * It stores rendered screen output to improve performance.
 * 
 * @param config - Cache configuration (optional)
 * @see Requirements 14.1, 14.2, 14.3, 14.4, 14.5
 */
export function createCachePlugin(config: Partial<CacheConfig> = {}): PluginDefinition {
  // Merge with default configuration
  const cacheConfig: CacheConfig = {
    ...DEFAULT_CONFIG,
    ...config
  };

  // Cache storage using Map
  // @see Requirements 14.1
  const cache = new Map<string, CachedScreen>();

  // Cache statistics
  let hits = 0;
  let misses = 0;
  
  // Store unregister functions for cleanup
  const unregisterFunctions: Array<() => void> = [];

  /**
   * Check if a cached entry is expired
   * @param entry - Cached screen entry
   * @returns True if expired
   */
  function isExpired(entry: CachedScreen): boolean {
    const now = Date.now();
    return now - entry.timestamp > entry.ttl;
  }

  /**
   * Evict least recently used entry
   * @see Requirements 14.5
   */
  function evictLRU(): void {
    if (cache.size === 0) return;

    let lruKey: string | null = null;
    let lruTime = Infinity;

    // Find the least recently used entry
    for (const [key, entry] of cache.entries()) {
      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed;
        lruKey = key;
      }
    }

    // Evict the LRU entry
    if (lruKey !== null) {
      cache.delete(lruKey);
      console.log(`[cache] Evicted LRU entry: ${lruKey}`);
    }
  }

  // Cache plugin implementation
  const cachePlugin: CachePlugin = {
    set(screenId: string, html: string, ttl?: number): void {
      // Check if we need to evict an entry
      // @see Requirements 14.5
      if (cache.size >= cacheConfig.maxSize) {
        evictLRU();
      }

      const now = Date.now();
      const entry: CachedScreen = {
        html,
        timestamp: now,
        ttl: ttl ?? cacheConfig.defaultTTL,
        lastAccessed: now
      };

      // Store in cache
      // @see Requirements 14.1
      cache.set(screenId, entry);
    },

    get(screenId: string): string | undefined {
      const entry = cache.get(screenId);

      if (!entry) {
        misses++;
        return undefined;
      }

      // Check if expired
      // @see Requirements 14.4
      if (isExpired(entry)) {
        cache.delete(screenId);
        misses++;
        return undefined;
      }

      // Update last accessed time for LRU
      // @see Requirements 14.5
      entry.lastAccessed = Date.now();
      hits++;

      return entry.html;
    },

    has(screenId: string): boolean {
      const entry = cache.get(screenId);

      if (!entry) {
        return false;
      }

      // Check if expired
      // @see Requirements 14.4
      if (isExpired(entry)) {
        cache.delete(screenId);
        return false;
      }

      return true;
    },

    clear(screenId: string): void {
      cache.delete(screenId);
    },

    clearAll(): void {
      cache.clear();
      hits = 0;
      misses = 0;
    },

    getStats() {
      return {
        size: cache.size,
        maxSize: cacheConfig.maxSize,
        hits,
        misses
      };
    }
  };

  return {
    name: 'cache',
    version: '1.0.0',
    setup(context: RuntimeContext): void {
      // Extend the runtime context with cache plugin
      (context as RuntimeContextWithCache).cache = cachePlugin;

      // Register cache:get action
      // @see Requirements 14.2, 14.3
      const unregisterGet = context.actions.registerAction({
        id: 'cache:get',
        timeout: 5000,
        handler: async (params: { screenId: string }) => {
          if (!params || !params.screenId) {
            throw new Error('cache:get action requires a screenId parameter');
          }

          const { screenId } = params;
          const html = cachePlugin.get(screenId);

          if (html !== undefined) {
            // Emit cache:hit event
            // @see Requirements 14.3
            context.events.emit('cache:hit', { screenId });
            console.log(`[cache] Cache hit for screen: ${screenId}`);
            
            return { screenId, html, cached: true };
          } else {
            // Emit cache:miss event
            context.events.emit('cache:miss', { screenId });
            console.log(`[cache] Cache miss for screen: ${screenId}`);
            
            return { screenId, html: undefined, cached: false };
          }
        }
      });
      unregisterFunctions.push(unregisterGet);

      // Register cache:set action
      // @see Requirements 14.1
      const unregisterSet = context.actions.registerAction({
        id: 'cache:set',
        timeout: 5000,
        handler: async (params: { screenId: string; html: string; ttl?: number }) => {
          if (!params || !params.screenId || !params.html) {
            throw new Error('cache:set action requires screenId and html parameters');
          }

          const { screenId, html, ttl } = params;
          cachePlugin.set(screenId, html, ttl);
          
          console.log(`[cache] Cached screen: ${screenId}`);
          
          return { screenId, cached: true };
        }
      });
      unregisterFunctions.push(unregisterSet);

      // Register cache:clear action
      const unregisterClear = context.actions.registerAction({
        id: 'cache:clear',
        timeout: 5000,
        handler: async (params: { screenId?: string }) => {
          if (params && params.screenId) {
            cachePlugin.clear(params.screenId);
            console.log(`[cache] Cleared cache for screen: ${params.screenId}`);
            return { screenId: params.screenId, cleared: true };
          } else {
            cachePlugin.clearAll();
            console.log('[cache] Cleared all cache');
            return { cleared: true };
          }
        }
      });
      unregisterFunctions.push(unregisterClear);

      // Register cache:stats action
      const unregisterStats = context.actions.registerAction({
        id: 'cache:stats',
        timeout: 5000,
        handler: async () => {
          const stats = cachePlugin.getStats();
          console.log('[cache] Stats:', stats);
          return stats;
        }
      });
      unregisterFunctions.push(unregisterStats);

      console.log(`[cache] Initialized with maxSize=${cacheConfig.maxSize}, defaultTTL=${cacheConfig.defaultTTL}ms`);
      console.log('[cache] Actions registered: cache:get, cache:set, cache:clear, cache:stats');
    },
    dispose(): void {
      // Unregister all actions
      unregisterFunctions.forEach(fn => fn());
      unregisterFunctions.length = 0;
      
      // Clear cache
      cachePlugin.clearAll();
      
      console.log('[cache] Plugin disposed');
    }
  };
}
