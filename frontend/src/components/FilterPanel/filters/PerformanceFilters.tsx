import React from 'react';
import { FilterState } from '../../../types';
import FilterSection from '../FilterSection';
import RangeFilter from '../components/RangeFilter';

/**
 * Props for the PerformanceFilters component
 */
interface PerformanceFiltersProps {
  /** Current filter state */
  filters: FilterState;
  /** Function to update specific filter values */
  updateFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  /** Expanded sections state */
  expandedSections: Set<string>;
  /** Function to toggle section expansion */
  toggleSection: (section: string) => void;
}

/**
 * Performance and contract filters component
 * Groups success metrics, performance ratings, and contract duration filters
 */
const PerformanceFilters: React.FC<PerformanceFiltersProps> = ({
  filters,
  updateFilter,
  expandedSections,
  toggleSection
}) => {
  return (
    <FilterSection
      title="Performance & Contract"
      sectionKey="performance"
      isExpanded={expandedSections.has('performance')}
      onToggle={toggleSection}
    >
      <div className="space-y-4">
        {/* Success Filter */}
        <div>
          <label className="flex items-center mb-2">
            <input
              type="checkbox"
              checked={filters.onlySuccessfulTransfers}
              onChange={(e) => updateFilter('onlySuccessfulTransfers', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm">Only successful transfers</span>
          </label>
        </div>

        {/* Performance Rating Range */}
        <RangeFilter
          title="Performance Rating (1-10)"
          minValue={filters.minPerformanceRating}
          maxValue={filters.maxPerformanceRating}
          onMinChange={(value) => updateFilter('minPerformanceRating', value)}
          onMaxChange={(value) => updateFilter('maxPerformanceRating', value)}
          step="0.1"
          min="1"
          max="10"
          placeholder={{ min: "1", max: "10" }}
        />

        {/* Contract Duration Range */}
        <RangeFilter
          title="Contract Duration (years)"
          minValue={filters.minContractDuration}
          maxValue={filters.maxContractDuration}
          onMinChange={(value) => updateFilter('minContractDuration', value)}
          onMaxChange={(value) => updateFilter('maxContractDuration', value)}
          min="1"
          max="10"
          placeholder={{ min: "1", max: "10" }}
        />
      </div>
    </FilterSection>
  );
};

export default PerformanceFilters;