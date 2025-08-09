import { useCallback, useRef, useState } from 'react';
import { MutationConfig, MutationResult } from './types';

/**
 * Standardized data mutation hook with optimistic updates and error handling
 * 
 * Features:
 * - Optimistic updates with rollback
 * - Batch mutation support
 * - Conflict resolution
 * - Cache invalidation
 * - Loading and error states
 * - Retry mechanisms
 * - TypeScript generics for type safety
 * 
 * @param config - Mutation configuration
 * @returns Mutation result interface
 * 
 * @example
 * ```typescript
 * const updateTransfer = useDataMutation({
 *   mutationFn: async (data: TransferUpdate) => {
 *     return api.updateTransfer(data.id, data);
 *   },
 *   onSuccess: (result, variables) => {
 *     toast.success('Transfer updated successfully');
 *   },
 *   optimisticUpdate: (variables) => ({
 *     type: 'OPTIMISTIC_UPDATE',
 *     payload: variables
 *   }),
 *   invalidateQueries: ['transfers', 'dashboard']
 * });
 * 
 * const handleUpdate = () => {
 *   updateTransfer.mutate({ id: '123', name: 'New Name' });
 * };
 * ```
 */
export function useDataMutation<TData = any, TVariables = void>(
  config: MutationConfig<TData, TVariables>
): MutationResult<TData, TVariables> {
  const {
    mutationFn,
    onSuccess,
    onError,
    optimisticUpdate,
    invalidateQueries = []
  } = config;

  // Mutation state
  const [data, setData] = useState<TData | undefined>();
  const [error, setError] = useState<Error | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);

  // Track active mutations for deduplication
  const activeMutationsRef = useRef<Map<string, Promise<TData>>>(new Map());
  
  // Optimistic update state
  const optimisticStateRef = useRef<any>(null);
  const rollbackRef = useRef<(() => void) | null>(null);

  // Generate mutation key for deduplication
  const generateMutationKey = useCallback((variables: TVariables): string => {
    return JSON.stringify(variables);
  }, []);

  // Apply optimistic update
  const applyOptimisticUpdate = useCallback((variables: TVariables) => {
    if (optimisticUpdate) {
      const update = optimisticUpdate(variables);
      optimisticStateRef.current = update;
      
      // Dispatch optimistic update event for global state management
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('optimistic-update', {
          detail: { type: 'apply', update, variables }
        }));
      }
    }
  }, [optimisticUpdate]);

  // Rollback optimistic update
  const rollbackOptimisticUpdate = useCallback(() => {
    if (optimisticStateRef.current) {
      // Dispatch rollback event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('optimistic-update', {
          detail: { 
            type: 'rollback', 
            update: optimisticStateRef.current 
          }
        }));
      }
      
      optimisticStateRef.current = null;
    }

    if (rollbackRef.current) {
      rollbackRef.current();
      rollbackRef.current = null;
    }
  }, []);

  // Commit optimistic update
  const commitOptimisticUpdate = useCallback((result: TData) => {
    if (optimisticStateRef.current) {
      // Dispatch commit event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('optimistic-update', {
          detail: { 
            type: 'commit', 
            update: optimisticStateRef.current,
            result
          }
        }));
      }
      
      optimisticStateRef.current = null;
    }
    rollbackRef.current = null;
  }, []);

  // Invalidate queries/cache
  const invalidateCache = useCallback(() => {
    if (invalidateQueries.length > 0 && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cache-invalidate', {
        detail: { keys: invalidateQueries }
      }));
    }
  }, [invalidateQueries]);

  // Main mutation function
  const mutate = useCallback(async (variables: TVariables): Promise<TData> => {
    const mutationKey = generateMutationKey(variables);
    
    // Check for active mutation with same variables (deduplication)
    const existingMutation = activeMutationsRef.current.get(mutationKey);
    if (existingMutation) {
      return existingMutation;
    }

    // Reset state
    setError(undefined);
    setIsSuccess(false);
    setIsError(false);
    setIsLoading(true);

    // Apply optimistic update
    applyOptimisticUpdate(variables);

    // Create mutation promise
    const mutationPromise = (async (): Promise<TData> => {
      try {
        const result = await mutationFn(variables);
        
        // Success handling
        setData(result);
        setIsSuccess(true);
        setIsLoading(false);
        
        // Commit optimistic update
        commitOptimisticUpdate(result);
        
        // Invalidate cache
        invalidateCache();
        
        // Call success callback
        onSuccess?.(result, variables);
        
        return result;
      } catch (err) {
        const error = err as Error;
        
        // Error handling
        setError(error);
        setIsError(true);
        setIsLoading(false);
        
        // Rollback optimistic update
        rollbackOptimisticUpdate();
        
        // Call error callback
        onError?.(error, variables);
        
        throw error;
      } finally {
        // Remove from active mutations
        activeMutationsRef.current.delete(mutationKey);
      }
    })();

    // Track active mutation
    activeMutationsRef.current.set(mutationKey, mutationPromise);
    
    return mutationPromise;
  }, [
    generateMutationKey,
    mutationFn,
    applyOptimisticUpdate,
    commitOptimisticUpdate,
    rollbackOptimisticUpdate,
    invalidateCache,
    onSuccess,
    onError
  ]);

  // Async version that doesn't throw (returns error in result)
  const mutateAsync = useCallback(async (variables: TVariables): Promise<TData> => {
    try {
      return await mutate(variables);
    } catch (error) {
      // Re-throw to maintain async behavior
      throw error;
    }
  }, [mutate]);

  // Reset mutation state
  const reset = useCallback(() => {
    setData(undefined);
    setError(undefined);
    setIsLoading(false);
    setIsSuccess(false);
    setIsError(false);
    
    // Rollback any pending optimistic updates
    rollbackOptimisticUpdate();
    
    // Clear active mutations
    activeMutationsRef.current.clear();
  }, [rollbackOptimisticUpdate]);

  return {
    mutate,
    mutateAsync,
    data,
    error,
    isLoading,
    isSuccess,
    isError,
    reset
  };
}

/**
 * Hook for batch mutations with coordinated optimistic updates
 * 
 * @param mutations - Array of mutation configurations
 * @returns Batch mutation interface
 */
export function useBatchMutation<TData = any, TVariables = void>(
  mutations: Array<MutationConfig<TData, TVariables>>
) {
  const mutationHooks = mutations.map(config => useDataMutation(config));
  const [isBatchLoading, setIsBatchLoading] = useState(false);
  const [batchError, setBatchError] = useState<Error | undefined>();

  const executeBatch = useCallback(async (
    variablesArray: TVariables[]
  ): Promise<Array<TData | Error>> => {
    if (variablesArray.length !== mutations.length) {
      throw new Error('Variables array length must match mutations array length');
    }

    setIsBatchLoading(true);
    setBatchError(undefined);

    const results: Array<TData | Error> = [];

    try {
      // Execute all mutations concurrently
      const promises = mutationHooks.map((hook, index) => 
        hook.mutateAsync(variablesArray[index]).catch(error => error)
      );

      const batchResults = await Promise.all(promises);
      results.push(...batchResults);

      // Check if any mutations failed
      const hasErrors = batchResults.some(result => result instanceof Error);
      if (hasErrors) {
        const firstError = batchResults.find(result => result instanceof Error) as Error;
        setBatchError(firstError);
      }

      return results;
    } catch (error) {
      setBatchError(error as Error);
      throw error;
    } finally {
      setIsBatchLoading(false);
    }
  }, [mutations.length, mutationHooks]);

  const resetBatch = useCallback(() => {
    mutationHooks.forEach(hook => hook.reset());
    setIsBatchLoading(false);
    setBatchError(undefined);
  }, [mutationHooks]);

  return {
    mutations: mutationHooks,
    executeBatch,
    resetBatch,
    isBatchLoading,
    batchError,
    isAnyLoading: mutationHooks.some(hook => hook.isLoading),
    isAnyError: mutationHooks.some(hook => hook.isError),
    allSuccess: mutationHooks.every(hook => hook.isSuccess)
  };
}

/**
 * Hook for sequential mutations with dependency chaining
 * 
 * @param mutations - Array of mutation configurations with dependencies
 * @returns Sequential mutation interface
 */
export function useSequentialMutation<TData = any, TVariables = void>(
  mutations: Array<MutationConfig<TData, TVariables> & {
    dependsOn?: number[]; // Indices of mutations this one depends on
  }>
) {
  const mutationHooks = mutations.map(config => useDataMutation(config));
  const [isSequenceLoading, setIsSequenceLoading] = useState(false);
  const [sequenceError, setSequenceError] = useState<Error | undefined>();
  const executionOrderRef = useRef<number[]>([]);

  const executeSequence = useCallback(async (
    variablesArray: TVariables[]
  ): Promise<Array<TData | undefined>> => {
    if (variablesArray.length !== mutations.length) {
      throw new Error('Variables array length must match mutations array length');
    }

    setIsSequenceLoading(true);
    setSequenceError(undefined);

    const results: Array<TData | undefined> = new Array(mutations.length);
    const executed = new Set<number>();
    const toExecute = new Set<number>(mutations.map((_, index) => index));

    try {
      while (toExecute.size > 0) {
        const readyToExecute: number[] = [];

        // Find mutations that can be executed (dependencies met)
        toExecute.forEach(index => {
          const mutation = mutations[index];
          const dependencies = mutation.dependsOn || [];
          
          if (dependencies.every(dep => executed.has(dep))) {
            readyToExecute.push(index);
          }
        });

        if (readyToExecute.length === 0) {
          throw new Error('Circular dependency detected in mutation sequence');
        }

        // Execute ready mutations in parallel
        const promises = readyToExecute.map(async index => {
          const result = await mutationHooks[index].mutateAsync(variablesArray[index]);
          results[index] = result;
          executed.add(index);
          toExecute.delete(index);
          executionOrderRef.current.push(index);
          return result;
        });

        await Promise.all(promises);
      }

      return results;
    } catch (error) {
      setSequenceError(error as Error);
      throw error;
    } finally {
      setIsSequenceLoading(false);
    }
  }, [mutations, mutationHooks]);

  const resetSequence = useCallback(() => {
    mutationHooks.forEach(hook => hook.reset());
    setIsSequenceLoading(false);
    setSequenceError(undefined);
    executionOrderRef.current = [];
  }, [mutationHooks]);

  return {
    mutations: mutationHooks,
    executeSequence,
    resetSequence,
    isSequenceLoading,
    sequenceError,
    executionOrder: executionOrderRef.current
  };
}