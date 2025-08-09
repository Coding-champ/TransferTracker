/**
 * Performance Types - Shared type definitions for performance monitoring hooks
 * 
 * Provides consistent type definitions across all performance hooks to ensure
 * zero overhead and proper TypeScript support.
 */

// Core performance metrics
export interface PerformanceThresholds {
  renderTime?: number; // Maximum render time in ms (default: 16.67ms for 60fps)
  memoryUsage?: number; // Maximum memory usage percentage (default: 80%)
  renderCount?: number; // Maximum renders per time window (default: 20)
  componentMountTime?: number; // Maximum component mount time in ms (default: 100ms)
}

export interface PerformanceConfig {
  enabled?: boolean; // Enable/disable performance monitoring
  throttle?: number; // Throttle interval for measurements in ms
  memoryTracking?: boolean; // Enable memory tracking
  renderTracking?: boolean; // Enable render tracking
  developmentOnly?: boolean; // Only enable in development mode
}

// Lazy loading types
export interface LazyLoadingOptions {
  fallback?: React.ComponentType | React.ReactElement | null;
  preload?: boolean; // Preload component on mount
  retryAttempts?: number; // Number of retry attempts on failure
  retryDelay?: number; // Delay between retries in ms
  timeout?: number; // Timeout for loading in ms
}

export interface LazyLoadingState {
  isLoaded: boolean;
  isLoading: boolean;
  error: Error | null;
  retryCount: number;
}

// Virtualization types
export interface VirtualizationOptions {
  itemHeight?: number | ((index: number) => number); // Fixed or dynamic item height
  overscan?: number; // Number of items to render outside visible area
  estimateSize?: boolean; // Enable dynamic size estimation
  scrollingDelay?: number; // Delay before stopping scroll optimization
  getScrollElement?: () => Element | null; // Custom scroll container
}

export interface VirtualizationState {
  startIndex: number;
  endIndex: number;
  visibleItems: Array<{ index: number; data: any }>;
  totalHeight: number;
  scrollTop: number;
  isScrolling: boolean;
}

export interface VirtualizationResult<T = any> {
  visibleItems: Array<{ index: number; data: T }>;
  scrollProps: {
    onScroll: (event: React.UIEvent) => void;
    style: React.CSSProperties;
  };
  containerRef: React.RefObject<HTMLDivElement>;
  totalHeight: number;
  isScrolling: boolean;
}

// Memory monitoring types
export interface MemoryThresholds {
  warningThreshold?: number; // Percentage to trigger warnings (default: 80%)
  criticalThreshold?: number; // Percentage to trigger critical alerts (default: 90%)
  leakThreshold?: number; // MB increase threshold for leak detection (default: 10MB)
  maxHistorySize?: number; // Maximum number of memory snapshots to keep
}

// Render tracking types
export interface RenderOptimizationOptions {
  trackProps?: boolean; // Track prop changes that cause renders
  trackState?: boolean; // Track state changes that cause renders
  logExcessiveRenders?: boolean; // Log warnings for excessive renders
  maxRenderFrequency?: number; // Maximum renders per second before warning
}

// Performance alerts
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlertType = 'render' | 'memory' | 'lifecycle' | 'lazy-loading' | 'virtualization';

export interface PerformanceAlert {
  id: string;
  timestamp: number;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  componentName?: string;
  metadata?: Record<string, any>;
}

// Component performance metrics
export interface ComponentMetrics {
  componentName: string;
  mountTime: number | null;
  renderCount: number;
  averageRenderTime: number;
  memoryUsage: number;
  lastActivity: number;
  alerts: PerformanceAlert[];
}

// Global performance statistics
export interface GlobalPerformanceStats {
  totalComponents: number;
  averageScore: number;
  criticalAlerts: number;
  memoryUsage: {
    current: number;
    peak: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  };
  renderingStats: {
    slowComponents: string[];
    excessiveRenderComponents: string[];
    averageRenderTime: number;
  };
}

// Hook options for zero-overhead design
export interface ZeroOverheadOptions {
  enabled?: boolean; // Master enable/disable switch
  developmentOnly?: boolean; // Only run in development
  throttle?: number; // Throttle expensive operations
  cleanup?: boolean; // Enable automatic cleanup
  maxDataPoints?: number; // Limit data retention
}

// Callback types for performance hooks
export interface PerformanceCallbacks {
  onThresholdExceeded?: (metric: string, value: number, threshold: number) => void;
  onAlert?: (alert: PerformanceAlert) => void;
  onMemoryLeak?: (componentName: string, trend: string) => void;
  onExcessiveRenders?: (componentName: string, renderCount: number) => void;
}

// Export utility type helpers
export type PerformanceHookOptions = ZeroOverheadOptions & PerformanceCallbacks;

// Re-export common React types for convenience
export type ComponentType<P = {}> = React.ComponentType<P>;
export type RefObject<T> = React.RefObject<T>;
export type MutableRefObject<T> = React.MutableRefObject<T>;
export type CSSProperties = React.CSSProperties;
export type UIEvent = React.UIEvent;