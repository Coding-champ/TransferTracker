import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { 
  StateSelector, 
  StateSubscription, 
  GlobalStateConfig, 
  StateAction, 
  StateMiddleware 
} from './types';

/**
 * Enhanced global state management hook with selective subscriptions
 * 
 * Features:
 * - Selective state subscriptions to prevent unnecessary re-renders
 * - Built-in state persistence
 * - TypeScript generics for type safety
 * - Middleware support
 * - DevTools integration
 * 
 * @example
 * ```typescript
 * interface AppState {
 *   user: User | null;
 *   theme: 'light' | 'dark';
 *   filters: FilterState;
 * }
 * 
 * const [state, dispatch, subscribe] = useGlobalState<AppState>({
 *   initialState: { user: null, theme: 'light', filters: {} },
 *   persistence: { enabled: true, key: 'app-state' }
 * });
 * 
 * // Selective subscription - only re-renders when user changes
 * const user = subscribe(state => state.user);
 * ```
 */
export function useGlobalState<T extends Record<string, any>>(
  config: GlobalStateConfig<T>
) {
  const { 
    initialState, 
    persistence = { enabled: false, key: 'global-state' },
    devTools = process.env.NODE_ENV === 'development',
    middleware = []
  } = config;

  // State management
  const [state, setStateInternal] = useState<T>(() => {
    if (persistence.enabled && typeof window !== 'undefined') {
      try {
        const storage = persistence.storage === 'sessionStorage' 
          ? sessionStorage 
          : localStorage;
        const saved = storage.getItem(persistence.key);
        if (saved) {
          return { ...initialState, ...JSON.parse(saved) };
        }
      } catch (error) {
        console.warn('Failed to load persisted state:', error);
      }
    }
    return initialState;
  });

  // Subscriptions management
  const subscriptionsRef = useRef<Map<string, StateSubscription<T>>>(new Map());
  const selectorCacheRef = useRef<Map<string, any>>(new Map());

  // DevTools integration
  const devToolsRef = useRef<any>(null);
  useEffect(() => {
    if (devTools && typeof window !== 'undefined' && (window as any).__REDUX_DEVTOOLS_EXTENSION__) {
      devToolsRef.current = (window as any).__REDUX_DEVTOOLS_EXTENSION__.connect({
        name: 'Global State',
        trace: true
      });
      devToolsRef.current.init(state);
    }
  }, [devTools]);

  // State persistence
  useEffect(() => {
    if (persistence.enabled && typeof window !== 'undefined') {
      try {
        const storage = persistence.storage === 'sessionStorage' 
          ? sessionStorage 
          : localStorage;
        storage.setItem(persistence.key, JSON.stringify(state));
      } catch (error) {
        console.warn('Failed to persist state:', error);
      }
    }
  }, [state, persistence]);

  // Middleware chain execution
  const executeMiddleware = useCallback((action: StateAction, next: () => void) => {
    if (middleware.length === 0) {
      next();
      return;
    }

    let index = 0;
    const runMiddleware = (actionToPass: StateAction) => {
      if (index >= middleware.length) {
        next();
        return;
      }

      const currentMiddleware = middleware[index++];
      currentMiddleware(state, actionToPass, runMiddleware);
    };

    runMiddleware(action);
  }, [middleware, state]);

  // Enhanced dispatch with middleware and DevTools support
  const dispatch = useCallback((action: StateAction) => {
    const enhancedAction: StateAction = {
      ...action,
      meta: {
        timestamp: Date.now(),
        ...action.meta
      }
    };

    executeMiddleware(enhancedAction, () => {
      setStateInternal(prevState => {
        let newState = prevState;

        // Apply action based on type
        if (typeof action.payload === 'function') {
          newState = action.payload(prevState);
        } else if (action.type === 'SET_STATE') {
          newState = { ...prevState, ...action.payload };
        } else if (action.type === 'RESET_STATE') {
          newState = initialState;
        } else if (action.type === 'UPDATE_FIELD') {
          const { field, value } = action.payload;
          newState = { ...prevState, [field]: value };
        }

        // DevTools integration
        if (devToolsRef.current) {
          devToolsRef.current.send(enhancedAction.type, newState);
        }

        // Notify subscribers
        subscriptionsRef.current.forEach((subscription) => {
          try {
            const newValue = subscription.selector(newState);
            const previousValue = selectorCacheRef.current.get(subscription.id);
            
            if (newValue !== previousValue) {
              selectorCacheRef.current.set(subscription.id, newValue);
              subscription.callback(newValue, previousValue);
            }
          } catch (error) {
            console.warn('Error in state subscription:', error);
          }
        });

        return newState;
      });
    });
  }, [executeMiddleware, initialState]);

  // Selective state subscription hook
  const useSubscription = useCallback(<R>(
    selector: StateSelector<T, R>
  ): R => {
    const subscriptionId = useRef(`sub_${Date.now()}_${Math.random()}`);
    const [selectedValue, setSelectedValue] = useState<R>(() => {
      const value = selector(state);
      selectorCacheRef.current.set(subscriptionId.current, value);
      return value;
    });

    useEffect(() => {
      const subscription: StateSubscription<T> = {
        id: subscriptionId.current,
        selector,
        callback: (newValue: R) => setSelectedValue(newValue)
      };

      subscriptionsRef.current.set(subscriptionId.current, subscription);

      return () => {
        subscriptionsRef.current.delete(subscriptionId.current);
        selectorCacheRef.current.delete(subscriptionId.current);
      };
    }, [selector]);

    // Update when state changes
    useEffect(() => {
      const newValue = selector(state);
      const previousValue = selectorCacheRef.current.get(subscriptionId.current);
      
      if (newValue !== previousValue) {
        selectorCacheRef.current.set(subscriptionId.current, newValue);
        setSelectedValue(newValue);
      }
    }, [state, selector]);

    return selectedValue;
  }, [state]);

  // Get selected value from state (non-hook version for testing)
  const getSelectedValue = useCallback(<R>(
    selector: StateSelector<T, R>
  ): R => {
    return selector(state);
  }, [state]);

  // Utility actions
  const setState = useCallback((newState: Partial<T> | ((prev: T) => T)) => {
    dispatch({
      type: 'SET_STATE',
      payload: newState
    });
  }, [dispatch]);

  const resetState = useCallback(() => {
    dispatch({ type: 'RESET_STATE' });
  }, [dispatch]);

  const updateField = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    dispatch({
      type: 'UPDATE_FIELD',
      payload: { field, value }
    });
  }, [dispatch]);

  // Performance metrics
  const metrics = useMemo(() => ({
    subscriptionCount: subscriptionsRef.current.size,
    cacheSize: selectorCacheRef.current.size,
    stateSize: JSON.stringify(state).length
  }), [state]);

  return {
    state,
    dispatch,
    useSubscription,
    getSelectedValue,
    setState,
    resetState,
    updateField,
    metrics
  };
}

/**
 * Hook for creating state actions with proper typing
 */
export function useStateActions<T>(dispatch: (action: StateAction) => void) {
  return useMemo(() => ({
    setState: (payload: Partial<T> | ((prev: T) => T)) => 
      dispatch({ type: 'SET_STATE', payload }),
    
    resetState: () => 
      dispatch({ type: 'RESET_STATE' }),
    
    updateField: <K extends keyof T>(field: K, value: T[K]) => 
      dispatch({ type: 'UPDATE_FIELD', payload: { field, value } }),
    
    batchUpdate: (updates: Array<{ field: keyof T; value: any }>) => 
      dispatch({ type: 'BATCH_UPDATE', payload: updates }),
    
    customAction: (type: string, payload?: any) => 
      dispatch({ type, payload })
  }), [dispatch]);
}

/**
 * Middleware for logging state changes
 */
export const loggingMiddleware: StateMiddleware<any> = (state, action, next) => {
  if (process.env.NODE_ENV === 'development') {
    console.group(`🔄 State Action: ${action.type}`);
    console.log('Previous State:', state);
    console.log('Action:', action);
    next(action);
    console.log('Next State:', state);
    console.groupEnd();
  } else {
    next(action);
  }
};

/**
 * Middleware for performance monitoring
 */
export const performanceMiddleware: StateMiddleware<any> = (state, action, next) => {
  const start = performance.now();
  next(action);
  const end = performance.now();
  
  if (end - start > 16) { // More than one frame
    console.warn(`Slow state update: ${action.type} took ${end - start}ms`);
  }
};