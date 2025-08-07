import React from 'react';
import * as d3 from 'd3';
import { NetworkNode } from '../../../../types';
import { formatCurrency, formatPercentage } from '../../../../utils';

interface NodeInfoPanelProps {
  selectedNodeData: NetworkNode;
}

const NodeInfoPanel: React.FC<NodeInfoPanelProps> = ({ selectedNodeData }) => {
  // Enhanced color scale for leagues
  const colorScale = d3.scaleOrdinal<string>()
    .domain(['Bundesliga', 'Premier League', 'La Liga', 'Serie A', 'Ligue 1', 'Eredivisie', 'Primeira Liga', 'Süper Lig'])
    .range(['#d70909', '#3d0845', '#ff6b35', '#004225', '#1e3a8a', '#ff8c00', '#228b22', '#dc143c']);

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <h4 className="text-lg font-semibold mb-3">📊 Club Analytics</h4>
      <div className="space-y-4">
        <div>
          <h5 className="font-medium text-lg">{selectedNodeData.name}</h5>
          <p className="text-sm text-gray-600 flex items-center">
            <span 
              className="w-3 h-3 rounded-full mr-2"
              style={{ backgroundColor: colorScale(selectedNodeData.league) }}
            ></span>
            {selectedNodeData.league} • {selectedNodeData.country}
            {selectedNodeData.continent && (
              <span className="ml-1 text-gray-500">({selectedNodeData.continent})</span>
            )}
          </p>
          {selectedNodeData.leagueTier && (
            <p className="text-xs text-gray-500">Tier {selectedNodeData.leagueTier} League</p>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="text-blue-600 font-medium">Transfers In</div>
            <div className="text-2xl font-bold text-blue-800">
              {selectedNodeData.stats.transfersIn}
            </div>
          </div>
          <div className="bg-red-50 rounded-lg p-3">
            <div className="text-red-600 font-medium">Transfers Out</div>
            <div className="text-2xl font-bold text-red-800">
              {selectedNodeData.stats.transfersOut}
            </div>
          </div>
          {selectedNodeData.stats.transferSuccessRate !== undefined && (
            <div className="bg-green-50 rounded-lg p-3 col-span-2">
              <div className="text-green-600 font-medium">Success Rate</div>
              <div className="text-2xl font-bold text-green-800">
                {formatPercentage(selectedNodeData.stats.transferSuccessRate)}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Money Spent:</span>
            <span className="font-medium text-red-600">
              {formatCurrency(selectedNodeData.stats.totalSpent)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Money Received:</span>
            <span className="font-medium text-green-600">
              {formatCurrency(selectedNodeData.stats.totalReceived)}
            </span>
          </div>
          <div className="flex justify-between border-t pt-2">
            <span className="text-gray-600 font-medium">Net Spend:</span>
            <span className={`font-bold ${selectedNodeData.stats.netSpend > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {selectedNodeData.stats.netSpend > 0 ? '-' : '+'}
              {formatCurrency(Math.abs(selectedNodeData.stats.netSpend))}
            </span>
          </div>
          
          {/* Enhanced metrics */}
          {selectedNodeData.stats.avgROI !== undefined && selectedNodeData.stats.avgROI !== 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">Average ROI:</span>
              <span className={`font-medium ${selectedNodeData.stats.avgROI > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercentage(selectedNodeData.stats.avgROI)}
              </span>
            </div>
          )}
          
          {selectedNodeData.stats.avgPerformanceRating !== undefined && selectedNodeData.stats.avgPerformanceRating > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">Avg Performance:</span>
              <span className="font-medium text-blue-600">
                {selectedNodeData.stats.avgPerformanceRating.toFixed(1)}/10
              </span>
            </div>
          )}
          
          {selectedNodeData.stats.avgPlayerAge && (
            <div className="flex justify-between">
              <span className="text-gray-600">Avg Player Age:</span>
              <span className="font-medium text-gray-700">
                {selectedNodeData.stats.avgPlayerAge.toFixed(1)} years
              </span>
            </div>
          )}
        </div>

        {/* Club details */}
        {(selectedNodeData.clubValue || selectedNodeData.foundingYear || selectedNodeData.stadiumCapacity) && (
          <div className="pt-3 border-t border-gray-200">
            <div className="text-xs font-medium text-gray-700 mb-2">Club Information:</div>
            <div className="space-y-1 text-xs text-gray-600">
              {selectedNodeData.clubValue && (
                <div>Market Value: {formatCurrency(selectedNodeData.clubValue)}</div>
              )}
              {selectedNodeData.foundingYear && (
                <div>Founded: {selectedNodeData.foundingYear}</div>
              )}
              {selectedNodeData.stadiumCapacity && (
                <div>Stadium: {selectedNodeData.stadiumCapacity.toLocaleString()} seats</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(NodeInfoPanel);