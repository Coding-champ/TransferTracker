/**
 * Export Utils - Data export functionality for telemetry data
 * Provides methods to export performance and telemetry data for analysis
 */

import { performanceMetrics, PerformanceMetric } from './performanceMetrics';
import { errorTracker, ErrorMetric } from './errorTracking';
import { userInteractionTracker, UserInteraction } from './userInteractions';

export interface TelemetryReport {
  timestamp: number;
  sessionId: string;
  duration: number;
  performance: {
    metrics: PerformanceMetric[];
    summary: ReturnType<typeof performanceMetrics.getSummary>;
  };
  errors: {
    metrics: ErrorMetric[];
    stats: ReturnType<typeof errorTracker.getErrorStats>;
  };
  interactions: {
    metrics: UserInteraction[];
    stats: ReturnType<typeof userInteractionTracker.getInteractionStats>;
  };
  metadata: {
    userAgent: string;
    url: string;
    viewport: { width: number; height: number };
    performance: {
      navigation: PerformanceNavigationTiming | null;
      memory: any;
    };
  };
}

class ExportUtils {
  private sessionId: string;
  private sessionStartTime: number;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.sessionStartTime = Date.now();
  }

  /**
   * Generate a complete telemetry report
   */
  generateReport(): TelemetryReport {
    const now = Date.now();
    
    return {
      timestamp: now,
      sessionId: this.sessionId,
      duration: now - this.sessionStartTime,
      performance: {
        metrics: performanceMetrics.getRenderMetrics(),
        summary: performanceMetrics.getSummary()
      },
      errors: {
        metrics: errorTracker.getErrors(),
        stats: errorTracker.getErrorStats()
      },
      interactions: {
        metrics: userInteractionTracker.getInteractions(),
        stats: userInteractionTracker.getInteractionStats()
      },
      metadata: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        performance: {
          navigation: this.getNavigationTiming(),
          memory: this.getMemoryInfo()
        }
      }
    };
  }

  /**
   * Export data as JSON file
   */
  exportAsJson(filename?: string): void {
    const report = this.generateReport();
    const jsonData = JSON.stringify(report, null, 2);
    
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `telemetry-report-${this.sessionId}-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }

  /**
   * Export data as CSV file
   */
  exportAsCSV(dataType: 'performance' | 'errors' | 'interactions', filename?: string): void {
    let csvData: string;
    let defaultFilename: string;

    switch (dataType) {
      case 'performance':
        csvData = this.convertPerformanceMetricsToCSV();
        defaultFilename = `performance-metrics-${this.sessionId}-${Date.now()}.csv`;
        break;
      case 'errors':
        csvData = this.convertErrorMetricsToCSV();
        defaultFilename = `error-metrics-${this.sessionId}-${Date.now()}.csv`;
        break;
      case 'interactions':
        csvData = this.convertInteractionMetricsToCSV();
        defaultFilename = `interaction-metrics-${this.sessionId}-${Date.now()}.csv`;
        break;
      default:
        throw new Error(`Unknown data type: ${dataType}`);
    }

    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || defaultFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }

  /**
   * Export summary report as text
   */
  exportSummaryReport(filename?: string): void {
    const report = this.generateReport();
    const summary = this.generateTextSummary(report);
    
    const blob = new Blob([summary], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `telemetry-summary-${this.sessionId}-${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }

  /**
   * Send data to external service (for production monitoring)
   */
  async sendToExternal(endpoint: string, apiKey?: string): Promise<void> {
    if (process.env.NODE_ENV !== 'development') {
      const report = this.generateReport();
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      try {
        await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(report)
        });
      } catch (error) {
        console.error('Failed to send telemetry data:', error);
      }
    }
  }

  /**
   * Copy data to clipboard
   */
  async copyToClipboard(format: 'json' | 'summary' = 'json'): Promise<void> {
    let text: string;

    if (format === 'json') {
      const report = this.generateReport();
      text = JSON.stringify(report, null, 2);
    } else {
      const report = this.generateReport();
      text = this.generateTextSummary(report);
    }

    try {
      await navigator.clipboard.writeText(text);
      console.log('Telemetry data copied to clipboard');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  }

  /**
   * Convert performance metrics to CSV
   */
  private convertPerformanceMetricsToCSV(): string {
    const metrics = performanceMetrics.getRenderMetrics();
    const headers = ['Timestamp', 'Component', 'Render Time', 'Render Count', 'Props Changed', 'Excessive'];
    
    const rows = metrics.map(metric => [
      new Date(metric.timestamp).toISOString(),
      metric.componentName || '',
      metric.renderTime.toString(),
      metric.renderCount.toString(),
      metric.propsChanged.join(';'),
      (metric.metadata?.excessive || false).toString()
    ]);

    return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  }

  /**
   * Convert error metrics to CSV
   */
  private convertErrorMetricsToCSV(): string {
    const errors = errorTracker.getErrors();
    const headers = ['Timestamp', 'Type', 'Component', 'Message', 'Severity', 'Resolved'];
    
    const rows = errors.map(error => [
      new Date(error.timestamp).toISOString(),
      error.errorType,
      error.componentName || '',
      error.message.replace(/"/g, '""'), // Escape quotes
      error.severity,
      (error.resolved || false).toString()
    ]);

    return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  }

  /**
   * Convert interaction metrics to CSV
   */
  private convertInteractionMetricsToCSV(): string {
    const interactions = userInteractionTracker.getInteractions();
    const headers = ['Timestamp', 'Type', 'Target', 'Component', 'Duration'];
    
    const rows = interactions.map(interaction => [
      new Date(interaction.timestamp).toISOString(),
      interaction.type,
      interaction.target,
      interaction.componentName || '',
      (interaction.duration || 0).toString()
    ]);

    return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  }

  /**
   * Generate text summary report
   */
  private generateTextSummary(report: TelemetryReport): string {
    const duration = Math.round(report.duration / 1000);
    
    return `
TELEMETRY SUMMARY REPORT
========================

Session ID: ${report.sessionId}
Generated: ${new Date(report.timestamp).toISOString()}
Duration: ${duration} seconds
URL: ${report.metadata.url}

PERFORMANCE METRICS
-------------------
Total Components: ${report.performance.summary.componentCount}
Average Render Time: ${report.performance.summary.averageRenderTime.toFixed(2)}ms
Memory Usage: ${(report.performance.summary.memoryUsage / 1024 / 1024).toFixed(2)}MB
Excessive Renders: ${report.performance.summary.excessiveRenders}

ERROR SUMMARY
-------------
Total Errors: ${report.errors.stats.total}
Critical: ${report.errors.stats.bySeverity.critical || 0}
High: ${report.errors.stats.bySeverity.high || 0}
Medium: ${report.errors.stats.bySeverity.medium || 0}
Low: ${report.errors.stats.bySeverity.low || 0}

INTERACTION SUMMARY
-------------------
Total Interactions: ${report.interactions.stats.total}
Clicks: ${report.interactions.stats.byType.click || 0}
Scrolls: ${report.interactions.stats.byType.scroll || 0}
Keyboard: ${report.interactions.stats.byType.keyboard || 0}

TOP ISSUES
----------
${report.errors.stats.topErrors.slice(0, 5).map(error => `- ${error.message} (${error.count}x)`).join('\n')}

NAVIGATION PERFORMANCE
---------------------
${report.metadata.performance.navigation ? `
Load Time: ${report.metadata.performance.navigation.loadEventEnd - report.metadata.performance.navigation.loadEventStart}ms
DOM Content Loaded: ${report.metadata.performance.navigation.domContentLoadedEventEnd - report.metadata.performance.navigation.domContentLoadedEventStart}ms
` : 'Navigation timing not available'}

ENVIRONMENT
-----------
User Agent: ${report.metadata.userAgent}
Viewport: ${report.metadata.viewport.width}x${report.metadata.viewport.height}
Memory Limit: ${report.metadata.performance.memory?.jsHeapSizeLimit ? (report.metadata.performance.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2) + 'MB' : 'Unknown'}
`;
  }

  /**
   * Get navigation timing information
   */
  private getNavigationTiming(): PerformanceNavigationTiming | null {
    if (typeof performance !== 'undefined' && performance.getEntriesByType) {
      const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      return navigationEntries.length > 0 ? navigationEntries[0] : null;
    }
    return null;
  }

  /**
   * Get memory information
   */
  private getMemoryInfo(): any {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      return (performance as any).memory;
    }
    return null;
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
export const exportUtils = new ExportUtils();

// Development-only convenience methods
if (process.env.NODE_ENV === 'development') {
  // Expose to global scope for easy access in dev tools
  (window as any).exportTelemetry = {
    json: () => exportUtils.exportAsJson(),
    csv: (type: 'performance' | 'errors' | 'interactions') => exportUtils.exportAsCSV(type),
    summary: () => exportUtils.exportSummaryReport(),
    clipboard: (format: 'json' | 'summary' = 'json') => exportUtils.copyToClipboard(format),
    report: () => exportUtils.generateReport()
  };

  console.log('📊 Telemetry export utilities available:');
  console.log('- window.exportTelemetry.json() - Export full report as JSON');
  console.log('- window.exportTelemetry.csv("performance") - Export performance as CSV');
  console.log('- window.exportTelemetry.summary() - Export summary as text');
  console.log('- window.exportTelemetry.clipboard() - Copy to clipboard');
}