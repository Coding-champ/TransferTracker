/**
 * useApiMutation Hook
 * 
 * Standardized mutation handling for POST/PUT/DELETE operations with:
 * - Optimistic updates integration
 * - Automatic error rollback
 * - Request queuing for offline scenarios
 * - Performance optimizations
 */

import { useState, useCallback, useRef } from 'react';
import { ApiMutationOptions, ApiMutationResult, RequestConfig } from './types';
import { useOfflineSync } from './useOfflineSync';
import { useErrorRecovery } from './useErrorRecovery';
import { useNetworkStatus } from './useNetworkStatus';
import { useToast } from '../../contexts/ToastContext';

/**
 * Enhanced API mutation hook for create/update/delete operations
 * 
 * @param mutationFn - Function that executes the mutation
 * @param options - Mutation options including optimistic updates and error handling
 * @returns Mutation state and execution functions
 */
export function useApiMutation<TData, TVariables = any>(
  mutationFn: (variables: TVariables) => Promise<TData> | RequestConfig,
  options: ApiMutationOptions<TData, TVariables> = {}
): ApiMutationResult<TData, TVariables> {
  const {
    onMutate,
    onSuccess,
    onError,
    onSettled,
    retry = false,
    retryDelay = 1000,
    offline = true
  } = options;

  // Core state
  const [state, setState] = useState<{
    data: TData | null;
    loading: boolean;
    error: string | null;
    status: 'idle' | 'loading' | 'success' | 'error';
  }>({
    data: null,
    loading: false,
    error: null,
    status: 'idle'
  });

  // Hook dependencies
  const { showToast } = useToast();
  const offlineSync = useOfflineSync({ enableQueue: offline });
  const errorRecovery = useErrorRecovery({
    autoRetry: typeof retry === 'boolean' ? retry : true,
    maxRetries: typeof retry === 'number' ? retry : 3,
    retryStrategy: 'exponential'
  });
  const networkStatus = useNetworkStatus();

  // Refs for cleanup and rollback
  const rollbackRef = useRef<(() => void) | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Execute mutation with all optimizations
  const executeMutation = useCallback(async (variables: TVariables): Promise<TData> => {
    let optimisticData: TData | undefined;
    
    try {
      // Setup abort controller
      abortControllerRef.current = new AbortController();

      // Execute optimistic update
      if (onMutate) {
        optimisticData = onMutate(variables);
        if (optimisticData) {
          setState(prev => ({
            ...prev,
            data: optimisticData!,
            loading: true,
            error: null,
            status: 'loading'
          }));
        }
      } else {
        setState(prev => ({
          ...prev,
          loading: true,
          error: null,
          status: 'loading'
        }));
      }

      // Check if offline and queue if necessary
      if (!networkStatus.isOnline && offline) {
        const offlineAction = {
          id: `mutation-${Date.now()}-${Math.random()}`,
          type: 'mutation' as const,
          request: () => executeMutationRequest(variables),
          metadata: {
            url: 'unknown', // Will be determined by mutationFn
            method: 'POST', // Default, will be overridden by RequestConfig
            payload: variables,
            timestamp: Date.now()
          }
        };

        offlineSync.queueAction(offlineAction);
        
        showToast('Request queued for when you\'re back online', { type: 'info' });
        
        // Return optimistic data or throw error
        if (optimisticData) {
          setState(prev => ({
            ...prev,
            loading: false,
            status: 'success'
          }));
          return optimisticData;
        } else {
          throw new Error('No network connection available');
        }
      }

      // Execute the actual mutation
      const result = await executeMutationRequest(variables);

      // Update state with real data
      setState(prev => ({
        ...prev,
        data: result,
        loading: false,
        error: null,
        status: 'success'
      }));

      // Clear error recovery state on success
      errorRecovery.reset();

      // Call success callback
      if (onSuccess) {
        onSuccess(result, variables);
      }

      return result;

    } catch (error: any) {
      // Handle aborted requests
      if (error.name === 'AbortError') {
        throw error;
      }

      // Execute rollback if optimistic update was applied
      if (optimisticData && rollbackRef.current) {
        rollbackRef.current();
        rollbackRef.current = null;
      }

      // Attempt error recovery
      const canRecover = await errorRecovery.handleError(error);
      
      if (canRecover) {
        // Retry will be handled by error recovery
        return executeMutation(variables);
      }

      // Update error state
      const errorMessage = error.message || 'Mutation failed';
      setState(prev => ({
        ...prev,
        data: optimisticData ? null : prev.data, // Keep previous data if no optimistic update
        loading: false,
        error: errorMessage,
        status: 'error'
      }));

      // Call error callback with rollback function
      if (onError) {
        onError(error, variables, rollbackRef.current || undefined);
      }

      // Show error toast
      showToast(errorMessage, { type: 'error' });

      throw error;

    } finally {
      // Call settled callback
      if (onSettled) {
        onSettled(state.data || undefined, state.error ? new Error(state.error) : null, variables);
      }

      // Cleanup
      abortControllerRef.current = null;
    }
  }, [
    mutationFn, onMutate, onSuccess, onError, onSettled, retry, offline,
    networkStatus, offlineSync, errorRecovery, showToast
  ]);

  // Execute the actual mutation request
  const executeMutationRequest = useCallback(async (variables: TVariables): Promise<TData> => {
    const mutationResult = await mutationFn(variables);

    // Handle both Promise<TData> and RequestConfig returns
    if (mutationResult && typeof mutationResult === 'object' && 'url' in mutationResult) {
      // It's a RequestConfig, execute with fetch
      const { url, method = 'POST', params, data, headers, timeout } = mutationResult as RequestConfig;
      
      const fetchOptions: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: data ? JSON.stringify(data) : JSON.stringify(variables),
        signal: abortControllerRef.current?.signal
      };

      const urlWithParams = params ? 
        `${url}?${new URLSearchParams(params).toString()}` : url;
      
      const response = await fetch(urlWithParams, fetchOptions);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Handle different response types
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        return await response.json();
      } else {
        // Return response status for non-JSON responses
        return { success: true, status: response.status } as TData;
      }
    } else {
      // It's already a Promise<TData>
      return mutationResult as TData;
    }
  }, [mutationFn]);

  // Synchronous mutation execution
  const mutate = useCallback((variables: TVariables) => {
    executeMutation(variables).catch(() => {
      // Error is already handled in executeMutation
    });
  }, [executeMutation]);

  // Asynchronous mutation execution (returns promise)
  const mutateAsync = useCallback(async (variables: TVariables): Promise<TData> => {
    return await executeMutation(variables);
  }, [executeMutation]);

  // Reset mutation state
  const reset = useCallback(() => {
    // Cancel any ongoing mutation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Reset state
    setState({
      data: null,
      loading: false,
      error: null,
      status: 'idle'
    });

    // Clear rollback
    rollbackRef.current = null;

    // Reset error recovery
    errorRecovery.reset();
  }, [errorRecovery]);

  // Mutation result
  return {
    ...state,
    mutate,
    mutateAsync,
    reset
  };
}

export default useApiMutation;