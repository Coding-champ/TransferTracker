import React, { useCallback, useMemo } from 'react';
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
 * Optimized with React.memo for performance
 */
const GeographicFilters: React.FC<GeographicFiltersProps> = React.memo(({
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
   * Memoized to avoid recalculation on every render
   */
  const countries = useMemo(() => {
    const uniqueCountries = Array.from(new Set(leagues.map(league => league.country).filter(Boolean)));
    return uniqueCountries.sort();
  }, [leagues]);

  // Memoized callbacks for better performance
  const handleContinentsChange = useCallback((item: string | number, checked: boolean) => {
    handleArrayFilter('continents', item, checked);
  }, [handleArrayFilter]);

  const handleCountriesChange = useCallback((item: string | number, checked: boolean) => {
    handleArrayFilter('countries', item, checked);
  }, [handleArrayFilter]);

  const handleLeaguesChange = useCallback((item: string | number, checked: boolean) => {
    handleArrayFilter('leagues', item, checked);
  }, [handleArrayFilter]);

  const handleLeagueTiersChange = useCallback((item: string | number, checked: boolean) => {
    handleArrayFilter('leagueTiers', item, checked);
  }, [handleArrayFilter]);

  const renderLeagueLabel = useCallback((item: string | number) => {
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
  }, [leagues]);

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
          onItemChange={handleContinentsChange}
          maxHeight="max-h-24"
        />
        
        {/* Countries */}
        <CheckboxFilter
          title="Countries"
          items={countries}
          selectedItems={filters.countries}
          onItemChange={handleCountriesChange}
          maxHeight="max-h-24"
        />

        {/* Leagues */}
        <CheckboxFilter
          title="Leagues"
          items={leagues.map(l => l.name)}
          selectedItems={filters.leagues}
          onItemChange={handleLeaguesChange}
          maxHeight="max-h-24"
          renderLabel={renderLeagueLabel}
        />

        {/* League Tiers */}
        <CheckboxFilter
          title="League Tiers"
          items={leagueTiers}
          selectedItems={filters.leagueTiers}
          onItemChange={handleLeagueTiersChange}
          renderLabel={(item) => `Tier ${item}`}
        />
      </div>
    </FilterSection>
  );
});

export default GeographicFilters;