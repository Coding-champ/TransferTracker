/**
 * Telemetry - Main telemetry API
 * Central hub for all performance monitoring, error tracking, and user interaction analysis
 */

// Import for internal use
import { performanceMetrics } from './performanceMetrics';
import { errorTracker } from './errorTracking';
import { userInteractionTracker } from './userInteractions';
import { exportUtils } from './exportUtils';

// Core telemetry modules
export { 
  performanceMetrics, 
  type PerformanceMetric, 
  type RenderMetric, 
  type MemoryMetric, 
  type ComponentLifecycleMetric 
} from './performanceMetrics';

export { 
  errorTracker, 
  type ErrorMetric, 
  type NetworkError, 
  type ReactError 
} from './errorTracking';

export { 
  userInteractionTracker, 
  type UserInteraction, 
  type ClickInteraction, 
  type ScrollInteraction, 
  type KeyboardInteraction 
} from './userInteractions';

export { 
  exportUtils, 
  type TelemetryReport 
} from './exportUtils';

/**
 * Main Telemetry class - Central API for all telemetry functionality
 */
class Telemetry {
  private isDevelopment = process.env.NODE_ENV === 'development';

  /**
   * Initialize telemetry system
   */
  init(): void {
    if (!this.isDevelopment) return;

    console.log('🔍 Telemetry system initialized');
    console.log('📊 Performance monitoring active');
    console.log('🚨 Error tracking enabled');
    console.log('👆 User interaction tracking enabled');
    
    // Setup keyboard shortcuts for quick access
    this.setupKeyboardShortcuts();
    
    // Start collecting initial data
    this.startInitialDataCollection();
  }

  /**
   * Start collecting initial performance data
   */
  private startInitialDataCollection(): void {
    // Track initial memory usage
    performanceMetrics.trackMemory('App');
    
    // Track app lifecycle
    performanceMetrics.trackLifecycle('App', 'mount');
    
    // Set up periodic data collection
    setInterval(() => {
      performanceMetrics.trackMemory('System');
    }, 5000); // Every 5 seconds
  }

  /**
   * Track component render performance
   */
  trackRender(componentName: string, startTime: number, propsChanged: string[] = []): void {
    if (!this.isDevelopment) return;
    
    const renderTime = performance.now() - startTime;
    performanceMetrics.trackRender(componentName, renderTime, propsChanged);
    
    // Track memory after render
    performanceMetrics.trackMemory(componentName);
  }

  /**
   * Track component lifecycle
   */
  trackLifecycle(componentName: string, phase: 'mount' | 'update' | 'unmount'): void {
    if (!this.isDevelopment) return;
    
    performanceMetrics.trackLifecycle(componentName, phase);
  }

  /**
   * Track errors with context
   */
  trackError(error: Error, context?: {
    componentName?: string;
    action?: string;
    metadata?: Record<string, any>;
  }): void {
    if (!this.isDevelopment) return;

    if (context?.action) {
      errorTracker.trackUserActionError(context.action, error, context.componentName, context.metadata);
    } else {
      errorTracker.trackJavaScriptError(error, context?.componentName, context?.metadata);
    }
  }

  /**
   * Track network requests
   */
  trackNetworkRequest(
    url: string, 
    method: string, 
    startTime: number, 
    success: boolean, 
    status?: number,
    error?: Error
  ): void {
    if (!this.isDevelopment) return;

    const responseTime = performance.now() - startTime;
    
    if (!success && error) {
      errorTracker.trackNetworkError(url, method, error, status, responseTime);
    }
    
    // Track performance for all requests
    performanceMetrics.trackLifecycle(`Network-${method}-${url}`, 'update');
  }

  /**
   * Track user interactions
   */
  trackUserInteraction(
    type: 'click' | 'scroll' | 'keyboard' | 'focus' | 'hover',
    target: string,
    componentName?: string,
    metadata?: Record<string, any>
  ): void {
    if (!this.isDevelopment) return;

    switch (type) {
      case 'click':
        // Note: Click tracking is automatic, this is for manual tracking
        userInteractionTracker.trackFocus(target, componentName, { ...metadata, manualTrack: true });
        break;
      case 'focus':
        userInteractionTracker.trackFocus(target, componentName, metadata);
        break;
      default:
        // Other types are handled automatically by global listeners
        break;
    }
  }

  /**
   * Get current performance summary
   */
  getPerformanceSummary() {
    return performanceMetrics.getSummary();
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    return errorTracker.getErrorStats();
  }

  /**
   * Get interaction statistics
   */
  getInteractionStats() {
    return userInteractionTracker.getInteractionStats();
  }

  /**
   * Export telemetry data
   */
  export(format: 'json' | 'csv' | 'summary' = 'json', type?: 'performance' | 'errors' | 'interactions') {
    switch (format) {
      case 'json':
        exportUtils.exportAsJson();
        break;
      case 'csv':
        if (!type) {
          console.warn('CSV export requires a type parameter');
          return;
        }
        exportUtils.exportAsCSV(type);
        break;
      case 'summary':
        exportUtils.exportSummaryReport();
        break;
    }
  }

  /**
   * Reset all telemetry data
   */
  reset(): void {
    performanceMetrics.reset();
    errorTracker.clearErrors();
    userInteractionTracker.clearInteractions();
    console.log('🔄 Telemetry data reset');
  }

  /**
   * Setup keyboard shortcuts for quick access
   */
  private setupKeyboardShortcuts(): void {
    document.addEventListener('keydown', (event) => {
      // Only activate with Ctrl/Cmd + Alt + T (for Telemetry)
      if ((event.ctrlKey || event.metaKey) && event.altKey && event.key === 't') {
        event.preventDefault();
        this.showQuickStats();
      }
      
      // Ctrl/Cmd + Alt + E for Export
      if ((event.ctrlKey || event.metaKey) && event.altKey && event.key === 'e') {
        event.preventDefault();
        this.export('json');
      }
      
      // Ctrl/Cmd + Alt + R for Reset
      if ((event.ctrlKey || event.metaKey) && event.altKey && event.key === 'r') {
        event.preventDefault();
        this.reset();
      }
    });
  }

  /**
   * Show quick stats in console
   */
  private showQuickStats(): void {
    console.group('📊 Telemetry Quick Stats');
    console.log('Performance:', this.getPerformanceSummary());
    console.log('Errors:', this.getErrorStats());
    console.log('Interactions:', this.getInteractionStats());
    console.log('');
    console.log('Shortcuts:');
    console.log('- Ctrl/Cmd + Alt + T: Show stats');
    console.log('- Ctrl/Cmd + Alt + E: Export data');
    console.log('- Ctrl/Cmd + Alt + R: Reset data');
    console.groupEnd();
  }
}

// Singleton instance
export const telemetry = new Telemetry();

// Development-only global access
if (process.env.NODE_ENV === 'development') {
  (window as any).telemetry = telemetry;
  
  // Auto-initialize
  telemetry.init();
}

/**
 * React Hook for easy telemetry integration
 */
export function useTelemetry(componentName: string) {
  const trackRender = (startTime: number, propsChanged: string[] = []) => {
    telemetry.trackRender(componentName, startTime, propsChanged);
  };

  const trackLifecycle = (phase: 'mount' | 'update' | 'unmount') => {
    telemetry.trackLifecycle(componentName, phase);
  };

  const trackError = (error: Error, action?: string, metadata?: Record<string, any>) => {
    telemetry.trackError(error, { componentName, action, metadata });
  };

  const trackInteraction = (
    type: 'click' | 'scroll' | 'keyboard' | 'focus' | 'hover',
    target: string,
    metadata?: Record<string, any>
  ) => {
    telemetry.trackUserInteraction(type, target, componentName, metadata);
  };

  return {
    trackRender,
    trackLifecycle,
    trackError,
    trackInteraction
  };
}

// Default export
export default telemetry;