/**
 * PerformanceOverlay - Floating performance monitoring panel
 * Provides real-time performance metrics overlay for development
 */

import React, { useState, useEffect, useRef } from 'react';
import { performanceMetrics } from '../utils/telemetry/performanceMetrics';
import { errorTracker } from '../utils/telemetry/errorTracking';
import { userInteractionTracker } from '../utils/telemetry/userInteractions';

interface PerformanceOverlayProps {
  enabled?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  compact?: boolean;
}

interface PerformanceStats {
  renderTime: number;
  memoryUsage: number;
  errorCount: number;
  interactionCount: number;
  componentCount: number;
  timestamp: number;
}

export const PerformanceOverlay: React.FC<PerformanceOverlayProps> = ({
  enabled = process.env.NODE_ENV === 'development',
  position = 'top-right',
  compact = false
}) => {
  const [stats, setStats] = useState<PerformanceStats>({
    renderTime: 0,
    memoryUsage: 0,
    errorCount: 0,
    interactionCount: 0,
    componentCount: 0,
    timestamp: Date.now()
  });

  const [isVisible, setIsVisible] = useState(true);
  const [isExpanded, setIsExpanded] = useState(!compact);
  const intervalRef = useRef<NodeJS.Timeout>();

  // Update stats periodically
  useEffect(() => {
    if (!enabled) return;

    const updateStats = () => {
      const perfSummary = performanceMetrics.getSummary();
      const errorStats = errorTracker.getErrorStats();
      const interactionStats = userInteractionTracker.getInteractionStats();

      setStats({
        renderTime: perfSummary.averageRenderTime,
        memoryUsage: perfSummary.memoryUsage,
        errorCount: errorStats.total,
        interactionCount: interactionStats.total,
        componentCount: perfSummary.componentCount,
        timestamp: Date.now()
      });
    };

    // Initial update
    updateStats();

    // Set up interval
    intervalRef.current = setInterval(updateStats, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled]);

  // Keyboard shortcut to toggle overlay
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + Shift + P to toggle overlay
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'P') {
        event.preventDefault();
        setIsVisible(prev => !prev);
      }
      // Ctrl/Cmd + Shift + E to toggle expanded
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'E') {
        event.preventDefault();
        setIsExpanded(prev => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!enabled || !isVisible) {
    return null;
  }

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'top-right':
        return 'top-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      default:
        return 'top-4 right-4';
    }
  };

  const formatMemory = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)}MB`;
  };

  const formatRenderTime = (ms: number): string => {
    return `${ms.toFixed(1)}ms`;
  };

  const getPerformanceStatus = () => {
    if (stats.renderTime > 16.67) return { color: 'text-red-500', label: 'SLOW' };
    if (stats.renderTime > 8) return { color: 'text-yellow-500', label: 'OK' };
    return { color: 'text-green-500', label: 'FAST' };
  };

  const status = getPerformanceStatus();

  return (
    <div
      className={`fixed z-50 ${getPositionClasses()} bg-black bg-opacity-80 text-white text-xs font-mono rounded-lg shadow-lg backdrop-blur-sm border border-gray-600`}
      style={{ minWidth: '200px' }}
    >
      {/* Header */}
      <div 
        className="px-3 py-2 bg-gray-800 rounded-t-lg cursor-pointer flex justify-between items-center"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${status.color.replace('text-', 'bg-')}`} />
          <span className="font-semibold">Performance</span>
          <span className={`text-xs ${status.color}`}>{status.label}</span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsVisible(false);
            }}
            className="text-gray-400 hover:text-white"
          >
            ×
          </button>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="px-3 py-2 space-y-1">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-400">Render:</span>
              <span className={`ml-1 ${status.color}`}>
                {formatRenderTime(stats.renderTime)}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Memory:</span>
              <span className="ml-1 text-blue-400">
                {formatMemory(stats.memoryUsage)}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Errors:</span>
              <span className={`ml-1 ${stats.errorCount > 0 ? 'text-red-400' : 'text-green-400'}`}>
                {stats.errorCount}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Components:</span>
              <span className="ml-1 text-purple-400">
                {stats.componentCount}
              </span>
            </div>
          </div>

          {/* Interactions */}
          <div className="border-t border-gray-600 pt-1 mt-2">
            <div className="text-gray-400 text-xs">
              Interactions: <span className="text-cyan-400">{stats.interactionCount}</span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="border-t border-gray-600 pt-1 mt-2 space-y-1">
            <button
              onClick={() => {
                performanceMetrics.reset();
                errorTracker.clearErrors();
                userInteractionTracker.clearInteractions();
              }}
              className="w-full text-left text-xs text-gray-400 hover:text-white"
            >
              🔄 Reset Metrics
            </button>
            <button
              onClick={() => {
                const summary = performanceMetrics.getSummary();
                console.group('📊 Performance Summary');
                console.log('Average Render Time:', summary.averageRenderTime.toFixed(2) + 'ms');
                console.log('Memory Usage:', formatMemory(summary.memoryUsage));
                console.log('Component Count:', summary.componentCount);
                console.log('Excessive Renders:', summary.excessiveRenders);
                console.groupEnd();
              }}
              className="w-full text-left text-xs text-gray-400 hover:text-white"
            >
              📋 Log Summary
            </button>
            <button
              onClick={() => {
                if ((window as any).exportTelemetry) {
                  (window as any).exportTelemetry.clipboard('summary');
                }
              }}
              className="w-full text-left text-xs text-gray-400 hover:text-white"
            >
              📄 Copy Report
            </button>
          </div>

          {/* Keyboard Shortcuts */}
          <div className="border-t border-gray-600 pt-1 mt-2 text-xs text-gray-500">
            <div>Ctrl+Shift+P: Toggle</div>
            <div>Ctrl+Shift+E: Expand</div>
          </div>
        </div>
      )}

      {/* Compact Mode */}
      {!isExpanded && (
        <div className="px-3 py-1 text-xs">
          <div className="flex space-x-2">
            <span className={status.color}>{formatRenderTime(stats.renderTime)}</span>
            <span className="text-blue-400">{formatMemory(stats.memoryUsage)}</span>
            <span className={stats.errorCount > 0 ? 'text-red-400' : 'text-green-400'}>
              {stats.errorCount}E
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceOverlay;