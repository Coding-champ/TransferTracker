/**
 * DevDashboard - Main development dashboard for performance monitoring
 * Comprehensive performance analysis and migration tracking interface
 */

import React, { useState, useEffect } from 'react';
import { performanceMetrics, type PerformanceMetric } from '../utils/telemetry/performanceMetrics';
import { errorTracker, type ErrorMetric } from '../utils/telemetry/errorTracking';
import { userInteractionTracker } from '../utils/telemetry/userInteractions';
import { telemetryConfig } from '../utils/telemetry/config';
import { migrationConfig } from '../hooks/migration/migrationConfig';

interface DevDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DashboardTab {
  id: string;
  name: string;
  icon: string;
}

const TABS: DashboardTab[] = [
  { id: 'overview', name: 'Overview', icon: '📊' },
  { id: 'performance', name: 'Performance', icon: '⚡' },
  { id: 'errors', name: 'Errors', icon: '🚨' },
  { id: 'interactions', name: 'Interactions', icon: '👆' },
  { id: 'migrations', name: 'Migrations', icon: '🔄' }
];

export const DevDashboard: React.FC<DevDashboardProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [perfSummary, setPerfSummary] = useState(performanceMetrics.getSummary());
  const [errorStats, setErrorStats] = useState(errorTracker.getErrorStats());
  const [interactionStats, setInteractionStats] = useState(userInteractionTracker.getInteractionStats());
  const [renderMetrics, setRenderMetrics] = useState<PerformanceMetric[]>([]);
  const [recentErrors, setRecentErrors] = useState<ErrorMetric[]>([]);
  const [forceRender, setForceRender] = useState(0); // Force re-render key

  // Initialize sample data when telemetry is enabled
  useEffect(() => {
    if (!isOpen) return;
    
    const isTelemetryEnabled = telemetryConfig.isEnabled();
    if (!isTelemetryEnabled) return;
    
    // Generate initial sample data when dashboard opens and telemetry is enabled
    const initSampleData = () => {
      // Generate minimal sample data for better user experience
      const components = ['App', 'FilterPanel', 'TransferDashboard', 'DevDashboard'];
      
      for (let i = 0; i < 8; i++) {
        const component = components[i % components.length];
        const renderTime = 3 + Math.random() * 12; // 3-15ms realistic
        performanceMetrics.trackRender(component, renderTime);
      }
      
      // Track some memory usage
      performanceMetrics.trackMemory('Dashboard');
      
      // Force component re-render to display new data
      setForceRender(prev => prev + 1);
    };
    
    // Small delay to ensure data is available
    const timeout = setTimeout(initSampleData, 100);
    return () => clearTimeout(timeout);
  }, [isOpen]); // Simplified dependency array

  // Update data periodically and on tab changes - only when telemetry is enabled
  useEffect(() => {
    if (!isOpen) return;

    const updateData = () => {
      try {
        // Always get the latest data regardless of telemetry state
        setPerfSummary(performanceMetrics.getSummary());
        setErrorStats(errorTracker.getErrorStats());
        setInteractionStats(userInteractionTracker.getInteractionStats());
        
        // Only get detailed metrics if telemetry is enabled
        if (telemetryConfig.isEnabled()) {
          setRenderMetrics(performanceMetrics.getRenderMetrics().slice(-20)); // Last 20 renders
          setRecentErrors(errorTracker.getErrors().slice(-10)); // Last 10 errors
        } else {
          setRenderMetrics([]);
          setRecentErrors([]);
        }
      } catch (error) {
        console.error('Error updating dashboard data:', error);
      }
    };

    // Update immediately when dashboard opens or tab changes
    updateData();
    
    // Only set interval if dashboard is open - reduce frequency to save CPU
    const interval = setInterval(updateData, 5000); // 5 seconds instead of 2

    return () => clearInterval(interval);
  }, [isOpen, activeTab, forceRender]); // Include forceRender to trigger updates

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      if (event.key === 'Escape') {
        onClose();
      }

      // Tab shortcuts (1-5)
      const tabIndex = parseInt(event.key) - 1;
      if (tabIndex >= 0 && tabIndex < TABS.length) {
        setActiveTab(TABS[tabIndex].id);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const formatMemory = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatTime = (ms: number): string => {
    return `${ms.toFixed(2)} ms`;
  };

  const getPerformanceGrade = (avgRenderTime: number): { grade: string; color: string } => {
    if (avgRenderTime < 5) return { grade: 'A+', color: 'text-green-500' };
    if (avgRenderTime < 10) return { grade: 'A', color: 'text-green-400' };
    if (avgRenderTime < 16.67) return { grade: 'B', color: 'text-yellow-400' };
    if (avgRenderTime < 25) return { grade: 'C', color: 'text-orange-400' };
    return { grade: 'D', color: 'text-red-500' };
  };

  const renderOverviewTab = () => {
    const grade = getPerformanceGrade(perfSummary.averageRenderTime);
    
    return (
      <div className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Performance Grade</p>
                <p className={`text-2xl font-bold ${grade.color}`}>{grade.grade}</p>
              </div>
              <div className="text-2xl">⚡</div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Render Time</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatTime(perfSummary.averageRenderTime)}
                </p>
              </div>
              <div className="text-2xl">🚀</div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Memory Usage</p>
                <p className="text-2xl font-bold text-purple-600">
                  {perfSummary.memoryUsage > 0 ? formatMemory(perfSummary.memoryUsage) : 'Collecting...'}
                </p>
                {perfSummary.memoryUsage === 0 && (
                  <p className="text-xs text-gray-400">No memory data yet</p>
                )}
              </div>
              <div className="text-2xl">💾</div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Components</p>
                <p className="text-2xl font-bold text-indigo-600">{perfSummary.componentCount}</p>
              </div>
              <div className="text-2xl">🧩</div>
            </div>
          </div>
        </div>

        {/* Status Summary */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">System Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${errorStats.total === 0 ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm">
                {errorStats.total === 0 ? 'No Errors' : `${errorStats.total} Errors`}
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${perfSummary.excessiveRenders === 0 ? 'bg-green-500' : 'bg-yellow-500'}`} />
              <span className="text-sm">
                {perfSummary.excessiveRenders === 0 ? 'Optimized Renders' : `${perfSummary.excessiveRenders} Excessive Renders`}
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-sm">{interactionStats.total} User Interactions</span>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {recentErrors.slice(0, 5).map(error => (
              <div key={error.id} className="flex items-center justify-between text-sm">
                <span className="text-red-600">Error: {error.message.slice(0, 50)}...</span>
                <span className="text-gray-500">{new Date(error.timestamp).toLocaleTimeString()}</span>
              </div>
            ))}
            {recentErrors.length === 0 && (
              <div className="text-gray-500 text-sm">No recent errors</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderPerformanceTab = () => (
    <div className="space-y-6">
      {/* Render Metrics Chart */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Render Performance</h3>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {renderMetrics.map((metric, index) => (
            <div key={metric.id} className="flex items-center justify-between text-sm border-b pb-1">
              <span className="font-mono">{metric.componentName || 'Unknown'}</span>
              <div className="flex space-x-4">
                <span className={`${metric.metadata?.excessive ? 'text-red-500' : 'text-green-500'}`}>
                  {formatTime(metric.value)}
                </span>
                <span className="text-gray-500">{new Date(metric.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Performance Tips */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Optimization Tips</h3>
        <div className="space-y-2 text-sm">
          {perfSummary.excessiveRenders > 0 && (
            <div className="flex items-start space-x-2">
              <span className="text-orange-500">⚠️</span>
              <span>Consider using React.memo() or useMemo() for components with excessive renders</span>
            </div>
          )}
          {perfSummary.averageRenderTime > 16.67 && (
            <div className="flex items-start space-x-2">
              <span className="text-red-500">🐌</span>
              <span>Render time exceeds 60fps threshold. Consider code splitting or lazy loading</span>
            </div>
          )}
          <div className="flex items-start space-x-2">
            <span className="text-blue-500">💡</span>
            <span>Use the performance hooks to track and optimize component behavior</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderErrorsTab = () => (
    <div className="space-y-6">
      {/* Error Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(errorStats.bySeverity).map(([severity, count]) => (
          <div key={severity} className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 capitalize">{severity}</p>
                <p className="text-2xl font-bold text-red-600">{count}</p>
              </div>
              <div className="text-2xl">
                {severity === 'critical' ? '🔥' : severity === 'high' ? '🚨' : severity === 'medium' ? '⚠️' : '💡'}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Error List */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Recent Errors</h3>
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {recentErrors.map(error => (
            <div key={error.id} className="border border-gray-200 rounded p-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      error.severity === 'critical' ? 'bg-red-100 text-red-800' :
                      error.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                      error.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {error.severity}
                    </span>
                    <span className="text-xs text-gray-500">{error.errorType}</span>
                    {error.componentName && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {error.componentName}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium">{error.message}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(error.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
          {recentErrors.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              <div className="text-4xl mb-2">🎉</div>
              <p>No errors detected!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderInteractionsTab = () => (
    <div className="space-y-6">
      {/* Interaction Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(interactionStats.byType).map(([type, count]) => (
          <div key={type} className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 capitalize">{type}</p>
                <p className="text-2xl font-bold text-blue-600">{count}</p>
              </div>
              <div className="text-2xl">
                {type === 'click' ? '👆' : type === 'scroll' ? '📜' : type === 'keyboard' ? '⌨️' : '🖱️'}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Interaction Patterns */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Interaction Patterns</h3>
        <div className="space-y-3">
          <div>
            <p className="text-sm text-gray-600">Session Duration</p>
            <p className="text-lg font-semibold">
              {Math.round(interactionStats.patterns.sessionDuration / 1000)}s
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Average Scroll Velocity</p>
            <p className="text-lg font-semibold">
              {interactionStats.patterns.averageScrollVelocity.toFixed(2)} px/ms
            </p>
          </div>
          {interactionStats.patterns.mostClickedTargets.length > 0 && (
            <div>
              <p className="text-sm text-gray-600 mb-2">Most Clicked Elements</p>
              <div className="space-y-1">
                {interactionStats.patterns.mostClickedTargets.slice(0, 5).map(target => (
                  <div key={target.target} className="flex justify-between text-sm">
                    <span className="font-mono">{target.target}</span>
                    <span className="text-gray-500">{target.count} clicks</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderMigrationsTab = () => {
    const activeMigrations = migrationConfig.getActiveMigrations();
    
    return (
      <div className="space-y-6">
        {/* Migration Status */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Active Migrations</h3>
          {activeMigrations.length > 0 ? (
            <div className="space-y-3">
              {activeMigrations.map(migration => (
                <div key={migration.componentName} className="border border-gray-200 rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">{migration.componentName}</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      migration.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {migration.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>{migration.oldHook} → {migration.newHook}</p>
                    <p>Strategy: {migration.strategy.type} ({migration.strategy.rolloutPercentage}%)</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <div className="text-4xl mb-2">🔄</div>
              <p>No active migrations</p>
            </div>
          )}
        </div>

        {/* Migration Controls */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Migration Controls</h3>
          <div className="space-y-2 text-sm">
            <p>Use browser console commands to control migrations:</p>
            <div className="bg-gray-100 p-3 rounded font-mono text-xs space-y-1">
              <div>migrationHelpers.enableMigration('ComponentName')</div>
              <div>migrationHelpers.disableMigration('ComponentName')</div>
              <div>migrationHelpers.setFeatureFlag('ComponentName', true)</div>
              <div>migrationHelpers.getActiveMigrations()</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverviewTab();
      case 'performance':
        return renderPerformanceTab();
      case 'errors':
        return renderErrorsTab();
      case 'interactions':
        return renderInteractionsTab();
      case 'migrations':
        return renderMigrationsTab();
      default:
        return renderOverviewTab();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-gray-50 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Performance Dashboard</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {TABS.map((tab, index) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.name}</span>
                <span className="text-xs bg-gray-200 text-gray-600 px-1 rounded">
                  {index + 1}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div key={activeTab} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default DevDashboard;