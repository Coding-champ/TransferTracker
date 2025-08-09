/**
 * Enhanced useApiQuery Hook
 * 
 * This is an enhanced version of the existing useNetworkData hook with:
 * - Intelligent request deduplication
 * - Background refetch strategies
 * - Stale-while-revalidate pattern
 * - Smart dependency tracking (prevent cascade re-renders)
 * - CPU optimization: only re-render when actual data changes
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useApiCache } from './useApiCache';
import { useRequestDeduplication } from './useRequestDeduplication';
import { useErrorRecovery } from './useErrorRecovery';
import { useNetworkStatus } from './useNetworkStatus';
import { ApiQueryOptions, ApiQueryResult, RequestConfig } from './types';
import { useToast } from '../../contexts/ToastContext';

/**
 * Enhanced API query hook with intelligent caching and optimization
 * 
 * @param queryFn - Function that returns the API request configuration or promise
 * @param deps - Dependencies that trigger refetch when changed
 * @param options - Query options for caching, retry, etc.
 * @returns Enhanced query state with optimized re-rendering
 */
export function useApiQuery<T>(
  queryFn: () => Promise<T> | RequestConfig,
  deps: any[] = [],
  options: ApiQueryOptions = {}
): ApiQueryResult<T> {
  const {
    cache = true,
    cacheTTL = 5 * 60 * 1000, // 5 minutes
    deduplicate = true,
    staleWhileRevalidate = true,
    refetchInterval,
    refetchOnWindowFocus = true,
    retry = true,
    retryDelay = 1000,
    offline = true,
    cacheKey: customCacheKey,
    abortController: externalAbortController
  } = options;

  // Core state management
  const [state, setState] = useState<{
    data: T | null;
    loading: boolean;
    error: string | null;
    isStale: boolean;
    isRefetching: boolean;
    lastFetched: number | null;
    status: 'idle' | 'loading' | 'success' | 'error';
  }>({
    data: null,
    loading: false,
    error: null,
    isStale: false,
    isRefetching: false,
    lastFetched: null,
    status: 'idle'
  });

  // Hook dependencies
  const { showToast } = useToast();
  const cache_hook = useApiCache<T>({ 
    maxSize: 100, 
    defaultTTL: cacheTTL,
    lru: true 
  });
  const deduplication = useRequestDeduplication({ strategy: 'key-based' });
  const errorRecovery = useErrorRecovery({
    autoRetry: typeof retry === 'boolean' ? retry : true,
    maxRetries: typeof retry === 'number' ? retry : 3,
    retryStrategy: 'exponential'
  });
  const networkStatus = useNetworkStatus({ adaptiveLoading: true });

  // Refs for cleanup and abort control
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const refetchIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Generate cache key
  const cacheKey = useMemo(() => {
    if (customCacheKey) {
      return typeof customCacheKey === 'function' ? customCacheKey() : customCacheKey;
    }
    return `api-query-${JSON.stringify(deps)}`;
  }, [customCacheKey, deps]);

  // Optimized state updater to prevent unnecessary re-renders
  const updateState = useCallback((updater: Partial<typeof state>) => {
    setState(prevState => {
      const newState = { ...prevState, ...updater };
      
      // Only update if there are actual changes
      const hasChanges = Object.keys(updater).some(
        key => prevState[key as keyof typeof state] !== newState[key as keyof typeof state]
      );
      
      return hasChanges ? newState : prevState;
    });
  }, []);

  // Execute the query with all optimizations
  const executeQuery = useCallback(async (isRefetch = false): Promise<T | null> => {
    // Check cache first (if not explicitly refetching)
    if (cache && !isRefetch) {
      const cachedData = cache_hook.get(cacheKey);
      if (cachedData && !cache_hook.isStale(cacheKey)) {
        updateState({
          data: cachedData,
          loading: false,
          error: null,
          status: 'success',
          lastFetched: Date.now(),
          isStale: false
        });
        return cachedData;
      }
      
      // Set stale data if available and using stale-while-revalidate
      if (cachedData && staleWhileRevalidate) {
        updateState({
          data: cachedData,
          isStale: true,
          isRefetching: true
        });
      }
    }

    // Check for existing request (deduplication)
    if (deduplicate) {
      const existingRequest = deduplication.getRequest(cacheKey);
      if (existingRequest) {
        try {
          const result = await existingRequest as T;
          updateState({
            data: result,
            loading: false,
            error: null,
            status: 'success',
            lastFetched: Date.now(),
            isStale: false,
            isRefetching: false
          });
          return result;
        } catch (error: any) {
          updateState({
            loading: false,
            error: error.message,
            status: 'error',
            isRefetching: false
          });
          return null;
        }
      }
    }

    // Setup abort controller
    const abortController = externalAbortController || new AbortController();
    abortControllerRef.current = abortController;

    // Update loading state
    updateState({
      loading: !isRefetch,
      isRefetching: isRefetch,
      error: null,
      status: 'loading'
    });

    try {
      // Execute query function
      const requestPromise = (async () => {
        const queryResult = await queryFn();
        
        // Handle both Promise<T> and RequestConfig returns
        if (queryResult && typeof queryResult === 'object' && 'url' in queryResult) {
          // It's a RequestConfig, execute with fetch or axios
          const { url, method = 'GET', params, data, headers, timeout } = queryResult as RequestConfig;
          
          // Simple fetch implementation for RequestConfig
          const fetchOptions: RequestInit = {
            method,
            headers: {
              'Content-Type': 'application/json',
              ...headers
            },
            body: data ? JSON.stringify(data) : undefined,
            signal: abortController.signal
          };

          const urlWithParams = params ? 
            `${url}?${new URLSearchParams(params).toString()}` : url;
          
          const response = await fetch(urlWithParams, fetchOptions);
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          return await response.json();
        } else {
          // It's already a Promise<T>
          return queryResult as T;
        }
      })();

      // Add to deduplication if enabled
      if (deduplicate) {
        deduplication.addRequest(cacheKey, requestPromise);
      }

      const result = await requestPromise;

      // Cache the result
      if (cache && result) {
        cache_hook.set(cacheKey, result);
      }

      // Update successful state
      updateState({
        data: result,
        loading: false,
        error: null,
        status: 'success',
        lastFetched: Date.now(),
        isStale: false,
        isRefetching: false
      });

      // Clear error recovery state on success
      errorRecovery.reset();

      return result;

    } catch (error: any) {
      // Handle aborted requests
      if (error.name === 'AbortError') {
        return null;
      }

      // Attempt error recovery
      const canRecover = await errorRecovery.handleError(error);
      
      if (canRecover) {
        // Retry will be handled by error recovery
        return null;
      }

      // Update error state
      const errorMessage = error.message || 'An unexpected error occurred';
      updateState({
        loading: false,
        error: errorMessage,
        status: 'error',
        isRefetching: false
      });

      // Show user-friendly error toast
      if (networkStatus.isOnline) {
        showToast(errorMessage, { type: 'error' });
      } else {
        showToast('You are offline. Data will sync when connection is restored.', { 
          type: 'warning' 
        });
      }

      return null;

    } finally {
      // Clean up
      if (deduplicate) {
        deduplication.removeRequest(cacheKey);
      }
      abortControllerRef.current = null;
    }
  }, [
    queryFn, cacheKey, cache, deduplicate, staleWhileRevalidate, 
    cache_hook, deduplication, errorRecovery, networkStatus, 
    showToast, updateState, externalAbortController
  ]);

  // Manual refetch function
  const refetch = useCallback(async () => {
    await executeQuery(true);
  }, [executeQuery]);

  // Reset function
  const reset = useCallback(() => {
    // Cancel any ongoing requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Clear timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (refetchIntervalRef.current) {
      clearInterval(refetchIntervalRef.current);
    }

    // Reset state
    setState({
      data: null,
      loading: false,
      error: null,
      isStale: false,
      isRefetching: false,
      lastFetched: null,
      status: 'idle'
    });

    // Clear cache
    if (cache) {
      cache_hook.remove(cacheKey);
    }
  }, [cache, cache_hook, cacheKey]);

  // Invalidate and refetch
  const invalidate = useCallback(async () => {
    if (cache) {
      cache_hook.remove(cacheKey);
    }
    await executeQuery(true);
  }, [cache, cache_hook, cacheKey, executeQuery]);

  // Initial query execution and dependency changes
  useEffect(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce execution to prevent rapid successive calls
    timeoutRef.current = setTimeout(() => {
      executeQuery();
    }, 100);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [executeQuery, ...deps]);

  // Setup refetch interval
  useEffect(() => {
    if (!refetchInterval || refetchInterval <= 0) return;

    refetchIntervalRef.current = setInterval(() => {
      if (!state.loading && networkStatus.isOnline) {
        executeQuery(true);
      }
    }, refetchInterval);

    return () => {
      if (refetchIntervalRef.current) {
        clearInterval(refetchIntervalRef.current);
      }
    };
  }, [refetchInterval, state.loading, networkStatus.isOnline, executeQuery]);

  // Setup window focus refetch
  useEffect(() => {
    if (!refetchOnWindowFocus) return;

    const handleFocus = () => {
      if (!state.loading && networkStatus.isOnline) {
        executeQuery(true);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetchOnWindowFocus, state.loading, networkStatus.isOnline, executeQuery]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (refetchIntervalRef.current) {
        clearInterval(refetchIntervalRef.current);
      }
    };
  }, []);

  // Memoized result to prevent unnecessary re-renders
  return useMemo(() => ({
    ...state,
    refetch,
    reset,
    invalidate
  }), [state, refetch, reset, invalidate]);
}

export default useApiQuery;