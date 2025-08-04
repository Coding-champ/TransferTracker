import React from 'react';
import { FilterState, League } from '../../../types';
import FilterSection from '../FilterSection';
import CheckboxFilter from '../components/CheckboxFilter';

/**
 * Props for the GeographicFilters component
 */
interface GeographicFiltersProps {
  /** Current filter state */
  filters: FilterState;
  /** Function to handle array-based filter changes */
  handleArrayFilter: (filterKey: keyof FilterState, value: string | number, checked: boolean) => void;
  /** Available leagues from API */
  leagues: League[];
  /** Available continents from API */
  continents: string[];
  /** Available league tiers from API */
  leagueTiers: number[];
  /** Expanded sections state */
  expandedSections: Set<string>;
  /** Function to toggle section expansion */
  toggleSection: (section: string) => void;
}

/**
 * Geographic filters component for continents, countries, leagues, and league tiers
 * Groups all location-based filtering options
 */
const GeographicFilters: React.FC<GeographicFiltersProps> = ({
  filters,
  handleArrayFilter,
  leagues,
  continents,
  leagueTiers,
  expandedSections,
  toggleSection
}) => {
  /**
   * Extract unique countries from leagues data
   */
  const getUniqueCountries = (): string[] => {
    const countries = new Set<string>();
    leagues.forEach(league => countries.add(league.country));
    return Array.from(countries).sort();
  };

  return (
    <FilterSection
      title="Geographic Filters"
      sectionKey="geographic"
      isExpanded={expandedSections.has('geographic')}
      onToggle={toggleSection}
    >
      <div className="space-y-4">
        {/* Continents */}
        <CheckboxFilter
          title="Continents"
          items={continents}
          selectedItems={filters.continents}
          onItemChange={(item, checked) => handleArrayFilter('continents', item, checked)}
          maxHeight="max-h-24"
        />
        
        {/* Countries */}
        <CheckboxFilter
          title="Countries"
          items={getUniqueCountries()}
          selectedItems={filters.countries}
          onItemChange={(item, checked) => handleArrayFilter('countries', item, checked)}
          maxHeight="max-h-24"
        />

        {/* Leagues */}
        <CheckboxFilter
          title="Leagues"
          items={leagues.map(l => l.name)}
          selectedItems={filters.leagues}
          onItemChange={(item, checked) => handleArrayFilter('leagues', item, checked)}
          maxHeight="max-h-24"
          renderLabel={(item) => {
            const league = leagues.find(l => l.name === item);
            return (
              <span>
                {item}
                {league && (
                  <span className="text-xs text-gray-500 ml-1">
                    ({league.country}, Tier {league.tier})
                  </span>
                )}
              </span>
            );
          }}
        />

        {/* League Tiers */}
        <CheckboxFilter
          title="League Tiers"
          items={leagueTiers}
          selectedItems={filters.leagueTiers}
          onItemChange={(item, checked) => handleArrayFilter('leagueTiers', item, checked)}
          renderLabel={(item) => `Tier ${item}`}
        />
      </div>
    </FilterSection>
  );
};

export default GeographicFilters;