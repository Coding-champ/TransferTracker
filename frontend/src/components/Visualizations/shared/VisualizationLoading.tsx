import React from 'react';

interface VisualizationLoadingProps {
  title: string;
  message?: string;
  size?: 'small' | 'medium' | 'large';
}

export const VisualizationLoading: React.FC<VisualizationLoadingProps> = ({
  title,
  message = "Preparing visualization...",
  size = 'medium'
}) => {
  const sizeClasses = {
    small: 'h-48',
    medium: 'h-96',
    large: 'h-[500px]'
  };

  const spinnerSizes = {
    small: 'h-8 w-8',
    medium: 'h-12 w-12',
    large: 'h-16 w-16'
  };

  return (
    <div className={`flex items-center justify-center ${sizeClasses[size]} bg-white rounded-lg shadow-lg`}>
      <div className="text-center">
        <div className={`animate-spin rounded-full ${spinnerSizes[size]} border-b-2 border-blue-600 mx-auto mb-4`}></div>
        <div className="text-lg text-gray-600">Loading {title}...</div>
        <div className="text-sm text-gray-500 mt-2">{message}</div>
      </div>
    </div>
  );
};

export default VisualizationLoading;