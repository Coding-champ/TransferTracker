/**
 * Optimized Hooks Index
 * Exports all performance-optimized hooks
 */

// Performance hooks
export { useMemoizedCallback, useThrottledCallback, useDebouncedCallback } from './performance/useMemoizedCallback';
export { useShallowMemo, useShallowMemoFilters, useShallowMemoArray, useStableObject, useStableArray } from './performance/useShallowMemo';

// Cache hooks
export { useApiCache } from './cache/useApiCache';
export { useRequestDeduplication, useStaleWhileRevalidate } from './cache/useRequestDeduplication';

// Data hooks
export { useOptimizedNetworkData } from './data/useOptimizedNetworkData';
export { useTransferData, useAnalyticsData } from './data/useTransferData';

// Legacy hooks (for backward compatibility)
export { useNetworkData } from './useNetworkData';
export { useDebounce } from './useDebounce';