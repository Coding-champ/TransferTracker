/**
 * Error Tracking - Monitor and track application errors
 * Provides comprehensive error monitoring for debugging and performance analysis
 */

export interface ErrorMetric {
  id: string;
  timestamp: number;
  componentName?: string;
  errorType: 'javascript' | 'react' | 'network' | 'performance' | 'user-action';
  message: string;
  stack?: string;
  metadata?: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved?: boolean;
}

export interface NetworkError extends ErrorMetric {
  url: string;
  method: string;
  status?: number;
  responseTime?: number;
}

export interface ReactError extends ErrorMetric {
  componentStack?: string;
  errorBoundary?: string;
  phase?: 'render' | 'commit' | 'effect';
}

class ErrorTracker {
  private errors: ErrorMetric[] = [];
  private errorCounts = new Map<string, number>();
  private isDevelopment = process.env.NODE_ENV === 'development';
  private maxErrors = 500;

  constructor() {
    if (this.isDevelopment) {
      this.setupGlobalErrorHandling();
    }
  }

  /**
   * Track a JavaScript error
   */
  trackJavaScriptError(
    error: Error,
    componentName?: string,
    metadata?: Record<string, any>
  ): void {
    // Always track for dashboard display - environment check moved to caller

    const errorMetric: ErrorMetric = {
      id: `js-error-${Date.now()}`,
      timestamp: Date.now(),
      componentName,
      errorType: 'javascript',
      message: error.message,
      stack: error.stack,
      metadata: {
        ...metadata,
        errorName: error.name
      },
      severity: this.determineSeverity(error.message, error.stack)
    };

    this.addError(errorMetric);
  }

  /**
   * Track a React error (from ErrorBoundary)
   */
  trackReactError(
    error: Error,
    errorInfo: { componentStack?: string },
    componentName?: string
  ): void {
    if (!this.isDevelopment) return;

    const reactError: ReactError = {
      id: `react-error-${Date.now()}`,
      timestamp: Date.now(),
      componentName,
      errorType: 'react',
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      metadata: {
        errorName: error.name,
        hasComponentStack: !!errorInfo.componentStack
      },
      severity: 'high' // React errors are typically serious
    };

    this.addError(reactError);
  }

  /**
   * Track a network error
   */
  trackNetworkError(
    url: string,
    method: string,
    error: Error,
    status?: number,
    responseTime?: number
  ): void {
    if (!this.isDevelopment) return;

    const networkError: NetworkError = {
      id: `network-error-${Date.now()}`,
      timestamp: Date.now(),
      errorType: 'network',
      message: error.message,
      url,
      method,
      status,
      responseTime,
      metadata: {
        errorName: error.name,
        isTimeout: responseTime && responseTime > 30000,
        statusCategory: status ? Math.floor(status / 100) * 100 : undefined
      },
      severity: this.determineNetworkSeverity(status, responseTime)
    };

    this.addError(networkError);
  }

  /**
   * Track a performance-related error
   */
  trackPerformanceError(
    message: string,
    componentName?: string,
    metadata?: Record<string, any>
  ): void {
    if (!this.isDevelopment) return;

    const performanceError: ErrorMetric = {
      id: `perf-error-${Date.now()}`,
      timestamp: Date.now(),
      componentName,
      errorType: 'performance',
      message,
      metadata,
      severity: 'medium'
    };

    this.addError(performanceError);
  }

  /**
   * Track user action error
   */
  trackUserActionError(
    action: string,
    error: Error,
    componentName?: string,
    metadata?: Record<string, any>
  ): void {
    if (!this.isDevelopment) return;

    const userActionError: ErrorMetric = {
      id: `user-error-${Date.now()}`,
      timestamp: Date.now(),
      componentName,
      errorType: 'user-action',
      message: `${action}: ${error.message}`,
      stack: error.stack,
      metadata: {
        ...metadata,
        action,
        errorName: error.name
      },
      severity: 'low'
    };

    this.addError(userActionError);
  }

  /**
   * Get all errors
   */
  getErrors(): ErrorMetric[] {
    return [...this.errors];
  }

  /**
   * Get errors by type
   */
  getErrorsByType(type: ErrorMetric['errorType']): ErrorMetric[] {
    return this.errors.filter(error => error.errorType === type);
  }

  /**
   * Get errors by component
   */
  getErrorsByComponent(componentName: string): ErrorMetric[] {
    return this.errors.filter(error => error.componentName === componentName);
  }

  /**
   * Get errors by severity
   */
  getErrorsBySeverity(severity: ErrorMetric['severity']): ErrorMetric[] {
    return this.errors.filter(error => error.severity === severity);
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    topErrors: Array<{ message: string; count: number }>;
    recentErrors: ErrorMetric[];
  } {
    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};

    this.errors.forEach(error => {
      byType[error.errorType] = (byType[error.errorType] || 0) + 1;
      bySeverity[error.severity] = (bySeverity[error.severity] || 0) + 1;
    });

    const topErrors = Array.from(this.errorCounts.entries())
      .map(([message, count]) => ({ message, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const recentErrors = this.errors
      .slice(-10)
      .reverse();

    return {
      total: this.errors.length,
      byType,
      bySeverity,
      topErrors,
      recentErrors
    };
  }

  /**
   * Mark error as resolved
   */
  markResolved(errorId: string): void {
    const error = this.errors.find(e => e.id === errorId);
    if (error) {
      error.resolved = true;
    }
  }

  /**
   * Clear old errors
   */
  clearOldErrors(maxAge: number = 600000): void { // 10 minutes default
    const cutoffTime = Date.now() - maxAge;
    this.errors = this.errors.filter(error => error.timestamp > cutoffTime);
  }

  /**
   * Clear all errors
   */
  clearErrors(): void {
    this.errors = [];
    this.errorCounts.clear();
  }

  /**
   * Setup global error handling
   */
  private setupGlobalErrorHandling(): void {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.trackJavaScriptError(
        new Error(event.message),
        undefined,
        {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          isGlobalError: true
        }
      );
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason instanceof Error 
        ? event.reason 
        : new Error(String(event.reason));

      this.trackJavaScriptError(error, undefined, {
        type: 'unhandledPromiseRejection',
        isPromiseRejection: true
      });
    });
  }

  /**
   * Add error to collection
   */
  private addError(error: ErrorMetric): void {
    this.errors.push(error);

    // Track error frequency
    const errorKey = error.message;
    this.errorCounts.set(errorKey, (this.errorCounts.get(errorKey) || 0) + 1);

    // Prevent memory leaks
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors / 2);
    }

    // Log high/critical errors immediately
    if (error.severity === 'high' || error.severity === 'critical') {
      console.error(`🚨 ${error.severity.toUpperCase()} Error:`, error);
    }
  }

  /**
   * Determine error severity based on content
   */
  private determineSeverity(message: string, stack?: string): ErrorMetric['severity'] {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('chunk') || lowerMessage.includes('loading')) {
      return 'medium';
    }
    
    if (lowerMessage.includes('network') || lowerMessage.includes('fetch')) {
      return 'medium';
    }
    
    if (lowerMessage.includes('memory') || lowerMessage.includes('maximum call stack')) {
      return 'critical';
    }
    
    if ((stack && stack.includes('React')) || lowerMessage.includes('render')) {
      return 'high';
    }
    
    return 'medium';
  }

  /**
   * Determine network error severity
   */
  private determineNetworkSeverity(status?: number, responseTime?: number): ErrorMetric['severity'] {
    if (!status) return 'high';
    
    if (status >= 500) return 'critical';
    if (status >= 400) return 'medium';
    if (responseTime && responseTime > 30000) return 'high';
    
    return 'low';
  }
}

// Singleton instance
export const errorTracker = new ErrorTracker();

// Development-only periodic reporting
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    errorTracker.clearOldErrors();
    
    const stats = errorTracker.getErrorStats();
    if (stats.total > 0) {
      console.group('📊 Error Report');
      console.log('Total errors:', stats.total);
      console.log('By type:', stats.byType);
      console.log('By severity:', stats.bySeverity);
      if (stats.topErrors.length > 0) {
        console.log('Top errors:', stats.topErrors);
      }
      console.groupEnd();
    }
  }, 120000); // Every 2 minutes
}