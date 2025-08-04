import React, { useEffect } from 'react';
import { NetworkData } from '../types';
import { useD3Network } from '../hooks/useD3Network';
import { NetworkPerformanceConfig } from '../utils/networkOptimizer';
import NetworkControls from './NetworkControls';

interface NetworkCanvasProps {
  networkData: NetworkData;
  width?: number;
  height?: number;
  performanceConfig?: NetworkPerformanceConfig;
}

const NetworkCanvas: React.FC<NetworkCanvasProps> = ({ 
  networkData, 
  width = 1200, 
  height = 800,
  performanceConfig
}) => {
  const { svgRef, initializeVisualization, restartSimulation, isSimulationRunning, zoomRef } = useD3Network({
    networkData,
    width,
    height,
    performanceConfig
  });

  // Initialize visualization when data changes
  useEffect(() => {
    const cleanup = initializeVisualization();
    return cleanup;
  }, [initializeVisualization]);

  return (
    <div className="relative">
      <svg 
        ref={svgRef} 
        className="w-full border border-gray-200 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100"
        style={{ minHeight: `${height}px` }}
      />
      <NetworkControls 
        svgRef={svgRef} 
        zoomRef={zoomRef}
        restartSimulation={restartSimulation}
        isSimulationRunning={isSimulationRunning}
      />
    </div>
  );
};

export default NetworkCanvas;