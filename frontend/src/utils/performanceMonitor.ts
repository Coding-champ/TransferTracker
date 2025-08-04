/**
 * Performance monitoring utilities for TransferTracker
 * Helps track CPU and memory usage to ensure performance targets are met
 */

interface PerformanceMetrics {
  timestamp: number;
  memoryUsage?: number; // in MB
  renderTime?: number; // in ms
  nodeCount?: number;
  edgeCount?: number;
  operation: string;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private maxMetrics = 100; // Keep last 100 metrics
  
  /**
   * Start measuring an operation
   */
  startMeasure(operation: string): () => PerformanceMetrics {
    const startTime = performance.now();
    // Note: startMemory could be used for memory delta calculations in future
    
    return () => {
      const endTime = performance.now();
      const endMemory = this.getMemoryUsage();
      
      const metric: PerformanceMetrics = {
        timestamp: Date.now(),
        memoryUsage: endMemory,
        renderTime: endTime - startTime,
        operation
      };
      
      this.addMetric(metric);
      return metric;
    };
  }
  
  /**
   * Record a performance metric
   */
  recordMetric(metric: Partial<PerformanceMetrics> & { operation: string }) {
    const fullMetric: PerformanceMetrics = {
      timestamp: Date.now(),
      memoryUsage: this.getMemoryUsage(),
      ...metric
    };
    
    this.addMetric(fullMetric);
  }
  
  /**
   * Get current memory usage if available
   */
  private getMemoryUsage(): number | undefined {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return Math.round(memory.usedJSHeapSize / 1024 / 1024); // Convert to MB
    }
    return undefined;
  }
  
  /**
   * Add metric to collection
   */
  private addMetric(metric: PerformanceMetrics) {
    this.metrics.push(metric);
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }
    
    // Log warnings if performance targets are exceeded
    this.checkPerformanceTargets(metric);
  }
  
  /**
   * Check if performance targets are being met
   */
  private checkPerformanceTargets(metric: PerformanceMetrics) {
    // Target: RAM usage should not exceed 500MB for typical datasets
    if (metric.memoryUsage && metric.memoryUsage > 500) {
      console.warn(`⚠️ Memory usage high: ${metric.memoryUsage}MB (target: <500MB) during ${metric.operation}`);
    }
    
    // Target: Network visualization should render within 2 seconds
    if (metric.renderTime && metric.renderTime > 2000 && metric.operation.includes('network')) {
      console.warn(`⚠️ Slow network rendering: ${metric.renderTime.toFixed(0)}ms (target: <2000ms) for ${metric.operation}`);
    }
    
    // Target: Filter operations should be responsive (<100ms)
    if (metric.renderTime && metric.renderTime > 100 && metric.operation.includes('filter')) {
      console.warn(`⚠️ Slow filter operation: ${metric.renderTime.toFixed(0)}ms (target: <100ms) for ${metric.operation}`);
    }
  }
  
  /**
   * Get recent metrics
   */
  getMetrics(count = 10): PerformanceMetrics[] {
    return this.metrics.slice(-count);
  }
  
  /**
   * Get average performance for an operation
   */
  getAveragePerformance(operation: string): { avgTime: number; avgMemory: number; count: number } {
    const operationMetrics = this.metrics.filter(m => m.operation.includes(operation));
    
    if (operationMetrics.length === 0) {
      return { avgTime: 0, avgMemory: 0, count: 0 };
    }
    
    const totalTime = operationMetrics.reduce((sum, m) => sum + (m.renderTime || 0), 0);
    const totalMemory = operationMetrics.reduce((sum, m) => sum + (m.memoryUsage || 0), 0);
    
    return {
      avgTime: totalTime / operationMetrics.length,
      avgMemory: totalMemory / operationMetrics.length,
      count: operationMetrics.length
    };
  }
  
  /**
   * Log performance summary
   */
  logSummary() {
    console.group('🚀 Performance Summary');
    
    const networkPerf = this.getAveragePerformance('network');
    const filterPerf = this.getAveragePerformance('filter');
    const currentMemory = this.getMemoryUsage();
    
    console.log(`Current Memory: ${currentMemory}MB`);
    console.log(`Network Rendering: ${networkPerf.avgTime.toFixed(0)}ms avg (${networkPerf.count} samples)`);
    console.log(`Filter Operations: ${filterPerf.avgTime.toFixed(0)}ms avg (${filterPerf.count} samples)`);
    
    // Check if targets are being met
    const targets = {
      memory: currentMemory ? currentMemory < 500 : true,
      networkSpeed: networkPerf.avgTime < 2000,
      filterSpeed: filterPerf.avgTime < 100
    };
    
    console.log('Target Compliance:');
    console.log(`  Memory < 500MB: ${targets.memory ? '✅' : '❌'}`);
    console.log(`  Network < 2s: ${targets.networkSpeed ? '✅' : '❌'}`);
    console.log(`  Filters < 100ms: ${targets.filterSpeed ? '✅' : '❌'}`);
    
    console.groupEnd();
  }
  
  /**
   * Clear all metrics
   */
  clear() {
    this.metrics = [];
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Helper functions for common operations
export const measureNetworkRender = (nodeCount: number, edgeCount: number) => {
  const endMeasure = performanceMonitor.startMeasure(`network-render-${nodeCount}n-${edgeCount}e`);
  return () => {
    const metric = endMeasure();
    metric.nodeCount = nodeCount;
    metric.edgeCount = edgeCount;
    return metric;
  };
};

export const measureFilterOperation = (filterType: string) => {
  return performanceMonitor.startMeasure(`filter-${filterType}`);
};

export const measureOptimization = (operation: string) => {
  return performanceMonitor.startMeasure(`optimization-${operation}`);
};