import React from 'react';
import { SANKEY_PATTERNS, PatternStats } from '../utils/patterns';

interface PatternSelectorProps {
  selectedPattern: string | null;
  onPatternSelect: (patternId: string | null) => void;
  patternStats: PatternStats[];
  className?: string;
}

export const PatternSelector: React.FC<PatternSelectorProps> = ({
  selectedPattern,
  onPatternSelect,
  patternStats,
  className = ''
}) => {
  const formatValue = (value: number): string => {
    if (value >= 1000000) {
      return `€${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `€${(value / 1000).toFixed(1)}K`;
    }
    return `€${value.toFixed(0)}`;
  };

  const getPatternStats = (patternId: string): PatternStats | undefined => {
    return patternStats.find(stat => stat.patternId === patternId);
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg border border-gray-200 p-4 ${className}`}>
      <div className="border-b border-gray-200 pb-3 mb-3">
        <h3 className="text-lg font-semibold text-gray-900">Pattern Highlighting</h3>
        <p className="text-sm text-gray-600">Discover interesting transfer patterns</p>
      </div>

      <div className="space-y-2">
        {/* Clear Selection */}
        <button
          onClick={() => onPatternSelect(null)}
          className={`w-full text-left p-3 rounded-lg border transition-colors duration-200 ${
            selectedPattern === null
              ? 'border-blue-500 bg-blue-50 text-blue-900'
              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-medium">Show All Flows</span>
            <div className="w-4 h-4 rounded-full bg-gray-400"></div>
          </div>
          <p className="text-xs text-gray-600 mt-1">Clear pattern highlighting</p>
        </button>

        {/* Pattern Options */}
        {SANKEY_PATTERNS.map((pattern) => {
          const stats = getPatternStats(pattern.id);
          const isSelected = selectedPattern === pattern.id;
          const hasMatches = stats && stats.matchCount > 0;

          return (
            <button
              key={pattern.id}
              onClick={() => onPatternSelect(pattern.id)}
              disabled={!hasMatches}
              className={`w-full text-left p-3 rounded-lg border transition-colors duration-200 ${
                isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : hasMatches
                  ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  : 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-60'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: pattern.color }}
                    ></div>
                    <span className={`font-medium ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                      {pattern.name}
                    </span>
                  </div>
                  <p className={`text-xs ${isSelected ? 'text-blue-700' : 'text-gray-600'} mb-2`}>
                    {pattern.description}
                  </p>
                  
                  {hasMatches && stats && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Matches:</span>
                        <span className="font-medium">{stats.matchCount}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Total Value:</span>
                        <span className="font-medium">{formatValue(stats.totalValue)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Avg Value:</span>
                        <span className="font-medium">{formatValue(stats.avgValue)}</span>
                      </div>
                    </div>
                  )}
                  
                  {!hasMatches && (
                    <p className="text-xs text-gray-500">No matches found</p>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Pattern Details */}
      {selectedPattern && (() => {
        const pattern = SANKEY_PATTERNS.find(p => p.id === selectedPattern);
        const stats = getPatternStats(selectedPattern);
        
        if (!pattern || !stats) return null;
        
        return (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="font-medium text-gray-900 mb-2">Pattern Details</h4>
            <div className="bg-gray-50 rounded-lg p-3">
              <h5 className="font-medium text-sm text-gray-900 mb-2">Top Matches:</h5>
              <div className="space-y-2">
                {stats.topMatches.slice(0, 3).map((match, index) => (
                  <div key={index} className="flex justify-between text-xs">
                    <span className="text-gray-600 truncate">
                      {match.from} → {match.to}
                    </span>
                    <span className="font-medium ml-2">
                      {formatValue(match.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};