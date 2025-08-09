/**
 * useLazyLoading - Zero-overhead component lazy loading hook
 * 
 * Provides efficient lazy loading with proper error handling, retries,
 * and performance monitoring. Only activates when needed to ensure zero CPU overhead.
 */

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { telemetryConfig } from '../../utils/telemetry/config';
import { performanceMetrics } from '../../utils/telemetry/performanceMetrics';
import type { 
  LazyLoadingOptions, 
  LazyLoadingState, 
  PerformanceHookOptions,
  ComponentType 
} from './types';

export interface UseLazyLoadingOptions extends LazyLoadingOptions, PerformanceHookOptions {
  // Inherited options from base types
}

export interface LazyLoadingResult<P = {}> {
  LazyComponent: ComponentType<P> | null;
  isLoaded: boolean;
  isLoading: boolean;
  error: Error | null;
  retryCount: number;
  preload: () => Promise<void>;
  reset: () => void;
}

/**
 * Hook for lazy loading components with zero overhead when disabled
 */
export const useLazyLoading = <P extends object = {}>(
  componentLoader: () => Promise<{ default: ComponentType<P> } | ComponentType<P>>,
  options: UseLazyLoadingOptions = {}
): LazyLoadingResult<P> => {
  const {
    enabled = process.env.NODE_ENV === 'development',
    developmentOnly = false,
    fallback = null,
    preload: shouldPreload = false,
    retryAttempts = 3,
    retryDelay = 1000,
    timeout = 10000,
    throttle = 0,
    onAlert,
    onThresholdExceeded
  } = options;

  // Early return if disabled to ensure zero overhead
  const isEnabled = enabled && (!developmentOnly || process.env.NODE_ENV === 'development');
  
  const [state, setState] = useState<LazyLoadingState>({
    isLoaded: false,
    isLoading: false,
    error: null,
    retryCount: 0
  });

  const componentRef = useRef<ComponentType<P> | null>(null);
  const loadingPromiseRef = useRef<Promise<void> | null>(null);
  const mountedRef = useRef(true);
  const lastLoadAttemptRef = useRef<number>(0);

  /**
   * Load component with timeout and retry logic
   */
  const loadComponent = useCallback(async (): Promise<void> => {
    if (!isEnabled || !mountedRef.current) return;

    // Throttle loading attempts
    const now = Date.now();
    if (throttle > 0 && now - lastLoadAttemptRef.current < throttle) {
      return;
    }
    lastLoadAttemptRef.current = now;

    // Return existing promise if already loading
    if (loadingPromiseRef.current) {
      return loadingPromiseRef.current;
    }

    const loadStartTime = performance.now();

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    loadingPromiseRef.current = new Promise(async (resolve, reject) => {
      try {
        // Create timeout promise
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`Component loading timed out after ${timeout}ms`)), timeout);
        });

        // Race between component loading and timeout
        const moduleResult = await Promise.race([
          componentLoader(),
          timeoutPromise
        ]) as { default: ComponentType<P> } | ComponentType<P>;

        // Handle both default export and direct export
        const Component = 'default' in moduleResult ? moduleResult.default : moduleResult;
        
        if (!Component) {
          throw new Error('Component loader returned null or undefined');
        }

        componentRef.current = Component;

        if (mountedRef.current) {
          setState({
            isLoaded: true,
            isLoading: false,
            error: null,
            retryCount: 0
          });

          // Track successful loading in telemetry
          if (telemetryConfig.isEnabled()) {
            const loadTime = performance.now() - loadStartTime;
            performanceMetrics.trackEvent('lazy_loading_success', {
              loadTime,
              component: Component.displayName || Component.name || 'Unknown',
              retryCount: state.retryCount
            });

            // Alert if loading took too long
            if (loadTime > 3000 && onThresholdExceeded) {
              onThresholdExceeded('loadTime', loadTime, 3000);
            }
          }
        }

        resolve();
      } catch (error) {
        if (!mountedRef.current) {
          resolve();
          return;
        }

        const loadError = error instanceof Error ? error : new Error('Failed to load component');
        
        setState(prev => {
          const newRetryCount = prev.retryCount + 1;
          
          // Track failed loading attempt
          if (telemetryConfig.isEnabled()) {
            performanceMetrics.trackEvent('lazy_loading_error', {
              error: loadError.message,
              retryCount: newRetryCount,
              component: 'Unknown'
            });

            // Create alert for repeated failures
            if (newRetryCount >= retryAttempts && onAlert) {
              onAlert({
                id: `lazy-loading-${Date.now()}`,
                timestamp: Date.now(),
                type: 'lazy-loading',
                severity: 'high',
                message: `Failed to load component after ${retryAttempts} attempts: ${loadError.message}`,
                metadata: { retryCount: newRetryCount, error: loadError.message }
              });
            }
          }

          // Retry if attempts remaining
          if (newRetryCount < retryAttempts) {
            setTimeout(() => {
              if (mountedRef.current) {
                loadingPromiseRef.current = null;
                loadComponent();
              }
            }, retryDelay * Math.pow(2, newRetryCount - 1)); // Exponential backoff
            
            return {
              ...prev,
              isLoading: false,
              retryCount: newRetryCount
            };
          } else {
            return {
              ...prev,
              isLoading: false,
              error: loadError,
              retryCount: newRetryCount
            };
          }
        });

        if (state.retryCount >= retryAttempts) {
          reject(loadError);
        } else {
          resolve();
        }
      } finally {
        loadingPromiseRef.current = null;
      }
    });

    return loadingPromiseRef.current;
  }, [
    isEnabled,
    componentLoader,
    timeout,
    retryAttempts,
    retryDelay,
    throttle,
    state.retryCount,
    onAlert,
    onThresholdExceeded
  ]);

  /**
   * Preload component without rendering
   */
  const preload = useCallback(async (): Promise<void> => {
    if (!isEnabled || state.isLoaded || state.isLoading) return;
    await loadComponent();
  }, [isEnabled, state.isLoaded, state.isLoading, loadComponent]);

  /**
   * Reset loading state
   */
  const reset = useCallback(() => {
    if (!isEnabled) return;
    
    setState({
      isLoaded: false,
      isLoading: false,
      error: null,
      retryCount: 0
    });
    componentRef.current = null;
    loadingPromiseRef.current = null;
  }, [isEnabled]);

  // Preload on mount if requested
  useEffect(() => {
    if (shouldPreload && isEnabled) {
      loadComponent();
    }
  }, [shouldPreload, isEnabled, loadComponent]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Return early if disabled to ensure zero overhead
  if (!isEnabled) {
    return {
      LazyComponent: null,
      isLoaded: false,
      isLoading: false,
      error: null,
      retryCount: 0,
      preload: async () => {},
      reset: () => {}
    };
  }

  // Create lazy component wrapper
  const LazyComponent: ComponentType<P> | null = componentRef.current ? 
    React.memo((props: P) => {
      if (!componentRef.current) return null;
      return React.createElement(componentRef.current, props);
    }) : null;

  return {
    LazyComponent,
    isLoaded: state.isLoaded,
    isLoading: state.isLoading,
    error: state.error,
    retryCount: state.retryCount,
    preload,
    reset
  };
};

/**
 * Higher-order component for lazy loading with Suspense wrapper
 */
export function withLazyLoading<P extends object>(
  componentLoader: () => Promise<{ default: ComponentType<P> } | ComponentType<P>>,
  options: UseLazyLoadingOptions = {}
): ComponentType<P> {
  const LazyLoadedComponent: ComponentType<P> = (props: P) => {
    const { LazyComponent, isLoading, error } = useLazyLoading(componentLoader, options);

    if (error) {
      return React.createElement('div', {
        className: 'p-4 border border-red-200 rounded-lg bg-red-50'
      }, [
        React.createElement('h3', { 
          key: 'title',
          className: 'text-red-800 font-medium' 
        }, 'Failed to load component'),
        React.createElement('p', { 
          key: 'message',
          className: 'text-red-600 text-sm mt-1' 
        }, error.message)
      ]);
    }

    if (isLoading) {
      return options.fallback || React.createElement('div', {
        className: 'flex items-center justify-center p-4'
      }, React.createElement('div', {
        className: 'animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600'
      }));
    }

    if (!LazyComponent) {
      return null;
    }

    return React.createElement(Suspense, {
      fallback: options.fallback || React.createElement('div', {
        className: 'flex items-center justify-center p-4'
      }, React.createElement('div', {
        className: 'animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600'
      }))
    }, React.createElement(LazyComponent, props));
  };

  LazyLoadedComponent.displayName = `withLazyLoading(${componentLoader.name || 'Component'})`;
  
  return LazyLoadedComponent;
}

/**
 * Create a lazy-loaded component with preloading capabilities
 */
export function createLazyComponent<P extends object>(
  componentLoader: () => Promise<{ default: ComponentType<P> } | ComponentType<P>>,
  options: UseLazyLoadingOptions = {}
): {
  Component: ComponentType<P>;
  preload: () => Promise<void>;
} {
  let preloadFn: (() => Promise<void>) | null = null;
  
  const Component: ComponentType<P> = (props: P) => {
    const { LazyComponent, preload } = useLazyLoading(componentLoader, { 
      ...options, 
      preload: true 
    });
    
    preloadFn = preload;
    
    return LazyComponent ? React.createElement(LazyComponent, props) : null;
  };

  return {
    Component,
    preload: () => preloadFn ? preloadFn() : Promise.resolve()
  };
}