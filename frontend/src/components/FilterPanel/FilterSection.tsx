import React, { useState } from 'react';

/**
 * Props for the FilterSection component
 */
interface FilterSectionProps {
  /** The title displayed in the section header */
  title: string;
  /** Unique key to identify this section for expand/collapse state */
  sectionKey: string;
  /** Whether this section is currently expanded */
  isExpanded: boolean;
  /** Callback when the section is toggled */
  onToggle: (key: string) => void;
  /** The content to display when the section is expanded */
  children: React.ReactNode;
  /** Optional help text to display */
  helpText?: string;
  /** Optional tooltip for the section header */
  tooltip?: string;
}

/**
 * Collapsible filter section wrapper component
 * Provides a consistent expand/collapse interface for filter groups
 * Enhanced with tooltips and help text for better UX
 * Wrapped with React.memo to prevent unnecessary re-renders
 */
const FilterSection: React.FC<FilterSectionProps> = React.memo(({
  title,
  sectionKey,
  isExpanded,
  onToggle,
  children,
  helpText,
  tooltip
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg">
      <div className="relative">
        <button
          onClick={() => onToggle(sectionKey)}
          onMouseEnter={() => tooltip && setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className="w-full px-4 py-2 text-left bg-gray-50 hover:bg-gray-100 rounded-t-lg flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-gray-700">{title}</h3>
            {helpText && (
              <span className="text-xs text-gray-400 hover:text-gray-600 cursor-help" title={helpText}>
                ℹ️
              </span>
            )}
          </div>
          <span className="text-gray-400">
            {isExpanded ? '−' : '+'}
          </span>
        </button>
        
        {/* Tooltip */}
        {tooltip && showTooltip && (
          <div className="absolute top-full left-0 z-10 mt-1 px-3 py-2 text-xs text-white bg-gray-800 rounded-md shadow-lg max-w-xs">
            {tooltip}
            <div className="absolute bottom-full left-4 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-800"></div>
          </div>
        )}
      </div>
      
      {isExpanded && (
        <div className="p-4 border-t border-gray-200">
          {helpText && (
            <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
              💡 {helpText}
            </div>
          )}
          {children}
        </div>
      )}
    </div>
  );
});

export default FilterSection;