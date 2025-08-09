import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

/**
 * Enhanced custom hook for debouncing values with improved memory management
 * Delays execution until after wait milliseconds have elapsed since the last time it was invoked
 * 
 * @param value - The value to debounce
 * @param delay - Debounce delay in milliseconds
 * @param options - Configuration options
 * @returns Debounced value
 * 
 * @example
 * ```typescript
 * const debouncedSearchTerm = useDebounce(searchTerm, 300);
 * const debouncedValue = useDebounce(value, 500, { 
 *   leading: true, 
 *   maxWait: 2000 
 * });
 * ```
 */
export function useDebounce<T>(
  value: T, 
  delay: number,
  options: {
    /** Execute on the leading edge */
    leading?: boolean;
    /** Maximum wait time in milliseconds */
    maxWait?: number;
    /** Enable equality check to prevent unnecessary updates */
    equalityCheck?: boolean;
  } = {}
): T {
  const { leading = false, maxWait, equalityCheck = true } = options;
  
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousValueRef = useRef<T>(value);
  const leadingCalledRef = useRef<boolean>(false);

  useEffect(() => {
    // Equality check to prevent unnecessary updates
    if (equalityCheck && value === previousValueRef.current) {
      return;
    }

    const updateValue = () => {
      setDebouncedValue(value);
      previousValueRef.current = value;
      leadingCalledRef.current = false;
    };

    // Leading edge execution
    if (leading && !leadingCalledRef.current) {
      updateValue();
      leadingCalledRef.current = true;
    }

    // Clear existing timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (maxTimeoutRef.current) {
      clearTimeout(maxTimeoutRef.current);
    }

    // Set debounce timeout
    timeoutRef.current = setTimeout(() => {
      if (!leading || leadingCalledRef.current) {
        updateValue();
      }
      if (maxTimeoutRef.current) {
        clearTimeout(maxTimeoutRef.current);
        maxTimeoutRef.current = null;
      }
    }, delay);

    // Set max wait timeout if specified
    if (maxWait && !maxTimeoutRef.current) {
      maxTimeoutRef.current = setTimeout(() => {
        updateValue();
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      }, maxWait);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (maxTimeoutRef.current) {
        clearTimeout(maxTimeoutRef.current);
        maxTimeoutRef.current = null;
      }
    };
  }, [value, delay, leading, maxWait, equalityCheck]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (maxTimeoutRef.current) {
        clearTimeout(maxTimeoutRef.current);
      }
    };
  }, []);

  return debouncedValue;
}

/**
 * Enhanced hook for debouncing callbacks with memory optimization
 * 
 * @param callback - The callback function to debounce
 * @param delay - Debounce delay in milliseconds
 * @param deps - Dependency array for the callback
 * @returns Debounced callback function
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: React.DependencyList = []
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Memoize the callback to prevent unnecessary re-creations
  const memoizedCallback = useCallback(callback, [callback, ...deps]);

  const debouncedCallback = useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      memoizedCallback(...args);
    }, delay);
  }, [memoizedCallback, delay]) as T;

  // Cleanup function
  const cancelCallback = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cancelCallback;
  }, [cancelCallback]);

  // Add cancel method to the debounced callback
  (debouncedCallback as any).cancel = cancelCallback;

  return debouncedCallback;
}

/**
 * Hook for immediate debounced callback execution with cancel capability
 * 
 * @param callback - The callback function
 * @param delay - Debounce delay in milliseconds
 * @returns Object with execute and cancel functions
 */
export function useDebouncedExecutor<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const execute = useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    return new Promise<ReturnType<T>>((resolve, reject) => {
      timeoutRef.current = setTimeout(async () => {
        try {
          const result = await callback(...args);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, delay);
    });
  }, [callback, delay]);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const isPending = useMemo(() => timeoutRef.current !== null, []);

  useEffect(() => {
    return cancel;
  }, [cancel]);

  return { execute, cancel, isPending };
}