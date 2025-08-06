import React, { useRef, lazy, Suspense, useCallback, useMemo } from 'react';
import { useNetworkData } from '../hooks/useNetworkData';
import { useAppContext } from '../contexts/AppContext';
import { 
  TabNavigation, 
  VisualizationLoading,
  VisualizationContainer,
  DEFAULT_TABS,
  VisualizationType 
} from './Visualizations';
// Info panel components (moved from old structure)
import NetworkLegend from './Visualizations/NetworkVisualization/components/NetworkLegend';
import NodeInfoPanel from './Visualizations/NetworkVisualization/components/NodeInfoPanel';
import EdgeInfoPanel from './Visualizations/NetworkVisualization/components/EdgeInfoPanel';
import NetworkStatistics from './Visualizations/NetworkVisualization/components/NetworkStatistics';

// Lazy load visualization components
const NetworkVisualization = lazy(() => import('./Visualizations/NetworkVisualization'));
const CircularVisualization = lazy(() => import('./Visualizations/CircularVisualization'));
const SankeyVisualization = lazy(() => import('./Visualizations/SankeyVisualization'));
const HeatmapVisualization = lazy(() => import('./Visualizations/HeatmapVisualization'));
const TimelineVisualization = lazy(() => import('./Visualizations/TimelineVisualization'));
const StatisticsVisualization = lazy(() => import('./Visualizations/StatisticsVisualization'));

const TransferDashboard: React.FC = React.memo(() => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Get state from context
  const { state, setActiveVisualization } = useAppContext();
  const { filters, selectedNode, hoveredEdge, activeVisualization } = state;
  
  // Custom hooks for data fetching
  const { networkData, loading, error, refetch } = useNetworkData(filters);

  // Handle tab changes with useCallback to prevent re-renders
  const handleTabChange = useCallback((tab: VisualizationType) => {
    setActiveVisualization(tab);
  }, [setActiveVisualization]);

  // Memoize common props to prevent re-renders
  const commonProps = useMemo(() => {
    if (!networkData) return null;
    return {
      networkData,
      filters,
      width: 1200,
      height: 600
    };
  }, [networkData, filters]);

  // Render appropriate visualization based on active tab
  const renderVisualization = useCallback(() => {
    if (!commonProps) return null;
    
    switch (activeVisualization) {
      case 'network':
        return <NetworkVisualization {...commonProps} />;
      case 'circular':
        return <CircularVisualization {...commonProps} />;
      case 'sankey':
        return <SankeyVisualization {...commonProps} />;
      case 'heatmap':
        return <HeatmapVisualization {...commonProps} />;
      case 'timeline':
        return <TimelineVisualization {...commonProps} />;
      case 'statistics':
        return <StatisticsVisualization {...commonProps} />;
      default:
        return <NetworkVisualization {...commonProps} />;
    }
  }, [activeVisualization, commonProps]);

  // Memoize active tab info
  const activeTabInfo = useMemo(() => 
    DEFAULT_TABS.find(t => t.id === activeVisualization) || DEFAULT_TABS[0]
  , [activeVisualization]);

  return (
    <div className="w-full" ref={containerRef}>
      {/* Tab Navigation */}
      <div className="mb-6">
        <TabNavigation
          tabs={DEFAULT_TABS}
          activeTab={activeVisualization}
          onTabChange={handleTabChange}
        />
      </div>

      <div className="flex flex-col xl:flex-row gap-6">
        {/* Main Visualization Area */}
        <div className="flex-1">
          <VisualizationContainer
            networkData={networkData}
            filters={filters}
            title={activeTabInfo.label}
            description={activeTabInfo.description}
            isLoading={loading}
            error={error}
            onRetry={refetch}
          >
            <Suspense fallback={
              <VisualizationLoading 
                title={activeTabInfo.label} 
              />
            }>
              {renderVisualization()}
            </Suspense>
          </VisualizationContainer>
        </div>

        {/* Enhanced Info Panel (only show for network visualization or when there's selected data) */}
        {(activeVisualization === 'network' || selectedNode || hoveredEdge) && networkData && (
          <div className="w-full xl:w-96 space-y-6">
            {/* Legend */}
            <NetworkLegend networkData={networkData} />

            {/* Selected Node Info */}
            {selectedNode && (
              <NodeInfoPanel selectedNodeData={selectedNode} />
            )}

            {/* Hovered Edge Info */}
            {hoveredEdge && (
              <EdgeInfoPanel hoveredEdgeData={hoveredEdge} />
            )}

            {/* Network Statistics */}
            <NetworkStatistics networkData={networkData} filters={filters} />
          </div>
        )}
      </div>
    </div>
  );
});

// Add display name for better debugging
TransferDashboard.displayName = 'TransferDashboard';

export default TransferDashboard;