import React from 'react';
import { NetworkData } from '../../types';
import NetworkCanvas from './NetworkCanvas';

interface NetworkVisualizationProps {
  networkData: NetworkData;
  width?: number;
  height?: number;
  onNodeSelect?: (nodeId: string | null) => void;
  onEdgeSelect?: (edgeId: string | null) => void;
}

/**
 * Main export component for the Network Visualization
 */
const NetworkVisualization: React.FC<NetworkVisualizationProps> = (props) => {
  return <NetworkCanvas {...props} />;
};

export default NetworkVisualization;