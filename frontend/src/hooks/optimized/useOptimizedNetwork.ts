/**
 * useOptimizedNetwork - Enhanced network data fetching with performance optimizations
 * Provides intelligent caching, request deduplication, and memory management
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useShallowMemo } from '../performance/useShallowMemo';
import { useMemoizedCallback } from '../performance/useMemoizedCallback';
import { usePerformanceMetrics } from '../performance/usePerformanceMetrics';
import { telemetry } from '../../utils/telemetry/index';

// Import types (assuming they exist)
interface NetworkData {
  nodes: any[];
  edges: any[];
  filters?: any;
}

interface NetworkRequest {
  endpoint: string;
  params?: Record<string, any>;
  priority?: 'low' | 'normal' | 'high';
}

interface CacheEntry {
  data: NetworkData;
  timestamp: number;
  ttl: number;
  key: string;
  size: number;
}

interface UseOptimizedNetworkOptions {
  cacheTimeout?: number; // milliseconds
  maxCacheSize?: number; // entries
  retryAttempts?: number;
  priority?: 'low' | 'normal' | 'high';
  backgroundRefresh?: boolean;
  prefetchRelated?: boolean;
}

/**
 * Optimized network hook with intelligent caching and performance monitoring
 */
export const useOptimizedNetwork = (
  request: NetworkRequest,
  options: UseOptimizedNetworkOptions = {}
): {
  data: NetworkData | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  prefetch: (newRequest: NetworkRequest) => Promise<void>;
  getCacheStats: () => { size: number; hitRate: number; memoryUsage: number };
} => {
  const {
    cacheTimeout = 300000, // 5 minutes
    maxCacheSize = 100,
    retryAttempts = 3,
    priority = 'normal',
    backgroundRefresh = true,
    prefetchRelated = true
  } = options;

  // State management
  const [data, setData] = useState<NetworkData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Performance monitoring
  const performanceData = usePerformanceMetrics('useOptimizedNetwork');

  // Cache management (static to persist across hook instances)
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());
  const requestQueueRef = useRef<Map<string, Promise<NetworkData>>>(new Map());
  const statsRef = useRef({ hits: 0, misses: 0, requests: 0 });

  // Generate cache key
  const generateCacheKey = useCallback((req: NetworkRequest): string => {
    const keyObj = {
      endpoint: req.endpoint,
      params: req.params || {},
      priority: req.priority
    };
    return btoa(JSON.stringify(keyObj));
  }, []);

  // Stable request object to prevent unnecessary re-renders
  const stableRequest = useShallowMemo(() => request, [request]);

  // Cache key for current request
  const cacheKey = useMemo(() => generateCacheKey(stableRequest), [generateCacheKey, stableRequest]);

  /**
   * Clean expired cache entries
   */
  const cleanExpiredCache = useCallback(() => {
    const now = Date.now();
    const cache = cacheRef.current;
    const expiredKeys: string[] = [];

    cache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach(key => cache.delete(key));

    // Limit cache size
    if (cache.size > maxCacheSize) {
      const sortedEntries = Array.from(cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toRemove = sortedEntries.slice(0, cache.size - maxCacheSize);
      toRemove.forEach(([key]) => cache.delete(key));
    }
  }, [maxCacheSize]);

  /**
   * Get data from cache
   */
  const getCachedData = useCallback((key: string): NetworkData | null => {
    const entry = cacheRef.current.get(key);
    if (!entry) {
      statsRef.current.misses++;
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      cacheRef.current.delete(key);
      statsRef.current.misses++;
      return null;
    }

    statsRef.current.hits++;
    return entry.data;
  }, []);

  /**
   * Set data in cache
   */
  const setCachedData = useCallback((key: string, networkData: NetworkData) => {
    const entry: CacheEntry = {
      data: networkData,
      timestamp: Date.now(),
      ttl: cacheTimeout,
      key,
      size: JSON.stringify(networkData).length
    };

    cacheRef.current.set(key, entry);
    cleanExpiredCache();
  }, [cacheTimeout, cleanExpiredCache]);

  /**
   * Mock network request (replace with actual API call)
   */
  const performNetworkRequest = useCallback(async (req: NetworkRequest): Promise<NetworkData> => {
    const startTime = performance.now();

    try {
      // Simulate network delay based on priority
      const delay = priority === 'high' ? 100 : priority === 'normal' ? 300 : 500;
      await new Promise(resolve => setTimeout(resolve, delay));

      // Mock data generation (replace with actual API call)
      const mockData: NetworkData = {
        nodes: Array.from({ length: 50 }, (_, i) => ({
          id: `node-${i}`,
          name: `Node ${i}`,
          value: Math.random() * 100
        })),
        edges: Array.from({ length: 100 }, (_, i) => ({
          id: `edge-${i}`,
          source: `node-${Math.floor(Math.random() * 50)}`,
          target: `node-${Math.floor(Math.random() * 50)}`,
          weight: Math.random()
        })),
        filters: req.params
      };

      // Track network performance
      const endTime = performance.now();
      telemetry.trackNetworkRequest(
        req.endpoint,
        'GET',
        startTime,
        true,
        200
      );

      return mockData;
    } catch (err) {
      const endTime = performance.now();
      const error = err as Error;
      
      telemetry.trackNetworkRequest(
        req.endpoint,
        'GET',
        startTime,
        false,
        500,
        error
      );

      throw error;
    }
  }, [priority]);

  /**
   * Fetch data with retry logic
   */
  const fetchWithRetry = useCallback(async (req: NetworkRequest, attempt = 1): Promise<NetworkData> => {
    try {
      return await performNetworkRequest(req);
    } catch (err) {
      if (attempt < retryAttempts) {
        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchWithRetry(req, attempt + 1);
      }
      throw err;
    }
  }, [performNetworkRequest, retryAttempts]);

  /**
   * Main fetch function with deduplication
   */
  const fetchData = useMemoizedCallback(async (req: NetworkRequest): Promise<NetworkData> => {
    const key = generateCacheKey(req);
    
    // Check cache first
    const cachedData = getCachedData(key);
    if (cachedData) {
      return cachedData;
    }

    // Check if request is already in progress
    const existingRequest = requestQueueRef.current.get(key);
    if (existingRequest) {
      return existingRequest;
    }

    // Start new request
    const requestPromise = fetchWithRetry(req);
    requestQueueRef.current.set(key, requestPromise);

    try {
      const networkData = await requestPromise;
      setCachedData(key, networkData);
      return networkData;
    } finally {
      requestQueueRef.current.delete(key);
    }
  }, [generateCacheKey, getCachedData, fetchWithRetry, setCachedData]);

  /**
   * Refetch current data
   */
  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Clear cache for this request
      cacheRef.current.delete(cacheKey);
      
      const networkData = await fetchData(stableRequest);
      setData(networkData);
    } catch (err) {
      const error = err as Error;
      setError(error);
      telemetry.trackError(error, { 
        componentName: 'useOptimizedNetwork',
        action: 'refetch' 
      });
    } finally {
      setLoading(false);
    }
  }, [cacheKey, fetchData, stableRequest]);

  /**
   * Prefetch data for related requests
   */
  const prefetch = useCallback(async (newRequest: NetworkRequest) => {
    if (!prefetchRelated) return;

    try {
      await fetchData(newRequest);
    } catch (err) {
      // Silently fail prefetch attempts
      console.warn('Prefetch failed:', err);
    }
  }, [fetchData, prefetchRelated]);

  /**
   * Get cache statistics
   */
  const getCacheStats = useCallback(() => {
    const cache = cacheRef.current;
    const stats = statsRef.current;
    
    const totalMemory = Array.from(cache.values())
      .reduce((sum, entry) => sum + entry.size, 0);
    
    const hitRate = stats.requests > 0 ? stats.hits / stats.requests : 0;

    return {
      size: cache.size,
      hitRate,
      memoryUsage: totalMemory
    };
  }, []);

  // Initial data fetch
  useEffect(() => {
    let isCancelled = false;

    const loadData = async () => {
      statsRef.current.requests++;
      
      // Check cache first
      const cachedData = getCachedData(cacheKey);
      if (cachedData) {
        setData(cachedData);
        
        // Background refresh for stale data
        if (backgroundRefresh) {
          fetchData(stableRequest).then((freshData: any) => {
            if (!isCancelled && JSON.stringify(freshData) !== JSON.stringify(cachedData)) {
              setData(freshData);
            }
          }).catch(() => {
            // Silently fail background refresh
          });
        }
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const networkData = await fetchData(stableRequest);
        if (!isCancelled) {
          setData(networkData);
        }
      } catch (err) {
        if (!isCancelled) {
          const error = err as Error;
          setError(error);
          telemetry.trackError(error, { 
            componentName: 'useOptimizedNetwork',
            action: 'initial-fetch' 
          });
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [cacheKey, getCachedData, fetchData, stableRequest, backgroundRefresh]);

  // Cleanup expired cache periodically
  useEffect(() => {
    const interval = setInterval(cleanExpiredCache, 60000); // Every minute
    return () => clearInterval(interval);
  }, [cleanExpiredCache]);

  return {
    data,
    loading,
    error,
    refetch,
    prefetch,
    getCacheStats
  };
};

export default useOptimizedNetwork;