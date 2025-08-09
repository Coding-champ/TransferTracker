import { useCallback, useRef, useState, useEffect } from 'react';
import { 
  OptimisticUpdateConfig, 
  OptimisticUpdateResult 
} from './types';

/**
 * Hook for optimistic UI updates with automatic rollback on failures
 * 
 * Features:
 * - Optimistic UI updates for better UX
 * - Automatic rollback on API failures
 * - Conflict resolution strategies
 * - Network status awareness
 * - Batch optimistic updates
 * - Retry mechanisms with exponential backoff
 * 
 * @param initialState - Initial state value
 * @param config - Configuration options
 * @returns Object with state and optimistic update functions
 * 
 * @example
 * ```typescript
 * const {
 *   state,
 *   optimisticUpdate,
 *   isPending,
 *   rollbackAll
 * } = useOptimisticUpdates(transfers, {
 *   onConflict: 'merge', // or 'rollback' or 'ignore'
 *   retryConfig: { attempts: 3, delay: 1000 }
 * });
 * 
 * const handleTransferUpdate = async (transferId, newData) => {
 *   const result = await optimisticUpdate({
 *     id: `update-${transferId}`,
 *     update: (current) => current.map(t => 
 *       t.id === transferId ? { ...t, ...newData } : t
 *     ),
 *     serverOperation: () => api.updateTransfer(transferId, newData)
 *   });
 * };
 * ```
 */
export function useOptimisticUpdates<T>(
  initialState: T,
  config: {
    onConflict?: 'merge' | 'rollback' | 'ignore';
    retryConfig?: { attempts: number; delay: number };
    timeout?: number;
    onError?: (error: Error, updateId: string) => void;
    onSuccess?: (result: any, updateId: string) => void;
  } = {}
) {
  const {
    onConflict = 'rollback',
    retryConfig = { attempts: 3, delay: 1000 },
    timeout = 30000,
    onError,
    onSuccess
  } = config;

  // Current state (with optimistic updates applied)
  const [state, setState] = useState<T>(initialState);
  
  // Base state (without optimistic updates)
  const baseStateRef = useRef<T>(initialState);
  
  // Track pending optimistic updates
  const pendingUpdatesRef = useRef<Map<string, {
    originalUpdate: (current: T) => T;
    rollback: (current: T, original: T) => T;
    serverOperation: () => Promise<any>;
    timestamp: number;
    retryCount: number;
    timeout?: NodeJS.Timeout;
  }>>(new Map());

  // Network status tracking
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // Monitor network status
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Apply optimistic update to current state
  const applyOptimisticUpdate = useCallback((
    updateId: string,
    updateFn: (current: T) => T
  ) => {
    setState(currentState => {
      try {
        return updateFn(currentState);
      } catch (error) {
        console.error(`Failed to apply optimistic update ${updateId}:`, error);
        return currentState;
      }
    });
  }, []);

  // Rollback specific optimistic update
  const rollbackUpdate = useCallback((updateId: string) => {
    const pendingUpdate = pendingUpdatesRef.current.get(updateId);
    if (!pendingUpdate) return;

    setState(currentState => {
      try {
        return pendingUpdate.rollback 
          ? pendingUpdate.rollback(currentState, baseStateRef.current)
          : baseStateRef.current;
      } catch (error) {
        console.error(`Failed to rollback update ${updateId}:`, error);
        return baseStateRef.current; // Fallback to base state
      }
    });

    // Clear timeout
    if (pendingUpdate.timeout) {
      clearTimeout(pendingUpdate.timeout);
    }

    pendingUpdatesRef.current.delete(updateId);
  }, []);

  // Commit successful update to base state
  const commitUpdate = useCallback((updateId: string, serverResult?: any) => {
    const pendingUpdate = pendingUpdatesRef.current.get(updateId);
    if (!pendingUpdate) return;

    // Update base state with server result or current optimistic state
    if (serverResult && onConflict === 'merge') {
      // Merge server result with current state
      setState(currentState => {
        if (typeof serverResult === 'object' && currentState !== null && typeof currentState === 'object') {
          return { ...currentState as any, ...serverResult };
        }
        return serverResult;
      });
      baseStateRef.current = state;
    } else {
      // Use current optimistic state as new base
      baseStateRef.current = state;
    }

    // Clear timeout
    if (pendingUpdate.timeout) {
      clearTimeout(pendingUpdate.timeout);
    }

    pendingUpdatesRef.current.delete(updateId);
    
    onSuccess?.(serverResult, updateId);
  }, [state, onConflict, onSuccess]);

  // Retry failed update with exponential backoff
  const retryUpdate = useCallback(async (updateId: string): Promise<boolean> => {
    const pendingUpdate = pendingUpdatesRef.current.get(updateId);
    if (!pendingUpdate) return false;

    if (pendingUpdate.retryCount >= retryConfig.attempts) {
      rollbackUpdate(updateId);
      onError?.(new Error(`Max retry attempts reached for update ${updateId}`), updateId);
      return false;
    }

    // Exponential backoff delay
    const delay = retryConfig.delay * Math.pow(2, pendingUpdate.retryCount);
    
    try {
      await new Promise(resolve => setTimeout(resolve, delay));
      
      const result = await pendingUpdate.serverOperation();
      commitUpdate(updateId, result);
      return true;
    } catch (error) {
      pendingUpdate.retryCount++;
      
      if (pendingUpdate.retryCount >= retryConfig.attempts) {
        rollbackUpdate(updateId);
        onError?.(error as Error, updateId);
        return false;
      }
      
      // Schedule next retry
      return retryUpdate(updateId);
    }
  }, [retryConfig, rollbackUpdate, commitUpdate, onError]);

  // Main optimistic update function
  const optimisticUpdate = useCallback(async (
    updateConfig: OptimisticUpdateConfig<T> & {
      serverOperation: () => Promise<any>;
    }
  ): Promise<OptimisticUpdateResult<T>> => {
    const { id, update, rollback, serverOperation } = updateConfig;
    const updateTimeout = updateConfig.timeout || timeout;

    // Apply optimistic update immediately
    applyOptimisticUpdate(id, update);

    // Store pending update info
    const pendingUpdate = {
      originalUpdate: update,
      rollback: rollback || (() => baseStateRef.current),
      serverOperation,
      timestamp: Date.now(),
      retryCount: 0,
      timeout: undefined as NodeJS.Timeout | undefined
    };

    pendingUpdatesRef.current.set(id, pendingUpdate);

    // Set timeout for automatic rollback
    if (updateTimeout > 0) {
      pendingUpdate.timeout = setTimeout(() => {
        rollbackUpdate(id);
        onError?.(new Error(`Update ${id} timed out`), id);
      }, updateTimeout);
    }

    // Execute server operation (if online)
    const executeServerOperation = async (): Promise<void> => {
      if (!isOnline) {
        // Queue for when back online
        return;
      }

      try {
        const result = await serverOperation();
        commitUpdate(id, result);
      } catch (error) {
        if (retryConfig.attempts > 0) {
          pendingUpdate.retryCount++;
          await retryUpdate(id);
        } else {
          rollbackUpdate(id);
          onError?.(error as Error, id);
        }
      }
    };

    // Start server operation
    executeServerOperation();

    return {
      commit: async () => {
        const pending = pendingUpdatesRef.current.get(id);
        if (pending) {
          await executeServerOperation();
        }
      },
      rollback: () => rollbackUpdate(id),
      retry: async () => {
        await retryUpdate(id);
      }
    };
  }, [
    timeout,
    applyOptimisticUpdate,
    rollbackUpdate,
    commitUpdate,
    retryUpdate,
    isOnline,
    retryConfig,
    onError
  ]);

  // Batch multiple optimistic updates
  const batchOptimisticUpdate = useCallback(async (
    updates: Array<OptimisticUpdateConfig<T> & { serverOperation: () => Promise<any> }>
  ): Promise<OptimisticUpdateResult<T>[]> => {
    const results = await Promise.all(
      updates.map(update => optimisticUpdate(update))
    );

    return results;
  }, [optimisticUpdate]);

  // Rollback all pending updates
  const rollbackAll = useCallback(() => {
    const updateIds = Array.from(pendingUpdatesRef.current.keys());
    updateIds.forEach(rollbackUpdate);
    setState(baseStateRef.current);
  }, [rollbackUpdate]);

  // Get pending updates info
  const getPendingUpdates = useCallback(() => {
    return Array.from(pendingUpdatesRef.current.entries()).map(([id, update]) => ({
      id,
      timestamp: update.timestamp,
      retryCount: update.retryCount
    }));
  }, []);

  // Update base state (for external state changes)
  const updateBaseState = useCallback((newBaseState: T) => {
    baseStateRef.current = newBaseState;
    
    // If no pending updates, update current state too
    if (pendingUpdatesRef.current.size === 0) {
      setState(newBaseState);
    }
  }, []);

  // Retry all failed updates when coming back online
  useEffect(() => {
    if (isOnline && pendingUpdatesRef.current.size > 0) {
      const updateIds = Array.from(pendingUpdatesRef.current.keys());
      updateIds.forEach(retryUpdate);
    }
  }, [isOnline, retryUpdate]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      pendingUpdatesRef.current.forEach(update => {
        if (update.timeout) {
          clearTimeout(update.timeout);
        }
      });
    };
  }, []);

  return {
    state,
    baseState: baseStateRef.current,
    optimisticUpdate,
    batchOptimisticUpdate,
    rollbackUpdate,
    rollbackAll,
    updateBaseState,
    isPending: pendingUpdatesRef.current.size > 0,
    pendingCount: pendingUpdatesRef.current.size,
    getPendingUpdates,
    isOnline
  };
}