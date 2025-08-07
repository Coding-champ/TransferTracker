import React from 'react';
import { NetworkData, FilterState } from '../../../types';
import VisualizationLoading from './VisualizationLoading';
import EmptyState from './EmptyState';

interface VisualizationContainerProps {
  children: React.ReactNode;
  networkData: NetworkData | null;
  filters: FilterState;
  title: string;
  description?: string;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export const VisualizationContainer: React.FC<VisualizationContainerProps> = ({
  children,
  title,
  description,
  isLoading = false,
  error,
  onRetry,
  networkData,
  filters
}) => {
  if (isLoading) {
    return <VisualizationLoading title={title} />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 bg-white rounded-lg shadow-lg">
        <div className="text-center text-red-600">
          <div className="text-6xl mb-4">⚠️</div>
          <div className="text-lg mb-2">Error loading {title}</div>
          <div className="text-sm mb-4">{error}</div>
          {onRetry && (
            <button 
              onClick={onRetry}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!networkData || networkData.nodes.length === 0) {
    return <EmptyState title={title} />;
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-semibold">{title}</h3>
          {description && (
            <p className="text-sm text-gray-600 mt-1">{description}</p>
          )}
        </div>
        <div className="flex items-center space-x-4 text-sm text-gray-500">
          <span>{networkData.nodes.length} clubs</span>
          <span>•</span>
          <span>{networkData.edges.length} connections</span>
          <span>•</span>
          <span className="text-green-600 font-medium">
            {(networkData.metadata.transferSuccessRate || 0).toFixed(1)}% success rate
          </span>
        </div>
      </div>
      <div className="relative">
        {children}
      </div>
    </div>
  );
};

export default VisualizationContainer;