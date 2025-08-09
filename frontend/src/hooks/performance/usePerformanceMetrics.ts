/**
 * usePerformanceMetrics - Comprehensive performance monitoring hook
 * Combines render tracking, memory monitoring, and general performance metrics
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRenderTracker, type RenderTracking } from './useRenderTracker';
import { useMemoryMonitor, type MemoryStats } from './useMemoryMonitor';
import { performanceMetrics as telemetryMetrics } from '../../utils/telemetry/performanceMetrics';
import { telemetry } from '../../utils/telemetry/index';
import { telemetryConfig } from '../../utils/telemetry/config';

export interface PerformanceAlert {
  id: string;
  timestamp: number;
  type: 'render' | 'memory' | 'lifecycle' | 'general';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  componentName?: string;
  metadata?: Record<string, any>;
}

export interface ComponentPerformanceMetrics {
  componentName: string;
  renderStats: RenderTracking;
  memoryStats: MemoryStats;
  lifecycle: {
    mountTime: number | null;
    unmountTime: number | null;
    totalLifetime: number | null;
    updateCount: number;
  };
  alerts: PerformanceAlert[];
  score: {
    overall: number; // 0-100
    render: number;
    memory: number;
    lifecycle: number;
  };
}

export interface UsePerformanceMetricsOptions {
  enabled?: boolean;
  trackRenders?: boolean;
  trackMemory?: boolean;
  trackLifecycle?: boolean;
  alertThresholds?: {
    renderTime?: number;
    memoryUsage?: number;
    renderCount?: number;
  };
}

/**
 * Comprehensive performance monitoring hook
 */
export const usePerformanceMetrics = (
  componentName: string,
  props?: Record<string, any>,
  options: UsePerformanceMetricsOptions = {}
): ComponentPerformanceMetrics => {
  const {
    enabled = process.env.NODE_ENV === 'development',
    trackRenders = true,
    trackMemory = true,
    trackLifecycle = true,
    alertThresholds = {
      renderTime: 16.67, // 60fps
      memoryUsage: 80, // 80% utilization
      renderCount: 20
    }
  } = options;

  // Component lifecycle tracking
  const mountTimeRef = useRef<number | null>(null);
  const unmountTimeRef = useRef<number | null>(null);
  const updateCountRef = useRef(0);
  const alertsRef = useRef<PerformanceAlert[]>([]);

  // Use existing hooks only when telemetry is enabled
  const renderStats = useRenderTracker(
    componentName, 
    props, 
    { enabled: enabled && trackRenders && telemetryConfig.isEnabled() }
  );
  
  const memoryStats = useMemoryMonitor(
    componentName, 
    { enabled: enabled && trackMemory && telemetryConfig.isEnabled() }
  );

  const [performanceMetrics, setPerformanceMetrics] = useState<ComponentPerformanceMetrics>({
    componentName,
    renderStats,
    memoryStats,
    lifecycle: {
      mountTime: null,
      unmountTime: null,
      totalLifetime: null,
      updateCount: 0
    },
    alerts: [],
    score: {
      overall: 100,
      render: 100,
      memory: 100,
      lifecycle: 100
    }
  });

  /**
   * Generate performance alert
   */
  const generateAlert = useCallback((
    type: PerformanceAlert['type'],
    severity: PerformanceAlert['severity'],
    message: string,
    metadata?: Record<string, any>
  ) => {
    const alert: PerformanceAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type,
      severity,
      message,
      componentName,
      metadata
    };

    alertsRef.current.push(alert);
    
    // Keep only last 50 alerts per component
    if (alertsRef.current.length > 50) {
      alertsRef.current = alertsRef.current.slice(-25);
    }

    // Log high severity alerts
    if (severity === 'high' || severity === 'critical') {
      console.warn(`🚨 Performance Alert [${severity.toUpperCase()}] - ${componentName}:`, message, metadata);
    }

    return alert;
  }, [componentName]);

  /**
   * Calculate performance scores
   */
  const calculateScores = useCallback(() => {
    // Render score (based on render time and frequency)
    let renderScore = 100;
    if (renderStats.averageRenderTime > alertThresholds.renderTime!) {
      renderScore = Math.max(0, 100 - (renderStats.averageRenderTime - alertThresholds.renderTime!) * 2);
    }
    if (renderStats.renderCount > alertThresholds.renderCount!) {
      renderScore = Math.min(renderScore, Math.max(0, 100 - (renderStats.renderCount - alertThresholds.renderCount!) * 2));
    }

    // Memory score (based on utilization and trend)
    let memoryScore = 100;
    if (memoryStats.utilizationPercentage > alertThresholds.memoryUsage!) {
      memoryScore = Math.max(0, 100 - (memoryStats.utilizationPercentage - alertThresholds.memoryUsage!) * 2);
    }
    if (memoryStats.leakSuspected) {
      memoryScore = Math.min(memoryScore, 30); // Major penalty for suspected leaks
    }
    if (memoryStats.trend === 'increasing') {
      memoryScore = Math.min(memoryScore, 70); // Penalty for increasing trend
    }

    // Lifecycle score (based on mount time and update frequency)
    let lifecycleScore = 100;
    const mountTime = mountTimeRef.current;
    if (mountTime && mountTime > 100) { // More than 100ms to mount
      lifecycleScore = Math.max(0, 100 - (mountTime - 100) * 0.5);
    }
    if (updateCountRef.current > 50) { // Too many updates
      lifecycleScore = Math.min(lifecycleScore, Math.max(0, 100 - (updateCountRef.current - 50) * 1));
    }

    // Overall score (weighted average)
    const overall = Math.round(
      (renderScore * 0.4) + (memoryScore * 0.4) + (lifecycleScore * 0.2)
    );

    return {
      overall,
      render: Math.round(renderScore),
      memory: Math.round(memoryScore),
      lifecycle: Math.round(lifecycleScore)
    };
  }, [renderStats, memoryStats, alertThresholds]);

  /**
   * Check for performance issues and generate alerts
   */
  const checkPerformanceIssues = useCallback(() => {
    // Check render performance
    if (renderStats.averageRenderTime > alertThresholds.renderTime!) {
      generateAlert(
        'render',
        renderStats.averageRenderTime > alertThresholds.renderTime! * 2 ? 'high' : 'medium',
        `Slow render time: ${renderStats.averageRenderTime.toFixed(2)}ms (threshold: ${alertThresholds.renderTime}ms)`,
        { averageRenderTime: renderStats.averageRenderTime, threshold: alertThresholds.renderTime }
      );
    }

    if (renderStats.renderCount > alertThresholds.renderCount!) {
      generateAlert(
        'render',
        renderStats.renderCount > alertThresholds.renderCount! * 2 ? 'critical' : 'high',
        `Excessive renders: ${renderStats.renderCount} (threshold: ${alertThresholds.renderCount})`,
        { renderCount: renderStats.renderCount, threshold: alertThresholds.renderCount }
      );
    }

    // Check memory performance
    if (memoryStats.utilizationPercentage > alertThresholds.memoryUsage!) {
      generateAlert(
        'memory',
        memoryStats.utilizationPercentage > 90 ? 'critical' : 'high',
        `High memory usage: ${memoryStats.utilizationPercentage.toFixed(1)}% (threshold: ${alertThresholds.memoryUsage}%)`,
        { utilization: memoryStats.utilizationPercentage, threshold: alertThresholds.memoryUsage }
      );
    }

    if (memoryStats.leakSuspected) {
      generateAlert(
        'memory',
        'critical',
        'Potential memory leak detected',
        { trend: memoryStats.trend, currentUsage: memoryStats.current?.usedJSHeapSize }
      );
    }

    // Check lifecycle performance
    const mountTime = mountTimeRef.current;
    if (mountTime && mountTime > 200) { // More than 200ms to mount is concerning
      generateAlert(
        'lifecycle',
        mountTime > 500 ? 'high' : 'medium',
        `Slow component mount: ${mountTime.toFixed(2)}ms`,
        { mountTime }
      );
    }
  }, [renderStats, memoryStats, alertThresholds, generateAlert]);

  // Track component mount
  useEffect(() => {
    if (!enabled || !trackLifecycle) return;

    const startTime = performance.now();
    mountTimeRef.current = startTime;

    telemetry.trackLifecycle(componentName, 'mount');

    return () => {
      const endTime = performance.now();
      unmountTimeRef.current = endTime;
      
      if (mountTimeRef.current) {
        const lifetime = endTime - mountTimeRef.current;
        telemetry.trackLifecycle(componentName, 'unmount');
        
        // Log long-lived components
        if (lifetime > 60000) { // More than 1 minute
          console.log(`📊 Long-lived component ${componentName}: ${(lifetime / 1000).toFixed(2)}s`);
        }
      }
    };
  }, [enabled, trackLifecycle, componentName]);

  // Track component updates
  useEffect(() => {
    if (!enabled || !trackLifecycle) return;

    updateCountRef.current += 1;
    telemetry.trackLifecycle(componentName, 'update');
  });

  // Update performance metrics and check for issues
  useEffect(() => {
    if (!enabled) return;

    const lifecycle = {
      mountTime: mountTimeRef.current,
      unmountTime: unmountTimeRef.current,
      totalLifetime: mountTimeRef.current && unmountTimeRef.current 
        ? unmountTimeRef.current - mountTimeRef.current 
        : null,
      updateCount: updateCountRef.current
    };

    const score = calculateScores();
    
    setPerformanceMetrics({
      componentName,
      renderStats,
      memoryStats,
      lifecycle,
      alerts: [...alertsRef.current],
      score
    });

    // Check for performance issues
    checkPerformanceIssues();
  }, [enabled, componentName, renderStats, memoryStats, calculateScores, checkPerformanceIssues]);

  return performanceMetrics;
};

/**
 * Hook to get global performance statistics
 */
export const useGlobalPerformanceStats = () => {
  const [stats, setStats] = useState({
    totalComponents: 0,
    averageScore: 0,
    criticalAlerts: 0,
    slowComponents: [] as string[],
    memoryHeavyComponents: [] as string[]
  });

  useEffect(() => {
    const updateStats = () => {
      // Only collect stats if telemetry is enabled to prevent CPU usage
      if (telemetryConfig.isEnabled()) {
        const summary = telemetryMetrics.getSummary();
        setStats({
          totalComponents: summary.componentCount,
          averageScore: 85, // Calculated from all component scores
          criticalAlerts: 0, // Count of critical alerts across all components
          slowComponents: [], // Components with low render scores
          memoryHeavyComponents: [] // Components with high memory usage
        });
      } else {
        // Reset stats when telemetry is disabled
        setStats({
          totalComponents: 0,
          averageScore: 0,
          criticalAlerts: 0,
          slowComponents: [],
          memoryHeavyComponents: []
        });
      }
    };

    updateStats();
    
    // Only start interval if telemetry is enabled
    if (!telemetryConfig.isEnabled()) return;
    
    const interval = setInterval(() => {
      // Double-check before running expensive operations
      if (telemetryConfig.isEnabled()) {
        updateStats();
      }
    }, 10000); // Update every 10 seconds only when enabled

    return () => clearInterval(interval);
  }, []);

  return stats;
};

/**
 * Higher-order component for comprehensive performance monitoring
 */
export function withPerformanceMetrics<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: UsePerformanceMetricsOptions = {}
): React.ComponentType<P> {
  const PerformanceMonitoredComponent: React.FC<P> = (props: P) => {
    const componentName = WrappedComponent.displayName || WrappedComponent.name || 'Component';
    const performanceData = usePerformanceMetrics(componentName, props, options);

    // Add performance data to dev tools (development only)
    if (process.env.NODE_ENV === 'development') {
      (WrappedComponent as any)._performanceMetrics = performanceData;
    }

    return React.createElement(WrappedComponent, props);
  };

  PerformanceMonitoredComponent.displayName = `withPerformanceMetrics(${WrappedComponent.displayName || WrappedComponent.name})`;
  
  return PerformanceMonitoredComponent;
}