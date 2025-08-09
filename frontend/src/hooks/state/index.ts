/**
 * Phase 3: State Management Hooks Export Index
 * 
 * Comprehensive state management hooks with enhanced features:
 * - Global state management with selective subscriptions
 * - Persistent storage (localStorage/sessionStorage) with compression
 * - State history with undo/redo functionality
 * - Optimistic updates with rollback
 * - Real-time synchronization
 * - Advanced caching with TTL and eviction policies
 * - Data mutation with conflict resolution
 * - Form state management with validation
 * - Field validation with async support
 */

// Import React hooks for the utility functions
import { useState, useCallback } from 'react';
import { useGlobalState } from './useGlobalState';
import { useFormState } from './useFormState';
import { useStateHistory } from './useStateHistory';
import { useOptimisticUpdates } from './useOptimisticUpdates';
import { useCacheManager } from './useCacheManager';

// Core State Management
export { useGlobalState, useStateActions, loggingMiddleware, performanceMiddleware } from './useGlobalState';
export { useSessionStorage, useSessionStorageState, useTemporarySessionStorage } from './useSessionStorage';
export { useStateHistory, useFormStateHistory } from './useStateHistory';
export { useOptimisticUpdates } from './useOptimisticUpdates';

// Data Synchronization
export { useRealtimeSync } from './useRealtimeSync';
export { useCacheManager } from './useCacheManager';
export { useDataMutation, useBatchMutation, useSequentialMutation } from './useDataMutation';

// Form Management
export { useFormState } from './useFormState';
export { useFieldValidator, useMultiFieldValidator } from './useFieldValidator';

// Types
export type {
  // Global State Types
  StateSelector,
  StateSubscription,
  GlobalStateConfig,
  StateMiddleware,
  StateAction,
  
  // State History Types
  StateHistoryEntry,
  StateHistoryConfig,
  
  // Optimistic Updates Types
  OptimisticUpdateConfig,
  OptimisticUpdateResult,
  
  // Real-time Sync Types
  RealtimeSyncConfig,
  RealtimeSyncMessage,
  
  // Cache Types
  CacheConfig,
  CacheEntry,
  
  // Form Types
  FormFieldConfig,
  ValidationRule,
  FormError,
  FormState,
  
  // Storage Types
  StorageConfig,
  
  // Mutation Types
  MutationConfig,
  MutationResult
} from './types';

// Utility hooks for common patterns - using functions instead of object properties
/**
 * Create a global state manager with persistence
 */
export function createPersistedGlobalState<T extends Record<string, any>>(initialState: T, key: string) {
  return () => useGlobalState({
    initialState,
    persistence: { enabled: true, key }
  });
}

/**
 * Create a form with validation and history
 */
export function createFormWithHistory<T extends Record<string, any>>(initialValues: T) {
  return () => {
    const formState = useFormState(initialValues);
    const history = useStateHistory(initialValues);
    
    return {
      ...formState,
      ...history,
      setValueWithHistory: (name: keyof T, value: T[keyof T]) => {
        formState.setValue(name, value);
        history.setState(formState.values);
      }
    };
  };
}

/**
 * Create optimistic updates with cache invalidation
 */
export function createOptimisticWithCache<T>(initialState: T, cacheKeys: string[]) {
  return () => {
    const optimistic = useOptimisticUpdates(initialState);
    const cache = useCacheManager();
    
    return {
      ...optimistic,
      optimisticUpdateWithInvalidation: async (config: any) => {
        const result = await optimistic.optimisticUpdate(config);
        cacheKeys.forEach(key => cache.remove(key));
        return result;
      }
    };
  };
}

// Performance monitoring for state hooks
export const useStatePerformance = () => {
  const [metrics, setMetrics] = useState({
    renders: 0,
    stateUpdates: 0,
    cacheHits: 0,
    cacheMisses: 0
  });
  
  const trackRender = useCallback(() => {
    setMetrics(prev => ({ ...prev, renders: prev.renders + 1 }));
  }, []);
  
  const trackStateUpdate = useCallback(() => {
    setMetrics(prev => ({ ...prev, stateUpdates: prev.stateUpdates + 1 }));
  }, []);
  
  const trackCacheHit = useCallback(() => {
    setMetrics(prev => ({ ...prev, cacheHits: prev.cacheHits + 1 }));
  }, []);
  
  const trackCacheMiss = useCallback(() => {
    setMetrics(prev => ({ ...prev, cacheMisses: prev.cacheMisses + 1 }));
  }, []);
  
  return {
    metrics,
    trackRender,
    trackStateUpdate,
    trackCacheHit,
    trackCacheMiss,
    reset: () => setMetrics({ renders: 0, stateUpdates: 0, cacheHits: 0, cacheMisses: 0 })
  };
};