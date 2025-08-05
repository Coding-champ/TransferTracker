import React, { useRef, lazy, Suspense } from 'react';
import { useNetworkData } from '../hooks/useNetworkData';
import { useAppContext } from '../contexts/AppContext';
import { 
  TabNavigation, 
  VisualizationLoading,
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

  // Handle tab changes
  const handleTabChange = (tab: VisualizationType) => {
    setActiveVisualization(tab);
  };

  // Render appropriate visualization based on active tab
  const renderVisualization = () => {
    if (loading) {
      return <VisualizationLoading title={DEFAULT_TABS.find(t => t.id === activeVisualization)?.label || 'Visualization'} />;
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-96 bg-white rounded-lg shadow-lg">
          <div className="text-center text-red-600">
            <div className="text-6xl mb-4">⚠️</div>
            <div className="text-lg mb-2">Error loading data</div>
            <div className="text-sm mb-4">{error}</div>
            <button 
              onClick={refetch}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    if (!networkData || networkData.nodes.length === 0) {
      return (
        <div className="flex items-center justify-center h-96 bg-white rounded-lg shadow-lg">
          <div className="text-center text-gray-500">
            <div className="text-6xl mb-4">🔍</div>
            <div className="text-lg mb-2">No data found</div>
            <div className="text-sm">Try adjusting your filters or search criteria</div>
            <div className="text-xs mt-2 text-gray-400">
              Current filters may be too restrictive
            </div>
          </div>
        </div>
      );
    }

    const commonProps = {
      networkData,
      filters,
      width: 1200,
      height: 600
    };

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
  };

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
          <Suspense fallback={
            <VisualizationLoading 
              title={DEFAULT_TABS.find(t => t.id === activeVisualization)?.label || 'Visualization'} 
            />
          }>
            {renderVisualization()}
          </Suspense>
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