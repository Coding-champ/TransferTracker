import { useCallback, useEffect, useRef, useState } from 'react';
import { CacheConfig, CacheEntry } from './types';

/**
 * Advanced cache manager hook with TTL, LRU eviction, and memory management
 * 
 * Features:
 * - Multiple eviction policies (LRU, LFU, FIFO)
 * - TTL (Time To Live) support
 * - Memory usage monitoring
 * - Tag-based invalidation
 * - Background refresh capabilities
 * - Cache hit/miss statistics
 * - Persistence to localStorage/sessionStorage
 * 
 * @param config - Cache configuration
 * @returns Cache manager interface
 * 
 * @example
 * ```typescript
 * const cache = useCacheManager({
 *   maxSize: 100,
 *   ttl: 5 * 60 * 1000, // 5 minutes
 *   evictionPolicy: 'lru',
 *   persistence: true
 * });
 * 
 * const transferData = await cache.get('transfers-2024', async () => {
 *   return fetchTransfers(2024);
 * }, { tags: ['transfers', '2024'] });
 * ```
 */
export function useCacheManager(config: CacheConfig = {}) {
  const {
    maxSize = 100,
    ttl = 5 * 60 * 1000, // 5 minutes default
    evictionPolicy = 'lru',
    persistence = false,
    tags = []
  } = config;

  // Cache storage
  const cacheRef = useRef<Map<string, CacheEntry<any>>>(new Map());
  
  // Statistics
  const [stats, setStats] = useState({
    hits: 0,
    misses: 0,
    size: 0,
    memoryUsage: 0
  });

  // Background refresh registry
  const refreshRegistryRef = useRef<Map<string, {
    refreshFn: () => Promise<any>;
    interval: number;
    timer?: NodeJS.Timeout;
  }>>(new Map());

  // Cleanup timer for expired entries
  const cleanupTimerRef = useRef<NodeJS.Timeout>();

  // Initialize cache from persistence
  useEffect(() => {
    if (persistence && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('cache-manager');
        if (stored) {
          const parsed = JSON.parse(stored);
          Object.entries(parsed).forEach(([key, entry]: [string, any]) => {
            // Only restore non-expired entries
            if (entry.timestamp + entry.ttl > Date.now()) {
              cacheRef.current.set(key, entry);
            }
          });
          updateStats();
        }
      } catch (error) {
        console.warn('Failed to load cache from storage:', error);
      }
    }
  }, [persistence]);

  // Persist cache to storage
  const persistCache = useCallback(() => {
    if (persistence && typeof window !== 'undefined') {
      try {
        const cacheObject = Object.fromEntries(cacheRef.current);
        localStorage.setItem('cache-manager', JSON.stringify(cacheObject));
      } catch (error) {
        console.warn('Failed to persist cache:', error);
      }
    }
  }, [persistence]);

  // Update statistics
  const updateStats = useCallback(() => {
    const cache = cacheRef.current;
    const memoryUsage = JSON.stringify(Object.fromEntries(cache)).length;
    
    setStats(prev => ({
      ...prev,
      size: cache.size,
      memoryUsage
    }));
  }, []);

  // Calculate memory usage of an entry
  const getEntrySize = useCallback((entry: CacheEntry<any>) => {
    return JSON.stringify(entry).length;
  }, []);

  // Check if entry is expired
  const isExpired = useCallback((entry: CacheEntry<any>) => {
    return Date.now() > entry.timestamp + entry.ttl;
  }, []);

  // Remove expired entries
  const cleanupExpired = useCallback(() => {
    const cache = cacheRef.current;
    const expiredKeys: string[] = [];

    cache.forEach((entry, key) => {
      if (isExpired(entry)) {
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach(key => {
      cache.delete(key);
      // Cancel background refresh if exists
      const refresh = refreshRegistryRef.current.get(key);
      if (refresh?.timer) {
        clearInterval(refresh.timer);
        refreshRegistryRef.current.delete(key);
      }
    });

    if (expiredKeys.length > 0) {
      updateStats();
      persistCache();
    }

    return expiredKeys.length;
  }, [isExpired, updateStats, persistCache]);

  // Evict entries based on policy
  const evictEntries = useCallback((count: number = 1) => {
    const cache = cacheRef.current;
    const entries = Array.from(cache.entries());

    let toEvict: string[] = [];

    switch (evictionPolicy) {
      case 'lru':
        // Sort by last access time (timestamp + hits as approximation)
        entries.sort(([, a], [, b]) => a.timestamp - b.timestamp);
        toEvict = entries.slice(0, count).map(([key]) => key);
        break;

      case 'lfu':
        // Sort by hit count
        entries.sort(([, a], [, b]) => a.hits - b.hits);
        toEvict = entries.slice(0, count).map(([key]) => key);
        break;

      case 'fifo':
        // Sort by creation time
        entries.sort(([, a], [, b]) => a.timestamp - b.timestamp);
        toEvict = entries.slice(0, count).map(([key]) => key);
        break;

      default:
        // Random eviction as fallback
        toEvict = entries.slice(0, count).map(([key]) => key);
    }

    toEvict.forEach(key => {
      cache.delete(key);
      // Cancel background refresh if exists
      const refresh = refreshRegistryRef.current.get(key);
      if (refresh?.timer) {
        clearInterval(refresh.timer);
        refreshRegistryRef.current.delete(key);
      }
    });

    updateStats();
    persistCache();
    return toEvict;
  }, [evictionPolicy, updateStats, persistCache]);

  // Get value from cache or fetch if not exists
  const get = useCallback(async <T>(
    key: string,
    fetchFn?: () => Promise<T>,
    options: {
      ttl?: number;
      tags?: string[];
      backgroundRefresh?: boolean;
      refreshInterval?: number;
    } = {}
  ): Promise<T | null> => {
    const cache = cacheRef.current;
    const entry = cache.get(key);

    // Check if entry exists and is not expired
    if (entry && !isExpired(entry)) {
      // Update hit count and last access
      entry.hits++;
      entry.timestamp = Date.now();
      
      setStats(prev => ({ ...prev, hits: prev.hits + 1 }));
      return entry.data;
    }

    // Cache miss - fetch new data if fetchFn provided
    if (fetchFn) {
      try {
        const data = await fetchFn();
        await set(key, data, {
          ttl: options.ttl,
          tags: options.tags,
          backgroundRefresh: options.backgroundRefresh,
          refreshInterval: options.refreshInterval,
          refreshFn: fetchFn
        });
        
        setStats(prev => ({ ...prev, misses: prev.misses + 1 }));
        return data;
      } catch (error) {
        setStats(prev => ({ ...prev, misses: prev.misses + 1 }));
        throw error;
      }
    }

    setStats(prev => ({ ...prev, misses: prev.misses + 1 }));
    return null;
  }, [isExpired]);

  // Set value in cache
  const set = useCallback(async <T>(
    key: string,
    value: T,
    options: {
      ttl?: number;
      tags?: string[];
      backgroundRefresh?: boolean;
      refreshInterval?: number;
      refreshFn?: () => Promise<T>;
    } = {}
  ) => {
    const cache = cacheRef.current;
    const entryTtl = options.ttl || ttl;
    const entryTags = [...tags, ...(options.tags || [])];

    // Create cache entry
    const entry: CacheEntry<T> = {
      data: value,
      timestamp: Date.now(),
      ttl: entryTtl,
      hits: 0,
      tags: entryTags
    };

    // Check if we need to evict before adding
    if (cache.size >= maxSize) {
      evictEntries(1);
    }

    cache.set(key, entry);

    // Setup background refresh if requested
    if (options.backgroundRefresh && options.refreshFn && options.refreshInterval) {
      const refresh = refreshRegistryRef.current.get(key);
      if (refresh?.timer) {
        clearInterval(refresh.timer);
      }

      const timer = setInterval(async () => {
        try {
          const newData = await options.refreshFn!();
          await set(key, newData, { ...options, backgroundRefresh: false }); // Prevent recursive refresh setup
        } catch (error) {
          console.warn(`Background refresh failed for key ${key}:`, error);
        }
      }, options.refreshInterval);

      refreshRegistryRef.current.set(key, {
        refreshFn: options.refreshFn,
        interval: options.refreshInterval,
        timer
      });
    }

    updateStats();
    persistCache();
  }, [ttl, tags, maxSize, evictEntries, updateStats, persistCache]);

  // Remove specific key
  const remove = useCallback((key: string) => {
    const cache = cacheRef.current;
    const deleted = cache.delete(key);

    // Cancel background refresh if exists
    const refresh = refreshRegistryRef.current.get(key);
    if (refresh?.timer) {
      clearInterval(refresh.timer);
      refreshRegistryRef.current.delete(key);
    }

    if (deleted) {
      updateStats();
      persistCache();
    }

    return deleted;
  }, [updateStats, persistCache]);

  // Clear cache by tags
  const invalidateByTags = useCallback((tagsToInvalidate: string[]) => {
    const cache = cacheRef.current;
    const keysToRemove: string[] = [];

    cache.forEach((entry, key) => {
      if (entry.tags.some(tag => tagsToInvalidate.includes(tag))) {
        keysToRemove.push(key);
      }
    });

    keysToRemove.forEach(remove);
    return keysToRemove;
  }, [remove]);

  // Clear all cache
  const clear = useCallback(() => {
    // Cancel all background refreshes
    refreshRegistryRef.current.forEach(refresh => {
      if (refresh.timer) {
        clearInterval(refresh.timer);
      }
    });
    refreshRegistryRef.current.clear();

    cacheRef.current.clear();
    setStats({ hits: 0, misses: 0, size: 0, memoryUsage: 0 });
    
    if (persistence && typeof window !== 'undefined') {
      localStorage.removeItem('cache-manager');
    }
  }, [persistence]);

  // Get cache hit ratio
  const getHitRatio = useCallback(() => {
    const total = stats.hits + stats.misses;
    return total > 0 ? stats.hits / total : 0;
  }, [stats]);

  // Get all keys
  const keys = useCallback(() => {
    return Array.from(cacheRef.current.keys());
  }, []);

  // Check if key exists and is not expired
  const has = useCallback((key: string) => {
    const entry = cacheRef.current.get(key);
    return entry ? !isExpired(entry) : false;
  }, [isExpired]);

  // Setup periodic cleanup
  useEffect(() => {
    cleanupTimerRef.current = setInterval(() => {
      cleanupExpired();
    }, 60000); // Cleanup every minute

    return () => {
      if (cleanupTimerRef.current) {
        clearInterval(cleanupTimerRef.current);
      }
    };
  }, [cleanupExpired]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cancel all background refreshes
      refreshRegistryRef.current.forEach(refresh => {
        if (refresh.timer) {
          clearInterval(refresh.timer);
        }
      });
      
      if (cleanupTimerRef.current) {
        clearInterval(cleanupTimerRef.current);
      }
    };
  }, []);

  return {
    get,
    set,
    remove,
    clear,
    has,
    keys,
    invalidateByTags,
    cleanupExpired,
    evictEntries,
    stats,
    getHitRatio,
    size: stats.size,
    memoryUsage: stats.memoryUsage
  };
}