import React from 'react';
import { FilterState } from '../../../types';

/**
 * Props for the QuickFilterButtons component
 */
interface QuickFilterButtonsProps {
  /** Callback to update specific filter values */
  updateFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
}

/**
 * Quick filter preset buttons for common filter combinations
 * Provides shortcuts for frequently used filter configurations
 * Wrapped with React.memo since this is a static component
 */
const QuickFilterButtons: React.FC<QuickFilterButtonsProps> = React.memo(({ updateFilter }) => {
  return (
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
      </div>
    </div>
  );
});

export default QuickFilterButtons;