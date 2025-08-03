import React, { useState, useEffect } from 'react';
import { FilterState, League, Club } from '../types';
import { formatCurrency, API_BASE_URL } from '../utils';
import { apiService } from '../services/api';

interface FilterPanelProps {
  onFiltersChange: (filters: FilterState) => void;
}

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

  // Data states
  const [leagues, setLeagues] = useState<League[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [seasons, setSeasons] = useState<string[]>([]);
  const [transferTypes, setTransferTypes] = useState<string[]>([]);
  const [transferWindows, setTransferWindows] = useState<string[]>([]);
  const [positions, setPositions] = useState<string[]>([]);
  const [nationalities, setNationalities] = useState<string[]>([]);
  const [continents, setContinents] = useState<string[]>([]);
  const [leagueTiers, setLeagueTiers] = useState<number[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['seasons', 'leagues', 'transferTypes'])
  );

  // Fetch all filter data on component mount
  useEffect(() => {
    const fetchFilterData = async () => {
      setLoading(true);
      try {
        const [
          leaguesRes,
          clubsRes,
          seasonsRes,
          transferTypesRes,
          transferWindowsRes,
          positionsRes,
          nationalitiesRes,
          continentsRes,
          leagueTiersRes
        ] = await Promise.all([
          /*apiService.getLeagues(),
          apiService.getClubs(),
          apiService.getSeasons(),
          apiService.getTransferTypes(),
          apiService.getTransferWindows(),
          apiService.getPositions(),
          apiService.getNationalities(),
          apiService.getContinents(),
          apiService.getLeagueTiers()*/
          fetch('http://localhost:3001/api/leagues'),
          fetch('http://localhost:3001/api/clubs'),
          fetch('http://localhost:3001/api/seasons'),
          fetch('http://localhost:3001/api/transfer-types'),
          fetch('http://localhost:3001/api/transfer-windows'),
          fetch('http://localhost:3001/api/positions'),
          fetch('http://localhost:3001/api/nationalities'),
          fetch('http://localhost:3001/api/continents'),
          fetch('http://localhost:3001/api/league-tiers')
        ]);

        const [
          leaguesData,
          clubsData,
          seasonsData,
          transferTypesData,
          transferWindowsData,
          positionsData,
          nationalitiesData,
          continentsData,
          leagueTiersData
        ] = await Promise.all([
          leaguesRes.json(),
          clubsRes.json(),
          seasonsRes.json(),
          transferTypesRes.json(),
          transferWindowsRes.json(),
          positionsRes.json(),
          nationalitiesRes.json(),
          continentsRes.json(),
          leagueTiersRes.json()
        ]);

        if (leaguesData.success) setLeagues(leaguesData.data);
        if (clubsData.success) setClubs(clubsData.data);
        if (seasonsData.success) setSeasons(seasonsData.data);
        if (transferTypesData.success) setTransferTypes(transferTypesData.data);
        if (transferWindowsData.success) setTransferWindows(transferWindowsData.data);
        if (positionsData.success) setPositions(positionsData.data);
        if (nationalitiesData.success) setNationalities(nationalitiesData.data);
        if (continentsData.success) setContinents(continentsData.data);
        if (leagueTiersData.success) setLeagueTiers(leagueTiersData.data);

      } catch (error) {
        console.error('Failed to fetch filter data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFilterData();
  }, []);

  // Update parent component when filters change
  useEffect(() => {
    onFiltersChange(filters);
  }, [filters, onFiltersChange]);

  const updateFilter = <K extends keyof FilterState>(
    key: K,
    value: FilterState[K]
  ) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

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

  const getUniqueCountries = () => {
    const countries = new Set<string>();
    leagues.forEach(league => countries.add(league.country));
    return Array.from(countries).sort();
  };

  const FilterSection: React.FC<{
    title: string;
    sectionKey: string;
    children: React.ReactNode;
    defaultExpanded?: boolean;
  }> = ({ title, sectionKey, children, defaultExpanded = false }) => {
    const isExpanded = expandedSections.has(sectionKey);
    
    return (
      <div className="border border-gray-200 rounded-lg">
        <button
          onClick={() => toggleSection(sectionKey)}
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

  const CheckboxList: React.FC<{
    items: (string | number)[];
    selectedItems: (string | number)[];
    onItemChange: (item: string | number, checked: boolean) => void;
    maxHeight?: string;
    renderLabel?: (item: string | number) => React.ReactNode;
  }> = ({ items, selectedItems, onItemChange, maxHeight = "max-h-32", renderLabel }) => (
    <div className={`space-y-2 ${maxHeight} overflow-y-auto custom-scrollbar`}>
      {items.map(item => (
        <label key={item} className="flex items-center">
          <input
            type="checkbox"
            checked={selectedItems.includes(item)}
            onChange={(e) => onItemChange(item, e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="ml-2 text-sm">
            {renderLabel ? renderLabel(item) : item}
          </span>
        </label>
      ))}
    </div>
  );

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
    <div className="bg-white rounded-lg shadow-lg p-3 mb-6">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* Basic Filters */}
        <FilterSection title="Seasons" sectionKey="seasons" defaultExpanded>
          <CheckboxList
            items={seasons}
            selectedItems={filters.seasons}
            onItemChange={(item, checked) => handleArrayFilter('seasons', item, checked)}
          />
        </FilterSection>

        <FilterSection title="Transfer Types" sectionKey="transferTypes" defaultExpanded>
          <CheckboxList
            items={transferTypes}
            selectedItems={filters.transferTypes}
            onItemChange={(item, checked) => handleArrayFilter('transferTypes', item, checked)}
            renderLabel={(item) => {
              const labels: { [key: string]: string } = {
                'sale': 'Sale',
                'loan': 'Loan',
                'free': 'Free Transfer',
                'loan_with_option': 'Loan with Option'
              };
              return labels[item as string] || item;
            }}
          />
          <div className="mt-4 pt-3 border-t space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.excludeLoans}
                onChange={(e) => updateFilter('excludeLoans', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm">Exclude all loans</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.isLoanToBuy}
                onChange={(e) => updateFilter('isLoanToBuy', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm">Only loan-to-buy transfers</span>
            </label>
          </div>
        </FilterSection>

        <FilterSection title="Transfer Windows" sectionKey="transferWindows">
          <CheckboxList
            items={transferWindows}
            selectedItems={filters.transferWindows}
            onItemChange={(item, checked) => handleArrayFilter('transferWindows', item, checked)}
            renderLabel={(item) => {
              const labels: { [key: string]: string } = {
                'summer': 'Summer Window',
                'winter': 'Winter Window'
              };
              return labels[item as string] || item;
            }}
          />
        </FilterSection>

        {/* Geographic Filters */}
        <FilterSection title="Geographic Filters" sectionKey="geographic">
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-medium text-gray-600 mb-2">Continents</h4>
              <CheckboxList
                items={continents}
                selectedItems={filters.continents}
                onItemChange={(item, checked) => handleArrayFilter('continents', item, checked)}
                maxHeight="max-h-24"
              />
            </div>
            
            <div>
              <h4 className="text-xs font-medium text-gray-600 mb-2">Countries</h4>
              <CheckboxList
                items={getUniqueCountries()}
                selectedItems={filters.countries}
                onItemChange={(item, checked) => handleArrayFilter('countries', item, checked)}
                maxHeight="max-h-24"
              />
            </div>

            <div>
              <h4 className="text-xs font-medium text-gray-600 mb-2">Leagues</h4>
              <CheckboxList
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
            </div>

            <div>
              <h4 className="text-xs font-medium text-gray-600 mb-2">League Tiers</h4>
              <CheckboxList
                items={leagueTiers}
                selectedItems={filters.leagueTiers}
                onItemChange={(item, checked) => handleArrayFilter('leagueTiers', item, checked)}
                renderLabel={(item) => `Tier ${item}`}
              />
            </div>
          </div>
        </FilterSection>

        {/* Player Filters */}
        <FilterSection title="Player Filters" sectionKey="player">
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-medium text-gray-600 mb-2">Positions</h4>
              <CheckboxList
                items={positions}
                selectedItems={filters.positions}
                onItemChange={(item, checked) => handleArrayFilter('positions', item, checked)}
                maxHeight="max-h-24"
              />
            </div>

            <div>
              <h4 className="text-xs font-medium text-gray-600 mb-2">Nationalities</h4>
              <CheckboxList
                items={nationalities.slice(0, 20)} // Limit to top 20 for UI
                selectedItems={filters.nationalities}
                onItemChange={(item, checked) => handleArrayFilter('nationalities', item, checked)}
                maxHeight="max-h-24"
              />
            </div>

            <div>
              <h4 className="text-xs font-medium text-gray-600 mb-2">Age Range</h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Min Age</label>
                  <input
                    type="number"
                    min="16"
                    max="45"
                    value={filters.minPlayerAge || ''}
                    onChange={(e) => updateFilter('minPlayerAge', e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="16"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Max Age</label>
                  <input
                    type="number"
                    min="16"
                    max="45"
                    value={filters.maxPlayerAge || ''}
                    onChange={(e) => updateFilter('maxPlayerAge', e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="45"
                  />
                </div>
              </div>
            </div>
          </div>
        </FilterSection>

        {/* Financial Filters */}
        <FilterSection title="Financial Filters" sectionKey="financial">
          <div className="space-y-4">
            <div>
              <label className="flex items-center mb-3">
                <input
                  type="checkbox"
                  checked={filters.hasTransferFee}
                  onChange={(e) => updateFilter('hasTransferFee', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm">Only paid transfers</span>
              </label>
            </div>

            <div>
              <h4 className="text-xs font-medium text-gray-600 mb-2">Transfer Fee Range</h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Minimum (€)</label>
                  <input
                    type="number"
                    value={filters.minTransferFee || ''}
                    onChange={(e) => updateFilter('minTransferFee', e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                  />
                  {filters.minTransferFee && (
                    <p className="text-xs text-gray-500 mt-1">
                      Min: {formatCurrency(filters.minTransferFee)}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Maximum (€)</label>
                  <input
                    type="number"
                    value={filters.maxTransferFee || ''}
                    onChange={(e) => updateFilter('maxTransferFee', e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="∞"
                  />
                  {filters.maxTransferFee && (
                    <p className="text-xs text-gray-500 mt-1">
                      Max: {formatCurrency(filters.maxTransferFee)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-medium text-gray-600 mb-2">ROI Range (%)</h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Min ROI</label>
                  <input
                    type="number"
                    step="0.1"
                    value={filters.minROI || ''}
                    onChange={(e) => updateFilter('minROI', e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="-100"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Max ROI</label>
                  <input
                    type="number"
                    step="0.1"
                    value={filters.maxROI || ''}
                    onChange={(e) => updateFilter('maxROI', e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="1000"
                  />
                </div>
              </div>
            </div>
          </div>
        </FilterSection>

        {/* Performance & Contract Filters */}
        <FilterSection title="Performance & Contract" sectionKey="performance">
          <div className="space-y-4">
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

            <div>
              <h4 className="text-xs font-medium text-gray-600 mb-2">Performance Rating (1-10)</h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Min Rating</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    step="0.1"
                    value={filters.minPerformanceRating || ''}
                    onChange={(e) => updateFilter('minPerformanceRating', e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="1"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Max Rating</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    step="0.1"
                    value={filters.maxPerformanceRating || ''}
                    onChange={(e) => updateFilter('maxPerformanceRating', e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="10"
                  />
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-medium text-gray-600 mb-2">Contract Duration (years)</h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Min Duration</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={filters.minContractDuration || ''}
                    onChange={(e) => updateFilter('minContractDuration', e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="1"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Max Duration</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={filters.maxContractDuration || ''}
                    onChange={(e) => updateFilter('maxContractDuration', e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="10"
                  />
                </div>
              </div>
            </div>
          </div>
        </FilterSection>
      </div>

      {/* Quick Filter Buttons */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Filters</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              updateFilter('leagues', ['Bundesliga']);
              updateFilter('continents', []);
              updateFilter('countries', []);
            }}
            className="px-3 py-1 text-sm bg-red-100 hover:bg-red-200 text-red-800 rounded-md transition-colors"
          >
            Bundesliga Only
          </button>
          <button
            onClick={() => {
              updateFilter('leagues', ['Premier League']);
              updateFilter('continents', []);
              updateFilter('countries', []);
            }}
            className="px-3 py-1 text-sm bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-md transition-colors"
          >
            Premier League Only
          </button>
          <button
            onClick={() => updateFilter('continents', ['Europe'])}
            className="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-md transition-colors"
          >
            European Leagues
          </button>
          <button
            onClick={() => {
              updateFilter('transferTypes', ['sale']);
              updateFilter('excludeLoans', true);
            }}
            className="px-3 py-1 text-sm bg-green-100 hover:bg-green-200 text-green-800 rounded-md transition-colors"
          >
            Sales Only
          </button>
          <button
            onClick={() => {
              updateFilter('minTransferFee', 10000000);
              updateFilter('hasTransferFee', true);
            }}
            className="px-3 py-1 text-sm bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-md transition-colors"
          >
            Big Transfers (€10M+)
          </button>
          <button
            onClick={() => updateFilter('onlySuccessfulTransfers', true)}
            className="px-3 py-1 text-sm bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-md transition-colors"
          >
            Successful Only
          </button>
          <button
            onClick={() => {
              updateFilter('transferWindows', ['summer']);
              updateFilter('seasons', ['2023/24']);
            }}
            className="px-3 py-1 text-sm bg-orange-100 hover:bg-orange-200 text-orange-800 rounded-md transition-colors"
          >
            Summer 2023/24
          </button>
          <button
            onClick={() => updateFilter('isLoanToBuy', true)}
            className="px-3 py-1 text-sm bg-indigo-100 hover:bg-indigo-200 text-indigo-800 rounded-md transition-colors"
          >
            Loan-to-Buy
          </button>
        </div>
      </div>

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