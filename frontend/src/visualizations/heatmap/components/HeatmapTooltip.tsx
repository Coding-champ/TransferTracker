import React from 'react';
import { HeatmapTooltipData, HeatmapMode } from '../types';
import { formatColorScaleValue } from '../utils/colorScales';

interface HeatmapTooltipProps {
  data: HeatmapTooltipData | null;
  mode: HeatmapMode;
  onDrillDown?: (cell: any) => void;
  className?: string;
}

export const HeatmapTooltip: React.FC<HeatmapTooltipProps> = ({
  data,
  mode,
  onDrillDown,
  className = ''
}) => {
  if (!data) return null;

  const { cell, position } = data;

  // Position tooltip to avoid edge overflow
  const tooltipStyle: React.CSSProperties = {
    position: 'fixed',
    left: position.x + 15,
    top: position.y - 10,
    zIndex: 9999,
    pointerEvents: 'auto', // Enable interactions
  };

  // Adjust position if tooltip would overflow
  if (position.x > window.innerWidth - 300) {
    tooltipStyle.left = position.x - 300;
  }
  if (position.y < 200) {
    tooltipStyle.top = position.y + 30;
  }

  return (
    <div
      style={tooltipStyle}
      className={`bg-gray-900 text-white rounded-lg shadow-lg p-3 max-w-xs ${className}`}
      onMouseEnter={() => {
        // Keep tooltip visible when hovering over it
      }}
      onMouseLeave={() => {
        // Could add logic here if needed
      }}
    >
      {/* Header */}
      <div className="border-b border-gray-700 pb-2 mb-2">
        <div className="font-semibold text-sm">
          {cell.source} → {cell.target}
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-300">Transfers:</span>
          <span className="font-medium">{cell.count}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-300">Total Value:</span>
          <span className="font-medium">
            {formatColorScaleValue(cell.value, 'value')}
          </span>
        </div>

        {cell.successRate !== undefined && (
          <div className="flex justify-between">
            <span className="text-gray-300">Success Rate:</span>
            <span className="font-medium">
              {formatColorScaleValue(cell.successRate, 'success-rate')}
            </span>
          </div>
        )}

        {cell.topTransfer && (
          <>
            <div className="border-t border-gray-700 pt-2 mt-2">
              <div className="text-gray-300 text-xs mb-1">Top Transfer:</div>
              <div className="font-medium text-xs">{cell.topTransfer.player}</div>
              <div className="text-gray-300 text-xs">
                {formatColorScaleValue(cell.topTransfer.value, 'value')}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Current mode indicator */}
      <div className="border-t border-gray-700 pt-2 mt-2">
        <div className="text-gray-400 text-xs">
          Current view: {getModeDisplayName(mode)}
        </div>
        <div className="text-gray-300 text-xs font-medium">
          {formatColorScaleValue(
            mode === 'value' ? cell.value : 
            mode === 'count' ? cell.count : 
            cell.successRate || 0, 
            mode
          )}
        </div>
      </div>

      {/* Action hint */}
      <div className="border-t border-gray-700 pt-2 mt-2">
        <button
          onClick={() => onDrillDown && onDrillDown(cell)}
          className="w-full text-left text-gray-400 text-xs hover:text-gray-200 transition-colors cursor-pointer"
        >
          Click to drill down →
        </button>
      </div>

      {/* Tooltip arrow */}
      <div 
        className="absolute w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"
        style={{
          left: position.x > window.innerWidth - 300 ? '280px' : '10px',
          bottom: '-4px'
        }}
      />
    </div>
  );
};

function getModeDisplayName(mode: HeatmapMode): string {
  switch (mode) {
    case 'value':
      return 'Transfer Value';
    case 'count':
      return 'Transfer Count';
    case 'success-rate':
      return 'Success Rate';
    default:
      return 'Unknown';
  }
}