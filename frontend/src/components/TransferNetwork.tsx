import React, { useRef } from 'react';
import { useNetworkData } from '../hooks/useNetworkData';
import { useAppContext } from '../contexts/AppContext';
import NetworkErrorBoundary from './NetworkErrorBoundary';
import NetworkCanvas from './NetworkCanvas';
import NetworkLegend from './NetworkLegend';
import NodeInfoPanel from './NodeInfoPanel';
import EdgeInfoPanel from './EdgeInfoPanel';
import NetworkStatistics from './NetworkStatistics';

const TransferNetwork: React.FC = React.memo(() => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Get filters and selected elements from context
  const { state } = useAppContext();
  const { filters, selectedNode, hoveredEdge } = state;
  
  // Custom hooks for data fetching
  const { networkData, loading, error, refetch } = useNetworkData(filters);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-lg text-gray-600">Loading enhanced network data...</div>
          <div className="text-sm text-gray-500 mt-2">Applying advanced filters...</div>
        </div>
      </div>
    );
  }

  // Error state
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

  // No data state
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

  return (
    <div className="w-full" ref={containerRef}>
      <div className="flex flex-col xl:flex-row gap-6">
        {/* Main Network Visualization */}
        <div className="flex-1">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Enhanced Transfer Network</h3>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span>{networkData.nodes.length} clubs</span>
                <span>•</span>
                <span>{networkData.edges.length} connections</span>
                <span>•</span>
                <span className="text-green-600 font-medium">
                  {(networkData.metadata.successRate || 0).toFixed(1)}% success rate
                </span>
              </div>
            </div>
            <div className="relative network-panel">
              <NetworkErrorBoundary>
                <NetworkCanvas 
                  networkData={networkData}
                  width={1200}
                  height={600}
                />
              </NetworkErrorBoundary>
            </div>
          </div>
        </div>

        {/* Enhanced Info Panel */}
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
      </div>
    </div>
  );
});

// Add display name for better debugging
TransferNetwork.displayName = 'TransferNetwork';

export default TransferNetwork;