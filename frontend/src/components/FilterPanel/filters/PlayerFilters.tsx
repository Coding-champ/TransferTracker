import React from 'react';
import { FilterState } from '../../../types';
import FilterSection from '../FilterSection';
import CheckboxFilter from '../components/CheckboxFilter';
import RangeFilter from '../components/RangeFilter';

/**
 * Props for the PlayerFilters component
 */
interface PlayerFiltersProps {
  /** Current filter state */
  filters: FilterState;
  /** Function to update specific filter values */
  updateFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  /** Function to handle array-based filter changes */
  handleArrayFilter: (filterKey: keyof FilterState, value: string | number, checked: boolean) => void;
  /** Available positions from API */
  positions: string[];
  /** Available nationalities from API */
  nationalities: string[];
  /** Expanded sections state */
  expandedSections: Set<string>;
  /** Function to toggle section expansion */
  toggleSection: (section: string) => void;
}

/**
 * Player-related filters component for positions, nationalities, and age
 * Groups all player demographic and characteristic filters
 */
const PlayerFilters: React.FC<PlayerFiltersProps> = ({
  filters,
  updateFilter,
  handleArrayFilter,
  positions,
  nationalities,
  expandedSections,
  toggleSection
}) => {
  return (
    <FilterSection
      title="Player Filters"
      sectionKey="player"
      isExpanded={expandedSections.has('player')}
      onToggle={toggleSection}
    >
      <div className="space-y-4">
        {/* Positions */}
        <CheckboxFilter
          title="Positions"
          items={positions}
          selectedItems={filters.positions}
          onItemChange={(item, checked) => handleArrayFilter('positions', item, checked)}
          maxHeight="max-h-24"
        />

        {/* Nationalities */}
        <CheckboxFilter
          title="Nationalities"
          items={nationalities.slice(0, 20)} // Limit to top 20 for UI
          selectedItems={filters.nationalities}
          onItemChange={(item, checked) => handleArrayFilter('nationalities', item, checked)}
          maxHeight="max-h-24"
        />

        {/* Age Range */}
        <RangeFilter
          title="Age Range"
          minValue={filters.minPlayerAge}
          maxValue={filters.maxPlayerAge}
          onMinChange={(value) => updateFilter('minPlayerAge', value)}
          onMaxChange={(value) => updateFilter('maxPlayerAge', value)}
          placeholder={{ min: "16", max: "45" }}
          min="16"
          max="45"
        />
      </div>
    </FilterSection>
  );
};

export default PlayerFilters;