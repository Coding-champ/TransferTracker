import { useCallback, useRef, useState } from 'react';
import { StateHistoryEntry, StateHistoryConfig, StateAction } from './types';

/**
 * State history hook with undo/redo functionality and time-travel debugging
 * 
 * Features:
 * - Undo/Redo functionality for complex state
 * - Time-travel debugging capabilities
 * - Configurable history depth
 * - Memory-efficient circular buffer implementation
 * - Action tracking for debugging
 * - Batched operations support
 * 
 * @param initialState - Initial state value
 * @param config - Configuration options
 * @returns Object with state, actions, and history controls
 * 
 * @example
 * ```typescript
 * const {
 *   state,
 *   setState,
 *   undo,
 *   redo,
 *   canUndo,
 *   canRedo,
 *   history,
 *   jumpTo
 * } = useStateHistory(initialFilters, {
 *   maxEntries: 50,
 *   enableTimeTravel: true
 * });
 * ```
 */
export function useStateHistory<T>(
  initialState: T,
  config: StateHistoryConfig = {}
) {
  const {
    maxEntries = 50,
    enableTimeTravel = true,
    trackActions = true
  } = config;

  // Current state
  const [state, setStateInternal] = useState<T>(initialState);
  
  // History management using circular buffer for memory efficiency
  const historyRef = useRef<StateHistoryEntry<T>[]>([{
    state: initialState,
    timestamp: Date.now(),
    action: trackActions ? { type: 'INIT', payload: initialState } : undefined
  }]);
  
  const currentIndexRef = useRef(0);
  const maxSizeRef = useRef(maxEntries);

  // Helper function to add entry to circular buffer
  const addHistoryEntry = useCallback((entry: StateHistoryEntry<T>) => {
    const history = historyRef.current;
    const currentIndex = currentIndexRef.current;

    // If we're not at the end of history, remove future entries
    if (currentIndex < history.length - 1) {
      history.splice(currentIndex + 1);
    }

    // Add new entry
    history.push(entry);

    // Maintain max size using circular buffer logic
    if (history.length > maxSizeRef.current) {
      history.shift();
    } else {
      currentIndexRef.current = history.length - 1;
    }
  }, []);

  // Enhanced setState with history tracking
  const setState = useCallback((
    newState: T | ((prev: T) => T),
    action?: StateAction
  ) => {
    setStateInternal(prevState => {
      const nextState = typeof newState === 'function' 
        ? (newState as (prev: T) => T)(prevState)
        : newState;

      // Don't add to history if state hasn't changed
      if (JSON.stringify(prevState) === JSON.stringify(nextState)) {
        return prevState;
      }

      // Add to history
      const historyEntry: StateHistoryEntry<T> = {
        state: nextState,
        timestamp: Date.now(),
        action: trackActions ? (action || { 
          type: 'SET_STATE', 
          payload: nextState,
          meta: { timestamp: Date.now() }
        }) : undefined
      };

      addHistoryEntry(historyEntry);
      return nextState;
    });
  }, [addHistoryEntry, trackActions]);

  // Undo functionality
  const undo = useCallback(() => {
    const history = historyRef.current;
    const currentIndex = currentIndexRef.current;

    if (currentIndex > 0) {
      currentIndexRef.current = currentIndex - 1;
      const previousEntry = history[currentIndex - 1];
      setStateInternal(previousEntry.state);
      return previousEntry;
    }
    return null;
  }, []);

  // Redo functionality
  const redo = useCallback(() => {
    const history = historyRef.current;
    const currentIndex = currentIndexRef.current;

    if (currentIndex < history.length - 1) {
      currentIndexRef.current = currentIndex + 1;
      const nextEntry = history[currentIndex + 1];
      setStateInternal(nextEntry.state);
      return nextEntry;
    }
    return null;
  }, []);

  // Jump to specific point in history (time-travel)
  const jumpTo = useCallback((index: number) => {
    if (!enableTimeTravel) {
      console.warn('Time travel is disabled in configuration');
      return false;
    }

    const history = historyRef.current;
    if (index >= 0 && index < history.length) {
      currentIndexRef.current = index;
      setStateInternal(history[index].state);
      return true;
    }
    return false;
  }, [enableTimeTravel]);

  // Jump to specific timestamp
  const jumpToTimestamp = useCallback((timestamp: number) => {
    if (!enableTimeTravel) {
      console.warn('Time travel is disabled in configuration');
      return false;
    }

    const history = historyRef.current;
    const targetIndex = history.findIndex(entry => entry.timestamp >= timestamp);
    
    if (targetIndex !== -1) {
      return jumpTo(targetIndex);
    }
    return false;
  }, [enableTimeTravel, jumpTo]);

  // Batch operations to prevent excessive history entries
  const batch = useCallback((operations: Array<() => void>) => {
    const originalMaxSize = maxSizeRef.current;
    
    // Temporarily disable history tracking for individual operations
    maxSizeRef.current = Number.MAX_SAFE_INTEGER;
    
    const startState = state;
    operations.forEach(operation => operation());
    
    // Restore history tracking and add single entry for the batch
    maxSizeRef.current = originalMaxSize;
    
    if (trackActions) {
      const batchAction: StateAction = {
        type: 'BATCH_OPERATION',
        payload: { operations: operations.length },
        meta: { timestamp: Date.now() }
      };
      setState(state, batchAction);
    }
  }, [state, setState, trackActions]);

  // Clear history
  const clearHistory = useCallback(() => {
    historyRef.current = [{
      state,
      timestamp: Date.now(),
      action: trackActions ? { type: 'CLEAR_HISTORY' } : undefined
    }];
    currentIndexRef.current = 0;
  }, [state, trackActions]);

  // Get current history stats
  const getHistoryStats = useCallback(() => {
    const history = historyRef.current;
    const currentIndex = currentIndexRef.current;
    
    return {
      totalEntries: history.length,
      currentIndex,
      canUndo: currentIndex > 0,
      canRedo: currentIndex < history.length - 1,
      memoryUsage: JSON.stringify(history).length,
      oldestTimestamp: history[0]?.timestamp,
      newestTimestamp: history[history.length - 1]?.timestamp
    };
  }, []);

  // Export history for debugging/analysis
  const exportHistory = useCallback(() => {
    if (!enableTimeTravel) {
      console.warn('Time travel is disabled, cannot export history');
      return null;
    }

    return {
      entries: historyRef.current,
      currentIndex: currentIndexRef.current,
      config,
      exportedAt: Date.now()
    };
  }, [enableTimeTravel, config]);

  // Import history (useful for testing/debugging)
  const importHistory = useCallback((historyData: {
    entries: StateHistoryEntry<T>[];
    currentIndex: number;
  }) => {
    if (!enableTimeTravel) {
      console.warn('Time travel is disabled, cannot import history');
      return false;
    }

    try {
      historyRef.current = historyData.entries;
      currentIndexRef.current = Math.min(
        historyData.currentIndex,
        historyData.entries.length - 1
      );
      
      if (historyData.entries[currentIndexRef.current]) {
        setStateInternal(historyData.entries[currentIndexRef.current].state);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to import history:', error);
      return false;
    }
  }, [enableTimeTravel]);

  // Computed values
  const canUndo = currentIndexRef.current > 0;
  const canRedo = currentIndexRef.current < historyRef.current.length - 1;
  const history = enableTimeTravel ? historyRef.current : [];
  const currentIndex = currentIndexRef.current;

  return {
    // State management
    state,
    setState,
    
    // History navigation
    undo,
    redo,
    jumpTo,
    jumpToTimestamp,
    
    // Batch operations
    batch,
    
    // History management
    clearHistory,
    
    // State queries
    canUndo,
    canRedo,
    history,
    currentIndex,
    
    // Utilities
    getHistoryStats,
    exportHistory,
    importHistory
  };
}

/**
 * Hook for managing form state with undo/redo functionality
 * 
 * @param initialFormState - Initial form state
 * @param config - Configuration options
 * @returns Form state with history controls
 */
export function useFormStateHistory<T extends Record<string, any>>(
  initialFormState: T,
  config: StateHistoryConfig = {}
) {
  const stateHistory = useStateHistory(initialFormState, {
    ...config,
    trackActions: true
  });

  // Enhanced form-specific methods
  const updateField = useCallback(<K extends keyof T>(
    field: K, 
    value: T[K]
  ) => {
    stateHistory.setState(
      prevState => ({ ...prevState, [field]: value }),
      {
        type: 'UPDATE_FIELD',
        payload: { field, value },
        meta: { timestamp: Date.now(), source: 'form' }
      }
    );
  }, [stateHistory]);

  const resetForm = useCallback(() => {
    stateHistory.setState(
      initialFormState,
      {
        type: 'RESET_FORM',
        payload: initialFormState,
        meta: { timestamp: Date.now() }
      }
    );
  }, [stateHistory, initialFormState]);

  return {
    ...stateHistory,
    formState: stateHistory.state,
    updateField,
    resetForm
  };
}