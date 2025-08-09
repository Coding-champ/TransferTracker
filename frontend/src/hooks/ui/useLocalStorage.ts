import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Type for localStorage hook return value
 */
type UseLocalStorageReturn<T> = [
  T,
  (value: T | ((prev: T) => T)) => void,
  () => void
];

/**
 * Configuration options for localStorage hook
 */
interface UseLocalStorageOptions<T> {
  /** Custom serializer function */
  serializer?: {
    read: (value: string) => T;
    write: (value: T) => string;
  };
  /** Default value factory function */
  defaultValue?: () => T;
  /** Whether to sync across tabs */
  syncAcrossTabs?: boolean;
  /** Error handling callback */
  onError?: (error: Error) => void;
}

/**
 * Enhanced localStorage hook with TypeScript support and error handling
 * 
 * Provides persistent state management with localStorage, including:
 * - Type safety with generic support
 * - Custom serialization
 * - Cross-tab synchronization
 * - Error handling for localStorage failures
 * - SSR compatibility
 * 
 * @param key - localStorage key
 * @param initialValue - Initial value if not found in localStorage
 * @param options - Configuration options
 * @returns Tuple with value, setter, and remover
 * 
 * @example
 * ```typescript
 * const [user, setUser, removeUser] = useLocalStorage('user', null, {
 *   syncAcrossTabs: true
 * });
 * 
 * const [preferences, setPreferences] = useLocalStorage('prefs', {
 *   theme: 'light',
 *   language: 'en'
 * });
 * ```
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  options: UseLocalStorageOptions<T> = {}
): UseLocalStorageReturn<T> {
  const {
    serializer = {
      read: JSON.parse,
      write: JSON.stringify
    },
    defaultValue,
    syncAcrossTabs = false,
    onError
  } = options;

  const isFirstRender = useRef(true);

  // Get initial value from localStorage or use provided initial value
  const getInitialValue = useCallback((): T => {
    try {
      // Return default if localStorage is not available (SSR)
      if (typeof window === 'undefined') {
        return defaultValue ? defaultValue() : initialValue;
      }

      const item = localStorage.getItem(key);
      if (item === null) {
        return defaultValue ? defaultValue() : initialValue;
      }

      return serializer.read(item);
    } catch (error) {
      onError?.(error as Error);
      return defaultValue ? defaultValue() : initialValue;
    }
  }, [key, initialValue, defaultValue, serializer, onError]);

  const [storedValue, setStoredValue] = useState<T>(getInitialValue);

  /**
   * Update localStorage and state
   */
  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    try {
      const valueToStore = typeof value === 'function' 
        ? (value as (prev: T) => T)(storedValue)
        : value;

      setStoredValue(valueToStore);

      if (typeof window !== 'undefined') {
        localStorage.setItem(key, serializer.write(valueToStore));
        
        // Dispatch custom event for cross-tab sync
        if (syncAcrossTabs) {
          window.dispatchEvent(new CustomEvent(`localStorage-${key}`, {
            detail: valueToStore
          }));
        }
      }
    } catch (error) {
      onError?.(error as Error);
    }
  }, [key, storedValue, serializer, syncAcrossTabs, onError]);

  /**
   * Remove value from localStorage
   */
  const removeValue = useCallback(() => {
    try {
      setStoredValue(defaultValue ? defaultValue() : initialValue);
      
      if (typeof window !== 'undefined') {
        localStorage.removeItem(key);
        
        if (syncAcrossTabs) {
          window.dispatchEvent(new CustomEvent(`localStorage-${key}`, {
            detail: null
          }));
        }
      }
    } catch (error) {
      onError?.(error as Error);
    }
  }, [key, initialValue, defaultValue, syncAcrossTabs, onError]);

  // Handle storage events (cross-tab sync)
  useEffect(() => {
    if (!syncAcrossTabs || typeof window === 'undefined') return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(serializer.read(e.newValue));
        } catch (error) {
          onError?.(error as Error);
        }
      }
    };

    const handleCustomEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail === null) {
        setStoredValue(defaultValue ? defaultValue() : initialValue);
      } else {
        setStoredValue(customEvent.detail);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener(`localStorage-${key}`, handleCustomEvent);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener(`localStorage-${key}`, handleCustomEvent);
    };
  }, [key, serializer, syncAcrossTabs, initialValue, defaultValue, onError]);

  // Sync with localStorage on mount (for SSR)
  useEffect(() => {
    if (isFirstRender.current && typeof window !== 'undefined') {
      isFirstRender.current = false;
      const value = getInitialValue();
      if (value !== storedValue) {
        setStoredValue(value);
      }
    }
  }, [getInitialValue, storedValue]);

  return [storedValue, setValue, removeValue];
}

/**
 * Hook for managing multiple localStorage keys with a common prefix
 * 
 * @param prefix - Common prefix for all keys
 * @param initialValues - Initial values for the keys
 * @returns Object with get, set, remove, and clear functions
 */
export function useLocalStorageState<T extends Record<string, any>>(
  prefix: string,
  initialValues: T
): {
  values: T;
  get: <K extends keyof T>(key: K) => T[K];
  set: <K extends keyof T>(key: K, value: T[K]) => void;
  remove: <K extends keyof T>(key: K) => void;
  clear: () => void;
} {
  const [values, setValues] = useState<T>(initialValues);

  // Initialize values from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const loadedValues = { ...initialValues };
    Object.keys(initialValues).forEach(key => {
      try {
        const item = localStorage.getItem(`${prefix}_${key}`);
        if (item !== null) {
          loadedValues[key as keyof T] = JSON.parse(item);
        }
      } catch (error) {
        console.warn(`Failed to load ${prefix}_${key} from localStorage:`, error);
      }
    });
    setValues(loadedValues);
  }, [prefix, initialValues]);

  const get = useCallback(<K extends keyof T>(key: K): T[K] => {
    return values[key];
  }, [values]);

  const set = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setValues(prev => ({ ...prev, [key]: value }));
    
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`${prefix}_${String(key)}`, JSON.stringify(value));
      } catch (error) {
        console.warn(`Failed to save ${prefix}_${String(key)} to localStorage:`, error);
      }
    }
  }, [prefix]);

  const remove = useCallback(<K extends keyof T>(key: K) => {
    setValues(prev => ({ ...prev, [key]: initialValues[key] }));
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`${prefix}_${String(key)}`);
    }
  }, [prefix, initialValues]);

  const clear = useCallback(() => {
    setValues(initialValues);
    
    if (typeof window !== 'undefined') {
      Object.keys(initialValues).forEach(key => {
        localStorage.removeItem(`${prefix}_${key}`);
      });
    }
  }, [prefix, initialValues]);

  return { values, get, set, remove, clear };
}