import React from 'react';
import { VisualizationProps } from '../../../types';
import VisualizationContainer from '../shared/VisualizationContainer';
import NetworkCanvas from './NetworkCanvas';

interface NetworkVisualizationProps extends VisualizationProps {
  onNodeSelect?: (nodeId: string | null) => void;
  onEdgeSelect?: (edgeId: string | null) => void;
}

/**
 * Main export component for the Network Visualization
 */
export const NetworkVisualization: React.FC<NetworkVisualizationProps> = ({
  networkData,
  filters,
  width = 1200,
  height = 600,
  onNodeSelect,
  onEdgeSelect
}) => {
  return (
    <VisualizationContainer
      networkData={networkData}
      filters={filters}
      title="Network Visualization"
      description="Interaktive Transfer-Netzwerk Darstellung"
    >
      <NetworkCanvas 
        networkData={networkData}
        width={width}
        height={height}
        onNodeSelect={onNodeSelect}
        onEdgeSelect={onEdgeSelect}
      />
    </VisualizationContainer>
  );
};

export default NetworkVisualization;