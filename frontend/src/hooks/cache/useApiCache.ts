/**
 * useApiCache - Generic cache hook for API responses
 * Provides intelligent caching with TTL and invalidation strategies
 */

import { useState, useEffect, useCallback, useRef } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  key: string;
  metadata?: Record<string, any>;
}

interface CacheConfig {
  defaultTTL?: number;
  maxEntries?: number;
  enableLocalStorage?: boolean;
  localStoragePrefix?: string;
}

const defaultConfig: Required<CacheConfig> = {
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  maxEntries: 100,
  enableLocalStorage: false,
  localStoragePrefix: 'api_cache_'
};

/**
 * Generic API cache hook with intelligent caching strategies
 */
export const useApiCache = <T>(config: CacheConfig = {}) => {
  const finalConfig = { ...defaultConfig, ...config };
  const cache = useRef<Map<string, CacheEntry<T>>>(new Map());
  const [cacheSize, setCacheSize] = useState(0);

  // Load from localStorage on mount if enabled
  useEffect(() => {
    if (finalConfig.enableLocalStorage) {
      try {
        const keys = Object.keys(localStorage).filter(key => 
          key.startsWith(finalConfig.localStoragePrefix)
        );
        
        keys.forEach(key => {
          const stored = localStorage.getItem(key);
          if (stored) {
            const entry: CacheEntry<T> = JSON.parse(stored);
            const cacheKey = key.replace(finalConfig.localStoragePrefix, '');
            
            // Check if entry is still valid
            if (Date.now() - entry.timestamp < entry.ttl) {
              cache.current.set(cacheKey, entry);
            } else {
              localStorage.removeItem(key);
            }
          }
        });
        
        setCacheSize(cache.current.size);
      } catch (error) {
        console.warn('Error loading cache from localStorage:', error);
      }
    }
  }, [finalConfig.enableLocalStorage, finalConfig.localStoragePrefix]);

  /**
   * Get item from cache
   */
  const get = useCallback((key: string): T | null => {
    const entry = cache.current.get(key);
    
    if (!entry) {
      return null;
    }
    
    // Check if entry has expired
    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      cache.current.delete(key);
      setCacheSize(cache.current.size);
      
      // Remove from localStorage if enabled
      if (finalConfig.enableLocalStorage) {
        localStorage.removeItem(finalConfig.localStoragePrefix + key);
      }
      
      return null;
    }
    
    return entry.data;
  }, [finalConfig.enableLocalStorage, finalConfig.localStoragePrefix]);

  /**
   * Set item in cache
   */
  const set = useCallback((
    key: string, 
    data: T, 
    options: { 
      ttl?: number; 
      metadata?: Record<string, any> 
    } = {}
  ) => {
    const ttl = options.ttl || finalConfig.defaultTTL;
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      key,
      metadata: options.metadata
    };
    
    // Enforce max entries limit (LRU eviction)
    if (cache.current.size >= finalConfig.maxEntries) {
      const firstKey = cache.current.keys().next().value;
      if (firstKey) {
        cache.current.delete(firstKey);
        if (finalConfig.enableLocalStorage) {
          localStorage.removeItem(finalConfig.localStoragePrefix + firstKey);
        }
      }
    }
    
    cache.current.set(key, entry);
    setCacheSize(cache.current.size);
    
    // Store in localStorage if enabled
    if (finalConfig.enableLocalStorage) {
      try {
        localStorage.setItem(
          finalConfig.localStoragePrefix + key,
          JSON.stringify(entry)
        );
      } catch (error) {
        console.warn('Error storing cache in localStorage:', error);
      }
    }
  }, [finalConfig.defaultTTL, finalConfig.maxEntries, finalConfig.enableLocalStorage, finalConfig.localStoragePrefix]);

  /**
   * Remove item from cache
   */
  const remove = useCallback((key: string) => {
    const deleted = cache.current.delete(key);
    if (deleted) {
      setCacheSize(cache.current.size);
      
      if (finalConfig.enableLocalStorage) {
        localStorage.removeItem(finalConfig.localStoragePrefix + key);
      }
    }
    return deleted;
  }, [finalConfig.enableLocalStorage, finalConfig.localStoragePrefix]);

  /**
   * Clear all cache entries
   */
  const clear = useCallback(() => {
    cache.current.clear();
    setCacheSize(0);
    
    if (finalConfig.enableLocalStorage) {
      const keys = Object.keys(localStorage).filter(key => 
        key.startsWith(finalConfig.localStoragePrefix)
      );
      keys.forEach(key => localStorage.removeItem(key));
    }
  }, [finalConfig.enableLocalStorage, finalConfig.localStoragePrefix]);

  /**
   * Get cache statistics
   */
  const getStats = useCallback(() => {
    const entries = Array.from(cache.current.values());
    const now = Date.now();
    
    return {
      totalEntries: entries.length,
      validEntries: entries.filter(entry => now - entry.timestamp < entry.ttl).length,
      expiredEntries: entries.filter(entry => now - entry.timestamp >= entry.ttl).length,
      oldestEntry: entries.reduce((oldest, entry) => 
        !oldest || entry.timestamp < oldest.timestamp ? entry : oldest, 
        null as CacheEntry<T> | null
      ),
      newestEntry: entries.reduce((newest, entry) => 
        !newest || entry.timestamp > newest.timestamp ? entry : newest, 
        null as CacheEntry<T> | null
      )
    };
  }, []);

  /**
   * Clean up expired entries
   */
  const cleanup = useCallback(() => {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    cache.current.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => {
      cache.current.delete(key);
      if (finalConfig.enableLocalStorage) {
        localStorage.removeItem(finalConfig.localStoragePrefix + key);
      }
    });
    
    if (keysToDelete.length > 0) {
      setCacheSize(cache.current.size);
    }
    
    return keysToDelete.length;
  }, [finalConfig.enableLocalStorage, finalConfig.localStoragePrefix]);

  /**
   * Check if key exists and is valid
   */
  const has = useCallback((key: string): boolean => {
    return get(key) !== null;
  }, [get]);

  return {
    get,
    set,
    remove,
    clear,
    has,
    cleanup,
    getStats,
    size: cacheSize
  };
};