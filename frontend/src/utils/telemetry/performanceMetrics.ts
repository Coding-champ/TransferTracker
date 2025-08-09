/**
 * Performance Metrics - Core performance tracking functionality
 * Provides real-time performance monitoring without impacting production bundle
 */

export interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  timestamp: number;
  componentName?: string;
  metadata?: Record<string, any>;
}

export interface RenderMetric extends PerformanceMetric {
  renderTime: number;
  renderCount: number;
  propsChanged: string[];
}

export interface MemoryMetric extends PerformanceMetric {
  heapUsed: number;
  heapTotal: number;
  external: number;
}

export interface ComponentLifecycleMetric extends PerformanceMetric {
  phase: 'mount' | 'update' | 'unmount';
  duration: number;
  componentName: string;
}

class PerformanceMetrics {
  private metrics: PerformanceMetric[] = [];
  private renderCounts = new Map<string, number>();
  private componentMountTimes = new Map<string, number>();
  private isDevelopment = process.env.NODE_ENV === 'development';
  private maxMetrics = 1000; // Prevent memory leaks

  /**
   * Track component render performance
   */
  trackRender(componentName: string, renderTime: number, propsChanged: string[] = []): void {
    if (!this.isDevelopment) return;

    const renderCount = this.renderCounts.get(componentName) || 0;
    this.renderCounts.set(componentName, renderCount + 1);

    const metric: RenderMetric = {
      id: `render-${componentName}-${Date.now()}`,
      name: 'component-render',
      value: renderTime,
      timestamp: Date.now(),
      componentName,
      renderTime,
      renderCount: renderCount + 1,
      propsChanged,
      metadata: {
        type: 'render',
        excessive: renderTime > 16.67, // Above 60fps threshold
        frequentRenders: renderCount > 10
      }
    };

    this.addMetric(metric);
  }

  /**
   * Track memory usage
   */
  trackMemory(componentName?: string): void {
    if (!this.isDevelopment || typeof performance === 'undefined' || !(performance as any).memory) return;

    const memory = (performance as any).memory;
    const metric: MemoryMetric = {
      id: `memory-${Date.now()}`,
      name: 'memory-usage',
      value: memory.usedJSHeapSize,
      timestamp: Date.now(),
      componentName,
      heapUsed: memory.usedJSHeapSize,
      heapTotal: memory.totalJSHeapSize,
      external: memory.external || 0,
      metadata: {
        type: 'memory',
        heapUtilization: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
      }
    };

    this.addMetric(metric);
  }

  /**
   * Track component lifecycle events
   */
  trackLifecycle(componentName: string, phase: 'mount' | 'update' | 'unmount'): void {
    if (!this.isDevelopment) return;

    const now = Date.now();
    let duration = 0;

    if (phase === 'mount') {
      this.componentMountTimes.set(componentName, now);
    } else if (phase === 'unmount') {
      const mountTime = this.componentMountTimes.get(componentName);
      if (mountTime) {
        duration = now - mountTime;
        this.componentMountTimes.delete(componentName);
      }
    }

    const metric: ComponentLifecycleMetric = {
      id: `lifecycle-${componentName}-${phase}-${now}`,
      name: 'component-lifecycle',
      value: duration,
      timestamp: now,
      componentName,
      phase,
      duration,
      metadata: {
        type: 'lifecycle',
        longLived: phase === 'unmount' && duration > 30000 // Component lived more than 30s
      }
    };

    this.addMetric(metric);
  }

  /**
   * Get performance data for specific component
   */
  getComponentMetrics(componentName: string): PerformanceMetric[] {
    return this.metrics.filter(metric => metric.componentName === componentName);
  }

  /**
   * Get all render metrics
   */
  getRenderMetrics(): RenderMetric[] {
    return this.metrics.filter(metric => metric.name === 'component-render') as RenderMetric[];
  }

  /**
   * Get memory metrics
   */
  getMemoryMetrics(): MemoryMetric[] {
    return this.metrics.filter(metric => metric.name === 'memory-usage') as MemoryMetric[];
  }

  /**
   * Get metrics within time range
   */
  getMetricsInRange(startTime: number, endTime: number): PerformanceMetric[] {
    return this.metrics.filter(
      metric => metric.timestamp >= startTime && metric.timestamp <= endTime
    );
  }

  /**
   * Get excessive render count for components
   */
  getExcessiveRenders(): Array<{ componentName: string; count: number }> {
    const excessive: Array<{ componentName: string; count: number }> = [];
    
    this.renderCounts.forEach((count, componentName) => {
      if (count > 20) { // More than 20 renders might be excessive
        excessive.push({ componentName, count });
      }
    });

    return excessive.sort((a, b) => b.count - a.count);
  }

  /**
   * Clear old metrics to prevent memory leaks
   */
  clearOldMetrics(maxAge: number = 300000): void { // 5 minutes default
    const cutoffTime = Date.now() - maxAge;
    this.metrics = this.metrics.filter(metric => metric.timestamp > cutoffTime);
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    totalMetrics: number;
    componentCount: number;
    averageRenderTime: number;
    memoryUsage: number;
    excessiveRenders: number;
  } {
    const renderMetrics = this.getRenderMetrics();
    const memoryMetrics = this.getMemoryMetrics();
    const latestMemory = memoryMetrics[memoryMetrics.length - 1];

    return {
      totalMetrics: this.metrics.length,
      componentCount: new Set(this.metrics.map(m => m.componentName).filter(Boolean)).size,
      averageRenderTime: renderMetrics.length > 0 
        ? renderMetrics.reduce((sum, m) => sum + m.renderTime, 0) / renderMetrics.length 
        : 0,
      memoryUsage: latestMemory ? latestMemory.heapUsed : 0,
      excessiveRenders: this.getExcessiveRenders().length
    };
  }

  /**
   * Add metric with automatic cleanup
   */
  private addMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    // Prevent memory leaks by limiting metrics count
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics / 2); // Keep latest half
    }
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics = [];
    this.renderCounts.clear();
    this.componentMountTimes.clear();
  }
}

// Singleton instance
export const performanceMetrics = new PerformanceMetrics();

// Development-only console logging
if (process.env.NODE_ENV === 'development') {
  // Auto-cleanup every 5 minutes
  setInterval(() => {
    performanceMetrics.clearOldMetrics();
  }, 300000);

  // Log excessive renders every 30 seconds
  setInterval(() => {
    const excessive = performanceMetrics.getExcessiveRenders();
    if (excessive.length > 0) {
      console.warn('🚨 Components with excessive renders:', excessive);
    }
  }, 30000);
}