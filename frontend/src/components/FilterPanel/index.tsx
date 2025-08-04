import React, { useState, useEffect } from 'react';
import { FilterState } from '../../types';
import { formatCurrency } from '../../utils';
import { useFilterData } from './hooks/useFilterData';
import BasicFilters from './filters/BasicFilters';
import GeographicFilters from './filters/GeographicFilters';
import PlayerFilters from './filters/PlayerFilters';
import FinancialFilters from './filters/FinancialFilters';
import PerformanceFilters from './filters/PerformanceFilters';
import QuickFilterButtons from './components/QuickFilterButtons';

/**
 * Props for the FilterPanel component
 */
interface FilterPanelProps {
  /** Callback when filters change */
  onFiltersChange: (filters: FilterState) => void;
}

/**
 * Main FilterPanel component that orchestrates all filter sections
 * Refactored from a 879-line monolith into smaller, reusable components
 */
const FilterPanel: React.FC<FilterPanelProps> = ({ onFiltersChange }) => {
  const [filters, setFilters] = useState<FilterState>({
    seasons: ['2023/24'],
    leagues: [],
    countries: [],
    continents: [],
    transferTypes: ['sale', 'loan', 'free', 'loan_with_option'],
    transferWindows: [],
    positions: [],
    nationalities: [],
    clubs: [],
    leagueTiers: [],
    minTransferFee: undefined,
    maxTransferFee: undefined,
    minPlayerAge: undefined,
    maxPlayerAge: undefined,
    minContractDuration: undefined,
    maxContractDuration: undefined,
    minROI: undefined,
    maxROI: undefined,
    minPerformanceRating: undefined,
    maxPerformanceRating: undefined,
    hasTransferFee: false,
    excludeLoans: false,
    isLoanToBuy: false,
    onlySuccessfulTransfers: false
  });

  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['seasons', 'leagues', 'transferTypes'])
  );

  // Use the custom hook for data fetching
  const {
    leagues,
    seasons,
    transferTypes,
    transferWindows,
    positions,
    nationalities,
    continents,
    leagueTiers,
    loading
  } = useFilterData();

  // Update parent component when filters change
  useEffect(() => {
    onFiltersChange(filters);
  }, [filters, onFiltersChange]);

  /**
   * Update a specific filter value
   */
  const updateFilter = <K extends keyof FilterState>(
    key: K,
    value: FilterState[K]
  ) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  /**
   * Handle array-based filter changes (checkboxes)
   */
  const handleArrayFilter = (
    filterKey: keyof FilterState,
    value: string | number,
    checked: boolean
  ) => {
    const currentArray = filters[filterKey] as (string | number)[];
    if (checked) {
      updateFilter(filterKey, [...currentArray, value] as any);
    } else {
      updateFilter(filterKey, currentArray.filter(item => item !== value) as any);
    }
  };

  /**
   * Toggle a section's expanded state
   */
  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  /**
   * Reset all filters to default values
   */
  const resetFilters = () => {
    setFilters({
      seasons: ['2023/24'],
      leagues: [],
      countries: [],
      continents: [],
      transferTypes: ['sale', 'loan', 'free', 'loan_with_option'],
      transferWindows: [],
      positions: [],
      nationalities: [],
      clubs: [],
      leagueTiers: [],
      minTransferFee: undefined,
      maxTransferFee: undefined,
      minPlayerAge: undefined,
      maxPlayerAge: undefined,
      minContractDuration: undefined,
      maxContractDuration: undefined,
      minROI: undefined,
      maxROI: undefined,
      minPerformanceRating: undefined,
      maxPerformanceRating: undefined,
      hasTransferFee: false,
      excludeLoans: false,
      isLoanToBuy: false,
      onlySuccessfulTransfers: false
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading filters...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      {/* Header with controls */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Advanced Filters</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setExpandedSections(new Set(['seasons', 'leagues', 'transferTypes', 'geographic', 'performance']))}
            className="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md transition-colors"
          >
            Expand All
          </button>
          <button
            onClick={() => setExpandedSections(new Set())}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            Collapse All
          </button>
          <button
            onClick={resetFilters}
            className="px-3 py-1 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded-md transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Filter Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        <BasicFilters
          filters={filters}
          updateFilter={updateFilter}
          handleArrayFilter={handleArrayFilter}
          seasons={seasons}
          transferTypes={transferTypes}
          transferWindows={transferWindows}
          expandedSections={expandedSections}
          toggleSection={toggleSection}
        />

        <GeographicFilters
          filters={filters}
          handleArrayFilter={handleArrayFilter}
          leagues={leagues}
          continents={continents}
          leagueTiers={leagueTiers}
          expandedSections={expandedSections}
          toggleSection={toggleSection}
        />

        <PlayerFilters
          filters={filters}
          updateFilter={updateFilter}
          handleArrayFilter={handleArrayFilter}
          positions={positions}
          nationalities={nationalities}
          expandedSections={expandedSections}
          toggleSection={toggleSection}
        />

        <FinancialFilters
          filters={filters}
          updateFilter={updateFilter}
          expandedSections={expandedSections}
          toggleSection={toggleSection}
        />

        <PerformanceFilters
          filters={filters}
          updateFilter={updateFilter}
          expandedSections={expandedSections}
          toggleSection={toggleSection}
        />
      </div>

      {/* Quick Filter Buttons */}
      <QuickFilterButtons updateFilter={updateFilter} />

      {/* Active Filters Summary */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Active Filters</h3>
        <div className="flex flex-wrap gap-1">
          {/* Seasons */}
          {filters.seasons.map(season => (
            <span key={season} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
              {season}
            </span>
          ))}
          
          {/* Geographic filters */}
          {filters.continents.map(continent => (
            <span key={continent} className="px-2 py-1 text-xs bg-cyan-100 text-cyan-800 rounded">
              📍 {continent}
            </span>
          ))}
          {filters.countries.map(country => (
            <span key={country} className="px-2 py-1 text-xs bg-teal-100 text-teal-800 rounded">
              🏳️ {country}
            </span>
          ))}
          {filters.leagues.length > 0 ? (
            filters.leagues.map(league => (
              <span key={league} className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                ⚽ {league}
              </span>
            ))
          ) : (
            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
              All Leagues
            </span>
          )}
          
          {/* League tiers */}
          {filters.leagueTiers.map(tier => (
            <span key={tier} className="px-2 py-1 text-xs bg-slate-100 text-slate-800 rounded">
              Tier {tier}
            </span>
          ))}
          
          {/* Transfer types */}
          {filters.transferTypes.map(type => (
            <span key={type} className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">
              📋 {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </span>
          ))}
          
          {/* Transfer windows */}
          {filters.transferWindows.map(window => (
            <span key={window} className="px-2 py-1 text-xs bg-amber-100 text-amber-800 rounded">
              🗓️ {window} window
            </span>
          ))}
          
          {/* Positions */}
          {filters.positions.map(position => (
            <span key={position} className="px-2 py-1 text-xs bg-emerald-100 text-emerald-800 rounded">
              👤 {position}
            </span>
          ))}
          
          {/* Nationalities */}
          {filters.nationalities.slice(0, 3).map(nationality => (
            <span key={nationality} className="px-2 py-1 text-xs bg-rose-100 text-rose-800 rounded">
              🌍 {nationality}
            </span>
          ))}
          {filters.nationalities.length > 3 && (
            <span className="px-2 py-1 text-xs bg-rose-100 text-rose-800 rounded">
              +{filters.nationalities.length - 3} more nationalities
            </span>
          )}
          
          {/* Financial filters */}
          {filters.hasTransferFee && (
            <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
              💰 Paid transfers only
            </span>
          )}
          {filters.minTransferFee && (
            <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded">
              Min: {formatCurrency(filters.minTransferFee)}
            </span>
          )}
          {filters.maxTransferFee && (
            <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded">
              Max: {formatCurrency(filters.maxTransferFee)}
            </span>
          )}
          
          {/* Age filters */}
          {filters.minPlayerAge && (
            <span className="px-2 py-1 text-xs bg-indigo-100 text-indigo-800 rounded">
              Age ≥ {filters.minPlayerAge}
            </span>
          )}
          {filters.maxPlayerAge && (
            <span className="px-2 py-1 text-xs bg-indigo-100 text-indigo-800 rounded">
              Age ≤ {filters.maxPlayerAge}
            </span>
          )}
          
          {/* Contract duration filters */}
          {filters.minContractDuration && (
            <span className="px-2 py-1 text-xs bg-violet-100 text-violet-800 rounded">
              Contract ≥ {filters.minContractDuration}y
            </span>
          )}
          {filters.maxContractDuration && (
            <span className="px-2 py-1 text-xs bg-violet-100 text-violet-800 rounded">
              Contract ≤ {filters.maxContractDuration}y
            </span>
          )}
          
          {/* ROI filters */}
          {filters.minROI !== undefined && (
            <span className="px-2 py-1 text-xs bg-lime-100 text-lime-800 rounded">
              ROI ≥ {filters.minROI.toFixed(1)}%
            </span>
          )}
          {filters.maxROI !== undefined && (
            <span className="px-2 py-1 text-xs bg-lime-100 text-lime-800 rounded">
              ROI ≤ {filters.maxROI.toFixed(1)}%
            </span>
          )}
          
          {/* Performance rating filters */}
          {filters.minPerformanceRating !== undefined && (
            <span className="px-2 py-1 text-xs bg-emerald-100 text-emerald-800 rounded">
              Rating ≥ {filters.minPerformanceRating.toFixed(1)}
            </span>
          )}
          {filters.maxPerformanceRating !== undefined && (
            <span className="px-2 py-1 text-xs bg-emerald-100 text-emerald-800 rounded">
              Rating ≤ {filters.maxPerformanceRating.toFixed(1)}
            </span>
          )}
          
          {/* Boolean filters */}
          {filters.excludeLoans && (
            <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
              🚫 No loans
            </span>
          )}
          {filters.isLoanToBuy && (
            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
              🔄 Loan-to-buy only
            </span>
          )}
          {filters.onlySuccessfulTransfers && (
            <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
              ✅ Successful only
            </span>
          )}
          
          {/* Show total count */}
          <span className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded font-medium">
            {[
              ...filters.seasons,
              ...filters.leagues,
              ...filters.countries,
              ...filters.continents,
              ...filters.transferTypes,
              ...filters.transferWindows,
              ...filters.positions,
              ...filters.nationalities,
              ...filters.leagueTiers.map(String),
              ...(filters.hasTransferFee ? ['paid'] : []),
              ...(filters.excludeLoans ? ['no-loans'] : []),
              ...(filters.isLoanToBuy ? ['loan-to-buy'] : []),
              ...(filters.onlySuccessfulTransfers ? ['successful'] : []),
              ...(filters.minTransferFee ? ['min-fee'] : []),
              ...(filters.maxTransferFee ? ['max-fee'] : []),
              ...(filters.minPlayerAge ? ['min-age'] : []),
              ...(filters.maxPlayerAge ? ['max-age'] : []),
              ...(filters.minContractDuration ? ['min-contract'] : []),
              ...(filters.maxContractDuration ? ['max-contract'] : []),
              ...(filters.minROI !== undefined ? ['min-roi'] : []),
              ...(filters.maxROI !== undefined ? ['max-roi'] : []),
              ...(filters.minPerformanceRating !== undefined ? ['min-rating'] : []),
              ...(filters.maxPerformanceRating !== undefined ? ['max-rating'] : [])
            ].length} active filters
          </span>
        </div>
        
        {/* Filter combinations warning */}
        {(filters.excludeLoans && filters.isLoanToBuy) && (
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
            ⚠️ Warning: "Exclude loans" and "Loan-to-buy only" filters conflict with each other.
          </div>
        )}
        
        {(filters.leagues.length > 0 && filters.continents.length > 0) && (
          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
            ℹ️ Note: Both league and continent filters are active. Results will show the intersection of both filters.
          </div>
        )}
      </div>
    </div>
  );
};

export default FilterPanel;