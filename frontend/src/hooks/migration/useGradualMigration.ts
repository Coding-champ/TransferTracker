/**
 * useGradualMigration - Orchestrates gradual migration from old to new hooks
 * Provides safe, monitored transitions with automatic rollback capabilities
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { migrationConfig, type ComponentMigrationConfig } from './migrationConfig';
import { usePerformanceMetrics } from '../performance/usePerformanceMetrics';
import { errorTracker } from '../../utils/telemetry/errorTracking';
import { performanceMetrics } from '../../utils/telemetry/performanceMetrics';

export interface MigrationState {
  isUsingNewHook: boolean;
  migrationActive: boolean;
  rollbackReason?: string;
  performanceComparison?: {
    oldHookMetrics: any;
    newHookMetrics: any;
    improvement: number; // Percentage improvement (negative means degradation)
  };
  errorCount: number;
  lastRollback?: Date;
}

export interface MigrationResult<TOldResult, TNewResult = TOldResult> {
  data: TOldResult | TNewResult;
  state: MigrationState;
  controls: {
    forceOldHook: () => void;
    forceNewHook: () => void;
    reset: () => void;
    rollback: (reason: string) => void;
  };
}

export interface UseGradualMigrationOptions {
  componentName: string;
  enabled?: boolean;
  userId?: string;
  onRollback?: (reason: string) => void;
  onMigrationSuccess?: () => void;
  customThresholds?: {
    maxErrorRate?: number;
    maxPerformanceDegradation?: number;
  };
}

/**
 * Hook for gradual migration between old and new implementations
 */
export const useGradualMigration = <TOldResult, TNewResult = TOldResult>(
  oldHook: () => TOldResult,
  newHook: () => TNewResult,
  options: UseGradualMigrationOptions
): MigrationResult<TOldResult, TNewResult> => {
  const {
    componentName,
    enabled = true,
    userId,
    onRollback,
    onMigrationSuccess,
    customThresholds
  } = options;

  // Migration state
  const [migrationState, setMigrationState] = useState<MigrationState>({
    isUsingNewHook: false,
    migrationActive: false,
    errorCount: 0
  });

  // Performance tracking
  const performanceData = usePerformanceMetrics(componentName);
  
  // Refs for tracking
  const errorCountRef = useRef(0);
  const migrationStartTimeRef = useRef<number>();
  const rollbackTimeRef = useRef<number>();
  const oldHookMetricsRef = useRef<any>();
  const newHookMetricsRef = useRef<any>();

  // Get migration configuration
  const migrationConfigData = migrationConfig.getComponentConfig(componentName);

  /**
   * Determine if new hook should be used
   */
  const shouldUseNewHook = useCallback((): boolean => {
    if (!enabled || !migrationConfigData?.enabled) {
      return false;
    }

    // Check for recent rollback (wait 5 minutes before retrying)
    if (rollbackTimeRef.current && Date.now() - rollbackTimeRef.current < 300000) {
      return false;
    }

    // Use migration config to determine rollout
    return migrationConfig.shouldUseMigratedHook(componentName, userId);
  }, [enabled, migrationConfigData, componentName, userId]);

  /**
   * Track error for migration monitoring
   */
  const trackMigrationError = useCallback((error: Error, isNewHook: boolean) => {
    errorCountRef.current += 1;
    
    errorTracker.trackJavaScriptError(error, componentName, {
      migrationActive: migrationState.migrationActive,
      usingNewHook: isNewHook,
      migrationPhase: isNewHook ? 'new-hook' : 'old-hook'
    });

    setMigrationState(prev => ({
      ...prev,
      errorCount: errorCountRef.current
    }));
  }, [componentName, migrationState.migrationActive]);

  /**
   * Check if migration should be rolled back due to errors or performance
   */
  const shouldRollback = useCallback((): { should: boolean; reason?: string } => {
    if (!migrationState.migrationActive || !migrationState.isUsingNewHook) {
      return { should: false };
    }

    const config = migrationConfigData;
    if (!config) return { should: false };

    // Check error rate threshold
    const thresholds = {
      ...config.performanceThresholds,
      ...customThresholds
    };

    if (thresholds.maxErrorRate && errorCountRef.current > 0) {
      const migrationDuration = migrationStartTimeRef.current 
        ? Date.now() - migrationStartTimeRef.current 
        : 1000;
      const errorRate = errorCountRef.current / (migrationDuration / 1000); // errors per second
      
      if (errorRate > thresholds.maxErrorRate) {
        return { 
          should: true, 
          reason: `Error rate exceeded threshold: ${errorRate.toFixed(2)}/s > ${thresholds.maxErrorRate}/s` 
        };
      }
    }

    // Check performance degradation
    if (thresholds.maxRenderTime && performanceData.renderStats.averageRenderTime > thresholds.maxRenderTime) {
      return { 
        should: true, 
        reason: `Render time exceeded threshold: ${performanceData.renderStats.averageRenderTime.toFixed(2)}ms > ${thresholds.maxRenderTime}ms` 
      };
    }

    // Check memory increase
    if (thresholds.maxMemoryIncrease && performanceData.memoryStats.current) {
      const memoryMB = performanceData.memoryStats.current.usedJSHeapSize / 1024 / 1024;
      const baselineMemory = oldHookMetricsRef.current?.memoryUsage || 0;
      const memoryIncrease = memoryMB - baselineMemory;
      
      if (memoryIncrease > (thresholds.maxMemoryIncrease || 0)) {
        return { 
          should: true, 
          reason: `Memory increase exceeded threshold: ${memoryIncrease.toFixed(2)}MB > ${thresholds.maxMemoryIncrease}MB` 
        };
      }
    }

    return { should: false };
  }, [migrationState, migrationConfigData, customThresholds, performanceData]);

  /**
   * Perform rollback to old hook
   */
  const performRollback = useCallback((reason: string) => {
    console.warn(`🔄 Rolling back migration for ${componentName}: ${reason}`);
    
    rollbackTimeRef.current = Date.now();
    
    setMigrationState(prev => ({
      ...prev,
      isUsingNewHook: false,
      rollbackReason: reason,
      lastRollback: new Date()
    }));

    // Disable migration temporarily
    migrationConfig.updateComponentConfig(componentName, { 
      enabled: false 
    });

    // Track rollback event
    errorTracker.trackUserActionError('migration-rollback', new Error(reason), componentName, {
      errorCount: errorCountRef.current,
      migrationDuration: migrationStartTimeRef.current 
        ? Date.now() - migrationStartTimeRef.current 
        : 0
    });

    onRollback?.(reason);
  }, [componentName, onRollback]);

  /**
   * Control functions
   */
  const controls = {
    forceOldHook: () => {
      setMigrationState(prev => ({ ...prev, isUsingNewHook: false }));
    },
    forceNewHook: () => {
      setMigrationState(prev => ({ ...prev, isUsingNewHook: true }));
    },
    reset: () => {
      errorCountRef.current = 0;
      rollbackTimeRef.current = undefined;
      setMigrationState({
        isUsingNewHook: shouldUseNewHook(),
        migrationActive: true,
        errorCount: 0
      });
    },
    rollback: performRollback
  };

  // Execute hooks and handle errors
  let result: TOldResult | TNewResult;
  let hookError: Error | null = null;

  try {
    if (migrationState.isUsingNewHook) {
      // Capture new hook metrics
      const startTime = performance.now();
      result = newHook();
      const endTime = performance.now();
      
      newHookMetricsRef.current = {
        renderTime: endTime - startTime,
        memoryUsage: performanceData.memoryStats.current?.usedJSHeapSize || 0
      };
    } else {
      // Capture old hook metrics
      const startTime = performance.now();
      result = oldHook();
      const endTime = performance.now();
      
      oldHookMetricsRef.current = {
        renderTime: endTime - startTime,
        memoryUsage: performanceData.memoryStats.current?.usedJSHeapSize || 0
      };
    }
  } catch (error) {
    hookError = error as Error;
    trackMigrationError(hookError, migrationState.isUsingNewHook);
    
    // Fallback to old hook if new hook fails
    if (migrationState.isUsingNewHook) {
      try {
        result = oldHook();
        performRollback(`New hook failed: ${hookError.message}`);
      } catch (fallbackError) {
        // Both hooks failed, re-throw original error
        throw hookError;
      }
    } else {
      throw hookError;
    }
  }

  // Initialize migration state
  useEffect(() => {
    const shouldUse = shouldUseNewHook();
    
    setMigrationState(prev => ({
      ...prev,
      isUsingNewHook: shouldUse,
      migrationActive: shouldUse && enabled
    }));

    if (shouldUse && enabled) {
      migrationStartTimeRef.current = Date.now();
    }
  }, [shouldUseNewHook, enabled]);

  // Monitor for rollback conditions
  useEffect(() => {
    if (!migrationState.migrationActive) return;

    const rollbackCheck = shouldRollback();
    if (rollbackCheck.should && rollbackCheck.reason) {
      performRollback(rollbackCheck.reason);
    }
  }, [migrationState.migrationActive, shouldRollback, performRollback]);

  // Calculate performance comparison
  const performanceComparison = oldHookMetricsRef.current && newHookMetricsRef.current ? {
    oldHookMetrics: oldHookMetricsRef.current,
    newHookMetrics: newHookMetricsRef.current,
    improvement: ((oldHookMetricsRef.current.renderTime - newHookMetricsRef.current.renderTime) / oldHookMetricsRef.current.renderTime) * 100
  } : undefined;

  // Report successful migration
  useEffect(() => {
    if (migrationState.isUsingNewHook && 
        migrationState.migrationActive && 
        migrationStartTimeRef.current &&
        Date.now() - migrationStartTimeRef.current > 60000 && // Stable for 1 minute
        errorCountRef.current === 0) {
      
      onMigrationSuccess?.();
      
      console.log(`✅ Migration successful for ${componentName}`, {
        duration: Date.now() - migrationStartTimeRef.current,
        performanceImprovement: performanceComparison?.improvement
      });
    }
  }, [migrationState, componentName, onMigrationSuccess, performanceComparison]);

  return {
    data: result!,
    state: {
      ...migrationState,
      performanceComparison
    },
    controls
  };
};

/**
 * Simple migration hook for basic use cases
 */
export const useSimpleMigration = <T>(
  oldHook: () => T,
  newHook: () => T,
  componentName: string,
  enabled: boolean = true
): T => {
  const { data } = useGradualMigration(oldHook, newHook, {
    componentName,
    enabled
  });
  
  return data;
};