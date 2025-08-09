/**
 * Migration Configuration - Settings and options for gradual hook migration
 * Centralized configuration for migration behavior, A/B testing, and rollback strategies
 */

export interface MigrationStrategy {
  type: 'gradual' | 'canary' | 'blue-green' | 'feature-flag';
  rolloutPercentage?: number; // For gradual rollouts (0-100)
  userSegment?: string; // Target specific user groups
  timeWindow?: {
    start?: Date;
    end?: Date;
  };
  dependencies?: string[]; // Required migrations before this one
}

export interface ComponentMigrationConfig {
  componentName: string;
  oldHook: string;
  newHook: string;
  strategy: MigrationStrategy;
  enabled: boolean;
  rollbackOnFailure: boolean;
  performanceThresholds: {
    maxRenderTime?: number;
    maxMemoryIncrease?: number;
    maxErrorRate?: number;
  };
  metadata?: Record<string, any>;
}

export interface GlobalMigrationConfig {
  enabled: boolean;
  environment: 'development' | 'staging' | 'production';
  defaultStrategy: MigrationStrategy;
  components: Record<string, ComponentMigrationConfig>;
  monitoring: {
    collectMetrics: boolean;
    sampleRate: number; // 0-1
    reportingInterval: number; // milliseconds
  };
  safety: {
    maxConcurrentMigrations: number;
    automaticRollback: boolean;
    rollbackThreshold: {
      errorRate: number; // 0-1
      performanceDegradation: number; // 0-1
    };
  };
}

/**
 * Default migration configuration
 */
export const DEFAULT_MIGRATION_CONFIG: GlobalMigrationConfig = {
  enabled: process.env.NODE_ENV === 'development',
  environment: process.env.NODE_ENV as 'development' | 'staging' | 'production',
  defaultStrategy: {
    type: 'gradual',
    rolloutPercentage: 10
  },
  components: {},
  monitoring: {
    collectMetrics: true,
    sampleRate: 1.0,
    reportingInterval: 30000 // 30 seconds
  },
  safety: {
    maxConcurrentMigrations: 3,
    automaticRollback: true,
    rollbackThreshold: {
      errorRate: 0.05, // 5% error rate
      performanceDegradation: 0.2 // 20% performance degradation
    }
  }
};

/**
 * Pre-configured migration strategies
 */
export const MIGRATION_STRATEGIES = {
  // Safe gradual rollout starting with 5% of users
  SAFE_GRADUAL: {
    type: 'gradual' as const,
    rolloutPercentage: 5
  },
  
  // Canary deployment for critical components
  CANARY: {
    type: 'canary' as const,
    rolloutPercentage: 1,
    userSegment: 'beta-testers'
  },
  
  // Feature flag based migration
  FEATURE_FLAG: {
    type: 'feature-flag' as const,
    rolloutPercentage: 0 // Controlled externally
  },
  
  // Full migration (for development)
  IMMEDIATE: {
    type: 'gradual' as const,
    rolloutPercentage: 100
  }
} as const;

/**
 * Component-specific migration configurations
 */
export const COMPONENT_MIGRATIONS: Record<string, ComponentMigrationConfig> = {
  'FilterPanel': {
    componentName: 'FilterPanel',
    oldHook: 'useNetworkData',
    newHook: 'useOptimizedNetwork',
    strategy: MIGRATION_STRATEGIES.SAFE_GRADUAL,
    enabled: true,
    rollbackOnFailure: true,
    performanceThresholds: {
      maxRenderTime: 50, // 50ms max render time
      maxMemoryIncrease: 10, // 10MB max memory increase
      maxErrorRate: 0.01 // 1% error rate
    },
    metadata: {
      priority: 'high',
      reason: 'Performance optimization for filter operations'
    }
  },
  
  'NetworkVisualization': {
    componentName: 'NetworkVisualization',
    oldHook: 'useNetworkData',
    newHook: 'useOptimizedNetwork',
    strategy: MIGRATION_STRATEGIES.CANARY,
    enabled: true,
    rollbackOnFailure: true,
    performanceThresholds: {
      maxRenderTime: 100, // 100ms for complex visualization
      maxMemoryIncrease: 50, // 50MB for large datasets
      maxErrorRate: 0.005 // 0.5% error rate (critical component)
    },
    metadata: {
      priority: 'critical',
      reason: 'Memory optimization for large network datasets'
    }
  },
  
  'TransferDashboard': {
    componentName: 'TransferDashboard',
    oldHook: 'useTransferData',
    newHook: 'useOptimizedCache',
    strategy: MIGRATION_STRATEGIES.FEATURE_FLAG,
    enabled: false, // Disabled by default
    rollbackOnFailure: true,
    performanceThresholds: {
      maxRenderTime: 75,
      maxMemoryIncrease: 20,
      maxErrorRate: 0.02
    },
    metadata: {
      priority: 'medium',
      reason: 'Caching optimization for dashboard data'
    }
  }
};

/**
 * Utility functions for migration configuration
 */
export class MigrationConfigManager {
  private config: GlobalMigrationConfig;

  constructor(config: Partial<GlobalMigrationConfig> = {}) {
    this.config = {
      ...DEFAULT_MIGRATION_CONFIG,
      ...config,
      components: {
        ...COMPONENT_MIGRATIONS,
        ...config.components
      }
    };
  }

  /**
   * Get component migration configuration
   */
  getComponentConfig(componentName: string): ComponentMigrationConfig | null {
    return this.config.components[componentName] || null;
  }

  /**
   * Check if migration is enabled for component
   */
  isComponentMigrationEnabled(componentName: string): boolean {
    const config = this.getComponentConfig(componentName);
    return this.config.enabled && config?.enabled === true;
  }

  /**
   * Should use new hook based on rollout strategy
   */
  shouldUseMigratedHook(componentName: string, userId?: string): boolean {
    const config = this.getComponentConfig(componentName);
    if (!config || !this.isComponentMigrationEnabled(componentName)) {
      return false;
    }

    switch (config.strategy.type) {
      case 'gradual':
        return this.shouldRolloutToUser(config.strategy.rolloutPercentage || 0, userId);
      
      case 'canary':
        // For canary, check if user is in target segment
        if (config.strategy.userSegment) {
          return this.isUserInSegment(userId, config.strategy.userSegment);
        }
        return this.shouldRolloutToUser(config.strategy.rolloutPercentage || 0, userId);
      
      case 'feature-flag':
        // Check external feature flag (localStorage for demo)
        return this.isFeatureFlagEnabled(componentName);
      
      case 'blue-green':
        // For blue-green, it's all or nothing based on deployment
        return config.strategy.rolloutPercentage === 100;
      
      default:
        return false;
    }
  }

  /**
   * Update component migration configuration
   */
  updateComponentConfig(componentName: string, updates: Partial<ComponentMigrationConfig>): void {
    const existing = this.config.components[componentName];
    if (existing) {
      this.config.components[componentName] = {
        ...existing,
        ...updates
      };
    }
  }

  /**
   * Disable migration for component (emergency rollback)
   */
  disableComponentMigration(componentName: string): void {
    this.updateComponentConfig(componentName, { enabled: false });
  }

  /**
   * Get list of active migrations
   */
  getActiveMigrations(): ComponentMigrationConfig[] {
    return Object.values(this.config.components)
      .filter(config => config.enabled);
  }

  /**
   * Get global configuration
   */
  getGlobalConfig(): GlobalMigrationConfig {
    return { ...this.config };
  }

  /**
   * Determine if user should be in rollout based on percentage
   */
  private shouldRolloutToUser(percentage: number, userId?: string): boolean {
    if (percentage === 0) return false;
    if (percentage === 100) return true;

    // Use deterministic hash based on user ID or session
    const id = userId || this.getSessionId();
    const hash = this.simpleHash(id);
    const userPercentile = hash % 100;
    
    return userPercentile < percentage;
  }

  /**
   * Check if user is in specific segment
   */
  private isUserInSegment(userId: string | undefined, segment: string): boolean {
    // In a real app, this would check user properties
    // For demo purposes, check localStorage
    if (typeof window !== 'undefined') {
      const userSegments = localStorage.getItem('userSegments');
      if (userSegments) {
        try {
          const segments = JSON.parse(userSegments);
          return segments.includes(segment);
        } catch (e) {
          console.warn('Failed to parse user segments from localStorage');
        }
      }
    }
    return false;
  }

  /**
   * Check if feature flag is enabled
   */
  private isFeatureFlagEnabled(componentName: string): boolean {
    if (typeof window !== 'undefined') {
      const flagKey = `migration_${componentName}`;
      return localStorage.getItem(flagKey) === 'true';
    }
    return false;
  }

  /**
   * Get session ID for consistent user bucketing
   */
  private getSessionId(): string {
    if (typeof window !== 'undefined') {
      let sessionId = sessionStorage.getItem('migrationSessionId');
      if (!sessionId) {
        sessionId = Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem('migrationSessionId', sessionId);
      }
      return sessionId;
    }
    return 'server-session';
  }

  /**
   * Simple hash function for user bucketing
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}

// Singleton instance
export const migrationConfig = new MigrationConfigManager();

// Development-only global access
if (process.env.NODE_ENV === 'development') {
  (window as any).migrationConfig = migrationConfig;
  
  // Helper functions for testing migrations
  (window as any).migrationHelpers = {
    enableMigration: (componentName: string) => {
      migrationConfig.updateComponentConfig(componentName, { enabled: true });
    },
    disableMigration: (componentName: string) => {
      migrationConfig.disableComponentMigration(componentName);
    },
    setFeatureFlag: (componentName: string, enabled: boolean) => {
      localStorage.setItem(`migration_${componentName}`, enabled.toString());
    },
    setUserSegment: (segments: string[]) => {
      localStorage.setItem('userSegments', JSON.stringify(segments));
    },
    getActiveMigrations: () => migrationConfig.getActiveMigrations()
  };

  console.log('🔄 Migration configuration available:');
  console.log('- window.migrationConfig - Configuration manager');
  console.log('- window.migrationHelpers - Testing utilities');
}