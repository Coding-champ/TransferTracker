/**
 * Performance Hooks - Zero CPU Overhead Implementation
 * 
 * Complete suite of performance monitoring, optimization, and memory management hooks
 * designed for zero unnecessary CPU usage and optimal React performance.
 */

// Core performance types
export type * from './types';

// Memory optimization hooks
export { 
  useMemoizedCallback, 
  useThrottledCallback, 
  useDebouncedCallback 
} from './useMemoizedCallback';

export { 
  useShallowMemo, 
  useShallowMemoFilters, 
  useShallowMemoArray, 
  useStableObject, 
  useStableArray 
} from './useShallowMemo';

export { 
  useThrottle, 
  useThrottledValue, 
  useThrottledAsync 
} from './useThrottle';

// Performance monitoring hooks
export { 
  useRenderTracker, 
  useGlobalRenderStats, 
  useAutoRenderTracker, 
  withRenderTracker 
} from './useRenderTracker';

export { 
  useMemoryMonitor, 
  useGlobalMemoryMonitor, 
  useGarbageCollector, 
  withMemoryMonitor 
} from './useMemoryMonitor';

export { 
  usePerformanceMetrics, 
  useGlobalPerformanceStats, 
  withPerformanceMetrics 
} from './usePerformanceMetrics';

// Component optimization hooks
export { 
  useLazyLoading, 
  withLazyLoading, 
  createLazyComponent 
} from './useLazyLoading';

export { 
  useVirtualization, 
  useWindowVirtualization, 
  withVirtualization 
} from './useVirtualization';