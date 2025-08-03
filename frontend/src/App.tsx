import { useState } from 'react';
import './App.css';
import TransferNetwork from './components/TransferNetwork'; // ✅ FIXED: Changed from TransferTracker
import FilterPanel from './components/FilterPanel';
import { FilterState } from './types';
import { countActiveFilters } from './utils';

// Hauptkomponente der Anwendung

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
                {countActiveFilters(filters) > 0 && (
                  <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                    {countActiveFilters(filters)} filters active
                  </span>
                )}
              </div>
            </div>
            <div className="text-sm text-gray-500">
              Advanced Transfer Analytics
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter Panel */}
        <FilterPanel onFiltersChange={handleFiltersChange} />
        
        {/* Network Visualization - ✅ FIXED: Now using TransferNetwork */}
        <TransferNetwork filters={filters} />
        
        {/* Enhanced Footer Info */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Enhanced Features & Usage Guide</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">🎯 Advanced Filtering</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Geographic filters</li>
                <li>• Performance metrics (ROI, success rate)</li>
                <li>• Player demographics</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">📊 Enhanced Visualization</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Success rate indicators</li>
                <li>• Transfer window analysis</li>
                <li>• ROI metrics visualization</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">🔍 Navigation & Controls</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Zoom in/out with mouse wheel</li>
                <li>• Drag nodes to reposition them</li>
                <li>• Click nodes to pin/unpin position</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">💡 Analysis Features</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Loan-to-buy conversion tracking</li>
                <li>• Transfer success analytics</li>
                <li>• Quick filter presets</li>
              </ul>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-sm text-gray-500">
            <p>Football Transfer Network</p>
            <p className="mt-1">
              Built with React, D3.js & Express.js
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