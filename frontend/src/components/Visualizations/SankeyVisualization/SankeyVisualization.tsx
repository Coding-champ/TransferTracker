import React, { useState, useMemo, useCallback } from 'react';
import { VisualizationProps, SankeyStrategyConfig } from '../../../types';
import { useSankeyData } from './hooks/useSankeyDataStrategy';
import { DEFAULT_STRATEGY } from './strategies';
import SankeyChart from './components/SankeyChart';
import SankeyStrategySelector from './components/SankeyStrategySelector';
import SankeyEmptyState from './components/SankeyEmptyState';

interface SankeyVisualizationProps extends VisualizationProps {}

export const SankeyVisualization: React.FC<SankeyVisualizationProps> = ({
  networkData,
  width = 1200,
  height = 600
}) => {
  // Strategy configuration state
  const [strategyConfig, setStrategyConfig] = useState<SankeyStrategyConfig>({
    selectedStrategy: DEFAULT_STRATEGY.id,
    customSettings: {
      minimumFlowValue: undefined,
      showSelfLoops: false,
      enableFiltering: true
    }
  });
  
  // Get processed Sankey data using the strategy
  const { 
    sankeyData, 
    transformResult, 
    error, 
    hasValidData, 
    currentStrategy 
  } = useSankeyData(networkData, strategyConfig);

  // Handle strategy configuration changes
  const handleConfigChange = useCallback((newConfig: SankeyStrategyConfig) => {
    setStrategyConfig(newConfig);
  }, []);

  // Memoize chart props for performance
  const chartProps = useMemo(() => {
    if (!sankeyData) return null;
    
    // Add missing properties to links to match SankeyChart expectations
    const enhancedLinks = sankeyData.links.map((link) => {
      const sourceNodeIndex = sankeyData.nodes.findIndex(node => 
        node.id === (typeof link.source === 'string' ? link.source : link.source.id)
      );
      const targetNodeIndex = sankeyData.nodes.findIndex(node => 
        node.id === (typeof link.target === 'string' ? link.target : link.target.id)
      );
      
      return {
        source: Math.max(0, sourceNodeIndex),
        target: Math.max(0, targetNodeIndex),
        value: link.value,
        sourceCategory: typeof link.source === 'string' ? link.source : link.source.name,
        targetCategory: typeof link.target === 'string' ? link.target : link.target.name,
        width: link.width
      };
    });
    
    return {
      nodes: sankeyData.nodes,
      links: enhancedLinks,
      width,
      height,
      groupingMode: sankeyData.groupBy
    };
  }, [sankeyData, width, height]);

  // Show empty state if no valid data
  if (!hasValidData || !chartProps) {
    return (
      <div className="relative">
        <SankeyStrategySelector
          currentConfig={strategyConfig}
          onConfigChange={handleConfigChange}
          networkData={networkData}
          className="absolute top-4 right-4 z-10 w-80"
        />
        <SankeyEmptyState 
          width={width} 
          height={height}
          message={error || "No transfer data available for the selected strategy"}
        />
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Strategy Selector Panel */}
      <SankeyStrategySelector
        currentConfig={strategyConfig}
        onConfigChange={handleConfigChange}
        networkData={networkData}
        className="absolute top-4 right-4 z-10 w-80"
      />
      
      {/* Data Summary Panel */}
      {transformResult && (
        <div className="absolute top-4 left-4 z-10 bg-white border rounded-lg shadow-sm p-3">
          <h4 className="font-medium text-gray-900 mb-2">Data Summary</h4>
          <div className="text-xs text-gray-600 space-y-1">
            <div className="flex justify-between">
              <span>Strategy:</span>
              <span className="font-medium">{currentStrategy.name}</span>
            </div>
            <div className="flex justify-between">
              <span>Nodes:</span>
              <span className="font-medium">{transformResult.stats.transformedNodeCount}</span>
            </div>
            <div className="flex justify-between">
              <span>Flows:</span>
              <span className="font-medium">{transformResult.stats.transformedLinkCount}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Value:</span>
              <span className="font-medium">€{(transformResult.stats.totalValue / 1000000).toFixed(1)}M</span>
            </div>
            {transformResult.stats.hasCycles && (
              <div className="text-orange-600 text-xs mt-2">
                ⚠ Circular references detected
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Main Sankey Chart */}
      <SankeyChart {...chartProps} />
      
      {/* Error Display */}
      {error && (
        <div className="absolute bottom-4 left-4 right-4 z-10 bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="text-sm text-red-800">
            <span className="font-medium">Error:</span> {error}
          </div>
        </div>
      )}
    </div>
  );
};

export default SankeyVisualization;