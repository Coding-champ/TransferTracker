import React from 'react';

interface SankeyEmptyStateProps {
  width: number;
  height: number;
  message?: string;
}

const SankeyEmptyState: React.FC<SankeyEmptyStateProps> = ({ 
  width, 
  height, 
  message = "No data available" 
}) => {
  return (
    <div 
      className="flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300"
      style={{ width, height }}
    >
      <div className="text-center text-gray-500">
        <div className="text-4xl mb-4">🌊</div>
        <div className="text-lg font-medium">Sankey Visualization</div>
        <div className="text-sm mt-2">{message}</div>
        <div className="text-xs mt-1">Try adjusting your strategy or filters</div>
      </div>
    </div>
  );
};

export default SankeyEmptyState;