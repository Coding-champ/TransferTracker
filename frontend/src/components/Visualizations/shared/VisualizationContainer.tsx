import React, { Suspense } from 'react';
import { VisualizationProps } from '../../../types';

interface VisualizationContainerProps extends VisualizationProps {
  children: React.ReactNode;
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
  networkData
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
            {(networkData.metadata.successRate || 0).toFixed(1)}% success rate
          </span>
        </div>
      </div>
      <div className="relative">
        <Suspense fallback={<VisualizationLoading title={title} />}>
          {children}
        </Suspense>
      </div>
    </div>
  );
};

export const VisualizationLoading: React.FC<{ title: string }> = ({ title }) => (
  <div className="flex items-center justify-center h-96 bg-white rounded-lg shadow-lg">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <div className="text-lg text-gray-600">Loading {title}...</div>
      <div className="text-sm text-gray-500 mt-2">Preparing visualization...</div>
    </div>
  </div>
);

export const EmptyState: React.FC<{ title: string }> = ({ title }) => (
  <div className="flex items-center justify-center h-96 bg-white rounded-lg shadow-lg">
    <div className="text-center text-gray-500">
      <div className="text-6xl mb-4">🔍</div>
      <div className="text-lg mb-2">No data available for {title}</div>
      <div className="text-sm">Try adjusting your filters or search criteria</div>
      <div className="text-xs mt-2 text-gray-400">
        Current filters may be too restrictive
      </div>
    </div>
  </div>
);

export default VisualizationContainer;