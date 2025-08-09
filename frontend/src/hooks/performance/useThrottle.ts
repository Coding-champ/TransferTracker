import { useCallback, useRef, useEffect } from 'react';

/**
 * Configuration options for throttling
 */
interface ThrottleOptions {
  /** Execute on the leading edge */
  leading?: boolean;
  /** Execute on the trailing edge */
  trailing?: boolean;
}

/**
 * Custom hook for throttling function calls
 * 
 * Throttling ensures that a function is called at most once in a specified time period.
 * Unlike debouncing, throttling guarantees execution at regular intervals.
 * 
 * @param callback - The function to throttle
 * @param delay - Throttle delay in milliseconds
 * @param options - Throttle configuration options
 * @returns Throttled function
 * 
 * @example
 * ```typescript
 * const throttledHandler = useThrottle(() => {
 *   console.log('Throttled call');
 * }, 1000, { leading: true, trailing: false });
 * 
 * // Will only execute once per second
 * throttledHandler();
 * throttledHandler();
 * throttledHandler();
 * ```
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  options: ThrottleOptions = { leading: true, trailing: true }
): T & { cancel: () => void; flush: () => void } {
  const { leading = true, trailing = true } = options;
  
  const lastCallTimeRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastArgsRef = useRef<Parameters<T> | null>(null);
  const resultRef = useRef<ReturnType<T> | undefined>(undefined);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    lastArgsRef.current = null;
  }, []);

  const flush = useCallback(() => {
    if (timeoutRef.current && lastArgsRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      
      resultRef.current = callback(...lastArgsRef.current);
      lastArgsRef.current = null;
      lastCallTimeRef.current = Date.now();
      
      return resultRef.current;
    }
  }, [callback]);

  const throttledFunction = useCallback((...args: Parameters<T>): ReturnType<T> => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTimeRef.current;
    
    // Store the latest arguments
    lastArgsRef.current = args;

    // Leading edge execution
    if (leading && timeSinceLastCall >= delay) {
      lastCallTimeRef.current = now;
      resultRef.current = callback(...args);
      lastArgsRef.current = null;
      return resultRef.current as ReturnType<T>;
    }

    // Schedule trailing edge execution
    if (trailing && !timeoutRef.current) {
      const remainingTime = delay - timeSinceLastCall;
      
      timeoutRef.current = setTimeout(() => {
        if (lastArgsRef.current) {
          lastCallTimeRef.current = Date.now();
          resultRef.current = callback(...lastArgsRef.current);
          lastArgsRef.current = null;
        }
        timeoutRef.current = null;
      }, remainingTime > 0 ? remainingTime : 0);
    }

    return (resultRef.current ?? undefined) as ReturnType<T>;
  }, [callback, delay, leading, trailing]) as T & { cancel: () => void; flush: () => void };

  // Add utility methods
  throttledFunction.cancel = cancel;
  throttledFunction.flush = flush;

  // Cleanup on unmount
  useEffect(() => {
    return cancel;
  }, [cancel]);

  return throttledFunction;
}

/**
 * Hook for throttling values instead of functions
 * 
 * @param value - The value to throttle
 * @param delay - Throttle delay in milliseconds
 * @param options - Throttle configuration
 * @returns Throttled value
 */
export function useThrottledValue<T>(
  value: T,
  delay: number,
  options: ThrottleOptions = { leading: true, trailing: true }
): T {
  const lastUpdateRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const throttledValueRef = useRef<T>(value);
  const pendingValueRef = useRef<T>(value);

  const { leading = true, trailing = true } = options;

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateRef.current;
    
    pendingValueRef.current = value;

    // Leading edge update
    if (leading && timeSinceLastUpdate >= delay) {
      throttledValueRef.current = value;
      lastUpdateRef.current = now;
      return;
    }

    // Schedule trailing edge update
    if (trailing && !timeoutRef.current) {
      const remainingTime = delay - timeSinceLastUpdate;
      
      timeoutRef.current = setTimeout(() => {
        throttledValueRef.current = pendingValueRef.current;
        lastUpdateRef.current = Date.now();
        timeoutRef.current = null;
      }, remainingTime > 0 ? remainingTime : 0);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [value, delay, leading, trailing]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return throttledValueRef.current;
}

/**
 * Hook for throttling API calls or async operations
 * 
 * @param asyncFunction - The async function to throttle
 * @param delay - Throttle delay in milliseconds
 * @returns Throttled async function with promise resolution
 */
export function useThrottledAsync<T extends (...args: any[]) => Promise<any>>(
  asyncFunction: T,
  delay: number
): T & { cancel: () => void; isPending: () => boolean } {
  const lastCallTimeRef = useRef<number>(0);
  const pendingPromiseRef = useRef<Promise<any> | null>(null);
  const resolversRef = useRef<Array<{ resolve: Function; reject: Function }>>([]);

  const cancel = useCallback(() => {
    resolversRef.current.forEach(({ reject }) => {
      reject(new Error('Throttled async call was cancelled'));
    });
    resolversRef.current = [];
    pendingPromiseRef.current = null;
  }, []);

  const isPending = useCallback(() => {
    return pendingPromiseRef.current !== null;
  }, []);

  const throttledAsyncFunction = useCallback(async (...args: Parameters<T>) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTimeRef.current;

    // If within throttle period and a call is pending, wait for it
    if (timeSinceLastCall < delay && pendingPromiseRef.current) {
      return new Promise<any>((resolve, reject) => {
        resolversRef.current.push({ resolve, reject });
      });
    }

    // If enough time has passed, make a new call
    if (timeSinceLastCall >= delay) {
      lastCallTimeRef.current = now;
      
      const promise = asyncFunction(...args);
      pendingPromiseRef.current = promise;

      try {
        const result = await promise;
        
        // Resolve all pending promises with the same result
        resolversRef.current.forEach(({ resolve }) => resolve(result));
        resolversRef.current = [];
        pendingPromiseRef.current = null;
        
        return result;
      } catch (error) {
        // Reject all pending promises with the same error
        resolversRef.current.forEach(({ reject }) => reject(error));
        resolversRef.current = [];
        pendingPromiseRef.current = null;
        
        throw error;
      }
    }

    // Return the pending promise if available
    return pendingPromiseRef.current;
  }, [asyncFunction, delay]) as T & { cancel: () => void; isPending: () => boolean };

  throttledAsyncFunction.cancel = cancel;
  throttledAsyncFunction.isPending = isPending;

  useEffect(() => {
    return cancel;
  }, [cancel]);

  return throttledAsyncFunction;
}