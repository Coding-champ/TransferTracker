/**
 * Enhanced useApiCache Hook (Phase 4)
 * 
 * Enhanced from existing implementation with:
 * - LRU cache with size limits
 * - TTL-based invalidation  
 * - Selective cache warming
 * - Memory-efficient storage
 * - Cache tags for group invalidation
 * - Performance monitoring
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { CacheEntry, CacheOptions, CacheState } from './types';

/**
 * Enhanced API cache hook with LRU eviction and intelligent invalidation
 * 
 * @param options - Cache configuration options
 * @returns Enhanced cache utilities and state
 */
export function useApiCache<T>(options: CacheOptions = {}) {
  const {
    maxSize = 100,
    defaultTTL = 5 * 60 * 1000, // 5 minutes
    lru = true,
    warming = false,
    selectiveInvalidation = true
  } = options;

  // Cache storage with LRU tracking
  const cacheRef = useRef<Map<string, CacheEntry<T>>>(new Map());
  const accessOrderRef = useRef<string[]>([]);
  
  // Cache statistics
  const [cacheState, setCacheState] = useState<CacheState>({
    size: 0,
    hitRate: 0,
    memoryUsage: 0,
    status: 'healthy'
  });

  // Performance tracking
  const statsRef = useRef({
    hits: 0,
    misses: 0,
    sets: 0,
    evictions: 0,
    totalAccess: 0
  });

  // Update cache statistics
  const updateStats = useCallback(() => {
    const cache = cacheRef.current;
    const stats = statsRef.current;
    
    const hitRate = stats.totalAccess > 0 ? (stats.hits / stats.totalAccess) * 100 : 0;
    
    // Rough memory usage calculation (JSON string length)
    let memoryUsage = 0;
    cache.forEach(entry => {
      memoryUsage += JSON.stringify(entry.data).length * 2; // Rough bytes estimation
    });

    const status: CacheState['status'] = 
      cache.size >= maxSize * 0.9 ? 'full' : 'healthy';

    setCacheState({
      size: cache.size,
      hitRate,
      memoryUsage,
      status
    });
  }, [maxSize]);

  // LRU eviction
  const evictLRU = useCallback(() => {
    const cache = cacheRef.current;
    const accessOrder = accessOrderRef.current;

    if (cache.size >= maxSize && accessOrder.length > 0) {
      const lruKey = accessOrder.shift()!;
      cache.delete(lruKey);
      statsRef.current.evictions++;
      updateStats();
    }
  }, [maxSize, updateStats]);

  // Update access order for LRU
  const updateAccessOrder = useCallback((key: string) => {
    if (!lru) return;

    const accessOrder = accessOrderRef.current;
    const existingIndex = accessOrder.indexOf(key);
    
    if (existingIndex > -1) {
      accessOrder.splice(existingIndex, 1);
    }
    
    accessOrder.push(key);
  }, [lru]);

  // Get item from cache
  const get = useCallback((key: string): T | null => {
    const cache = cacheRef.current;
    const stats = statsRef.current;
    
    stats.totalAccess++;
    
    const entry = cache.get(key);
    
    if (!entry) {
      stats.misses++;
      updateStats();
      return null;
    }
    
    // Check if entry has expired
    const now = Date.now();
    const isExpired = (now - entry.timestamp) > entry.ttl;
    
    if (isExpired) {
      cache.delete(key);
      const accessOrder = accessOrderRef.current;
      const index = accessOrder.indexOf(key);
      if (index > -1) {
        accessOrder.splice(index, 1);
      }
      
      stats.misses++;
      updateStats();
      return null;
    }
    
    // Update access tracking
    entry.accessCount++;
    entry.lastAccess = now;
    updateAccessOrder(key);
    
    stats.hits++;
    updateStats();
    return entry.data;
  }, [updateStats, updateAccessOrder]);

  // Set item in cache
  const set = useCallback((
    key: string, 
    data: T, 
    ttl: number = defaultTTL,
    tags: string[] = []
  ) => {
    const cache = cacheRef.current;
    const stats = statsRef.current;

    // Evict if necessary
    if (cache.size >= maxSize) {
      evictLRU();
    }

    const now = Date.now();
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      ttl,
      tags,
      accessCount: 1,
      lastAccess: now
    };

    cache.set(key, entry);
    updateAccessOrder(key);
    
    stats.sets++;
    updateStats();
  }, [defaultTTL, maxSize, evictLRU, updateAccessOrder, updateStats]);

  // Remove item from cache
  const remove = useCallback((key: string): boolean => {
    const cache = cacheRef.current;
    const accessOrder = accessOrderRef.current;
    
    const deleted = cache.delete(key);
    
    if (deleted) {
      const index = accessOrder.indexOf(key);
      if (index > -1) {
        accessOrder.splice(index, 1);
      }
      updateStats();
    }
    
    return deleted;
  }, [updateStats]);

  // Check if entry is stale (expired but still in cache)
  const isStale = useCallback((key: string): boolean => {
    const cache = cacheRef.current;
    const entry = cache.get(key);
    
    if (!entry) return false;
    
    const now = Date.now();
    return (now - entry.timestamp) > entry.ttl;
  }, []);

  // Check if key exists in cache (regardless of expiration)
  const has = useCallback((key: string): boolean => {
    return cacheRef.current.has(key);
  }, []);

  // Invalidate by tags
  const invalidateByTags = useCallback((tags: string[]) => {
    if (!selectiveInvalidation) return 0;

    const cache = cacheRef.current;
    const accessOrder = accessOrderRef.current;
    let invalidated = 0;
    
    const keysToDelete: string[] = [];
    
    cache.forEach((entry, key) => {
      const hasMatchingTag = tags.some(tag => entry.tags?.includes(tag));
      if (hasMatchingTag) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => {
      cache.delete(key);
      const index = accessOrder.indexOf(key);
      if (index > -1) {
        accessOrder.splice(index, 1);
      }
      invalidated++;
    });
    
    if (invalidated > 0) {
      updateStats();
    }
    
    return invalidated;
  }, [selectiveInvalidation, updateStats]);

  // Clear all cache entries
  const clear = useCallback(() => {
    cacheRef.current.clear();
    accessOrderRef.current.length = 0;
    
    // Reset stats
    statsRef.current = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0,
      totalAccess: 0
    };
    
    updateStats();
  }, [updateStats]);

  // Cleanup expired entries
  const cleanup = useCallback(() => {
    const cache = cacheRef.current;
    const accessOrder = accessOrderRef.current;
    const now = Date.now();
    let cleaned = 0;
    
    const keysToDelete: string[] = [];
    
    cache.forEach((entry, key) => {
      if ((now - entry.timestamp) > entry.ttl) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => {
      cache.delete(key);
      const index = accessOrder.indexOf(key);
      if (index > -1) {
        accessOrder.splice(index, 1);
      }
      cleaned++;
    });
    
    if (cleaned > 0) {
      updateStats();
    }
    
    return cleaned;
  }, [updateStats]);

  // Warm cache with provided data
  const warm = useCallback((entries: Array<{ key: string; data: T; ttl?: number; tags?: string[] }>) => {
    if (!warming) return;
    
    entries.forEach(({ key, data, ttl = defaultTTL, tags = [] }) => {
      set(key, data, ttl, tags);
    });
  }, [warming, defaultTTL, set]);

  // Get cache statistics
  const getStats = useCallback(() => ({
    ...cacheState,
    detailed: {
      ...statsRef.current,
      cacheEfficiency: statsRef.current.totalAccess > 0 ? 
        (statsRef.current.hits / statsRef.current.totalAccess) * 100 : 0,
      averageAccessCount: cacheRef.current.size > 0 ? 
        Array.from(cacheRef.current.values()).reduce((sum, entry) => sum + entry.accessCount, 0) / cacheRef.current.size : 0
    }
  }), [cacheState]);

  // Periodic cleanup
  useEffect(() => {
    const interval = setInterval(() => {
      cleanup();
    }, 60000); // Cleanup every minute

    return () => clearInterval(interval);
  }, [cleanup]);

  // Initial stats update
  useEffect(() => {
    updateStats();
  }, [updateStats]);

  return {
    get,
    set,
    remove,
    has,
    isStale,
    invalidateByTags,
    clear,
    cleanup,
    warm,
    getStats,
    state: cacheState
  };
}

export default useApiCache;