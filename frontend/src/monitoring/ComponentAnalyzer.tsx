/**
 * ComponentAnalyzer - Detailed component performance analysis
 * Provides deep insights into individual component behavior and optimization opportunities
 */

import React, { useState, useEffect } from 'react';
import { performanceMetrics } from '../utils/telemetry/performanceMetrics';
import { errorTracker } from '../utils/telemetry/errorTracking';
import { userInteractionTracker } from '../utils/telemetry/userInteractions';

interface ComponentAnalyzerProps {
  selectedComponent?: string;
  onComponentSelect?: (componentName: string) => void;
  className?: string;
}

interface ComponentAnalysis {
  name: string;
  metrics: {
    renderCount: number;
    averageRenderTime: number;
    totalRenderTime: number;
    lastRenderTime: number;
    memoryUsage: number;
    errorCount: number;
    interactionCount: number;
  };
  performance: {
    score: number; // 0-100
    grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
    issues: string[];
    recommendations: string[];
  };
  trends: {
    renderTimetrend: 'improving' | 'stable' | 'degrading';
    memoryTrend: 'stable' | 'increasing' | 'decreasing';
    errorTrend: 'none' | 'stable' | 'increasing';
  };
}

export const ComponentAnalyzer: React.FC<ComponentAnalyzerProps> = ({
  selectedComponent,
  onComponentSelect,
  className = ''
}) => {
  const [components, setComponents] = useState<string[]>([]);
  const [analysis, setAnalysis] = useState<ComponentAnalysis | null>(null);
  const [selectedComponentName, setSelectedComponentName] = useState(selectedComponent || '');

  // Get list of components with performance data
  useEffect(() => {
    const updateComponents = () => {
      const renderMetrics = performanceMetrics.getRenderMetrics();
      const componentNames = Array.from(new Set(
        renderMetrics
          .map(metric => metric.componentName)
          .filter((name): name is string => name !== undefined && name !== '')
      ));
      setComponents(componentNames.sort());
    };

    updateComponents();
    const interval = setInterval(updateComponents, 3000);

    return () => clearInterval(interval);
  }, []);

  // Analyze selected component
  useEffect(() => {
    if (!selectedComponentName) return;

    const analyzeComponent = () => {
      const componentMetrics = performanceMetrics.getComponentMetrics(selectedComponentName);
      const componentErrors = errorTracker.getErrorsByComponent(selectedComponentName);
      const componentInteractions = userInteractionTracker.getInteractionsByComponent(selectedComponentName);

      const renderMetrics = componentMetrics.filter(m => m.name === 'component-render');
      const memoryMetrics = componentMetrics.filter(m => m.name === 'memory-usage');

      // Calculate basic metrics
      const metrics = {
        renderCount: renderMetrics.length,
        averageRenderTime: renderMetrics.length > 0 
          ? renderMetrics.reduce((sum, m) => sum + m.value, 0) / renderMetrics.length 
          : 0,
        totalRenderTime: renderMetrics.reduce((sum, m) => sum + m.value, 0),
        lastRenderTime: renderMetrics.length > 0 ? renderMetrics[renderMetrics.length - 1].value : 0,
        memoryUsage: memoryMetrics.length > 0 
          ? memoryMetrics[memoryMetrics.length - 1].value 
          : 0,
        errorCount: componentErrors.length,
        interactionCount: componentInteractions.length
      };

      // Calculate performance score
      let score = 100;
      const issues: string[] = [];
      const recommendations: string[] = [];

      // Render performance analysis
      if (metrics.averageRenderTime > 16.67) {
        score -= 20;
        issues.push('Slow rendering (>16.67ms)');
        recommendations.push('Consider using React.memo() or optimizing render logic');
      }

      if (metrics.renderCount > 50) {
        score -= 15;
        issues.push('Excessive re-renders');
        recommendations.push('Review props and state changes, use useMemo/useCallback');
      }

      // Memory analysis
      if (metrics.memoryUsage > 50 * 1024 * 1024) { // 50MB
        score -= 15;
        issues.push('High memory usage');
        recommendations.push('Check for memory leaks and unnecessary object references');
      }

      // Error analysis
      if (metrics.errorCount > 0) {
        score -= metrics.errorCount * 5;
        issues.push(`${metrics.errorCount} error(s) detected`);
        recommendations.push('Review error logs and implement error boundaries');
      }

      // Determine grade
      let grade: ComponentAnalysis['performance']['grade'] = 'A+';
      if (score < 95) grade = 'A';
      if (score < 85) grade = 'B';
      if (score < 75) grade = 'C';
      if (score < 65) grade = 'D';
      if (score < 50) grade = 'F';

      // Calculate trends (simplified - in real app would use historical data)
      const trends = {
        renderTimetrend: metrics.averageRenderTime > 20 ? 'degrading' : 
                       metrics.averageRenderTime < 10 ? 'improving' : 'stable',
        memoryTrend: 'stable' as const,
        errorTrend: metrics.errorCount > 0 ? 'increasing' : 'none'
      } as ComponentAnalysis['trends'];

      // Add optimization recommendations
      if (metrics.renderCount > 10 && issues.length === 0) {
        recommendations.push('Consider migrating to optimized hooks for better performance');
      }

      if (metrics.interactionCount > metrics.renderCount * 2) {
        recommendations.push('High interaction to render ratio - consider event optimization');
      }

      setAnalysis({
        name: selectedComponentName,
        metrics,
        performance: {
          score: Math.max(0, score),
          grade,
          issues,
          recommendations
        },
        trends
      });
    };

    analyzeComponent();
    const interval = setInterval(analyzeComponent, 2000);

    return () => clearInterval(interval);
  }, [selectedComponentName]);

  const handleComponentSelect = (componentName: string) => {
    setSelectedComponentName(componentName);
    onComponentSelect?.(componentName);
  };

  const getGradeColor = (grade: ComponentAnalysis['performance']['grade']) => {
    switch (grade) {
      case 'A+':
      case 'A':
        return 'text-green-600 bg-green-100';
      case 'B':
        return 'text-blue-600 bg-blue-100';
      case 'C':
        return 'text-yellow-600 bg-yellow-100';
      case 'D':
        return 'text-orange-600 bg-orange-100';
      case 'F':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return '📈';
      case 'degrading':
      case 'increasing':
        return '📉';
      case 'stable':
        return '➡️';
      case 'none':
        return '✅';
      default:
        return '❓';
    }
  };

  const formatMemory = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatTime = (ms: number): string => {
    return `${ms.toFixed(2)} ms`;
  };

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      <div className="p-6">
        <h3 className="text-lg font-semibold mb-4">Component Analysis</h3>

        {/* Component Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Component
          </label>
          <select
            value={selectedComponentName}
            onChange={(e) => handleComponentSelect(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Choose a component...</option>
            {components.map(component => (
              <option key={component} value={component}>
                {component}
              </option>
            ))}
          </select>
        </div>

        {/* Analysis Results */}
        {analysis ? (
          <div className="space-y-6">
            {/* Performance Score */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold">Performance Score</h4>
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-lg font-bold ${getGradeColor(analysis.performance.grade)}`}>
                    {analysis.performance.grade}
                  </span>
                  <span className="text-2xl font-bold text-gray-700">
                    {analysis.performance.score.toFixed(0)}
                  </span>
                </div>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Renders:</span>
                  <span className="ml-1 font-semibold">{analysis.metrics.renderCount}</span>
                </div>
                <div>
                  <span className="text-gray-600">Avg Time:</span>
                  <span className="ml-1 font-semibold">{formatTime(analysis.metrics.averageRenderTime)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Memory:</span>
                  <span className="ml-1 font-semibold">{formatMemory(analysis.metrics.memoryUsage)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Errors:</span>
                  <span className={`ml-1 font-semibold ${analysis.metrics.errorCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {analysis.metrics.errorCount}
                  </span>
                </div>
              </div>
            </div>

            {/* Trends */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold mb-3">Performance Trends</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>Render Time:</span>
                  <div className="flex items-center space-x-2">
                    <span>{getTrendIcon(analysis.trends.renderTimetrend)}</span>
                    <span className="capitalize">{analysis.trends.renderTimetrend}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span>Memory Usage:</span>
                  <div className="flex items-center space-x-2">
                    <span>{getTrendIcon(analysis.trends.memoryTrend)}</span>
                    <span className="capitalize">{analysis.trends.memoryTrend}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span>Error Rate:</span>
                  <div className="flex items-center space-x-2">
                    <span>{getTrendIcon(analysis.trends.errorTrend)}</span>
                    <span className="capitalize">{analysis.trends.errorTrend}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Issues */}
            {analysis.performance.issues.length > 0 && (
              <div className="bg-red-50 rounded-lg p-4">
                <h4 className="font-semibold mb-3 text-red-800">Issues Detected</h4>
                <ul className="space-y-1 text-sm text-red-700">
                  {analysis.performance.issues.map((issue, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="text-red-500 mt-0.5">⚠️</span>
                      <span>{issue}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {analysis.performance.recommendations.length > 0 && (
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-semibold mb-3 text-blue-800">Optimization Recommendations</h4>
                <ul className="space-y-1 text-sm text-blue-700">
                  {analysis.performance.recommendations.map((recommendation, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="text-blue-500 mt-0.5">💡</span>
                      <span>{recommendation}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Detailed Metrics */}
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3">Detailed Metrics</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Total Render Time:</span>
                  <span className="ml-1 font-semibold">{formatTime(analysis.metrics.totalRenderTime)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Last Render Time:</span>
                  <span className="ml-1 font-semibold">{formatTime(analysis.metrics.lastRenderTime)}</span>
                </div>
                <div>
                  <span className="text-gray-600">User Interactions:</span>
                  <span className="ml-1 font-semibold">{analysis.metrics.interactionCount}</span>
                </div>
                <div>
                  <span className="text-gray-600">Interaction/Render Ratio:</span>
                  <span className="ml-1 font-semibold">
                    {analysis.metrics.renderCount > 0 
                      ? (analysis.metrics.interactionCount / analysis.metrics.renderCount).toFixed(2)
                      : '0'
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : selectedComponentName ? (
          <div className="text-center text-gray-500 py-8">
            <div className="text-4xl mb-2">⏳</div>
            <p>Analyzing component...</p>
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8">
            <div className="text-4xl mb-2">🔍</div>
            <p>Select a component to analyze its performance</p>
            <p className="text-sm mt-2">
              {components.length} components available for analysis
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ComponentAnalyzer;