import React from 'react';
import { VisualizationProps } from '../../../types';
import VisualizationContainer from '../shared/VisualizationContainer';

interface CircularVisualizationProps extends VisualizationProps {}

export const CircularVisualization: React.FC<CircularVisualizationProps> = ({
  networkData,
  filters,
  width = 800,
  height = 800
}) => {
  return (
    <VisualizationContainer
      networkData={networkData}
      filters={filters}
      title="Circular Visualization"
      description="Liga-Hierarchie in konzentrischen Ringen"
    >
      <div 
        className="flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300"
        style={{ width, height }}
      >
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-4">🔄</div>
          <div className="text-lg font-medium">Circular Visualization</div>
          <div className="text-sm mt-2">Coming Soon</div>
          <div className="text-xs mt-1">Konzentrische Ringe für Liga-Tiers</div>
        </div>
      </div>
    </VisualizationContainer>
  );
};

export default CircularVisualization;