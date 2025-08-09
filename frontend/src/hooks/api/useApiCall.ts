import { useState, useCallback, useRef, useEffect } from 'react';
import { handleError, isAbortError, ApiError } from '../../utils/errors';
import { useToast } from '../../contexts/ToastContext';

/**
 * Configuration options for API calls
 */
export interface ApiCallConfig<T = any> {
  /** Whether to retry failed requests */
  retry?: boolean;
  /** Number of retry attempts */
  retryAttempts?: number;
  /** Delay between retries in milliseconds */
  retryDelay?: number;
  /** Whether to deduplicate identical requests */
  deduplicate?: boolean;
  /** Cache timeout in milliseconds */
  cacheTimeout?: number;
  /** Transform response data */
  transform?: (data: any) => T;
  /** Handle errors */
  onError?: (error: ApiError) => void;
  /** Handle success */
  onSuccess?: (data: T) => void;
}

/**
 * State returned by useApiCall hook
 */
export interface ApiCallState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  isAborted: boolean;
}

/**
 * Return type of useApiCall hook
 */
export interface UseApiCallReturn<T> {
  /** Current state */
  state: ApiCallState<T>;
  /** Execute the API call */
  execute: (...args: any[]) => Promise<T | null>;
  /** Reset the state */
  reset: () => void;
  /** Abort current request */
  abort: () => void;
}

// Request cache for deduplication
const requestCache = new Map<string, Promise<any>>();

// Response cache for caching
const responseCache = new Map<string, { data: any; timestamp: number }>();

/**
 * Base hook for API calls with comprehensive error handling, caching, and deduplication
 * 
 * @param apiFunction - The API function to call
 * @param config - Configuration options
 * @returns Hook state and control functions
 * 
 * @example
 * ```typescript
 * const { state, execute } = useApiCall(
 *   (id: string) => apiService.getUser(id),
 *   { retry: true, deduplicate: true }
 * );
 * 
 * // Use in effect
 * useEffect(() => {
 *   execute('user-123');
 * }, [execute]);
 * ```
 */
export function useApiCall<T = any>(
  apiFunction: (...args: any[]) => Promise<T>,
  config: ApiCallConfig<T> = {}
): UseApiCallReturn<T> {
  const {
    retry = false,
    retryAttempts = 3,
    retryDelay = 1000,
    deduplicate = true,
    cacheTimeout = 5 * 60 * 1000, // 5 minutes
    transform,
    onError,
    onSuccess
  } = config;

  const [state, setState] = useState<ApiCallState<T>>({
    data: null,
    loading: false,
    error: null,
    isAborted: false
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const { showToast } = useToast();

  /**
   * Generate cache key for request
   */
  const generateCacheKey = useCallback((args: any[]): string => {
    return `${apiFunction.name}_${JSON.stringify(args)}`;
  }, [apiFunction]);

  /**
   * Check if cached response is valid
   */
  const getCachedResponse = useCallback((cacheKey: string): T | null => {
    if (!deduplicate && !cacheTimeout) return null;
    
    const cached = responseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cacheTimeout) {
      return cached.data;
    }
    
    responseCache.delete(cacheKey);
    return null;
  }, [deduplicate, cacheTimeout]);

  /**
   * Execute API call with retry logic
   */
  const executeWithRetry = useCallback(async (
    args: any[],
    attempt: number = 1
  ): Promise<T | null> => {
    try {
      const result = await apiFunction(...args);
      return transform ? transform(result) : result;
    } catch (error) {
      if (isAbortError(error)) {
        throw error; // Don't retry aborted requests
      }

      if (retry && attempt < retryAttempts) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        return executeWithRetry(args, attempt + 1);
      }

      throw error;
    }
  }, [apiFunction, transform, retry, retryAttempts, retryDelay]);

  /**
   * Execute the API call
   */
  const execute = useCallback(async (...args: any[]): Promise<T | null> => {
    const cacheKey = generateCacheKey(args);

    // Check cache first
    const cachedData = getCachedResponse(cacheKey);
    if (cachedData) {
      setState(prev => ({ ...prev, data: cachedData, loading: false, error: null }));
      if (cachedData !== null) {
        onSuccess?.(cachedData);
      }
      return cachedData;
    }

    // Check for existing request (deduplication)
    if (deduplicate && requestCache.has(cacheKey)) {
      try {
        const result = await requestCache.get(cacheKey)!;
        setState(prev => ({ ...prev, data: result, loading: false, error: null }));
        if (result !== null) {
          onSuccess?.(result);
        }
        return result;
      } catch (error) {
        // Request failed, continue with new request
      }
    }

    // Abort previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    
    setState(prev => ({ ...prev, loading: true, error: null, isAborted: false }));

    const requestPromise = executeWithRetry(args);
    
    if (deduplicate) {
      requestCache.set(cacheKey, requestPromise);
    }

    try {
      const result = await requestPromise;
      
      if (!abortControllerRef.current?.signal.aborted) {
        setState(prev => ({ ...prev, data: result, loading: false, error: null }));
        
        if (cacheTimeout > 0 && result !== null) {
          responseCache.set(cacheKey, { data: result, timestamp: Date.now() });
        }
        
        if (result !== null) {
          onSuccess?.(result);
        }
      }
      
      return result;
    } catch (error) {
      if (isAbortError(error)) {
        setState(prev => ({ ...prev, loading: false, isAborted: true }));
        return null;
      }

      const processedError = handleError(error) as ApiError;
      const errorMessage = processedError.message || 'API call failed';
      
      if (!abortControllerRef.current?.signal.aborted) {
        setState(prev => ({ ...prev, loading: false, error: errorMessage }));
        onError?.(processedError);
        showToast(errorMessage, { type: 'error' });
      }
      
      return null;
    } finally {
      if (deduplicate) {
        requestCache.delete(cacheKey);
      }
    }
  }, [
    generateCacheKey,
    getCachedResponse,
    deduplicate,
    executeWithRetry,
    cacheTimeout,
    onSuccess,
    onError,
    showToast
  ]);

  /**
   * Reset the state
   */
  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
      isAborted: false
    });
  }, []);

  /**
   * Abort current request
   */
  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setState(prev => ({ ...prev, loading: false, isAborted: true }));
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    state,
    execute,
    reset,
    abort
  };
}

/**
 * Hook for simple API calls without advanced features
 * 
 * @param apiFunction - The API function to call
 * @returns Simplified hook state and execute function
 */
export function useSimpleApiCall<T = any>(
  apiFunction: (...args: any[]) => Promise<T>
): Pick<UseApiCallReturn<T>, 'state' | 'execute'> {
  const { state, execute } = useApiCall(apiFunction, {
    retry: false,
    deduplicate: false,
    cacheTimeout: 0
  });

  return { state, execute };
}