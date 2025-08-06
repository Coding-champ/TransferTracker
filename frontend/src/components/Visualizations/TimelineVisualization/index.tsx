import React from 'react';
import { VisualizationProps } from '../../../types';

interface TimelineVisualizationProps extends VisualizationProps {}

export const TimelineVisualization: React.FC<TimelineVisualizationProps> = ({
  networkData,
  filters,
  width = 1200,
  height = 600
}) => {
  return (
    <div 
      className="flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300"
      style={{ width, height }}
    >
      <div className="text-center text-gray-500">
        <div className="text-4xl mb-4">📅</div>
        <div className="text-lg font-medium">Timeline Visualization</div>
        <div className="text-sm mt-2">Coming Soon</div>
        <div className="text-xs mt-1">Zeitlicher Transfer-Verlauf</div>
      </div>
    </div>
  );
};

export default TimelineVisualization;