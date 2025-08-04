import React from 'react';

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
}

/**
 * Collapsible filter section wrapper component
 * Provides a consistent expand/collapse interface for filter groups
 */
const FilterSection: React.FC<FilterSectionProps> = ({
  title,
  sectionKey,
  isExpanded,
  onToggle,
  children
}) => {
  return (
    <div className="border border-gray-200 rounded-lg">
      <button
        onClick={() => onToggle(sectionKey)}
        className="w-full px-4 py-2 text-left bg-gray-50 hover:bg-gray-100 rounded-t-lg flex items-center justify-between"
      >
        <h3 className="text-sm font-medium text-gray-700">{title}</h3>
        <span className="text-gray-400">
          {isExpanded ? '−' : '+'}
        </span>
      </button>
      {isExpanded && (
        <div className="p-4 border-t border-gray-200">
          {children}
        </div>
      )}
    </div>
  );
};

export default FilterSection;