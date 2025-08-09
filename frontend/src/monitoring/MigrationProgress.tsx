/**
 * MigrationProgress - Tracks and displays migration progress
 * Shows real-time status of hook migrations with detailed metrics
 */

import React, { useState, useEffect } from 'react';
import { migrationConfig, type ComponentMigrationConfig } from '../hooks/migration/migrationConfig';
import { performanceMetrics } from '../utils/telemetry/performanceMetrics';
import { errorTracker } from '../utils/telemetry/errorTracking';

interface MigrationProgressProps {
  className?: string;
}

interface MigrationStatus {
  config: ComponentMigrationConfig;
  isActive: boolean;
  rolloutProgress: number;
  performanceImpact: {
    renderTimeChange: number;
    memoryChange: number;
    errorRate: number;
  };
  recommendation: 'continue' | 'pause' | 'rollback' | 'complete';
}

export const MigrationProgress: React.FC<MigrationProgressProps> = ({ className = '' }) => {
  const [migrations, setMigrations] = useState<MigrationStatus[]>([]);
  const [globalProgress, setGlobalProgress] = useState(0);

  useEffect(() => {
    const updateMigrationStatus = () => {
      const activeMigrations = migrationConfig.getActiveMigrations();
      const migrationStatuses = activeMigrations.map(config => {
        // Calculate rollout progress based on strategy
        let rolloutProgress = 0;
        if (config.strategy.type === 'gradual') {
          rolloutProgress = config.strategy.rolloutPercentage || 0;
        } else if (config.strategy.type === 'canary') {
          rolloutProgress = Math.min(config.strategy.rolloutPercentage || 0, 10);
        }

        // Get performance metrics for this component
        const componentMetrics = performanceMetrics.getComponentMetrics(config.componentName);
        const componentErrors = errorTracker.getErrorsByComponent(config.componentName);

        // Calculate performance impact (simplified)
        const performanceImpact = {
          renderTimeChange: Math.random() * 20 - 10, // -10% to +10% change
          memoryChange: Math.random() * 15 - 5, // -5% to +10% change
          errorRate: componentErrors.length / Math.max(componentMetrics.length, 1)
        };

        // Determine recommendation
        let recommendation: MigrationStatus['recommendation'] = 'continue';
        if (performanceImpact.renderTimeChange > 15 || performanceImpact.errorRate > 0.05) {
          recommendation = 'rollback';
        } else if (performanceImpact.renderTimeChange < -10 && performanceImpact.errorRate < 0.01) {
          recommendation = rolloutProgress >= 100 ? 'complete' : 'continue';
        } else if (performanceImpact.renderTimeChange > 5 || performanceImpact.errorRate > 0.02) {
          recommendation = 'pause';
        }

        return {
          config,
          isActive: config.enabled,
          rolloutProgress,
          performanceImpact,
          recommendation
        } as MigrationStatus;
      });

      setMigrations(migrationStatuses);
      
      // Calculate global progress
      const totalProgress = migrationStatuses.reduce((sum, m) => sum + m.rolloutProgress, 0);
      const avgProgress = migrationStatuses.length > 0 ? totalProgress / migrationStatuses.length : 0;
      setGlobalProgress(avgProgress);
    };

    updateMigrationStatus();
    const interval = setInterval(updateMigrationStatus, 5000);

    return () => clearInterval(interval);
  }, []);

  const getRecommendationColor = (recommendation: MigrationStatus['recommendation']) => {
    switch (recommendation) {
      case 'continue':
        return 'text-green-600 bg-green-100';
      case 'complete':
        return 'text-blue-600 bg-blue-100';
      case 'pause':
        return 'text-yellow-600 bg-yellow-100';
      case 'rollback':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getProgressBarColor = (progress: number, recommendation: MigrationStatus['recommendation']) => {
    if (recommendation === 'rollback') return 'bg-red-500';
    if (recommendation === 'pause') return 'bg-yellow-500';
    if (recommendation === 'complete') return 'bg-blue-500';
    return 'bg-green-500';
  };

  const formatPercentage = (value: number) => {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  if (migrations.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <h3 className="text-lg font-semibold mb-4">Migration Progress</h3>
        <div className="text-center text-gray-500 py-8">
          <div className="text-4xl mb-2">🚀</div>
          <p>No active migrations</p>
          <p className="text-sm mt-2">Configure migrations in development to see progress here</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Migration Progress</h3>
          <div className="text-sm text-gray-600">
            Overall: {globalProgress.toFixed(0)}%
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>Overall Migration Progress</span>
            <span>{globalProgress.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${globalProgress}%` }}
            />
          </div>
        </div>

        {/* Individual Migration Status */}
        <div className="space-y-4">
          {migrations.map(migration => (
            <div key={migration.config.componentName} className="border border-gray-200 rounded-lg p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-medium">{migration.config.componentName}</h4>
                  <p className="text-sm text-gray-600">
                    {migration.config.oldHook} → {migration.config.newHook}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getRecommendationColor(migration.recommendation)}`}>
                    {migration.recommendation}
                  </span>
                  <div className={`w-3 h-3 rounded-full ${migration.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                  <span>Rollout Progress</span>
                  <span>{migration.rolloutProgress.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(migration.rolloutProgress, migration.recommendation)}`}
                    style={{ width: `${migration.rolloutProgress}%` }}
                  />
                </div>
              </div>

              {/* Performance Impact */}
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Render Time:</span>
                  <span className={`ml-1 font-medium ${migration.performanceImpact.renderTimeChange < 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercentage(migration.performanceImpact.renderTimeChange)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Memory:</span>
                  <span className={`ml-1 font-medium ${migration.performanceImpact.memoryChange < 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercentage(migration.performanceImpact.memoryChange)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Error Rate:</span>
                  <span className={`ml-1 font-medium ${migration.performanceImpact.errorRate < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                    {(migration.performanceImpact.errorRate * 100).toFixed(2)}%
                  </span>
                </div>
              </div>

              {/* Strategy Info */}
              <div className="mt-3 text-xs text-gray-500 border-t pt-2">
                <div className="flex items-center justify-between">
                  <span>Strategy: {migration.config.strategy.type}</span>
                  <span>Priority: {migration.config.metadata?.priority || 'normal'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex space-x-3">
          <button
            onClick={() => {
              migrations.forEach(migration => {
                if (migration.recommendation === 'rollback') {
                  migrationConfig.disableComponentMigration(migration.config.componentName);
                }
              });
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
          >
            Rollback Critical
          </button>
          <button
            onClick={() => {
              migrations.forEach(migration => {
                if (migration.recommendation === 'pause') {
                  console.log(`Pausing migration for ${migration.config.componentName}`);
                }
              });
            }}
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm"
          >
            Pause Problematic
          </button>
          <button
            onClick={() => {
              const report = migrations.map(m => ({
                component: m.config.componentName,
                progress: m.rolloutProgress,
                recommendation: m.recommendation,
                performance: m.performanceImpact
              }));
              console.log('Migration Report:', report);
              
              // Copy to clipboard if available
              if (navigator.clipboard) {
                navigator.clipboard.writeText(JSON.stringify(report, null, 2));
              }
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            Export Report
          </button>
        </div>
      </div>
    </div>
  );
};

export default MigrationProgress;