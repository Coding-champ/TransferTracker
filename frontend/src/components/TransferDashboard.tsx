import React, { useRef, useCallback, useMemo } from 'react';
import { useNetworkData } from '../hooks/useNetworkData';
import { useAppContext } from '../contexts/AppContext';
import { 
  TabNavigation, 
  VisualizationContainer,
  DEFAULT_TABS,
  VisualizationType 
} from './Visualizations';
// Direct imports for all visualizations - eliminates lazy loading issues
import NetworkVisualization from './Visualizations/NetworkVisualization';
import CircularVisualization from './Visualizations/CircularVisualization';
import SankeyVisualization from './Visualizations/SankeyVisualization';
import HeatmapVisualization from './Visualizations/HeatmapVisualization';
import TimelineVisualization from './Visualizations/TimelineVisualization';
import StatisticsVisualization from './Visualizations/StatisticsVisualization';
// Info panel components (moved from old structure)
import NetworkLegend from './Visualizations/NetworkVisualization/components/NetworkLegend';
import NodeInfoPanel from './Visualizations/NetworkVisualization/components/NodeInfoPanel';
import EdgeInfoPanel from './Visualizations/NetworkVisualization/components/EdgeInfoPanel';
import NetworkStatistics from './Visualizations/NetworkVisualization/components/NetworkStatistics';

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
    switch (activeVisualization) {
      case 'network':
        if (!commonProps) return null;
        return <NetworkVisualization {...commonProps} />;
      case 'circular':
        if (!commonProps) return null;
        return <CircularVisualization {...commonProps} />;
      case 'sankey':
        if (!commonProps) return null;
        return <SankeyVisualization {...commonProps} />;
      case 'heatmap':
        // For heatmap, use common props or provide fallback
        return <HeatmapVisualization {...(commonProps || { networkData: null, filters, width: 1200, height: 600 })} />;
      case 'timeline':
        if (!commonProps) return null;
        return <TimelineVisualization {...commonProps} />;
      case 'statistics':
        if (!commonProps) return null;
        return <StatisticsVisualization {...commonProps} />;
      default:
        if (!commonProps) return null;
        return <NetworkVisualization {...commonProps} />;
    }
  }, [activeVisualization, commonProps, filters]);

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
            {renderVisualization()}
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