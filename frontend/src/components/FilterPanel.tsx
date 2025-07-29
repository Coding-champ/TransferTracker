import React, { useState, useEffect } from 'react';

interface FilterPanelProps {
  onFiltersChange: (filters: FilterState) => void;
}

interface FilterState {
  seasons: string[];
  leagues: string[];
  transferTypes: string[];
  minTransferFee?: number;
  maxTransferFee?: number;
}

interface League {
  id: number;
  name: string;
  country: string;
  tier: number;
}

interface Club {
  id: number;
  name: string;
  shortName?: string;
  league: string;
  country: string;
}

const FilterPanel: React.FC<FilterPanelProps> = ({ onFiltersChange }) => {
  const [filters, setFilters] = useState<FilterState>({
    seasons: ['2023/24'],
    leagues: [],
    transferTypes: ['sale', 'loan', 'free', 'loan_with_option'],
    minTransferFee: undefined,
    maxTransferFee: undefined
  });

  const [leagues, setLeagues] = useState<League[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(false);

  // Available options
  const seasonOptions = ['2022/23', '2023/24', '2024/25'];
  const transferTypeOptions = [
    { value: 'sale', label: 'Sale' },
    { value: 'loan', label: 'Loan' },
    { value: 'free', label: 'Free Transfer' },
    { value: 'loan_with_option', label: 'Loan with Option' }
  ];

  // Fetch leagues and clubs on component mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [leaguesResponse, clubsResponse] = await Promise.all([
          fetch('http://localhost:3001/api/leagues'),
          fetch('http://localhost:3001/api/clubs')
        ]);

        const leaguesResult = await leaguesResponse.json();
        const clubsResult = await clubsResponse.json();

        if (leaguesResult.success) {
          setLeagues(leaguesResult.data);
        }
        if (clubsResult.success) {
          setClubs(clubsResult.data);
        }
      } catch (error) {
        console.error('Failed to fetch filter data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
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

  const handleSeasonChange = (season: string, checked: boolean) => {
    if (checked) {
      updateFilter('seasons', [...filters.seasons, season]);
    } else {
      updateFilter('seasons', filters.seasons.filter(s => s !== season));
    }
  };

  const handleLeagueChange = (league: string, checked: boolean) => {
    if (checked) {
      updateFilter('leagues', [...filters.leagues, league]);
    } else {
      updateFilter('leagues', filters.leagues.filter(l => l !== league));
    }
  };

  const handleTransferTypeChange = (type: string, checked: boolean) => {
    if (checked) {
      updateFilter('transferTypes', [...filters.transferTypes, type]);
    } else {
      updateFilter('transferTypes', filters.transferTypes.filter(t => t !== type));
    }
  };

  const resetFilters = () => {
    setFilters({
      seasons: ['2023/24'],
      leagues: [],
      transferTypes: ['sale', 'loan', 'free', 'loan_with_option'],
      minTransferFee: undefined,
      maxTransferFee: undefined
    });
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `€${(value / 1000000).toFixed(0)}M`;
    }
    return `€${(value / 1000).toFixed(0)}K`;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Filters</h2>
        <button
          onClick={resetFilters}
          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
        >
          Reset
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Season Filter */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Season</h3>
          <div className="space-y-2">
            {seasonOptions.map(season => (
              <label key={season} className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.seasons.includes(season)}
                  onChange={(e) => handleSeasonChange(season, e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm">{season}</span>
              </label>
            ))}
          </div>
        </div>

        {/* League Filter */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Leagues</h3>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {loading ? (
              <div className="text-sm text-gray-500">Loading...</div>
            ) : (
              leagues.map(league => (
                <label key={league.id} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.leagues.includes(league.name)}
                    onChange={(e) => handleLeagueChange(league.name, e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm">{league.name}</span>
                  <span className="ml-1 text-xs text-gray-500">({league.country})</span>
                </label>
              ))
            )}
          </div>
          {filters.leagues.length === 0 && (
            <p className="text-xs text-gray-500 mt-2">All leagues selected by default</p>
          )}
        </div>

        {/* Transfer Type Filter */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Transfer Types</h3>
          <div className="space-y-2">
            {transferTypeOptions.map(option => (
              <label key={option.value} className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.transferTypes.includes(option.value)}
                  onChange={(e) => handleTransferTypeChange(option.value, e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Transfer Fee Filter */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Transfer Fee Range</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Minimum</label>
              <input
                type="number"
                placeholder="e.g. 1000000"
                value={filters.minTransferFee || ''}
                onChange={(e) => updateFilter('minTransferFee', e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full px-3 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {filters.minTransferFee && (
                <p className="text-xs text-gray-500 mt-1">
                  Min: {formatCurrency(filters.minTransferFee)}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Maximum</label>
              <input
                type="number"
                placeholder="e.g. 100000000"
                value={filters.maxTransferFee || ''}
                onChange={(e) => updateFilter('maxTransferFee', e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full px-3 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {filters.maxTransferFee && (
                <p className="text-xs text-gray-500 mt-1">
                  Max: {formatCurrency(filters.maxTransferFee)}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Filter Buttons */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Filters</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => updateFilter('leagues', ['Bundesliga'])}
            className="px-3 py-1 text-sm bg-red-100 hover:bg-red-200 text-red-800 rounded-md transition-colors"
          >
            Bundesliga Only
          </button>
          <button
            onClick={() => updateFilter('leagues', ['Premier League'])}
            className="px-3 py-1 text-sm bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-md transition-colors"
          >
            Premier League Only
          </button>
          <button
            onClick={() => updateFilter('transferTypes', ['sale'])}
            className="px-3 py-1 text-sm bg-green-100 hover:bg-green-200 text-green-800 rounded-md transition-colors"
          >
            Sales Only
          </button>
          <button
            onClick={() => {
              updateFilter('minTransferFee', 10000000);
              updateFilter('maxTransferFee', undefined);
            }}
            className="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-md transition-colors"
          >
            Big Transfers (€10M+)
          </button>
        </div>
      </div>

      {/* Active Filters Summary */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Active Filters</h3>
        <div className="flex flex-wrap gap-1">
          {filters.seasons.map(season => (
            <span key={season} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
              {season}
            </span>
          ))}
          {filters.leagues.length > 0 ? (
            filters.leagues.map(league => (
              <span key={league} className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                {league}
              </span>
            ))
          ) : (
            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
              All Leagues
            </span>
          )}
          {filters.transferTypes.map(type => (
            <span key={type} className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">
              {transferTypeOptions.find(opt => opt.value === type)?.label || type}
            </span>
          ))}
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
        </div>
      </div>
    </div>
  );
};

export default FilterPanel;