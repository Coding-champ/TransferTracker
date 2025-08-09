/**
 * useMemoryMonitor - Monitor memory usage and detect memory leaks
 * Provides real-time memory tracking and alerts for potential memory issues
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { performanceMetrics } from '../../utils/telemetry/performanceMetrics';
import { telemetryConfig } from '../../utils/telemetry/config';

export interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  external?: number;
}

export interface MemorySnapshot {
  timestamp: number;
  memory: MemoryInfo;
  componentName?: string;
  action?: string;
}

export interface MemoryStats {
  current: MemoryInfo | null;
  peak: MemoryInfo | null;
  average: MemoryInfo | null;
  trend: 'increasing' | 'decreasing' | 'stable';
  leakSuspected: boolean;
  utilizationPercentage: number;
  history: MemorySnapshot[];
}

export interface UseMemoryMonitorOptions {
  enabled?: boolean;
  interval?: number; // Monitoring interval in ms
  maxHistory?: number; // Max snapshots to keep
  leakThreshold?: number; // MB increase threshold for leak detection
  warningThreshold?: number; // Usage percentage to trigger warnings
}

/**
 * Hook to monitor memory usage and detect potential leaks
 */
export const useMemoryMonitor = (
  componentName?: string,
  options: UseMemoryMonitorOptions = {}
): MemoryStats => {
  const {
    enabled = process.env.NODE_ENV === 'development',
    interval = 5000, // 5 seconds
    maxHistory = 100,
    leakThreshold = 10, // 10MB
    warningThreshold = 80 // 80%
  } = options;

  const [memoryStats, setMemoryStats] = useState<MemoryStats>({
    current: null,
    peak: null,
    average: null,
    trend: 'stable',
    leakSuspected: false,
    utilizationPercentage: 0,
    history: []
  });

  const historyRef = useRef<MemorySnapshot[]>([]);
  const lastWarningRef = useRef<number>(0);

  /**
   * Get current memory information
   */
  const getCurrentMemory = useCallback((): MemoryInfo | null => {
    if (!enabled || typeof performance === 'undefined' || !(performance as any).memory) {
      return null;
    }

    const memory = (performance as any).memory;
    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      external: memory.external
    };
  }, [enabled]);

  /**
   * Analyze memory trend
   */
  const analyzeTrend = useCallback((history: MemorySnapshot[]): 'increasing' | 'decreasing' | 'stable' => {
    if (history.length < 5) return 'stable';

    const recent = history.slice(-5);
    const increases = recent.reduce((count, snapshot, index) => {
      if (index === 0) return 0;
      return snapshot.memory.usedJSHeapSize > recent[index - 1].memory.usedJSHeapSize ? count + 1 : count;
    }, 0);

    if (increases >= 4) return 'increasing';
    if (increases <= 1) return 'decreasing';
    return 'stable';
  }, []);

  /**
   * Detect potential memory leaks
   */
  const detectMemoryLeak = useCallback((history: MemorySnapshot[]): boolean => {
    if (history.length < 10) return false;

    const recent10 = history.slice(-10);
    const oldest = recent10[0];
    const newest = recent10[recent10.length - 1];
    
    const increaseMB = (newest.memory.usedJSHeapSize - oldest.memory.usedJSHeapSize) / (1024 * 1024);
    
    // Check if memory increased significantly over the last 10 snapshots
    return increaseMB > leakThreshold;
  }, [leakThreshold]);

  /**
   * Calculate average memory usage
   */
  const calculateAverage = useCallback((history: MemorySnapshot[]): MemoryInfo | null => {
    if (history.length === 0) return null;

    const sum = history.reduce((acc, snapshot) => ({
      usedJSHeapSize: acc.usedJSHeapSize + snapshot.memory.usedJSHeapSize,
      totalJSHeapSize: acc.totalJSHeapSize + snapshot.memory.totalJSHeapSize,
      jsHeapSizeLimit: acc.jsHeapSizeLimit + snapshot.memory.jsHeapSizeLimit,
      external: acc.external + (snapshot.memory.external || 0)
    }), {
      usedJSHeapSize: 0,
      totalJSHeapSize: 0,
      jsHeapSizeLimit: 0,
      external: 0
    });

    const count = history.length;
    return {
      usedJSHeapSize: sum.usedJSHeapSize / count,
      totalJSHeapSize: sum.totalJSHeapSize / count,
      jsHeapSizeLimit: sum.jsHeapSizeLimit / count,
      external: sum.external / count
    };
  }, []);

  /**
   * Take a memory snapshot
   */
  const takeSnapshot = useCallback((action?: string) => {
    const memory = getCurrentMemory();
    if (!memory) return;

    const snapshot: MemorySnapshot = {
      timestamp: Date.now(),
      memory,
      componentName,
      action
    };

    historyRef.current.push(snapshot);

    // Limit history size
    if (historyRef.current.length > maxHistory) {
      historyRef.current = historyRef.current.slice(-maxHistory);
    }

    // Track in global metrics - only when telemetry is enabled
    if (telemetryConfig.isEnabled()) {
      performanceMetrics.trackMemory(componentName);
    }

    // Update stats
    const history = historyRef.current;
    const peak = history.reduce((max, snapshot) => 
      snapshot.memory.usedJSHeapSize > (max?.usedJSHeapSize || 0) ? snapshot.memory : max
    , null as MemoryInfo | null);

    const average = calculateAverage(history);
    const trend = analyzeTrend(history);
    const leakSuspected = detectMemoryLeak(history);
    const utilizationPercentage = (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100;

    setMemoryStats({
      current: memory,
      peak,
      average,
      trend,
      leakSuspected,
      utilizationPercentage,
      history: [...history]
    });

    // Issue warnings for high memory usage or suspected leaks
    const now = Date.now();
    if (now - lastWarningRef.current > 30000) { // Throttle warnings to once per 30 seconds
      if (utilizationPercentage > warningThreshold) {
        console.warn(
          `🚨 High memory usage in ${componentName || 'unknown component'}:`,
          {
            current: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
            utilization: `${utilizationPercentage.toFixed(1)}%`,
            limit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB`
          }
        );
        lastWarningRef.current = now;
      }

      if (leakSuspected) {
        console.warn(
          `🔍 Potential memory leak detected in ${componentName || 'unknown component'}:`,
          {
            trend,
            increase: `${((history[history.length - 1].memory.usedJSHeapSize - history[Math.max(0, history.length - 10)].memory.usedJSHeapSize) / 1024 / 1024).toFixed(2)}MB over last 10 snapshots`
          }
        );
        lastWarningRef.current = now;
      }
    }
  }, [
    getCurrentMemory, 
    componentName, 
    maxHistory, 
    calculateAverage, 
    analyzeTrend, 
    detectMemoryLeak, 
    warningThreshold
  ]);

  // Automatic monitoring - only when enabled
  useEffect(() => {
    if (!enabled) return;

    const intervalId = setInterval(() => {
      takeSnapshot('auto');
    }, interval);

    // Take initial snapshot when enabled
    takeSnapshot('initial');

    return () => clearInterval(intervalId);
  }, [enabled, interval, takeSnapshot]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (enabled && componentName) {
        takeSnapshot('unmount');
      }
    };
  }, [enabled, componentName, takeSnapshot]);

  return memoryStats;
};

/**
 * Hook for global memory monitoring
 */
export const useGlobalMemoryMonitor = (options: UseMemoryMonitorOptions = {}) => {
  return useMemoryMonitor('Global', options);
};

/**
 * Hook to force garbage collection (if available) and measure impact
 */
export const useGarbageCollector = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [lastCollection, setLastCollection] = useState<{
    timestamp: number;
    beforeMB: number;
    afterMB: number;
    freedMB: number;
  } | null>(null);

  useEffect(() => {
    // Check if garbage collection is available (Chrome DevTools)
    setIsSupported(typeof (window as any).gc === 'function');
  }, []);

  const forceGC = useCallback(async () => {
    if (!isSupported || !(window as any).gc) {
      console.warn('Garbage collection not available. Open Chrome DevTools and enable "Expose GC" in settings.');
      return;
    }

    const beforeMemory = (performance as any).memory?.usedJSHeapSize || 0;
    const beforeMB = beforeMemory / 1024 / 1024;

    try {
      (window as any).gc();
      
      // Wait a bit for GC to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const afterMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const afterMB = afterMemory / 1024 / 1024;
      const freedMB = beforeMB - afterMB;

      const result = {
        timestamp: Date.now(),
        beforeMB,
        afterMB,
        freedMB
      };

      setLastCollection(result);
      
      console.log('🗑️ Garbage collection completed:', {
        freed: `${freedMB.toFixed(2)}MB`,
        before: `${beforeMB.toFixed(2)}MB`,
        after: `${afterMB.toFixed(2)}MB`
      });

      return result;
    } catch (error) {
      console.error('Failed to force garbage collection:', error);
    }
  }, [isSupported]);

  return {
    isSupported,
    forceGC,
    lastCollection
  };
};

/**
 * Higher-order component for automatic memory monitoring
 */
export function withMemoryMonitor<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: UseMemoryMonitorOptions = {}
): React.ComponentType<P> {
  const MemoryMonitoredComponent: React.FC<P> = (props: P) => {
    const componentName = WrappedComponent.displayName || WrappedComponent.name || 'Component';
    const memoryStats = useMemoryMonitor(componentName, options);

    // Add memory stats to dev tools (development only)
    if (process.env.NODE_ENV === 'development') {
      (WrappedComponent as any)._memoryStats = memoryStats;
    }

    return React.createElement(WrappedComponent, props);
  };

  MemoryMonitoredComponent.displayName = `withMemoryMonitor(${WrappedComponent.displayName || WrappedComponent.name})`;
  
  return MemoryMonitoredComponent;
}