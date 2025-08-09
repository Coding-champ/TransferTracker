/**
 * useRenderTracker - Monitor component re-renders and performance
 * Provides detailed insights into render behavior and optimization opportunities
 */

import React, { useEffect, useRef, useState } from 'react';
import { performanceMetrics } from '../../utils/telemetry/performanceMetrics';
import { telemetryConfig } from '../../utils/telemetry/config';

export interface RenderTracking {
  componentName: string;
  renderCount: number;
  lastRenderTime: number;
  totalRenderTime: number;
  averageRenderTime: number;
  propsChanges: Array<{
    timestamp: number;
    changedProps: string[];
  }>;
  isExcessive: boolean;
}

export interface UseRenderTrackerOptions {
  enabled?: boolean;
  threshold?: number; // Render time threshold in ms
  maxRenderCount?: number; // Max renders before flagging as excessive
  trackProps?: boolean;
  logExcessiveRenders?: boolean; // Log warnings for excessive renders
}

/**
 * Hook to track component render performance
 */
export const useRenderTracker = (
  componentName: string,
  props?: Record<string, any>,
  options: UseRenderTrackerOptions = {}
): RenderTracking => {
  const {
    enabled = process.env.NODE_ENV === 'development',
    threshold = 16.67, // 60fps threshold
    maxRenderCount = 20,
    trackProps = true,
    logExcessiveRenders = false
  } = options;

  const renderCountRef = useRef(0);
  const renderTimesRef = useRef<number[]>([]);
  const propsChangesRef = useRef<Array<{ timestamp: number; changedProps: string[] }>>([]);
  const lastPropsRef = useRef<Record<string, any>>();
  const renderStartTimeRef = useRef<number>();
  const [renderStats, setRenderStats] = useState<RenderTracking>({
    componentName,
    renderCount: 0,
    lastRenderTime: 0,
    totalRenderTime: 0,
    averageRenderTime: 0,
    propsChanges: [],
    isExcessive: false
  });

  // Track render start - only when enabled
  if (enabled) {
    renderStartTimeRef.current = performance.now();
    renderCountRef.current += 1;
  }

  // Track props changes
  useEffect(() => {
    if (!enabled || !trackProps || !props) return;

    const changedProps: string[] = [];
    
    if (lastPropsRef.current) {
      Object.keys(props).forEach(key => {
        if (props[key] !== lastPropsRef.current![key]) {
          changedProps.push(key);
        }
      });

      // Check for removed props
      Object.keys(lastPropsRef.current).forEach(key => {
        if (!(key in props)) {
          changedProps.push(`-${key}`);
        }
      });
    }

    if (changedProps.length > 0) {
      const change = {
        timestamp: Date.now(),
        changedProps
      };
      propsChangesRef.current.push(change);
      
      // Keep only last 50 changes to prevent memory leaks
      if (propsChangesRef.current.length > 50) {
        propsChangesRef.current = propsChangesRef.current.slice(-25);
      }
    }

    lastPropsRef.current = { ...props };
  }, [enabled, trackProps, props]);

  // Track render end and update stats
  useEffect(() => {
    if (!enabled || !renderStartTimeRef.current) return;

    const renderTime = performance.now() - renderStartTimeRef.current;
    renderTimesRef.current.push(renderTime);

    // Keep only last 100 render times to prevent memory leaks
    if (renderTimesRef.current.length > 100) {
      renderTimesRef.current = renderTimesRef.current.slice(-50);
    }

    const totalRenderTime = renderTimesRef.current.reduce((sum, time) => sum + time, 0);
    const averageRenderTime = totalRenderTime / renderTimesRef.current.length;
    const isExcessive = renderCountRef.current > maxRenderCount || averageRenderTime > threshold;

    // Track in performance metrics only when telemetry is enabled
    if (telemetryConfig.isEnabled()) {
      const changedProps = propsChangesRef.current.length > 0 
        ? propsChangesRef.current[propsChangesRef.current.length - 1].changedProps 
        : [];
      
      performanceMetrics.trackRender(componentName, renderTime, changedProps);
    }

    // Update local state
    setRenderStats({
      componentName,
      renderCount: renderCountRef.current,
      lastRenderTime: renderTime,
      totalRenderTime,
      averageRenderTime,
      propsChanges: [...propsChangesRef.current],
      isExcessive
    });

    // Log warning for excessive renders only when enabled
    if (isExcessive && logExcessiveRenders && renderCountRef.current % 10 === 0) {
      console.warn(
        `🚨 ${componentName}: Excessive renders detected`,
        {
          renderCount: renderCountRef.current,
          averageRenderTime: averageRenderTime.toFixed(2),
          threshold,
          recentPropsChanges: propsChangesRef.current.slice(-5)
        }
      );
    }
  }, [enabled, maxRenderCount, threshold, componentName, logExcessiveRenders]);

  return renderStats;
};

/**
 * Hook to get render statistics for multiple components
 */
export const useGlobalRenderStats = () => {
  const [stats, setStats] = useState({
    totalComponents: 0,
    excessiveRenders: 0,
    averageRenderTime: 0
  });

  useEffect(() => {
    const updateStats = () => {
      // Only collect stats when telemetry is enabled
      if (telemetryConfig.isEnabled()) {
        const summary = performanceMetrics.getSummary();
        setStats({
          totalComponents: summary.componentCount,
          excessiveRenders: summary.excessiveRenders,
          averageRenderTime: summary.averageRenderTime
        });
      } else {
        // Reset stats when disabled
        setStats({
          totalComponents: 0,
          excessiveRenders: 0,
          averageRenderTime: 0
        });
      }
    };

    updateStats();
    
    // Only start interval when telemetry is enabled - check initial state
    if (!telemetryConfig.isEnabled()) return;
    
    const interval = setInterval(() => {
      // Double-check before updating to prevent unnecessary work
      if (telemetryConfig.isEnabled()) {
        updateStats();
      }
    }, 10000); // Increased to 10 seconds and only when enabled

    return () => clearInterval(interval);
  }, []); // Remove dependencies to prevent interval recreation

  return stats;
};

/**
 * Hook to track render performance with automatic component name detection
 */
export const useAutoRenderTracker = (
  props?: Record<string, any>,
  options: UseRenderTrackerOptions = {}
): RenderTracking => {
  // Try to get component name from React DevTools or stack trace
  const componentName = useRef<string>();
  
  if (!componentName.current) {
    // Fallback to stack trace parsing
    const stack = new Error().stack;
    const match = stack?.match(/at\s+([A-Z][A-Za-z0-9]+)/);
    componentName.current = match ? match[1] : 'UnknownComponent';
  }

  return useRenderTracker(componentName.current, props, options);
};

/**
 * Higher-order component for automatic render tracking
 */
export function withRenderTracker<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string,
  options: UseRenderTrackerOptions = {}
): React.ComponentType<P> {
  const TrackedComponent: React.FC<P> = (props: P) => {
    const name = componentName || WrappedComponent.displayName || WrappedComponent.name || 'Component';
    const renderStats = useRenderTracker(name, props, options);

    // Add render stats to dev tools (development only)
    if (process.env.NODE_ENV === 'development') {
      (WrappedComponent as any)._renderStats = renderStats;
    }

    return React.createElement(WrappedComponent, props);
  };

  TrackedComponent.displayName = `withRenderTracker(${componentName || WrappedComponent.displayName || WrappedComponent.name})`;
  
  return TrackedComponent;
}