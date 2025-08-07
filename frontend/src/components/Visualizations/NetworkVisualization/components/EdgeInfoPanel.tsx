import React from 'react';
import { NetworkEdge } from '../../../../types';
import { formatCurrency, formatPercentage } from '../../../../utils';

interface EdgeInfoPanelProps {
  hoveredEdgeData: NetworkEdge;
}

const EdgeInfoPanel: React.FC<EdgeInfoPanelProps> = ({ hoveredEdgeData }) => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <h4 className="text-lg font-semibold mb-3">🔗 Transfer Connection</h4>
      <div className="space-y-3">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-800">
              {hoveredEdgeData.stats.transferCount}
            </div>
            <div className="text-sm text-gray-600">Total Transfers</div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3 text-sm">
          {hoveredEdgeData.stats.avgROI !== undefined && hoveredEdgeData.stats.avgROI !== 0 && (
            <div className="bg-blue-50 rounded-lg p-2 text-center">
              <div className="text-xs text-blue-600">Avg ROI</div>
              <div className={`font-bold ${hoveredEdgeData.stats.avgROI > 0 ? 'text-green-700' : 'text-red-700'}`}>
                {formatPercentage(hoveredEdgeData.stats.avgROI)}
              </div>
            </div>
          )}
          
          {hoveredEdgeData.stats.transferSuccessRate !== undefined && hoveredEdgeData.stats.transferSuccessRate > 0 && (
            <div className="bg-green-50 rounded-lg p-2 text-center">
              <div className="text-xs text-green-600">Success Rate</div>
              <div className="font-bold text-green-700">
                {formatPercentage(hoveredEdgeData.stats.transferSuccessRate)}
              </div>
            </div>
          )}
        </div>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Total Value:</span>
            <span className="font-medium">
              {formatCurrency(hoveredEdgeData.stats.totalValue)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Average Value:</span>
            <span className="font-medium">
              {formatCurrency(hoveredEdgeData.stats.avgTransferValue)}
            </span>
          </div>
          
          {hoveredEdgeData.stats.seasons.length > 0 && (
            <div className="pt-2 border-t">
              <span className="text-gray-600 text-xs">Active Seasons:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {hoveredEdgeData.stats.seasons.slice(0, 3).map(season => (
                  <span 
                    key={season} 
                    className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                  >
                    {season}
                  </span>
                ))}
                {hoveredEdgeData.stats.seasons.length > 3 && (
                  <span className="text-xs text-gray-500">
                    +{hoveredEdgeData.stats.seasons.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )}
          
          {hoveredEdgeData.stats.transferWindows.length > 0 && (
            <div className="pt-2">
              <span className="text-gray-600 text-xs">Transfer Windows:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {hoveredEdgeData.stats.transferWindows.map(window => (
                  <span 
                    key={window} 
                    className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded"
                  >
                    {window}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          <div className="pt-2 border-t">
            <span className="text-gray-600 text-xs">Transfer Types:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {hoveredEdgeData.stats.types.map(type => (
                <span 
                  key={type} 
                  className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded"
                >
                  {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Enhanced recent transfers preview */}
        {hoveredEdgeData.transfers.length > 0 && (
          <div className="pt-3 border-t">
            <div className="text-xs text-gray-600 mb-2">Recent Transfers:</div>
            <div className="space-y-2 max-h-24 overflow-y-auto">
              {hoveredEdgeData.transfers.slice(0, 4).map((transfer, idx) => (
                <div key={idx} className="text-xs bg-gray-50 rounded p-2">
                  <div className="font-medium text-gray-700">{transfer.playerName}</div>
                  <div className="flex justify-between text-gray-500 mt-1">
                    <span>
                      {transfer.transferFee ? formatCurrency(transfer.transferFee) : 'Free'}
                    </span>
                    <span>{transfer.season}</span>
                  </div>
                  {transfer.playerPerformanceScore && (
                    <div className="text-xs text-blue-600 mt-1">
                      Rating: {transfer.playerPerformanceScore.toFixed(1)}/10
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(EdgeInfoPanel);