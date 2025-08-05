import React from 'react';
import { VisualizationProps } from '../../../types';
import VisualizationContainer from '../shared/VisualizationContainer';

interface SankeyVisualizationProps extends VisualizationProps {}

export const SankeyVisualization: React.FC<SankeyVisualizationProps> = ({
  networkData,
  filters,
  width = 1200,
  height = 600
}) => {
  return (
    <VisualizationContainer
      networkData={networkData}
      filters={filters}
      title="Sankey Visualization"
      description="Transfer-Flüsse zwischen Ligen/Kontinenten"
    >
      <div 
        className="flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300"
        style={{ width, height }}
      >
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-4">🌊</div>
          <div className="text-lg font-medium">Sankey Visualization</div>
          <div className="text-sm mt-2">Coming Soon</div>
          <div className="text-xs mt-1">Transfer-Flüsse zwischen Ligen</div>
        </div>
      </div>
    </VisualizationContainer>
  );
};

export default SankeyVisualization;