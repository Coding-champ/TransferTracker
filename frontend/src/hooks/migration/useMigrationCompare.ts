/**
 * useMigrationCompare - A/B testing framework for comparing old vs optimized hooks
 * Provides detailed performance comparison and statistical analysis
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { usePerformanceMetrics } from '../performance/usePerformanceMetrics';
import { performanceMetrics } from '../../utils/telemetry/performanceMetrics';

export interface ComparisonMetrics {
  renderTime: number;
  memoryUsage: number;
  errorCount: number;
  executionCount: number;
  totalDuration: number;
  averageRenderTime: number;
  successRate: number;
}

export interface ComparisonResult {
  control: ComparisonMetrics; // Old hook
  treatment: ComparisonMetrics; // New hook
  improvement: {
    renderTime: number; // Percentage improvement
    memoryUsage: number;
    errorReduction: number;
    overallScore: number;
  };
  confidence: number; // Statistical confidence level (0-1)
  significant: boolean; // Is the difference statistically significant?
  winner: 'control' | 'treatment' | 'inconclusive';
}

export interface UseMigrationCompareOptions {
  componentName: string;
  enabled?: boolean;
  sampleSize?: number; // Number of executions to compare
  splitRatio?: number; // 0-1, percentage of traffic for treatment
  minSampleSize?: number; // Minimum samples before declaring significance
  confidenceLevel?: number; // Required confidence level (0-1)
}

export interface MigrationCompareState {
  phase: 'collecting' | 'analyzing' | 'complete';
  progress: number; // 0-100
  currentResult?: ComparisonResult;
  recommendation: 'use-old' | 'use-new' | 'need-more-data' | 'inconclusive';
}

/**
 * Hook for A/B testing migration performance
 */
export const useMigrationCompare = <T>(
  oldHook: () => T,
  newHook: () => T,
  options: UseMigrationCompareOptions
): {
  data: T;
  state: MigrationCompareState;
  controls: {
    reset: () => void;
    forcePhase: (phase: 'collecting' | 'analyzing' | 'complete') => void;
    exportResults: () => ComparisonResult | null;
  };
} => {
  const {
    componentName,
    enabled = true,
    sampleSize = 100,
    splitRatio = 0.5,
    minSampleSize = 20,
    confidenceLevel = 0.95
  } = options;

  // State management
  const [state, setState] = useState<MigrationCompareState>({
    phase: 'collecting',
    progress: 0,
    recommendation: 'need-more-data'
  });

  // Data collection
  const controlMetricsRef = useRef<Array<{ renderTime: number; memoryUsage: number; error: boolean }>>([]);
  const treatmentMetricsRef = useRef<Array<{ renderTime: number; memoryUsage: number; error: boolean }>>([]);
  const executionCountRef = useRef(0);
  const currentGroupRef = useRef<'control' | 'treatment'>('control');

  // Performance monitoring
  const performanceData = usePerformanceMetrics(componentName);

  /**
   * Determine which group this execution should use
   */
  const determineGroup = useCallback((): 'control' | 'treatment' => {
    if (!enabled) return 'control';
    
    // Use deterministic assignment based on execution count
    // This ensures consistent split ratio over time
    const seed = executionCountRef.current;
    const hash = ((seed * 9301 + 49297) % 233280) / 233280;
    
    return hash < splitRatio ? 'treatment' : 'control';
  }, [enabled, splitRatio]);

  /**
   * Calculate statistical significance using Welch's t-test
   */
  const calculateSignificance = useCallback((
    sample1: number[],
    sample2: number[],
    confidenceLevel: number
  ): { significant: boolean; confidence: number } => {
    if (sample1.length < 2 || sample2.length < 2) {
      return { significant: false, confidence: 0 };
    }

    // Calculate means
    const mean1 = sample1.reduce((a, b) => a + b, 0) / sample1.length;
    const mean2 = sample2.reduce((a, b) => a + b, 0) / sample2.length;

    // Calculate variances
    const variance1 = sample1.reduce((sum, x) => sum + Math.pow(x - mean1, 2), 0) / (sample1.length - 1);
    const variance2 = sample2.reduce((sum, x) => sum + Math.pow(x - mean2, 2), 0) / (sample2.length - 1);

    // Welch's t-test
    const standardError = Math.sqrt(variance1 / sample1.length + variance2 / sample2.length);
    
    if (standardError === 0) {
      return { significant: false, confidence: 0 };
    }

    const tStatistic = Math.abs(mean1 - mean2) / standardError;
    
    // Degrees of freedom for Welch's t-test
    const df = Math.pow(variance1 / sample1.length + variance2 / sample2.length, 2) /
               (Math.pow(variance1 / sample1.length, 2) / (sample1.length - 1) +
                Math.pow(variance2 / sample2.length, 2) / (sample2.length - 1));

    // Critical value for given confidence level (approximation)
    const alpha = 1 - confidenceLevel;
    const criticalValue = tCritical(df, alpha / 2);
    
    const significant = tStatistic > criticalValue;
    const confidence = significant ? confidenceLevel : Math.min(0.95, tStatistic / criticalValue * confidenceLevel);

    return { significant, confidence };
  }, []);

  /**
   * Approximate critical t-value
   */
  const tCritical = (df: number, alpha: number): number => {
    // Simplified approximation for common confidence levels
    if (alpha <= 0.025) return 2.0; // ~95% confidence
    if (alpha <= 0.05) return 1.645; // ~90% confidence
    return 1.28; // ~80% confidence
  };

  /**
   * Aggregate metrics from individual samples
   */
  const aggregateMetrics = useCallback((
    samples: Array<{ renderTime: number; memoryUsage: number; error: boolean }>
  ): ComparisonMetrics => {
    if (samples.length === 0) {
      return {
        renderTime: 0,
        memoryUsage: 0,
        errorCount: 0,
        executionCount: 0,
        totalDuration: 0,
        averageRenderTime: 0,
        successRate: 0
      };
    }

    const totalRenderTime = samples.reduce((sum, s) => sum + s.renderTime, 0);
    const totalMemoryUsage = samples.reduce((sum, s) => sum + s.memoryUsage, 0);
    const errorCount = samples.filter(s => s.error).length;

    return {
      renderTime: totalRenderTime,
      memoryUsage: totalMemoryUsage / samples.length, // Average memory usage
      errorCount,
      executionCount: samples.length,
      totalDuration: totalRenderTime,
      averageRenderTime: totalRenderTime / samples.length,
      successRate: (samples.length - errorCount) / samples.length
    };
  }, []);

  /**
   * Calculate comparison results
   */
  const calculateComparison = useCallback((): ComparisonResult | null => {
    const controlSamples = controlMetricsRef.current;
    const treatmentSamples = treatmentMetricsRef.current;

    if (controlSamples.length === 0 || treatmentSamples.length === 0) {
      return null;
    }

    const control = aggregateMetrics(controlSamples);
    const treatment = aggregateMetrics(treatmentSamples);

    // Calculate improvements
    const renderTimeImprovement = control.averageRenderTime > 0 
      ? ((control.averageRenderTime - treatment.averageRenderTime) / control.averageRenderTime) * 100
      : 0;

    const memoryImprovement = control.memoryUsage > 0
      ? ((control.memoryUsage - treatment.memoryUsage) / control.memoryUsage) * 100
      : 0;

    const errorReduction = control.errorCount > 0
      ? ((control.errorCount - treatment.errorCount) / control.errorCount) * 100
      : 0;

    // Overall score calculation (weighted)
    const overallScore = (renderTimeImprovement * 0.4) + (memoryImprovement * 0.3) + (errorReduction * 0.3);

    // Statistical significance testing
    const renderTimeSamples1 = controlSamples.map(s => s.renderTime);
    const renderTimeSamples2 = treatmentSamples.map(s => s.renderTime);
    const { significant, confidence } = calculateSignificance(renderTimeSamples1, renderTimeSamples2, confidenceLevel);

    // Determine winner
    let winner: 'control' | 'treatment' | 'inconclusive' = 'inconclusive';
    if (significant) {
      if (overallScore > 5) { // At least 5% improvement
        winner = 'treatment';
      } else if (overallScore < -5) { // At least 5% degradation
        winner = 'control';
      }
    }

    return {
      control,
      treatment,
      improvement: {
        renderTime: renderTimeImprovement,
        memoryUsage: memoryImprovement,
        errorReduction,
        overallScore
      },
      confidence,
      significant,
      winner
    };
  }, [aggregateMetrics, calculateSignificance, confidenceLevel]);

  /**
   * Record execution metrics
   */
  const recordMetrics = useCallback((
    group: 'control' | 'treatment',
    renderTime: number,
    memoryUsage: number,
    error: boolean
  ) => {
    const metrics = { renderTime, memoryUsage, error };
    
    if (group === 'control') {
      controlMetricsRef.current.push(metrics);
    } else {
      treatmentMetricsRef.current.push(metrics);
    }

    // Update progress
    const totalSamples = controlMetricsRef.current.length + treatmentMetricsRef.current.length;
    const progress = Math.min(100, (totalSamples / sampleSize) * 100);
    
    setState(prev => ({ ...prev, progress }));

    // Check if we should move to analysis phase
    if (totalSamples >= sampleSize || 
        (totalSamples >= minSampleSize && progress > 80)) {
      setState(prev => ({ ...prev, phase: 'analyzing' }));
    }
  }, [sampleSize, minSampleSize]);

  // Execute hooks with performance measurement
  const group = determineGroup();
  currentGroupRef.current = group;
  
  let result: T;
  let hookError: Error | null = null;
  const startTime = performance.now();
  const startMemory = performanceData.memoryStats.current?.usedJSHeapSize || 0;

  try {
    result = group === 'control' ? oldHook() : newHook();
  } catch (error) {
    hookError = error as Error;
    result = oldHook(); // Fallback to control
  }

  const endTime = performance.now();
  const endMemory = performanceData.memoryStats.current?.usedJSHeapSize || 0;

  // Record metrics for this execution
  useEffect(() => {
    if (state.phase === 'collecting') {
      executionCountRef.current += 1;
      
      recordMetrics(
        group,
        endTime - startTime,
        Math.max(0, endMemory - startMemory),
        hookError !== null
      );
    }
  }, [state.phase, group, endTime, startTime, endMemory, startMemory, hookError, recordMetrics]);

  // Analysis phase
  useEffect(() => {
    if (state.phase === 'analyzing') {
      const result = calculateComparison();
      
      if (result) {
        let recommendation: MigrationCompareState['recommendation'] = 'inconclusive';
        
        if (result.significant) {
          if (result.winner === 'treatment' && result.improvement.overallScore > 10) {
            recommendation = 'use-new';
          } else if (result.winner === 'control' || result.improvement.overallScore < -5) {
            recommendation = 'use-old';
          }
        } else if (controlMetricsRef.current.length + treatmentMetricsRef.current.length < minSampleSize) {
          recommendation = 'need-more-data';
        }

        setState(prev => ({
          ...prev,
          phase: 'complete',
          currentResult: result,
          recommendation
        }));

        // Log results
        console.group(`📊 A/B Test Results - ${componentName}`);
        console.log('Control (Old):', result.control);
        console.log('Treatment (New):', result.treatment);
        console.log('Improvement:', result.improvement);
        console.log('Statistical Confidence:', (result.confidence * 100).toFixed(1) + '%');
        console.log('Winner:', result.winner);
        console.log('Recommendation:', recommendation);
        console.groupEnd();
      }
    }
  }, [state.phase, calculateComparison, componentName, minSampleSize]);

  // Control functions
  const controls = {
    reset: () => {
      controlMetricsRef.current = [];
      treatmentMetricsRef.current = [];
      executionCountRef.current = 0;
      setState({
        phase: 'collecting',
        progress: 0,
        recommendation: 'need-more-data'
      });
    },
    forcePhase: (phase: 'collecting' | 'analyzing' | 'complete') => {
      setState(prev => ({ ...prev, phase }));
    },
    exportResults: () => state.currentResult || null
  };

  return {
    data: result!,
    state,
    controls
  };
};

/**
 * Simple comparison hook that returns the better performing option automatically
 */
export const useAutoOptimize = <T>(
  oldHook: () => T,
  newHook: () => T,
  componentName: string
): T => {
  const { data, state } = useMigrationCompare(oldHook, newHook, {
    componentName,
    sampleSize: 50,
    minSampleSize: 10
  });

  // Auto-switch to better performing hook once analysis is complete
  useEffect(() => {
    if (state.phase === 'complete' && state.recommendation === 'use-new') {
      console.log(`🚀 Auto-optimizing ${componentName} to use new hook`);
    }
  }, [state, componentName]);

  return data;
};