/**
 * Telemetry - Main telemetry API
 * Central hub for all performance monitoring, error tracking, and user interaction analysis
 * Now with performance-optimized configuration system
 */

// Import for internal use
import { performanceMetrics } from './performanceMetrics';
import { errorTracker } from './errorTracking';
import { userInteractionTracker } from './userInteractions';
import { exportUtils } from './exportUtils';
import { telemetryConfig } from './config';

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

export { 
  telemetryConfig,
  type TelemetryConfig
} from './config';

/**
 * Main Telemetry class - Central API for all telemetry functionality
 * Now with configurable performance settings
 */
class Telemetry {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private intervalIds: Set<NodeJS.Timeout> = new Set();

  /**
   * Initialize telemetry system with configuration - only when explicitly enabled
   */
  init(): void {
    if (!this.isDevelopment) return;

    // Only setup global access and shortcuts, don't start data collection or log
    this.setupKeyboardShortcuts();
  }

  /**
   * Enable telemetry with optional low-impact mode
   */
  enable(lowImpact: boolean = false): void {
    if (lowImpact) {
      telemetryConfig.enableLowImpact();
    } else {
      telemetryConfig.enable();
    }
    
    // Clear any existing intervals first
    this.clearIntervals();
    
    // Start data collection
    this.startInitialDataCollection();
    
    console.log('📊 Telemetry enabled', lowImpact ? '(low-impact mode)' : '');
  }

  /**
   * Disable telemetry and stop all monitoring
   */
  disable(): void {
    telemetryConfig.disable();
    this.clearIntervals();
    performanceMetrics.reset();
    console.log('📊 Telemetry disabled and data cleared');
  }

  /**
   * Clear all intervals
   */
  private clearIntervals(): void {
    this.intervalIds.forEach(id => clearInterval(id));
    this.intervalIds.clear();
    telemetryConfig.clearAllIntervals();
  }

  /**
   * Start collecting initial performance data (optimized)
   */
  private startInitialDataCollection(): void {
    const config = telemetryConfig.getConfig();
    
    if (!config.enabled) return;

    // Track initial memory usage if enabled
    if (config.dataCollection.memoryTracking) {
      performanceMetrics.trackMemory('App');
    }
    
    // Track app lifecycle if enabled
    if (config.dataCollection.lifecycleTracking) {
      performanceMetrics.trackLifecycle('App', 'mount');
    }
    
    // Generate minimal sample data only if configured
    if (config.sampleData.generateOnInit && config.sampleData.amount > 0) {
      this.generateMinimalSampleData(config.sampleData.amount);
    }
    
    // Set up periodic data collection with configurable interval
    if (config.sampleData.generatePeriodic) {
      const intervalId = setInterval(() => {
        if (!telemetryConfig.isEnabled()) return;
        
        // Only collect memory data periodically
        if (telemetryConfig.isEnabled('memoryTracking')) {
          performanceMetrics.trackMemory('System');
        }
      }, config.intervals.dataCollection);
      
      this.intervalIds.add(intervalId);
      telemetryConfig.registerInterval(intervalId);
    }
    
    console.log('📊 Optimized telemetry data collection started');
  }

  /**
   * Generate minimal sample data for testing
   */
  private generateMinimalSampleData(amount: number): void {
    const components = ['App', 'FilterPanel', 'TransferDashboard'];
    
    for (let i = 0; i < Math.min(amount, 10); i++) { // Cap at 10 samples
      const component = components[i % components.length];
      const renderTime = 5 + Math.random() * 15; // 5-20ms realistic render times
      performanceMetrics.trackRender(component, renderTime);
    }
  }

  /**
   * Track component render performance
   */
  trackRender(componentName: string, startTime: number, propsChanged: string[] = []): void {
    if (!this.isDevelopment || !telemetryConfig.isEnabled('renderTracking')) return;
    
    const renderTime = performance.now() - startTime;
    performanceMetrics.trackRender(componentName, renderTime, propsChanged);
    
    // Track memory after render only if memory tracking enabled
    if (telemetryConfig.isEnabled('memoryTracking')) {
      performanceMetrics.trackMemory(componentName);
    }
  }

  /**
   * Track component lifecycle
   */
  trackLifecycle(componentName: string, phase: 'mount' | 'update' | 'unmount'): void {
    if (!this.isDevelopment || !telemetryConfig.isEnabled('lifecycleTracking')) return;
    
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
    if (!this.isDevelopment || !telemetryConfig.isEnabled('errorTracking')) return;

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
    if (!this.isDevelopment || !telemetryConfig.isEnabled('userInteractionTracking')) return;

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
  
  // Only log when explicitly requested to avoid overhead
  // console.log('📊 Telemetry available. Use window.telemetryConfig.enable() to activate or window.telemetryConfig.enableLowImpact() for minimal impact.');
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