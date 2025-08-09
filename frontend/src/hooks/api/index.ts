/**
 * Phase 4: API & Network Hooks - Central Exports
 * 
 * Enhanced API layer with bulletproof networking, intelligent caching,
 * error recovery, and zero unnecessary CPU overhead.
 * 
 * @example Core Usage:
 * ```typescript
 * // Enhanced API Query
 * const { data, loading, error, refetch } = useApiQuery(
 *   () => fetch('/api/transfers'),
 *   [filters],
 *   { cache: true, staleWhileRevalidate: true }
 * );
 * 
 * // API Mutation with optimistic updates
 * const { mutate, loading } = useApiMutation(
 *   (data) => fetch('/api/transfers', { method: 'POST', body: JSON.stringify(data) }),
 *   {
 *     onMutate: (variables) => ({ ...variables, id: 'temp-' + Date.now() }),
 *     onSuccess: () => queryClient.invalidateQueries(['transfers'])
 *   }
 * );
 * ```
 */

// ===== Legacy API Hooks (Backward Compatibility) =====
export { 
  useApiCall, 
  useSimpleApiCall,
  type ApiCallConfig,
  type ApiCallState,
  type UseApiCallReturn
} from './useApiCall';

export { 
  useFilterData,
  useFilterCategory,
  useLeagues
} from './useFilterData';

// ===== Phase 4: Enhanced API Hooks =====
export { useApiQuery } from './useApiQuery';
export { useApiMutation } from './useApiMutation';
export { useApiCache } from './useApiCache';

// ===== Network & Performance Hooks =====
export { useNetworkStatus } from './useNetworkStatus';
export { useRequestDeduplication } from './useRequestDeduplication';
export { useErrorRecovery } from './useErrorRecovery';
export { useOfflineSync } from './useOfflineSync';
export { useRequestQueue } from './useRequestQueue';

// ===== Type Definitions =====
export type {
  // Core API Types
  ApiQueryOptions,
  ApiQueryState,
  ApiQueryResult,
  ApiMutationOptions,
  ApiMutationState,
  ApiMutationResult,
  
  // Cache Types
  CacheEntry,
  CacheOptions,
  CacheState,
  
  // Network Types
  NetworkCondition,
  NetworkStatusOptions,
  NetworkStatusState,
  
  // Error Recovery Types
  ErrorClassification,
  ErrorRecoveryOptions,
  ErrorRecoveryState,
  
  // Request Management Types
  QueuedRequest,
  RequestQueueOptions,
  RequestQueueState,
  DeduplicationOptions,
  DeduplicationState,
  
  // Offline Sync Types
  OfflineAction,
  OfflineSyncOptions,
  OfflineSyncState,
  
  // Utility Types
  RequestConfig,
  RequestMethod,
  ApiHookConfig
} from './types';

// Import types for utility functions
import type { 
  RequestConfig, 
  ApiQueryOptions, 
  ApiMutationOptions, 
  CacheOptions, 
  NetworkStatusOptions 
} from './types';

// Import hooks for utility functions
import { useApiQuery } from './useApiQuery';
import { useApiMutation } from './useApiMutation';

// ===== Utility Functions =====

/**
 * Create a standardized cache key for API requests
 */
export const createCacheKey = (
  url: string, 
  params?: Record<string, any>,
  prefix: string = 'api'
): string => {
  const paramsString = params ? JSON.stringify(params) : '';
  return `${prefix}:${url}:${paramsString}`;
};

/**
 * Create request configuration from URL and options
 */
export const createRequestConfig = (
  url: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    params?: Record<string, any>;
    data?: any;
    headers?: Record<string, string>;
    timeout?: number;
  } = {}
): RequestConfig => ({
  url,
  method: options.method || 'GET',
  params: options.params,
  data: options.data,
  headers: {
    'Content-Type': 'application/json',
    ...options.headers
  },
  timeout: options.timeout || 30000
});

// ===== Default Configurations =====

/**
 * Default API query options optimized for performance
 */
export const DEFAULT_QUERY_OPTIONS: ApiQueryOptions = {
  cache: true,
  cacheTTL: 5 * 60 * 1000, // 5 minutes
  deduplicate: true,
  staleWhileRevalidate: true,
  refetchOnWindowFocus: true,
  retry: 3,
  retryDelay: 1000,
  offline: true
};

/**
 * Default mutation options optimized for UX
 */
export const DEFAULT_MUTATION_OPTIONS: ApiMutationOptions<any, any> = {
  retry: false,
  offline: true
};

/**
 * Default cache options optimized for memory efficiency
 */
export const DEFAULT_CACHE_OPTIONS: CacheOptions = {
  maxSize: 100,
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  lru: true,
  warming: false,
  selectiveInvalidation: true
};

/**
 * Default network status options for adaptive behavior
 */
export const DEFAULT_NETWORK_OPTIONS: NetworkStatusOptions = {
  adaptiveLoading: true,
  bandwidthMonitoring: true,
  qualityThreshold: 'medium'
};

// ===== Hook Composition Utilities =====

/**
 * Composed hook for complete API functionality
 * Combines query, cache, network status, and error recovery
 */
export const useEnhancedApi = <T>(
  queryFn: () => Promise<T>,
  deps: any[] = [],
  options: ApiQueryOptions = {}
) => {
  const mergedOptions = { ...DEFAULT_QUERY_OPTIONS, ...options };
  
  return useApiQuery(queryFn, deps, mergedOptions);
};

/**
 * Composed hook for mutation with full offline support
 */
export const useEnhancedMutation = <TData, TVariables = any>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: ApiMutationOptions<TData, TVariables> = {}
) => {
  const mergedOptions = { ...DEFAULT_MUTATION_OPTIONS, ...options };
  
  return useApiMutation(mutationFn, mergedOptions);
};

// ===== Development Utilities =====

/**
 * Debug logging for API hooks (only in development)
 */
export const debugLog = (context: string, message: string, data?: any) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[API-${context}] ${message}`, data || '');
  }
};

/**
 * API hook performance timer
 */
export const createApiTimer = (context: string) => {
  const start = performance.now();
  return () => {
    const duration = performance.now() - start;
    debugLog('Performance', `${context} took ${duration.toFixed(2)}ms`);
    return duration;
  };
};