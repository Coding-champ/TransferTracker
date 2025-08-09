/**
 * useErrorRecovery Hook
 * 
 * Intelligent error categorization and recovery with:
 * - Automatic retry for transient errors
 * - Fallback data strategies
 * - User-friendly error messaging
 * - Exponential backoff retry strategies
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { ErrorRecoveryOptions, ErrorRecoveryState, ErrorClassification } from './types';

/**
 * Hook for intelligent error recovery and retry strategies
 * 
 * @param options - Error recovery configuration options
 * @returns Error recovery state and control functions
 */
export function useErrorRecovery(options: ErrorRecoveryOptions = {}) {
  const {
    autoRetry = true,
    maxRetries = 3,
    retryStrategy = 'exponential',
    enableFallback = false,
    fallbackProvider,
    errorClassifier
  } = options;

  // State management
  const [state, setState] = useState<ErrorRecoveryState>({
    error: null,
    classification: null,
    retryCount: 0,
    isRetrying: false,
    hasFallback: false,
    status: 'idle'
  });

  // Refs for cleanup
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Default error classifier
  const defaultErrorClassifier = useCallback((error: Error): ErrorClassification => {
    const errorMessage = error.message.toLowerCase();
    const errorName = error.name.toLowerCase();

    // Network errors
    if (errorName.includes('network') || 
        errorMessage.includes('network') ||
        errorMessage.includes('fetch')) {
      return {
        type: 'network',
        retryable: true,
        retryDelay: 2000,
        severity: 'medium'
      };
    }

    // Timeout errors
    if (errorName.includes('timeout') || 
        errorMessage.includes('timeout') ||
        errorMessage.includes('aborted')) {
      return {
        type: 'timeout',
        retryable: true,
        retryDelay: 1000,
        severity: 'medium'
      };
    }

    // Server errors (5xx)
    if (errorMessage.includes('500') || 
        errorMessage.includes('502') || 
        errorMessage.includes('503') ||
        errorMessage.includes('server error')) {
      return {
        type: 'server',
        retryable: true,
        retryDelay: 3000,
        severity: 'high'
      };
    }

    // Client errors (4xx)
    if (errorMessage.includes('400') || 
        errorMessage.includes('401') || 
        errorMessage.includes('403') ||
        errorMessage.includes('404')) {
      return {
        type: 'client',
        retryable: false,
        retryDelay: 0,
        severity: 'low'
      };
    }

    // Unknown errors
    return {
      type: 'unknown',
      retryable: false,
      retryDelay: 1000,
      severity: 'medium'
    };
  }, []);

  // Calculate retry delay based on strategy
  const calculateRetryDelay = useCallback((baseDelay: number, retryCount: number): number => {
    switch (retryStrategy) {
      case 'exponential':
        return baseDelay * Math.pow(2, retryCount);
      case 'linear':
        return baseDelay * (retryCount + 1);
      case 'fixed':
      default:
        return baseDelay;
    }
  }, [retryStrategy]);

  // Handle error and determine recovery strategy
  const handleError = useCallback(async (error: Error): Promise<boolean> => {
    // Classify the error
    const classification = errorClassifier ? 
      errorClassifier(error) : 
      defaultErrorClassifier(error);

    // Update state with error and classification
    setState(prev => ({
      ...prev,
      error,
      classification,
      status: 'analyzing'
    }));

    // Check if retry is possible
    const canRetry = classification.retryable && 
                    autoRetry && 
                    state.retryCount < maxRetries;

    if (canRetry) {
      // Calculate retry delay
      const delay = calculateRetryDelay(classification.retryDelay, state.retryCount);

      // Update state to show retrying
      setState(prev => ({
        ...prev,
        isRetrying: true,
        retryCount: prev.retryCount + 1,
        status: 'retrying'
      }));

      // Schedule retry
      return new Promise((resolve) => {
        retryTimeoutRef.current = setTimeout(() => {
          setState(prev => ({
            ...prev,
            isRetrying: false
          }));
          resolve(true);
        }, delay);
      });
    }

    // Check for fallback data
    if (enableFallback && fallbackProvider) {
      try {
        const fallbackData = await fallbackProvider();
        setState(prev => ({
          ...prev,
          hasFallback: true,
          status: 'recovered'
        }));
        return false; // Don't retry, use fallback
      } catch (fallbackError) {
        // Fallback failed, proceed with error
      }
    }

    // No recovery possible
    setState(prev => ({
      ...prev,
      status: 'failed'
    }));

    return false;
  }, [
    errorClassifier, 
    defaultErrorClassifier, 
    autoRetry, 
    maxRetries, 
    state.retryCount,
    calculateRetryDelay,
    enableFallback,
    fallbackProvider
  ]);

  // Reset error recovery state
  const reset = useCallback(() => {
    // Clear any pending retry
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    // Reset state
    setState({
      error: null,
      classification: null,
      retryCount: 0,
      isRetrying: false,
      hasFallback: false,
      status: 'idle'
    });
  }, []);

  // Check if error is retryable
  const isRetryable = useCallback((error: Error): boolean => {
    const classification = errorClassifier ? 
      errorClassifier(error) : 
      defaultErrorClassifier(error);
    
    return classification.retryable && state.retryCount < maxRetries;
  }, [errorClassifier, defaultErrorClassifier, state.retryCount, maxRetries]);

  // Get user-friendly error message
  const getUserFriendlyMessage = useCallback((error: Error): string => {
    const classification = errorClassifier ? 
      errorClassifier(error) : 
      defaultErrorClassifier(error);

    switch (classification.type) {
      case 'network':
        return 'Network connection issue. Please check your internet connection.';
      case 'timeout':
        return 'Request timed out. Please try again.';
      case 'server':
        return 'Server is temporarily unavailable. We\'re working to fix this.';
      case 'client':
        return 'Invalid request. Please check your input and try again.';
      default:
        return error.message || 'An unexpected error occurred.';
    }
  }, [errorClassifier, defaultErrorClassifier]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  return {
    state,
    handleError,
    reset,
    isRetryable,
    getUserFriendlyMessage
  };
}

export default useErrorRecovery;