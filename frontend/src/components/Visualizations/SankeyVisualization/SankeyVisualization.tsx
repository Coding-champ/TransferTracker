import React, { useState, useMemo, useCallback } from 'react';
import { VisualizationProps, SankeyStrategyConfig } from '../../../types';
import { useSankeyData } from './hooks/useSankeyDataStrategy';
import { DEFAULT_STRATEGY } from './strategies';
import SankeyChart from './components/SankeyChart';
import SankeyStrategySelector from './components/SankeyStrategySelector';
import SankeyEmptyState from './components/SankeyEmptyState';
import { PatternSelector } from './components/PatternSelector';
import { detectPatterns, calculatePatternStats } from './utils/patterns';

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
      enableFiltering: true,
      valueType: 'sum'
    }
  });

  // Interactive features state
  const [selectedPattern, setSelectedPattern] = useState<string | null>(null);
  const [focusedNode, setFocusedNode] = useState<string | null>(null);
  
  // Get processed Sankey data using the strategy
  const { 
    sankeyData, 
    error, 
    hasValidData
  } = useSankeyData(networkData, strategyConfig);

  // Calculate pattern statistics
  const patternStats = useMemo(() => {
    if (!networkData) return [];
    const patternMatches = detectPatterns(networkData.edges, networkData.nodes);
    return calculatePatternStats(patternMatches, networkData.nodes);
  }, [networkData]);

  // Handle strategy configuration changes
  const handleConfigChange = useCallback((newConfig: SankeyStrategyConfig) => {
    setStrategyConfig(newConfig);
    // Reset interactive state when strategy changes
    setSelectedPattern(null);
    setFocusedNode(null);
  }, []);

  // Handle pattern selection
  const handlePatternSelect = useCallback((patternId: string | null) => {
    setSelectedPattern(patternId);
    setFocusedNode(null); // Clear focus when pattern changes
  }, []);

  // Handle node click for focusing
  const handleNodeClick = useCallback((nodeId: string) => {
    if (focusedNode === nodeId) {
      // Click on already focused node clears focus
      setFocusedNode(null);
    } else {
      setFocusedNode(nodeId);
      setSelectedPattern(null); // Clear pattern when focusing on node
    }
  }, [focusedNode]);

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
      groupingMode: sankeyData.groupBy,
      networkData,
      selectedPattern,
      focusedNode,
      onNodeClick: handleNodeClick
    };
  }, [sankeyData, width, height, networkData, selectedPattern, focusedNode, handleNodeClick]);

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
        className="absolute top-4 right-4 z-20 w-80"
      />
      
      {/* Pattern Selector Panel */}
      <PatternSelector
        selectedPattern={selectedPattern}
        onPatternSelect={handlePatternSelect}
        patternStats={patternStats}
        className="absolute top-4 left-4 z-10 w-72"
      />

      {/* Focus Controls */}
      {(focusedNode || selectedPattern) && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 px-4 py-2 flex items-center gap-3">
            {focusedNode && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Focused on:</span>
                <span className="font-medium text-gray-900">{focusedNode}</span>
                <button
                  onClick={() => setFocusedNode(null)}
                  className="text-gray-400 hover:text-gray-600 ml-1"
                  title="Clear focus"
                >
                  ✕
                </button>
              </div>
            )}
            
            {selectedPattern && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Pattern:</span>
                <span className="font-medium text-gray-900">
                  {patternStats.find(p => p.patternId === selectedPattern)?.patternId.replace(/_/g, ' ') || selectedPattern}
                </span>
                <button
                  onClick={() => setSelectedPattern(null)}
                  className="text-gray-400 hover:text-gray-600 ml-1"
                  title="Clear pattern"
                >
                  ✕
                </button>
              </div>
            )}
            
            <button
              onClick={() => {
                setFocusedNode(null);
                setSelectedPattern(null);
              }}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded text-gray-700"
            >
              Reset View
            </button>
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