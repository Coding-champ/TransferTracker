import React, { useEffect } from 'react';
import { NetworkData } from '../types';
import { useD3Network } from '../hooks/useD3Network';
import { NetworkPerformanceConfig, getOptimalPerformanceConfig } from '../utils/networkOptimizer';

interface NetworkCanvasProps {
  networkData: NetworkData;
  width?: number;
  height?: number;
  performanceConfig?: NetworkPerformanceConfig;
  showOptimizationInfo?: boolean;
}

const NetworkCanvas: React.FC<NetworkCanvasProps> = ({ 
  networkData, 
  width = 1200, 
  height = 800,
  performanceConfig,
  showOptimizationInfo = false
}) => {
  const { svgRef, initializeVisualization } = useD3Network({
    networkData,
    width,
    height,
    performanceConfig
  });

  // Get current configuration for display
  const currentConfig = performanceConfig || getOptimalPerformanceConfig(
    networkData?.nodes?.length || 0,
    networkData?.edges?.length || 0
  );

  // Initialize visualization when data changes
  useEffect(() => {
    const cleanup = initializeVisualization();
    return cleanup;
  }, [initializeVisualization]);

  return (
    <div className="relative">
      {showOptimizationInfo && networkData && (
        <div className="absolute top-2 right-2 z-10 bg-white bg-opacity-90 rounded-lg p-3 text-xs shadow-lg">
          <div className="font-semibold mb-1">Network Optimization</div>
          <div>Original: {networkData.nodes.length} nodes, {networkData.edges.length} edges</div>
          <div>Rendered: ≤{currentConfig.maxNodes} nodes, ≤{currentConfig.maxEdges} edges</div>
          <div>LOD: {currentConfig.simplificationZoomThreshold}x zoom</div>
          <div>RAF: {currentConfig.useRequestAnimationFrame ? 'Enabled' : 'Disabled'}</div>
        </div>
      )}
      <svg 
        ref={svgRef} 
        className="w-full border border-gray-200 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100"
        style={{ minHeight: `${height}px` }}
      />
    </div>
  );
};

export default NetworkCanvas;