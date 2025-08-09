/**
 * useRequestDeduplication - Prevents duplicate API requests
 * Ensures only one request per unique key is in flight at any time
 */

import { useRef, useCallback } from 'react';

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
  abortController?: AbortController;
}

/**
 * Hook for preventing duplicate API requests
 */
export const useRequestDeduplication = <T>() => {
  const pendingRequests = useRef<Map<string, PendingRequest<T>>>(new Map());

  /**
   * Execute a request with deduplication
   * If a request with the same key is already in progress, return the existing promise
   */
  const executeRequest = useCallback(async (
    key: string,
    requestFn: (signal?: AbortSignal) => Promise<T>,
    options: {
      timeout?: number;
      enableAbort?: boolean;
    } = {}
  ): Promise<T> => {
    const { timeout = 30000, enableAbort = true } = options;

    // Check if request is already pending
    const existingRequest = pendingRequests.current.get(key);
    if (existingRequest) {
      console.log(`Deduplicating request for key: ${key}`);
      return existingRequest.promise;
    }

    // Create abort controller if enabled
    const abortController = enableAbort ? new AbortController() : undefined;

    // Create timeout if specified
    let timeoutId: NodeJS.Timeout | undefined;
    if (timeout > 0 && abortController) {
      timeoutId = setTimeout(() => {
        abortController.abort();
      }, timeout);
    }

    // Create the request promise
    const requestPromise = (async (): Promise<T> => {
      try {
        const result = await requestFn(abortController?.signal);
        return result;
      } finally {
        // Clean up
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        pendingRequests.current.delete(key);
      }
    })();

    // Store the pending request
    const pendingRequest: PendingRequest<T> = {
      promise: requestPromise,
      timestamp: Date.now(),
      abortController
    };

    pendingRequests.current.set(key, pendingRequest);

    return requestPromise;
  }, []);

  /**
   * Cancel a specific request
   */
  const cancelRequest = useCallback((key: string): boolean => {
    const pendingRequest = pendingRequests.current.get(key);
    if (pendingRequest && pendingRequest.abortController) {
      pendingRequest.abortController.abort();
      pendingRequests.current.delete(key);
      return true;
    }
    return false;
  }, []);

  /**
   * Cancel all pending requests
   */
  const cancelAllRequests = useCallback(() => {
    pendingRequests.current.forEach((request, key) => {
      if (request.abortController) {
        request.abortController.abort();
      }
    });
    pendingRequests.current.clear();
  }, []);

  /**
   * Check if a request is pending
   */
  const isRequestPending = useCallback((key: string): boolean => {
    return pendingRequests.current.has(key);
  }, []);

  /**
   * Get pending request count
   */
  const getPendingCount = useCallback((): number => {
    return pendingRequests.current.size;
  }, []);

  /**
   * Clean up old pending requests (older than specified age)
   */
  const cleanupOldRequests = useCallback((maxAge: number = 60000) => {
    const now = Date.now();
    const keysToDelete: string[] = [];

    pendingRequests.current.forEach((request, key) => {
      if (now - request.timestamp > maxAge) {
        if (request.abortController) {
          request.abortController.abort();
        }
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => {
      pendingRequests.current.delete(key);
    });

    return keysToDelete.length;
  }, []);

  return {
    executeRequest,
    cancelRequest,
    cancelAllRequests,
    isRequestPending,
    getPendingCount,
    cleanupOldRequests
  };
};

/**
 * useStaleWhileRevalidate - Implements stale-while-revalidate pattern
 * Returns cached data immediately while fetching fresh data in the background
 */
export const useStaleWhileRevalidate = <T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: {
    staleTime?: number;
    cacheTime?: number;
    revalidateOnFocus?: boolean;
    revalidateOnReconnect?: boolean;
  } = {}
) => {
  const {
    staleTime = 5 * 60 * 1000, // 5 minutes
    cacheTime = 10 * 60 * 1000, // 10 minutes
    revalidateOnFocus = true,
    revalidateOnReconnect = true
  } = options;

  const cache = useRef<Map<string, { data: T; timestamp: number }>>(new Map());
  const deduplication = useRequestDeduplication<T>();

  const getData = useCallback(async (): Promise<{
    data: T | null;
    isStale: boolean;
    isValidating: boolean;
  }> => {
    const cached = cache.current.get(key);
    const now = Date.now();

    // Check if we have cached data
    if (cached) {
      const age = now - cached.timestamp;
      const isStale = age > staleTime;
      const isExpired = age > cacheTime;

      if (!isExpired) {
        // Data is still fresh or stale but not expired
        if (isStale && !deduplication.isRequestPending(key)) {
          // Data is stale, fetch fresh data in background
          deduplication.executeRequest(key, fetchFn)
            .then(freshData => {
              cache.current.set(key, { data: freshData, timestamp: Date.now() });
            })
            .catch(error => {
              console.warn(`Failed to revalidate data for key ${key}:`, error);
            });

          return {
            data: cached.data,
            isStale: true,
            isValidating: true
          };
        }

        return {
          data: cached.data,
          isStale,
          isValidating: deduplication.isRequestPending(key)
        };
      }
    }

    // No valid cached data, fetch fresh data
    try {
      const freshData = await deduplication.executeRequest(key, fetchFn);
      cache.current.set(key, { data: freshData, timestamp: Date.now() });

      return {
        data: freshData,
        isStale: false,
        isValidating: false
      };
    } catch (error) {
      // If fetch fails and we have stale data, return it
      if (cached) {
        return {
          data: cached.data,
          isStale: true,
          isValidating: false
        };
      }
      throw error;
    }
  }, [key, fetchFn, staleTime, cacheTime, deduplication]);

  return {
    getData,
    invalidate: () => cache.current.delete(key),
    clearCache: () => cache.current.clear()
  };
};