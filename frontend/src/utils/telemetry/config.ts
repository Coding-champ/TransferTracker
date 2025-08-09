/**
 * Telemetry Configuration - Controls performance monitoring settings
 * Provides fine-grained control over telemetry features to prevent performance issues
 */

export interface TelemetryConfig {
  enabled: boolean;
  dataCollection: {
    renderTracking: boolean;
    memoryTracking: boolean;
    lifecycleTracking: boolean;
    userInteractionTracking: boolean;
    errorTracking: boolean;
  };
  intervals: {
    dataCollection: number; // ms between data collection cycles
    cleanup: number; // ms between cleanup cycles
    excessiveRenderCheck: number; // ms between excessive render checks
  };
  limits: {
    maxMetrics: number;
    maxRenderCount: number; // threshold for excessive renders
    maxMetricAge: number; // ms to keep metrics
  };
  sampleData: {
    generateOnInit: boolean;
    generatePeriodic: boolean;
    amount: number; // number of sample records to generate
  };
}

const DEFAULT_CONFIG: TelemetryConfig = {
  enabled: false, // Disabled by default to prevent performance issues
  dataCollection: {
    renderTracking: true,
    memoryTracking: true,
    lifecycleTracking: true,
    userInteractionTracking: true,
    errorTracking: true,
  },
  intervals: {
    dataCollection: 30000, // 30 seconds instead of 5
    cleanup: 600000, // 10 minutes instead of 5
    excessiveRenderCheck: 60000, // 1 minute instead of 30 seconds
  },
  limits: {
    maxMetrics: 200, // Reduced from 1000
    maxRenderCount: 50, // Reduced from 100+ 
    maxMetricAge: 600000, // 10 minutes instead of 5
  },
  sampleData: {
    generateOnInit: false, // Don't generate excessive sample data
    generatePeriodic: false, // Don't generate periodic fake data
    amount: 5, // Minimal sample data if needed
  },
};

class TelemetryConfigManager {
  private config: TelemetryConfig;
  private intervals: Set<NodeJS.Timeout> = new Set();

  constructor() {
    this.config = { ...DEFAULT_CONFIG };
    this.loadFromEnvironment();
  }

  /**
   * Load configuration from environment variables
   */
  private loadFromEnvironment(): void {
    // Check if explicitly enabled via environment
    if (process.env.REACT_APP_TELEMETRY_ENABLED === 'true') {
      this.config.enabled = true;
    }
    
    // Allow localStorage override in development
    if (process.env.NODE_ENV === 'development') {
      try {
        const stored = localStorage.getItem('telemetry-config');
        if (stored) {
          const parsed = JSON.parse(stored);
          this.config = { ...this.config, ...parsed };
        }
      } catch (error) {
        console.warn('Failed to load telemetry config from localStorage:', error);
      }
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): TelemetryConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<TelemetryConfig>): void {
    this.config = { ...this.config, ...updates };
    
    // Save to localStorage in development
    if (process.env.NODE_ENV === 'development') {
      try {
        localStorage.setItem('telemetry-config', JSON.stringify(this.config));
      } catch (error) {
        console.warn('Failed to save telemetry config to localStorage:', error);
      }
    }
    
    console.log('📊 Telemetry configuration updated:', this.config);
  }

  /**
   * Enable telemetry with optional config
   */
  enable(config?: Partial<TelemetryConfig>): void {
    this.updateConfig({ 
      enabled: true,
      ...config 
    });
  }

  /**
   * Disable telemetry and clear intervals
   */
  disable(): void {
    this.updateConfig({ enabled: false });
    this.clearAllIntervals();
    console.log('📊 Telemetry disabled');
  }

  /**
   * Check if feature is enabled
   */
  isEnabled(feature?: keyof TelemetryConfig['dataCollection']): boolean {
    if (!this.config.enabled) return false;
    if (!feature) return true;
    return this.config.dataCollection[feature];
  }

  /**
   * Register an interval for cleanup
   */
  registerInterval(intervalId: NodeJS.Timeout): void {
    this.intervals.add(intervalId);
  }

  /**
   * Clear all registered intervals
   */
  clearAllIntervals(): void {
    this.intervals.forEach(intervalId => clearInterval(intervalId));
    this.intervals.clear();
  }

  /**
   * Get performance-optimized settings
   */
  getOptimizedConfig(): TelemetryConfig {
    return {
      ...this.config,
      intervals: {
        dataCollection: 60000, // 1 minute
        cleanup: 1200000, // 20 minutes  
        excessiveRenderCheck: 120000, // 2 minutes
      },
      limits: {
        maxMetrics: 100,
        maxRenderCount: 30,
        maxMetricAge: 300000, // 5 minutes
      },
      sampleData: {
        generateOnInit: false,
        generatePeriodic: false,
        amount: 0,
      },
    };
  }

  /**
   * Apply low-impact configuration
   */
  enableLowImpact(): void {
    this.updateConfig(this.getOptimizedConfig());
  }
}

// Singleton instance
export const telemetryConfig = new TelemetryConfigManager();

// Development-only global access
if (process.env.NODE_ENV === 'development') {
  (window as any).telemetryConfig = telemetryConfig;
  
  // Only log when explicitly requested to avoid startup overhead
  // console.log('🔧 Telemetry configuration available:');
  // console.log('- window.telemetryConfig.enable() - Enable telemetry');
  // console.log('- window.telemetryConfig.disable() - Disable telemetry');
  // console.log('- window.telemetryConfig.enableLowImpact() - Enable with minimal performance impact');
}

export default telemetryConfig;