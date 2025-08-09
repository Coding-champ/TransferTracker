/**
 * Performance Integration Example for TransferDashboard
 * 
 * Demonstrates how to integrate the new performance hooks
 * with existing components for zero CPU overhead optimization.
 */

import React, { useMemo, useCallback } from 'react';
import { 
  useRenderTracker, 
  useMemoryMonitor, 
  useVirtualization,
  useLazyLoading,
  type VirtualizationResult
} from './index';

// Example: Enhanced TransferDashboard with performance monitoring
interface TransferDashboardProps {
  transfers: Array<{
    id: string;
    player: string;
    from: string;
    to: string;
    fee: number;
    date: string;
  }>;
  filters: Record<string, any>;
}

export const EnhancedTransferDashboard: React.FC<TransferDashboardProps> = React.memo(({
  transfers,
  filters
}) => {
  // Performance monitoring - only enabled in development
  const renderStats = useRenderTracker('TransferDashboard', { transfers, filters }, {
    enabled: process.env.NODE_ENV === 'development',
    trackProps: true,
    logExcessiveRenders: true
  });

  const memoryStats = useMemoryMonitor('TransferDashboard', {
    enabled: process.env.NODE_ENV === 'development',
    interval: 5000
  });

  // Virtualized transfer list for large datasets
  const { visibleItems, scrollProps, containerRef } = useVirtualization(transfers, {
    enabled: transfers.length > 100, // Only virtualize large lists
    itemHeight: 80,
    overscan: 5,
    throttle: 16 // 60fps
  });

  // Lazy-loaded heavy visualization component (example - replace with actual component)
  const { LazyComponent: NetworkVisualization, isLoaded, preload } = useLazyLoading(
    () => Promise.resolve({ 
      default: React.memo(() => 
        React.createElement('div', { className: 'p-8 text-center' }, 'Network Visualization Component')
      )
    }),
    {
      enabled: true,
      preload: false, // Load only when tab is activated
      fallback: React.createElement('div', {
        className: 'flex items-center justify-center h-64'
      }, 'Loading visualization...'),
      timeout: 10000
    }
  );

  // Memoized transfer processing to prevent unnecessary recalculations
  const processedTransfers = useMemo(() => {
    return transfers.map(transfer => ({
      ...transfer,
      displayValue: `${transfer.player} (${transfer.from} → ${transfer.to})`
    }));
  }, [transfers]);

  // Optimized filter handling
  const handleFilterChange = useCallback((newFilters: Record<string, any>) => {
    // This would update filters in parent component
    console.log('Filters changed:', newFilters);
  }, []);

  return (
    <div className="transfer-dashboard">
      {/* Performance monitoring display (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="performance-stats bg-gray-100 p-2 text-xs border-b">
          <div>Renders: {renderStats.renderCount} (avg: {renderStats.averageRenderTime.toFixed(2)}ms)</div>
          <div>Memory: {((memoryStats.current?.usedJSHeapSize || 0) / 1024 / 1024).toFixed(2)}MB</div>
          {renderStats.isExcessive && <div className="text-red-600">⚠️ Excessive renders detected!</div>}
        </div>
      )}

      {/* Main dashboard content */}
      <div className="flex h-screen">
        {/* Virtualized transfer list */}
        <div className="w-1/3 border-r">
          <h2 className="p-4 border-b font-semibold">
            Transfers ({transfers.length})
            {transfers.length > 100 && <span className="text-sm text-gray-500 ml-2">(virtualized)</span>}
          </h2>
          
          <div 
            ref={containerRef}
            {...scrollProps}
            className="h-full"
          >
            <div style={{ height: `${visibleItems.length * 80}px` }}>
              {visibleItems.map(({ index, data: transfer }) => (
                <div 
                  key={transfer.id}
                  data-index={index}
                  className="p-4 border-b hover:bg-gray-50 h-20"
                  style={{
                    position: 'absolute',
                    top: index * 80,
                    width: '100%'
                  }}
                >
                  <div className="font-medium">{transfer.player}</div>
                  <div className="text-sm text-gray-600">
                    {transfer.from} → {transfer.to}
                  </div>
                  <div className="text-sm text-green-600">
                    €{transfer.fee.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Visualization area */}
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b">
            <button
              onClick={() => preload()}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
              disabled={isLoaded}
            >
              {isLoaded ? 'Visualization Ready' : 'Load Network Visualization'}
            </button>
          </div>

          <div className="flex-1 p-4">
            {NetworkVisualization && (
              <NetworkVisualization />
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

EnhancedTransferDashboard.displayName = 'EnhancedTransferDashboard';

// Example: Performance-optimized FilterPanel
interface FilterPanelProps {
  filters: Record<string, any>;
  onFiltersChange: (filters: Record<string, any>) => void;
}

export const PerformanceOptimizedFilterPanel: React.FC<FilterPanelProps> = React.memo(({
  filters,
  onFiltersChange
}) => {
  // Render tracking for filter performance
  const renderStats = useRenderTracker('FilterPanel', filters, {
    enabled: process.env.NODE_ENV === 'development',
    trackProps: true,
    maxRenderCount: 10 // Flag if more than 10 renders per second
  });

  // Memoized expensive filter computations
  const filterOptions = useMemo(() => {
    // Simulate expensive computation
    return {
      leagues: ['Premier League', 'La Liga', 'Bundesliga'],
      countries: ['England', 'Spain', 'Germany', 'France'],
      seasons: ['2023/24', '2022/23', '2021/22']
    };
  }, []); // Empty deps - static data

  // Optimized change handlers
  const handleLeagueChange = useCallback((league: string, checked: boolean) => {
    const currentLeagues = filters.leagues || [];
    const newLeagues = checked 
      ? [...currentLeagues, league]
      : currentLeagues.filter((l: string) => l !== league);
    
    onFiltersChange({
      ...filters,
      leagues: newLeagues
    });
  }, [filters, onFiltersChange]);

  return (
    <div className="filter-panel bg-white p-4 border rounded-lg">
      {/* Performance indicator */}
      {process.env.NODE_ENV === 'development' && renderStats.isExcessive && (
        <div className="mb-4 p-2 bg-yellow-100 border border-yellow-300 rounded text-sm">
          ⚠️ Filter panel is re-rendering excessively ({renderStats.renderCount} renders)
        </div>
      )}

      <h3 className="font-semibold mb-4">Filters</h3>
      
      {/* Leagues */}
      <div className="mb-4">
        <h4 className="font-medium mb-2">Leagues</h4>
        {filterOptions.leagues.map(league => (
          <label key={league} className="flex items-center mb-1">
            <input
              type="checkbox"
              checked={(filters.leagues || []).includes(league)}
              onChange={(e) => handleLeagueChange(league, e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm">{league}</span>
          </label>
        ))}
      </div>

      {/* Active filters summary */}
      <div className="mt-4 pt-4 border-t">
        <div className="text-sm text-gray-600">
          Active filters: {Object.values(filters).flat().length}
        </div>
      </div>
    </div>
  );
});

PerformanceOptimizedFilterPanel.displayName = 'PerformanceOptimizedFilterPanel';

// Example usage documentation
export const PERFORMANCE_INTEGRATION_EXAMPLES = {
  /**
   * Zero CPU Overhead Principles:
   * 
   * 1. Conditional Activation:
   *    - Performance hooks only enabled in development
   *    - Virtualization only for large datasets (>100 items)
   *    - Lazy loading only for heavy components
   * 
   * 2. Memory Management:
   *    - React.memo for expensive components
   *    - useMemo for expensive calculations
   *    - useCallback for stable event handlers
   * 
   * 3. Render Optimization:
   *    - Proper dependency arrays
   *    - Avoid object/array recreation
   *    - Track and alert on excessive renders
   * 
   * 4. Resource Cleanup:
   *    - All intervals and subscriptions cleaned up
   *    - Limited data retention (maxDataPoints)
   *    - Automatic garbage collection prompts
   */

  USAGE_PATTERNS: {
    // Pattern 1: Development-only monitoring
    developmentMonitoring: `
      const renderStats = useRenderTracker('ComponentName', props, {
        enabled: process.env.NODE_ENV === 'development'
      });
    `,

    // Pattern 2: Conditional virtualization
    conditionalVirtualization: `
      const { visibleItems } = useVirtualization(items, {
        enabled: items.length > 100 // Only for large lists
      });
    `,

    // Pattern 3: Lazy loading with preload
    lazyLoading: `
      const { LazyComponent, preload } = useLazyLoading(
        () => import('./HeavyComponent'),
        { preload: false } // Load only when needed
      );
    `,

    // Pattern 4: Memory monitoring with thresholds
    memoryMonitoring: `
      const memoryStats = useMemoryMonitor('ComponentName', {
        warningThreshold: 80, // 80% memory usage
        interval: 5000 // Check every 5 seconds
      });
    `
  }
};