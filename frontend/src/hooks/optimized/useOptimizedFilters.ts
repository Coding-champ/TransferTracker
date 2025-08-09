/**
 * useOptimizedFilters - Enhanced filter management with performance optimizations
 * Provides intelligent state management, change detection, and filter optimization
 */

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useShallowMemo, useStableObject } from '../performance/useShallowMemo';
import { useMemoizedCallback } from '../performance/useMemoizedCallback';
import { usePerformanceMetrics } from '../performance/usePerformanceMetrics';
import { telemetry } from '../../utils/telemetry/index';

export interface FilterState {
  leagues?: string[];
  countries?: string[];
  transferTypes?: string[];
  seasons?: string[];
  valueRange?: { min: number; max: number };
  dateRange?: { start: Date | null; end: Date | null };
  performanceRating?: { min: number; max: number };
  contractDuration?: { min: number; max: number };
  successfulOnly?: boolean;
}

export interface FilterChangeEvent {
  key: keyof FilterState;
  value: any;
  previousValue: any;
  timestamp: number;
}

export interface FilterMetrics {
  totalChanges: number;
  lastChangeTime: number;
  averageChangeInterval: number;
  mostChangedFilters: Array<{ key: string; count: number }>;
  filterComplexity: number;
}

export interface UseOptimizedFiltersOptions {
  debounceMs?: number;
  enableHistory?: boolean;
  maxHistorySize?: number;
  validateChanges?: boolean;
  optimizeForPerformance?: boolean;
}

export interface FilterValidation {
  isValid: boolean;
  errors: Array<{ field: keyof FilterState; message: string }>;
  warnings: Array<{ field: keyof FilterState; message: string }>;
}

/**
 * Optimized filters hook with performance tracking and intelligent change management
 */
export const useOptimizedFilters = (
  initialFilters: FilterState = {},
  options: UseOptimizedFiltersOptions = {}
): {
  filters: FilterState;
  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  setFilters: (newFilters: Partial<FilterState>) => void;
  resetFilters: () => void;
  clearFilter: (key: keyof FilterState) => void;
  getChangedFilters: () => Partial<FilterState>;
  validateFilters: () => FilterValidation;
  getMetrics: () => FilterMetrics;
  history: FilterState[];
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
} => {
  const {
    debounceMs = 300,
    enableHistory = true,
    maxHistorySize = 50,
    validateChanges = true,
    optimizeForPerformance = true
  } = options;

  // Performance monitoring
  const performanceData = usePerformanceMetrics('useOptimizedFilters');

  // State management
  const [filters, setFiltersState] = useState<FilterState>(initialFilters);
  const [history, setHistory] = useState<FilterState[]>([initialFilters]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Refs for tracking and optimization
  const initialFiltersRef = useRef(initialFilters);
  const changeHistoryRef = useRef<FilterChangeEvent[]>([]);
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();
  const changeCountRef = useRef<Record<string, number>>({});
  const lastChangeTimeRef = useRef<number>(Date.now());

  // Stable initial filters to prevent unnecessary recalculations
  const stableInitialFilters = useStableObject(initialFilters);

  /**
   * Calculate filter complexity score
   */
  const calculateComplexity = useCallback((filterState: FilterState): number => {
    let complexity = 0;
    
    Object.entries(filterState).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        complexity += 1;
        
        // Additional complexity for arrays and ranges
        if (Array.isArray(value)) {
          complexity += value.length * 0.5;
        } else if (typeof value === 'object' && value !== null) {
          complexity += Object.keys(value).length * 0.5;
        }
      }
    });
    
    return complexity;
  }, []);

  /**
   * Validate filter state
   */
  const validateFilters = useCallback((): FilterValidation => {
    const errors: Array<{ field: keyof FilterState; message: string }> = [];
    const warnings: Array<{ field: keyof FilterState; message: string }> = [];

    // Value range validation
    if (filters.valueRange) {
      const { min, max } = filters.valueRange;
      if (min !== undefined && max !== undefined && min > max) {
        errors.push({ field: 'valueRange', message: 'Minimum value cannot be greater than maximum' });
      }
      if (min !== undefined && min < 0) {
        warnings.push({ field: 'valueRange', message: 'Negative values may not be meaningful' });
      }
    }

    // Date range validation
    if (filters.dateRange) {
      const { start, end } = filters.dateRange;
      if (start && end && start > end) {
        errors.push({ field: 'dateRange', message: 'Start date cannot be after end date' });
      }
      if (end && end > new Date()) {
        warnings.push({ field: 'dateRange', message: 'End date is in the future' });
      }
    }

    // Performance rating validation
    if (filters.performanceRating) {
      const { min, max } = filters.performanceRating;
      if (min !== undefined && (min < 1 || min > 10)) {
        errors.push({ field: 'performanceRating', message: 'Performance rating must be between 1 and 10' });
      }
      if (max !== undefined && (max < 1 || max > 10)) {
        errors.push({ field: 'performanceRating', message: 'Performance rating must be between 1 and 10' });
      }
    }

    // Contract duration validation
    if (filters.contractDuration) {
      const { min, max } = filters.contractDuration;
      if (min !== undefined && min < 0) {
        errors.push({ field: 'contractDuration', message: 'Contract duration cannot be negative' });
      }
      if (max !== undefined && max > 10) {
        warnings.push({ field: 'contractDuration', message: 'Contract duration over 10 years is unusual' });
      }
    }

    // Array validation
    ['leagues', 'countries', 'transferTypes', 'seasons'].forEach(field => {
      const value = filters[field as keyof FilterState];
      if (Array.isArray(value) && value.length > 20) {
        warnings.push({ 
          field: field as keyof FilterState, 
          message: `Large number of ${field} selected may impact performance` 
        });
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }, [filters]);

  /**
   * Track filter changes
   */
  const trackFilterChange = useCallback((key: keyof FilterState, value: any, previousValue: any) => {
    const now = Date.now();
    const changeEvent: FilterChangeEvent = {
      key,
      value,
      previousValue,
      timestamp: now
    };

    changeHistoryRef.current.push(changeEvent);
    
    // Limit change history size
    if (changeHistoryRef.current.length > 1000) {
      changeHistoryRef.current = changeHistoryRef.current.slice(-500);
    }

    // Update change counts
    changeCountRef.current[key] = (changeCountRef.current[key] || 0) + 1;
    lastChangeTimeRef.current = now;

    // Track performance impact
    telemetry.trackUserInteraction('focus', key, 'useOptimizedFilters', {
      filterKey: key,
      complexity: calculateComplexity(filters),
      changeCount: changeCountRef.current[key]
    });
  }, [filters, calculateComplexity]);

  /**
   * Update history stack
   */
  const updateHistory = useCallback((newFilters: FilterState) => {
    if (!enableHistory) return;

    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(newFilters);
      
      // Limit history size
      if (newHistory.length > maxHistorySize) {
        return newHistory.slice(-maxHistorySize);
      }
      
      return newHistory;
    });
    
    setHistoryIndex(prev => Math.min(prev + 1, maxHistorySize - 1));
  }, [enableHistory, historyIndex, maxHistorySize]);

  /**
   * Debounced filter update
   */
  const debouncedUpdate = useMemoizedCallback((newFilters: FilterState) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      const startTime = performance.now();
      
      setFiltersState(newFilters);
      updateHistory(newFilters);
      
      // Track render performance
      const endTime = performance.now();
      if (endTime - startTime > 5) { // Only track if significant
        telemetry.trackRender('useOptimizedFilters', startTime);
      }
    }, debounceMs);
  }, [debounceMs, updateHistory]);

  /**
   * Set individual filter value
   */
  const setFilter = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    const previousValue = filters[key];
    
    // Skip if value hasn't changed (deep comparison for objects)
    if (optimizeForPerformance) {
      if (JSON.stringify(previousValue) === JSON.stringify(value)) {
        return;
      }
    }

    const newFilters = { ...filters, [key]: value };
    
    // Validate if enabled
    if (validateChanges) {
      const validation = validateFilters();
      if (!validation.isValid) {
        console.warn('Filter validation failed:', validation.errors);
        // Still allow the change but log the issues
      }
    }

    trackFilterChange(key, value, previousValue);
    
    if (debounceMs > 0) {
      debouncedUpdate(newFilters);
    } else {
      setFiltersState(newFilters);
      updateHistory(newFilters);
    }
  }, [filters, optimizeForPerformance, validateChanges, validateFilters, trackFilterChange, debounceMs, debouncedUpdate, updateHistory]);

  /**
   * Set multiple filter values
   */
  const setFilters = useCallback((newFilters: Partial<FilterState>) => {
    const updatedFilters = { ...filters, ...newFilters };
    
    // Track changes for each modified filter
    Object.entries(newFilters).forEach(([key, value]) => {
      const filterKey = key as keyof FilterState;
      const previousValue = filters[filterKey];
      trackFilterChange(filterKey, value, previousValue);
    });

    if (debounceMs > 0) {
      debouncedUpdate(updatedFilters);
    } else {
      setFiltersState(updatedFilters);
      updateHistory(updatedFilters);
    }
  }, [filters, trackFilterChange, debounceMs, debouncedUpdate, updateHistory]);

  /**
   * Reset to initial filters
   */
  const resetFilters = useCallback(() => {
    trackFilterChange('reset' as keyof FilterState, stableInitialFilters, filters);
    setFiltersState(stableInitialFilters);
    updateHistory(stableInitialFilters);
  }, [stableInitialFilters, filters, trackFilterChange, updateHistory]);

  /**
   * Clear specific filter
   */
  const clearFilter = useCallback((key: keyof FilterState) => {
    const { [key]: removed, ...rest } = filters;
    trackFilterChange(key, undefined, removed);
    setFiltersState(rest);
    updateHistory(rest);
  }, [filters, trackFilterChange, updateHistory]);

  /**
   * Get filters that have changed from initial state
   */
  const getChangedFilters = useCallback((): Partial<FilterState> => {
    const changed: Partial<FilterState> = {};
    
    Object.entries(filters).forEach(([key, value]) => {
      const filterKey = key as keyof FilterState;
      const initialValue = stableInitialFilters[filterKey];
      
      if (JSON.stringify(value) !== JSON.stringify(initialValue)) {
        changed[filterKey] = value;
      }
    });
    
    return changed;
  }, [filters, stableInitialFilters]);

  /**
   * Get filter metrics
   */
  const getMetrics = useCallback((): FilterMetrics => {
    const changes = changeHistoryRef.current;
    const changeCount = changeCountRef.current;
    
    const totalChanges = changes.length;
    const lastChangeTime = lastChangeTimeRef.current;
    
    let averageChangeInterval = 0;
    if (changes.length > 1) {
      const intervals = changes.slice(1).map((change, index) => 
        change.timestamp - changes[index].timestamp
      );
      averageChangeInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    }
    
    const mostChangedFilters = Object.entries(changeCount)
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    const filterComplexity = calculateComplexity(filters);
    
    return {
      totalChanges,
      lastChangeTime,
      averageChangeInterval,
      mostChangedFilters,
      filterComplexity
    };
  }, [filters, calculateComplexity]);

  /**
   * Undo last change
   */
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setFiltersState(history[newIndex]);
    }
  }, [historyIndex, history]);

  /**
   * Redo last undone change
   */
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setFiltersState(history[newIndex]);
    }
  }, [historyIndex, history]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
      } else if ((event.ctrlKey || event.metaKey) && (event.key === 'y' || (event.key === 'z' && event.shiftKey))) {
        event.preventDefault();
        redo();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // Cleanup debounce timeout
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Stable filters object to prevent unnecessary re-renders
  const stableFilters = useShallowMemo(() => filters, [filters]);

  return {
    filters: stableFilters,
    setFilter,
    setFilters,
    resetFilters,
    clearFilter,
    getChangedFilters,
    validateFilters,
    getMetrics,
    history,
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1
  };
};

export default useOptimizedFilters;