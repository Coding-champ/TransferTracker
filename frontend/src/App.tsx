import React, { useState } from 'react';
import './App.css';
import TransferNetwork from './components/TransferTracker';
import FilterPanel from './components/FilterPanel';

interface FilterState {
  seasons: string[];
  leagues: string[];
  countries: string[];
  continents: string[];
  transferTypes: string[];
  transferWindows: string[];
  positions: string[];
  nationalities: string[];
  clubs: number[];
  leagueTiers: number[];
  minTransferFee?: number;
  maxTransferFee?: number;
  minPlayerAge?: number;
  maxPlayerAge?: number;
  minContractDuration?: number;
  maxContractDuration?: number;
  minROI?: number;
  maxROI?: number;
  minPerformanceRating?: number;
  maxPerformanceRating?: number;
  hasTransferFee?: boolean;
  excludeLoans?: boolean;
  isLoanToBuy?: boolean;
  onlySuccessfulTransfers?: boolean;
}

function App() {
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

  const handleFiltersChange = (newFilters: FilterState) => {
    setFilters(newFilters);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    
    // Count array filters
    count += filters.seasons.length;
    count += filters.leagues.length;
    count += filters.countries.length;
    count += filters.continents.length;
    count += filters.transferTypes.length;
    count += filters.transferWindows.length;
    count += filters.positions.length;
    count += filters.nationalities.length;
    count += filters.clubs.length;
    count += filters.leagueTiers.length;
    
    // Count numeric filters
    if (filters.minTransferFee) count++;
    if (filters.maxTransferFee) count++;
    if (filters.minPlayerAge) count++;
    if (filters.maxPlayerAge) count++;
    if (filters.minContractDuration) count++;
    if (filters.maxContractDuration) count++;
    if (filters.minROI !== undefined) count++;
    if (filters.maxROI !== undefined) count++;
    if (filters.minPerformanceRating !== undefined) count++;
    if (filters.maxPerformanceRating !== undefined) count++;
    
    // Count boolean filters
    if (filters.hasTransferFee) count++;
    if (filters.excludeLoans) count++;
    if (filters.isLoanToBuy) count++;
    if (filters.onlySuccessfulTransfers) count++;
    
    return count;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">
                Football Transfer Network
              </h1>
              <div className="flex items-center ml-4 space-x-2">
                <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                  Enhanced
                </span>
                {getActiveFilterCount() > 0 && (
                  <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                    {getActiveFilterCount()} filters active
                  </span>
                )}
              </div>
            </div>
            <div className="text-sm text-gray-500">
              Advanced transfer analytics & visualization
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter Panel */}
        <FilterPanel onFiltersChange={handleFiltersChange} />
        
        {/* Network Visualization */}
        <TransferNetwork filters={filters} />
        
        {/* Enhanced Footer Info */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Enhanced Features & Usage Guide</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">🎯 Advanced Filtering</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Geographic filters (continents, countries)</li>
                <li>• Performance metrics (ROI, success rate)</li>
                <li>• Contract analysis (duration, loan-to-buy)</li>
                <li>• Player demographics (age, nationality)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">📊 Enhanced Visualization</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Success rate indicators</li>
                <li>• Transfer window analysis</li>
                <li>• Performance ratings display</li>
                <li>• ROI metrics visualization</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">🔍 Navigation & Controls</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Zoom in/out with mouse wheel</li>
                <li>• Pan by dragging empty space</li>
                <li>• Drag nodes to reposition them</li>
                <li>• Click nodes to pin/unpin position</li>
                <li>• Collapsible filter sections</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">💡 Analysis Features</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Loan-to-buy conversion tracking</li>
                <li>• Transfer success analytics</li>
                <li>• Multi-dimensional filtering</li>
                <li>• Quick filter presets</li>
              </ul>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <h4 className="font-medium text-gray-900 mb-3">Current Filter Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-blue-600">{filters.seasons.length}</div>
                <div className="text-blue-800">Season{filters.seasons.length !== 1 ? 's' : ''}</div>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {filters.leagues.length || 'All'}
                </div>
                <div className="text-green-800">League{filters.leagues.length !== 1 ? 's' : ''}</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-purple-600">{filters.transferTypes.length}</div>
                <div className="text-purple-800">Transfer Type{filters.transferTypes.length !== 1 ? 's' : ''}</div>
              </div>
              <div className="bg-orange-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-orange-600">{getActiveFilterCount()}</div>
                <div className="text-orange-800">Total Filters</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-sm text-gray-500">
            <p>Enhanced Football Transfer Network Visualization</p>
            <p className="mt-1">
              Built with React, D3.js, TypeScript & PostgreSQL • 
              Features: Advanced Filtering, Performance Analytics, ROI Tracking
            </p>
            <div className="mt-2 flex justify-center space-x-4 text-xs">
              <span>🎯 Multi-dimensional Analysis</span>
              <span>📊 Real-time Visualization</span>
              <span>🔍 Interactive Exploration</span>
              <span>💡 Performance Insights</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;