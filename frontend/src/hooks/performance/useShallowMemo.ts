/**
 * useShallowMemo - Provides shallow comparison memoization
 * Optimizes performance when dealing with objects that change frequently but shallowly
 */

import { useMemo, useRef } from 'react';

/**
 * Performs shallow comparison between two objects
 */
function shallowEqual<T extends Record<string, any>>(obj1: T, obj2: T): boolean {
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  if (keys1.length !== keys2.length) {
    return false;
  }
  
  for (const key of keys1) {
    if (obj1[key] !== obj2[key]) {
      return false;
    }
  }
  
  return true;
}

/**
 * Performs shallow comparison for arrays
 */
function shallowEqualArray<T>(arr1: T[], arr2: T[]): boolean {
  if (arr1.length !== arr2.length) {
    return false;
  }
  
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) {
      return false;
    }
  }
  
  return true;
}

/**
 * Memoizes a value using shallow comparison
 */
export const useShallowMemo = <T extends Record<string, any> | any[]>(
  factory: () => T,
  deps: React.DependencyList
): T => {
  const prevValue = useRef<T>();
  
  return useMemo(() => {
    const newValue = factory();
    
    // If we have a previous value, compare it
    if (prevValue.current !== undefined) {
      const isEqual = Array.isArray(newValue) && Array.isArray(prevValue.current)
        ? shallowEqualArray(newValue, prevValue.current)
        : typeof newValue === 'object' && newValue !== null &&
          typeof prevValue.current === 'object' && prevValue.current !== null
        ? shallowEqual(newValue as Record<string, any>, prevValue.current as Record<string, any>)
        : newValue === prevValue.current;
      
      if (isEqual) {
        return prevValue.current;
      }
    }
    
    prevValue.current = newValue;
    return newValue;
  }, deps);
};

/**
 * Memoizes filter objects with shallow comparison
 * Specifically optimized for filter state objects
 */
export const useShallowMemoFilters = <T extends Record<string, any>>(
  filters: T
): T => {
  return useShallowMemo(() => filters, [filters]);
};

/**
 * Memoizes array-based dependencies with shallow comparison
 */
export const useShallowMemoArray = <T>(
  array: T[]
): T[] => {
  return useShallowMemo(() => array, [array]);
};

/**
 * Creates a stable object reference when properties haven't changed
 */
export const useStableObject = <T extends Record<string, any>>(
  obj: T
): T => {
  const prevObj = useRef<T>();
  
  return useMemo(() => {
    if (prevObj.current && shallowEqual(obj, prevObj.current)) {
      return prevObj.current;
    }
    prevObj.current = obj;
    return obj;
  }, [obj]);
};

/**
 * Creates a stable array reference when elements haven't changed
 */
export const useStableArray = <T>(
  array: T[]
): T[] => {
  const prevArray = useRef<T[]>();
  
  return useMemo(() => {
    if (prevArray.current && shallowEqualArray(array, prevArray.current)) {
      return prevArray.current;
    }
    prevArray.current = array;
    return array;
  }, [array]);
};