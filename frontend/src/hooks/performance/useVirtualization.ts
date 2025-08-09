/**
 * useVirtualization - Zero-overhead list virtualization hook
 * 
 * Provides efficient virtualization for large lists with minimal CPU usage.
 * Only renders visible items plus a small overscan buffer.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { telemetryConfig } from '../../utils/telemetry/config';
import { performanceMetrics } from '../../utils/telemetry/performanceMetrics';
import type { 
  VirtualizationOptions, 
  VirtualizationState, 
  VirtualizationResult,
  PerformanceHookOptions 
} from './types';

export interface UseVirtualizationOptions extends VirtualizationOptions, PerformanceHookOptions {
  // Inherited options from base types
}

interface ItemMetrics {
  height: number;
  offset: number;
}

/**
 * Hook for virtualizing large lists with zero overhead when disabled
 */
export const useVirtualization = <T = any>(
  items: T[],
  options: UseVirtualizationOptions = {}
): VirtualizationResult<T> => {
  const {
    enabled = true,
    developmentOnly = false,
    itemHeight = 50,
    overscan = 5,
    estimateSize = false,
    scrollingDelay = 150,
    getScrollElement,
    throttle = 16, // 60fps throttling
    maxDataPoints = 1000,
    onThresholdExceeded
  } = options;

  // Early return if disabled to ensure zero overhead
  const isEnabled = enabled && (!developmentOnly || process.env.NODE_ENV === 'development');
  
  const [state, setState] = useState<VirtualizationState>({
    startIndex: 0,
    endIndex: 0,
    visibleItems: [],
    totalHeight: 0,
    scrollTop: 0,
    isScrolling: false
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const itemMetricsRef = useRef<Map<number, ItemMetrics>>(new Map());
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  const lastScrollTimeRef = useRef<number>(0);
  const rafRef = useRef<number>();
  const heightCacheRef = useRef<number[]>([]);

  /**
   * Get item height - supports both fixed and dynamic heights
   */
  const getItemHeight = useCallback((index: number): number => {
    if (typeof itemHeight === 'function') {
      return itemHeight(index);
    }
    
    if (estimateSize && heightCacheRef.current[index]) {
      return heightCacheRef.current[index];
    }
    
    return typeof itemHeight === 'number' ? itemHeight : 50;
  }, [itemHeight, estimateSize]);

  /**
   * Calculate item metrics (height and offset)
   */
  const calculateItemMetrics = useCallback((index: number): ItemMetrics => {
    const cached = itemMetricsRef.current.get(index);
    if (cached) return cached;

    let offset = 0;
    for (let i = 0; i < index; i++) {
      offset += getItemHeight(i);
    }

    const height = getItemHeight(index);
    const metrics = { height, offset };
    
    itemMetricsRef.current.set(index, metrics);
    return metrics;
  }, [getItemHeight]);

  /**
   * Get total height of all items
   */
  const getTotalHeight = useCallback((): number => {
    if (items.length === 0) return 0;
    
    let total = 0;
    for (let i = 0; i < items.length; i++) {
      total += getItemHeight(i);
    }
    return total;
  }, [items.length, getItemHeight]);

  /**
   * Binary search to find item index at given offset
   */
  const findItemIndexAtOffset = useCallback((offset: number): number => {
    let low = 0;
    let high = items.length - 1;
    
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const { offset: midOffset, height } = calculateItemMetrics(mid);
      
      if (offset >= midOffset && offset < midOffset + height) {
        return mid;
      } else if (offset < midOffset) {
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }
    
    return Math.max(0, Math.min(items.length - 1, low));
  }, [items.length, calculateItemMetrics]);

  /**
   * Calculate visible range based on scroll position and container height
   */
  const calculateVisibleRange = useCallback((scrollTop: number, containerHeight: number) => {
    if (items.length === 0) {
      return { startIndex: 0, endIndex: 0 };
    }

    const startIndex = Math.max(0, findItemIndexAtOffset(scrollTop) - overscan);
    
    let endIndex = startIndex;
    let currentOffset = calculateItemMetrics(startIndex).offset;
    
    while (endIndex < items.length && currentOffset < scrollTop + containerHeight + overscan * getItemHeight(endIndex)) {
      currentOffset += getItemHeight(endIndex);
      endIndex++;
    }
    
    endIndex = Math.min(items.length - 1, endIndex + overscan);
    
    return { startIndex, endIndex };
  }, [items.length, findItemIndexAtOffset, overscan, calculateItemMetrics, getItemHeight]);

  /**
   * Update state with new scroll position
   */
  const updateScrollState = useCallback((scrollTop: number) => {
    if (!isEnabled || !containerRef.current) return;

    const now = performance.now();
    if (throttle > 0 && now - lastScrollTimeRef.current < throttle) {
      return;
    }
    lastScrollTimeRef.current = now;

    const containerHeight = containerRef.current.clientHeight;
    const totalHeight = getTotalHeight();
    const { startIndex, endIndex } = calculateVisibleRange(scrollTop, containerHeight);

    const visibleItems: Array<{ index: number; data: T }> = [];
    for (let i = startIndex; i <= endIndex; i++) {
      if (i < items.length) {
        visibleItems.push({
          index: i,
          data: items[i]
        });
      }
    }

    setState(prev => ({
      ...prev,
      startIndex,
      endIndex,
      visibleItems,
      totalHeight,
      scrollTop,
      isScrolling: true
    }));

    // Track performance metrics
    if (telemetryConfig.isEnabled()) {
      const visibleCount = endIndex - startIndex + 1;
      performanceMetrics.trackRender('Virtualization', scrollTop, [`visible:${visibleCount}`, `total:${items.length}`]);

      // Alert if rendering too many items
      if (visibleCount > 50 && onThresholdExceeded) {
        onThresholdExceeded('visibleItems', visibleCount, 50);
      }
    }

    // Clear scrolling state after delay
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    scrollTimeoutRef.current = setTimeout(() => {
      setState(prev => ({ ...prev, isScrolling: false }));
    }, scrollingDelay);

  }, [
    isEnabled,
    throttle,
    getTotalHeight,
    calculateVisibleRange,
    items,
    scrollingDelay,
    onThresholdExceeded
  ]);

  /**
   * Handle scroll events with RAF optimization
   */
  const handleScroll = useCallback((event: React.UIEvent) => {
    if (!isEnabled) return;

    const target = event.currentTarget as HTMLElement;
    const scrollTop = target.scrollTop;

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      updateScrollState(scrollTop);
    });
  }, [isEnabled, updateScrollState]);

  /**
   * Memoized scroll props to prevent unnecessary re-renders
   */
  const scrollProps = useMemo(() => ({
    onScroll: handleScroll,
    style: {
      height: '100%',
      overflow: 'auto'
    } as React.CSSProperties
  }), [handleScroll]);

  // Initialize visible items on mount or items change
  useEffect(() => {
    if (!isEnabled || !containerRef.current) return;

    // Clear cache when items change to prevent stale data
    if (items.length !== itemMetricsRef.current.size) {
      itemMetricsRef.current.clear();
      heightCacheRef.current = [];
    }

    const containerHeight = containerRef.current.clientHeight;
    updateScrollState(0);
  }, [isEnabled, items, updateScrollState]);

  // Update item height cache for dynamic sizing
  useEffect(() => {
    if (!estimateSize || !isEnabled) return;

    const observer = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        const index = parseInt(entry.target.getAttribute('data-index') || '0', 10);
        const height = entry.contentRect.height;
        
        if (heightCacheRef.current[index] !== height) {
          heightCacheRef.current[index] = height;
          itemMetricsRef.current.delete(index); // Invalidate cache
          
          // Recalculate visible range if needed
          if (containerRef.current) {
            updateScrollState(state.scrollTop);
          }
        }
      });
    });

    // Observe visible items for size changes
    const container = containerRef.current;
    if (container) {
      const items = container.querySelectorAll('[data-index]');
      items.forEach(item => observer.observe(item));
    }

    return () => observer.disconnect();
  }, [isEnabled, estimateSize, state.scrollTop, updateScrollState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  // Return early with minimal overhead if disabled
  if (!isEnabled) {
    return {
      visibleItems: items.map((data, index) => ({ index, data })),
      scrollProps: { onScroll: () => {}, style: {} },
      containerRef: { current: null } as React.RefObject<HTMLDivElement>,
      totalHeight: items.length * 50, // Fallback height
      isScrolling: false
    };
  }

  return {
    visibleItems: state.visibleItems,
    scrollProps,
    containerRef,
    totalHeight: state.totalHeight,
    isScrolling: state.isScrolling
  };
};

/**
 * Hook for virtualizing a window-based list (infinite scroll)
 */
export const useWindowVirtualization = <T = any>(
  items: T[],
  options: UseVirtualizationOptions = {}
): VirtualizationResult<T> & { loadMore: () => void } => {
  const virtualization = useVirtualization(items, options);
  const [hasMore, setHasMore] = useState(true);
  const loadingRef = useRef(false);

  const loadMore = useCallback(() => {
    if (loadingRef.current || !hasMore) return;
    
    loadingRef.current = true;
    
    // Trigger load more logic here
    // This would typically be handled by the parent component
    
    setTimeout(() => {
      loadingRef.current = false;
    }, 100);
  }, [hasMore]);

  // Check if we need to load more items
  useEffect(() => {
    const lastVisibleIndex = virtualization.visibleItems.length > 0 
      ? virtualization.visibleItems[virtualization.visibleItems.length - 1].index 
      : 0;
    if (lastVisibleIndex >= items.length - 5 && hasMore) {
      loadMore();
    }
  }, [virtualization.visibleItems, items.length, hasMore, loadMore]);

  return {
    ...virtualization,
    loadMore
  };
};

/**
 * Higher-order component for virtualized lists
 */
export function withVirtualization<P extends { items: any[] }>(
  WrappedComponent: React.ComponentType<P>,
  options: UseVirtualizationOptions = {}
): React.ComponentType<P> {
  const VirtualizedComponent: React.FC<P> = (props: P) => {
    const virtualization = useVirtualization(props.items, options);

    const enhancedProps = {
      ...props,
      virtualization
    } as P & { virtualization: VirtualizationResult };

    return React.createElement(WrappedComponent, enhancedProps);
  };

  VirtualizedComponent.displayName = `withVirtualization(${WrappedComponent.displayName || WrappedComponent.name})`;
  
  return VirtualizedComponent;
}