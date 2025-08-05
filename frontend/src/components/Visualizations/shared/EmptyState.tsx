import React from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description = "Try adjusting your filters or search criteria",
  icon = "🔍",
  actionLabel,
  onAction
}) => {
  return (
    <div className="flex items-center justify-center h-96 bg-white rounded-lg shadow-lg">
      <div className="text-center text-gray-500">
        <div className="text-6xl mb-4">{icon}</div>
        <div className="text-lg mb-2">No data available for {title}</div>
        <div className="text-sm">{description}</div>
        <div className="text-xs mt-2 text-gray-400">
          Current filters may be too restrictive
        </div>
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
};

export default EmptyState;