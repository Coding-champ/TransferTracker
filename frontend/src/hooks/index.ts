/**
 * Optimized Hooks Index
 * Exports all performance-optimized hooks and monitoring utilities
 */

// Performance hooks
export { useMemoizedCallback, useThrottledCallback, useDebouncedCallback } from './performance/useMemoizedCallback';
export { useShallowMemo, useShallowMemoFilters, useShallowMemoArray, useStableObject, useStableArray } from './performance/useShallowMemo';
export { useRenderTracker, useGlobalRenderStats, useAutoRenderTracker, withRenderTracker } from './performance/useRenderTracker';
export { useMemoryMonitor, useGlobalMemoryMonitor, useGarbageCollector, withMemoryMonitor } from './performance/useMemoryMonitor';
export { usePerformanceMetrics, useGlobalPerformanceStats, withPerformanceMetrics } from './performance/usePerformanceMetrics';

// Cache hooks
export { useApiCache } from './cache/useApiCache';
export { useRequestDeduplication, useStaleWhileRevalidate } from './cache/useRequestDeduplication';

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

// Legacy hooks (for backward compatibility)
export { useNetworkData } from './useNetworkData';
export { useDebounce } from './useDebounce';

// Hook migration utilities
export const MIGRATED_HOOKS = {
  useNetworkData: 'useOptimizedNetwork',
  useTransferData: 'useOptimizedCache',
  // Add more migrations as needed
} as const;