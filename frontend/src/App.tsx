import React, { useState } from 'react';
import './App.css';
import TransferNetwork from './components/TransferTracker';
import FilterPanel from './components/FilterPanel';

interface FilterState {
  seasons: string[];
  leagues: string[];
  transferTypes: string[];
  minTransferFee?: number;
  maxTransferFee?: number;
}

function App() {
  const [filters, setFilters] = useState<FilterState>({
    seasons: ['2023/24'],
    leagues: [],
    transferTypes: ['sale', 'loan', 'free', 'loan_with_option'],
    minTransferFee: undefined,
    maxTransferFee: undefined
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
              <span className="ml-3 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                Beta
              </span>
            </div>
            <div className="text-sm text-gray-500">
              Visualizing football transfers between clubs
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
        
        {/* Footer Info */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">How to Use</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Navigation</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Zoom in/out with mouse wheel</li>
                <li>• Pan by dragging empty space</li>
                <li>• Drag nodes to reposition them</li>
                <li>• Click nodes to pin/unpin position</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Visualization</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Node size = Total transfer activity</li>
                <li>• Edge thickness = Number of transfers</li>
                <li>• Colors represent different leagues</li>
                <li>• Arrows show transfer direction</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Filtering</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Select multiple seasons and leagues</li>
                <li>• Filter by transfer type and fee range</li>
                <li>• Use quick filters for common views</li>
                <li>• Hover over elements for details</li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-sm text-gray-500">
            <p>Football Transfer Network Visualization</p>
            <p className="mt-1">Built with React, D3.js, and Node.js</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;