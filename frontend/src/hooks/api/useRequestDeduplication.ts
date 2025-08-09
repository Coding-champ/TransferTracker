/**
 * useRequestDeduplication Hook
 * 
 * Prevents duplicate concurrent requests with:
 * - Smart request merging based on key/content/URL
 * - Response sharing across components
 * - Memory leak prevention
 * - Performance statistics tracking
 */

import { useRef, useCallback, useMemo } from 'react';
import { DeduplicationOptions, DeduplicationState } from './types';

/**
 * Hook for preventing duplicate concurrent requests
 * 
 * @param options - Deduplication configuration options
 * @returns Deduplication utilities and state
 */
export function useRequestDeduplication(options: DeduplicationOptions = {}) {
  const {
    strategy = 'key-based',
    keyGenerator,
    window = 5000, // 5 seconds
    shareResponse = true
  } = options;

  // Refs to maintain state across renders
  const activeRequestsRef = useRef<Map<string, Promise<any>>>(new Map());
  const statsRef = useRef({
    totalRequests: 0,
    deduplicatedRequests: 0,
    savedRequests: 0
  });

  // Generate deduplication key
  const generateKey = useCallback((...args: any[]): string => {
    if (keyGenerator) {
      return keyGenerator(...args);
    }

    switch (strategy) {
      case 'content-based':
        return JSON.stringify(args);
      case 'url-based':
        // Extract URL from arguments if available
        const url = args.find(arg => 
          typeof arg === 'string' || 
          (typeof arg === 'object' && arg?.url)
        );
        return typeof url === 'string' ? url : (url?.url || JSON.stringify(args));
      case 'key-based':
      default:
        return args.join('-');
    }
  }, [strategy, keyGenerator]);

  // Add request to deduplication map
  const addRequest = useCallback(<T>(key: string, request: Promise<T>): Promise<T> => {
    const activeRequests = activeRequestsRef.current;
    const stats = statsRef.current;

    stats.totalRequests++;

    // Check if request already exists
    if (activeRequests.has(key)) {
      stats.deduplicatedRequests++;
      stats.savedRequests++;
      
      if (shareResponse) {
        return activeRequests.get(key) as Promise<T>;
      }
    }

    // Add new request
    activeRequests.set(key, request);

    // Auto-cleanup after request completes or times out
    const cleanup = () => {
      setTimeout(() => {
        activeRequests.delete(key);
      }, window);
    };

    request
      .then(cleanup)
      .catch(cleanup);

    return request;
  }, [shareResponse, window]);

  // Get existing request
  const getRequest = useCallback(<T>(key: string): Promise<T> | null => {
    const activeRequests = activeRequestsRef.current;
    return activeRequests.get(key) as Promise<T> || null;
  }, []);

  // Remove request from deduplication map
  const removeRequest = useCallback((key: string): void => {
    const activeRequests = activeRequestsRef.current;
    activeRequests.delete(key);
  }, []);

  // Check if request exists
  const hasRequest = useCallback((key: string): boolean => {
    const activeRequests = activeRequestsRef.current;
    return activeRequests.has(key);
  }, []);

  // Clear all active requests
  const clearAll = useCallback((): void => {
    const activeRequests = activeRequestsRef.current;
    activeRequests.clear();
  }, []);

  // Get current statistics
  const getStats = useCallback(() => ({
    ...statsRef.current,
    activeRequestsCount: activeRequestsRef.current.size
  }), []);

  // Deduplicated request executor
  const execute = useCallback(<T>(
    keyArgs: any[],
    requestFn: () => Promise<T>
  ): Promise<T> => {
    const key = generateKey(...keyArgs);
    const existingRequest = getRequest<T>(key);

    if (existingRequest) {
      return existingRequest;
    }

    const newRequest = requestFn();
    return addRequest(key, newRequest);
  }, [generateKey, getRequest, addRequest]);

  // Memoized state to prevent unnecessary re-renders
  const state: DeduplicationState = useMemo(() => ({
    activeRequests: activeRequestsRef.current,
    stats: {
      ...statsRef.current,
      savedRequests: statsRef.current.deduplicatedRequests
    }
  }), []);

  return {
    state,
    generateKey,
    addRequest,
    getRequest,
    removeRequest,
    hasRequest,
    clearAll,
    getStats,
    execute
  };
}

export default useRequestDeduplication;