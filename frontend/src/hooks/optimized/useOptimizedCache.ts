/**
 * useOptimizedCache - Advanced caching solution with intelligent cache management
 * Provides multi-level caching, automatic invalidation, and memory optimization
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { usePerformanceMetrics } from '../performance/usePerformanceMetrics';
import { telemetry } from '../../utils/telemetry/index';

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
  tags: string[];
  priority: 'low' | 'normal' | 'high';
}

export interface CacheStats {
  totalEntries: number;
  totalMemory: number;
  hitRate: number;
  missRate: number;
  evictionCount: number;
  oldestEntry: number;
  newestEntry: number;
}

export interface UseOptimizedCacheOptions {
  maxSize?: number; // Maximum number of entries
  maxMemory?: number; // Maximum memory usage in bytes
  defaultTTL?: number; // Default time-to-live in milliseconds
  evictionPolicy?: 'lru' | 'lfu' | 'fifo' | 'ttl';
  enablePersistence?: boolean; // Persist to localStorage
  enableCompression?: boolean; // Compress large entries
  backgroundCleanup?: boolean; // Automatic cleanup
}

export interface CacheKey {
  scope: string;
  identifier: string;
  version?: string;
  params?: Record<string, any>;
}

/**
 * Advanced caching hook with intelligent memory management and performance optimization
 */
export const useOptimizedCache = <T = any>(
  options: UseOptimizedCacheOptions = {}
): {
  get: (key: CacheKey) => T | null;
  set: (key: CacheKey, data: T, ttl?: number, tags?: string[], priority?: 'low' | 'normal' | 'high') => void;
  has: (key: CacheKey) => boolean;
  delete: (key: CacheKey) => boolean;
  clear: (tag?: string) => void;
  invalidate: (pattern: Partial<CacheKey>) => number;
  getStats: () => CacheStats;
  prefetch: (key: CacheKey, fetcher: () => Promise<T>, ttl?: number) => Promise<void>;
  warmup: (entries: Array<{ key: CacheKey; fetcher: () => Promise<T>; ttl?: number }>) => Promise<void>;
  subscribe: (key: CacheKey, callback: (data: T | null) => void) => () => void;
} => {
  const {
    maxSize = 1000,
    maxMemory = 50 * 1024 * 1024, // 50MB
    defaultTTL = 300000, // 5 minutes
    evictionPolicy = 'lru',
    enablePersistence = false,
    enableCompression = false,
    backgroundCleanup = true
  } = options;

  // Performance monitoring
  const performanceData = usePerformanceMetrics('useOptimizedCache');

  // Cache storage (using Map for better performance than object)
  const cacheRef = useRef<Map<string, CacheEntry<T>>>(new Map());
  const subscriptionsRef = useRef<Map<string, Set<(data: T | null) => void>>>(new Map());
  
  // Statistics tracking
  const statsRef = useRef({
    hits: 0,
    misses: 0,
    sets: 0,
    evictions: 0
  });

  /**
   * Generate cache key string
   */
  const generateKeyString = useCallback((key: CacheKey): string => {
    const keyObj = {
      scope: key.scope,
      identifier: key.identifier,
      version: key.version || 'v1',
      params: key.params || {}
    };
    return btoa(JSON.stringify(keyObj));
  }, []);

  /**
   * Calculate data size (approximate)
   */
  const calculateSize = useCallback((data: T): number => {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch {
      // Fallback for non-serializable data
      return JSON.stringify(data || '').length * 2; // UTF-16 approximation
    }
  }, []);

  /**
   * Compress data if enabled
   */
  const compressData = useCallback((data: T): T => {
    if (!enableCompression) return data;
    
    // Simple compression for demo - in real app use proper compression library
    if (typeof data === 'string' && data.length > 1000) {
      // Placeholder for compression logic
      return data as T;
    }
    
    return data;
  }, [enableCompression]);

  /**
   * Get total cache memory usage
   */
  const getTotalMemory = useCallback((): number => {
    return Array.from(cacheRef.current.values())
      .reduce((total, entry) => total + entry.size, 0);
  }, []);

  /**
   * Evict entries based on policy
   */
  const evictEntries = useCallback((targetSize?: number) => {
    const cache = cacheRef.current;
    const entries = Array.from(cache.entries());
    
    if (entries.length === 0) return;

    const target = targetSize || Math.floor(maxSize * 0.8); // Evict to 80% capacity
    let evicted = 0;

    // Sort entries based on eviction policy
    let sortedEntries: Array<[string, CacheEntry<T>]>;
    
    switch (evictionPolicy) {
      case 'lru':
        sortedEntries = entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
        break;
      case 'lfu':
        sortedEntries = entries.sort((a, b) => a[1].accessCount - b[1].accessCount);
        break;
      case 'fifo':
        sortedEntries = entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
        break;
      case 'ttl':
        const now = Date.now();
        sortedEntries = entries.sort((a, b) => {
          const aExpiry = a[1].timestamp + a[1].ttl;
          const bExpiry = b[1].timestamp + b[1].ttl;
          return aExpiry - bExpiry;
        });
        break;
      default:
        sortedEntries = entries;
    }

    // Evict entries starting with lowest priority
    const priorityOrder = { low: 0, normal: 1, high: 2 };
    sortedEntries.sort((a, b) => priorityOrder[a[1].priority] - priorityOrder[b[1].priority]);

    while (cache.size > target && evicted < entries.length) {
      const [keyStr, entry] = sortedEntries[evicted];
      
      // Notify subscribers
      const subscribers = subscriptionsRef.current.get(keyStr);
      if (subscribers) {
        subscribers.forEach(callback => callback(null));
      }
      
      cache.delete(keyStr);
      evicted++;
      statsRef.current.evictions++;
    }

    if (evicted > 0) {
      telemetry.trackError(
        new Error(`Cache evicted ${evicted} entries (policy: ${evictionPolicy})`),
        { 
          componentName: 'useOptimizedCache',
          metadata: { evicted, policy: evictionPolicy, totalSize: cache.size }
        }
      );
    }
  }, [maxSize, evictionPolicy]);

  /**
   * Clean expired entries
   */
  const cleanExpired = useCallback(() => {
    const cache = cacheRef.current;
    const now = Date.now();
    const expired: string[] = [];

    cache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        expired.push(key);
      }
    });

    expired.forEach(key => {
      cache.delete(key);
      
      // Notify subscribers
      const subscribers = subscriptionsRef.current.get(key);
      if (subscribers) {
        subscribers.forEach(callback => callback(null));
      }
    });

    return expired.length;
  }, []);

  /**
   * Persist cache to localStorage
   */
  const persistCache = useCallback(() => {
    if (!enablePersistence || typeof window === 'undefined') return;

    try {
      const cacheData = Array.from(cacheRef.current.entries());
      const serialized = JSON.stringify(cacheData);
      localStorage.setItem('optimized-cache', serialized);
    } catch (error) {
      console.warn('Failed to persist cache:', error);
    }
  }, [enablePersistence]);

  /**
   * Load cache from localStorage
   */
  const loadPersistedCache = useCallback(() => {
    if (!enablePersistence || typeof window === 'undefined') return;

    try {
      const serialized = localStorage.getItem('optimized-cache');
      if (serialized) {
        const cacheData = JSON.parse(serialized);
        cacheRef.current = new Map(cacheData);
        
        // Clean expired entries after loading
        cleanExpired();
      }
    } catch (error) {
      console.warn('Failed to load persisted cache:', error);
    }
  }, [enablePersistence, cleanExpired]);

  /**
   * Get cached data
   */
  const get = useCallback((key: CacheKey): T | null => {
    const keyStr = generateKeyString(key);
    const entry = cacheRef.current.get(keyStr);

    if (!entry) {
      statsRef.current.misses++;
      return null;
    }

    const now = Date.now();
    
    // Check if expired
    if (now - entry.timestamp > entry.ttl) {
      cacheRef.current.delete(keyStr);
      statsRef.current.misses++;
      
      // Notify subscribers
      const subscribers = subscriptionsRef.current.get(keyStr);
      if (subscribers) {
        subscribers.forEach(callback => callback(null));
      }
      
      return null;
    }

    // Update access statistics
    entry.lastAccessed = now;
    entry.accessCount++;
    statsRef.current.hits++;

    return entry.data;
  }, [generateKeyString]);

  /**
   * Set cached data
   */
  const set = useCallback((
    key: CacheKey,
    data: T,
    ttl: number = defaultTTL,
    tags: string[] = [],
    priority: 'low' | 'normal' | 'high' = 'normal'
  ): void => {
    const keyStr = generateKeyString(key);
    const compressedData = compressData(data);
    const size = calculateSize(compressedData);
    const now = Date.now();

    // Check memory limits
    const currentMemory = getTotalMemory();
    if (currentMemory + size > maxMemory) {
      evictEntries();
    }

    // Check size limits
    if (cacheRef.current.size >= maxSize) {
      evictEntries();
    }

    const entry: CacheEntry<T> = {
      data: compressedData,
      timestamp: now,
      ttl,
      accessCount: 0,
      lastAccessed: now,
      size,
      tags,
      priority
    };

    cacheRef.current.set(keyStr, entry);
    statsRef.current.sets++;

    // Notify subscribers
    const subscribers = subscriptionsRef.current.get(keyStr);
    if (subscribers) {
      subscribers.forEach(callback => callback(compressedData));
    }

    // Persist if enabled
    if (enablePersistence) {
      persistCache();
    }
  }, [
    generateKeyString,
    compressData,
    calculateSize,
    getTotalMemory,
    maxMemory,
    maxSize,
    evictEntries,
    defaultTTL,
    enablePersistence,
    persistCache
  ]);

  /**
   * Check if key exists in cache
   */
  const has = useCallback((key: CacheKey): boolean => {
    const keyStr = generateKeyString(key);
    const entry = cacheRef.current.get(keyStr);
    
    if (!entry) return false;
    
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      cacheRef.current.delete(keyStr);
      return false;
    }
    
    return true;
  }, [generateKeyString]);

  /**
   * Delete specific entry
   */
  const deleteEntry = useCallback((key: CacheKey): boolean => {
    const keyStr = generateKeyString(key);
    const deleted = cacheRef.current.delete(keyStr);
    
    if (deleted) {
      // Notify subscribers
      const subscribers = subscriptionsRef.current.get(keyStr);
      if (subscribers) {
        subscribers.forEach(callback => callback(null));
      }
    }
    
    return deleted;
  }, [generateKeyString]);

  /**
   * Clear cache (optionally by tag)
   */
  const clear = useCallback((tag?: string): void => {
    if (!tag) {
      // Clear all
      cacheRef.current.forEach((_, keyStr) => {
        const subscribers = subscriptionsRef.current.get(keyStr);
        if (subscribers) {
          subscribers.forEach(callback => callback(null));
        }
      });
      cacheRef.current.clear();
    } else {
      // Clear by tag
      const toDelete: string[] = [];
      
      cacheRef.current.forEach((entry, keyStr) => {
        if (entry.tags.includes(tag)) {
          toDelete.push(keyStr);
        }
      });
      
      toDelete.forEach(keyStr => {
        cacheRef.current.delete(keyStr);
        const subscribers = subscriptionsRef.current.get(keyStr);
        if (subscribers) {
          subscribers.forEach(callback => callback(null));
        }
      });
    }
  }, []);

  /**
   * Invalidate entries matching pattern
   */
  const invalidate = useCallback((pattern: Partial<CacheKey>): number => {
    let invalidated = 0;
    const toDelete: string[] = [];

    cacheRef.current.forEach((entry, keyStr) => {
      try {
        const key = JSON.parse(atob(keyStr)) as CacheKey;
        
        const matches = Object.entries(pattern).every(([patternKey, patternValue]) => {
          const keyValue = key[patternKey as keyof CacheKey];
          return keyValue === patternValue;
        });

        if (matches) {
          toDelete.push(keyStr);
          invalidated++;
        }
      } catch {
        // Invalid key format, skip
      }
    });

    toDelete.forEach(keyStr => {
      cacheRef.current.delete(keyStr);
      const subscribers = subscriptionsRef.current.get(keyStr);
      if (subscribers) {
        subscribers.forEach(callback => callback(null));
      }
    });

    return invalidated;
  }, []);

  /**
   * Get cache statistics
   */
  const getStats = useCallback((): CacheStats => {
    const cache = cacheRef.current;
    const stats = statsRef.current;
    const now = Date.now();
    
    const totalRequests = stats.hits + stats.misses;
    const hitRate = totalRequests > 0 ? stats.hits / totalRequests : 0;
    const missRate = totalRequests > 0 ? stats.misses / totalRequests : 0;
    
    const timestamps = Array.from(cache.values()).map(entry => entry.timestamp);
    const oldestEntry = timestamps.length > 0 ? Math.min(...timestamps) : now;
    const newestEntry = timestamps.length > 0 ? Math.max(...timestamps) : now;

    return {
      totalEntries: cache.size,
      totalMemory: getTotalMemory(),
      hitRate,
      missRate,
      evictionCount: stats.evictions,
      oldestEntry,
      newestEntry
    };
  }, [getTotalMemory]);

  /**
   * Prefetch data
   */
  const prefetch = useCallback(async (
    key: CacheKey,
    fetcher: () => Promise<T>,
    ttl: number = defaultTTL
  ): Promise<void> => {
    if (has(key)) return; // Already cached

    try {
      const data = await fetcher();
      set(key, data, ttl);
    } catch (error) {
      console.warn('Prefetch failed for key:', key, error);
    }
  }, [has, set, defaultTTL]);

  /**
   * Warm up cache with multiple entries
   */
  const warmup = useCallback(async (
    entries: Array<{ key: CacheKey; fetcher: () => Promise<T>; ttl?: number }>
  ): Promise<void> => {
    const promises = entries.map(({ key, fetcher, ttl }) => 
      prefetch(key, fetcher, ttl).catch(error => {
        console.warn('Warmup failed for key:', key, error);
      })
    );

    await Promise.allSettled(promises);
  }, [prefetch]);

  /**
   * Subscribe to cache changes
   */
  const subscribe = useCallback((
    key: CacheKey,
    callback: (data: T | null) => void
  ): (() => void) => {
    const keyStr = generateKeyString(key);
    
    if (!subscriptionsRef.current.has(keyStr)) {
      subscriptionsRef.current.set(keyStr, new Set());
    }
    
    const subscribers = subscriptionsRef.current.get(keyStr)!;
    subscribers.add(callback);

    // Return unsubscribe function
    return () => {
      subscribers.delete(callback);
      if (subscribers.size === 0) {
        subscriptionsRef.current.delete(keyStr);
      }
    };
  }, [generateKeyString]);

  // Background cleanup
  useEffect(() => {
    if (!backgroundCleanup) return;

    const interval = setInterval(() => {
      const cleaned = cleanExpired();
      
      // Check memory pressure
      const currentMemory = getTotalMemory();
      if (currentMemory > maxMemory * 0.9) { // 90% threshold
        evictEntries();
      }
      
      // Persist after cleanup
      if (enablePersistence && cleaned > 0) {
        persistCache();
      }
    }, 60000); // Every minute

    return () => clearInterval(interval);
  }, [backgroundCleanup, cleanExpired, getTotalMemory, maxMemory, evictEntries, enablePersistence, persistCache]);

  // Load persisted cache on mount
  useEffect(() => {
    loadPersistedCache();
  }, [loadPersistedCache]);

  // Persist cache on unmount
  useEffect(() => {
    return () => {
      if (enablePersistence) {
        persistCache();
      }
    };
  }, [enablePersistence, persistCache]);

  return {
    get,
    set,
    has,
    delete: deleteEntry,
    clear,
    invalidate,
    getStats,
    prefetch,
    warmup,
    subscribe
  };
};

export default useOptimizedCache;