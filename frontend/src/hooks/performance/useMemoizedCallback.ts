/**
 * useMemoizedCallback - Creates stable callback references with proper memoization
 * Prevents unnecessary re-renders caused by callback recreation
 */

import { useCallback, useRef } from 'react';

/**
 * Creates a memoized callback that preserves referential equality
 * Uses a ref to store the latest callback, preventing stale closures
 */
export const useMemoizedCallback = <T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T => {
  const callbackRef = useRef<T>();
  
  // Update the ref when dependencies change
  callbackRef.current = callback;
  
  // Create a stable callback that always calls the latest version
  return useCallback(
    ((...args: Parameters<T>) => {
      return callbackRef.current?.(...args);
    }) as T,
    deps
  );
};

/**
 * Creates a throttled callback that limits execution frequency
 */
export const useThrottledCallback = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: React.DependencyList
): T => {
  const lastCallTime = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  return useMemoizedCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCallTime.current;
      
      if (timeSinceLastCall >= delay) {
        lastCallTime.current = now;
        return callback(...args);
      } else {
        // Schedule execution for the remaining time
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        
        timeoutRef.current = setTimeout(() => {
          lastCallTime.current = Date.now();
          callback(...args);
        }, delay - timeSinceLastCall);
      }
    }) as T,
    deps
  );
};

/**
 * Creates a debounced callback that delays execution until after a pause
 */
export const useDebouncedCallback = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: React.DependencyList
): T => {
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  return useMemoizedCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    }) as T,
    deps
  );
};