/**
 * Optimized Hooks Index
 * Exports all performance-optimized hooks and monitoring utilities
 * Phase 3: Added State Management Hooks
 */

// State Management Hooks (Phase 3)
export * from './state';

// API hooks - explicit exports to avoid naming conflicts
export { 
  useApiCall, 
  useSimpleApiCall,
  useFilterData,
  useFilterCategory,
  useLeagues,
  useApiQuery,
  useApiMutation,
  useApiCache,
  useNetworkStatus,
  useRequestDeduplication,
  useErrorRecovery,
  useOfflineSync,
  useRequestQueue,
  createCacheKey,
  createRequestConfig,
  DEFAULT_QUERY_OPTIONS,
  DEFAULT_MUTATION_OPTIONS,
  DEFAULT_CACHE_OPTIONS,
  DEFAULT_NETWORK_OPTIONS,
  useEnhancedApi,
  useEnhancedMutation,
  debugLog,
  createApiTimer,
  type ApiCallConfig,
  type ApiCallState,
  type UseApiCallReturn,
  type ApiQueryOptions,
  type ApiQueryState,
  type ApiQueryResult,
  type ApiMutationOptions,
  type ApiMutationState,
  type ApiMutationResult,
  type NetworkCondition,
  type NetworkStatusOptions,
  type NetworkStatusState,
  type ErrorClassification,
  type ErrorRecoveryOptions,
  type ErrorRecoveryState,
  type QueuedRequest,
  type RequestQueueOptions,
  type RequestQueueState,
  type DeduplicationOptions,
  type DeduplicationState,
  type OfflineAction,
  type OfflineSyncOptions,
  type OfflineSyncState,
  type RequestConfig,
  type RequestMethod,
  type ApiHookConfig
} from './api';

// Rename the conflicting type to avoid collision with state CacheEntry
export type { CacheEntry as ApiCacheEntry, CacheOptions, CacheState } from './api';

// Performance hooks  
export { useMemoizedCallback, useThrottledCallback, useDebouncedCallback } from './performance/useMemoizedCallback';
export { useShallowMemo, useShallowMemoFilters, useShallowMemoArray, useStableObject, useStableArray } from './performance/useShallowMemo';
export { useRenderTracker, useGlobalRenderStats, useAutoRenderTracker, withRenderTracker } from './performance/useRenderTracker';
export { useMemoryMonitor, useGlobalMemoryMonitor, useGarbageCollector, withMemoryMonitor } from './performance/useMemoryMonitor';
export { usePerformanceMetrics, useGlobalPerformanceStats, withPerformanceMetrics } from './performance/usePerformanceMetrics';
export { useThrottle, useThrottledValue, useThrottledAsync } from './performance/useThrottle';

// UI hooks
export * from './ui';

// Cache hooks (legacy - keeping for backward compatibility)
export { useRequestDeduplication as useRequestDeduplicationLegacy, useStaleWhileRevalidate } from './cache/useRequestDeduplication';

// Data hooks
export { useOptimizedNetworkData } from './data/useOptimizedNetworkData';
export { useTransferData, useAnalyticsData } from './data/useTransferData';

// Migration hooks
export { useGradualMigration, useSimpleMigration } from './migration/useGradualMigration';
export { useMigrationCompare, useAutoOptimize } from './migration/useMigrationCompare';
export { migrationConfig } from './migration/migrationConfig';

// Optimized hooks
export { default as useOptimizedNetwork } from './optimized/useOptimizedNetwork';
export { default as useOptimizedFilters } from './optimized/useOptimizedFilters';
export { default as useOptimizedCache } from './optimized/useOptimizedCache';

// Enhanced legacy hooks (backward compatible with improvements)
export { useNetworkData } from './useNetworkData';
export { 
  useDebounce, 
  useDebouncedCallback as useDebouncedCallbackLegacy, 
  useDebouncedExecutor 
} from './useDebounce';

// Hook migration utilities
export const MIGRATED_HOOKS = {
  useNetworkData: 'useOptimizedNetwork',
  useTransferData: 'useOptimizedCache',
  useFilterData: 'useFilterData', // Enhanced in API hooks
  useAppContext: 'useGlobalState', // Phase 3 replacement
  // Add more migrations as needed
} as const;