import React from 'react';
import { NetworkData, FilterState } from '../types';
import { formatCurrency, formatPercentage, formatDate } from '../utils';

interface NetworkStatisticsProps {
  networkData: NetworkData;
  filters: FilterState;
}

const NetworkStatistics: React.FC<NetworkStatisticsProps> = ({ networkData, filters }) => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <h4 className="text-lg font-semibold mb-4">📈 Network Analytics</h4>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center bg-blue-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-blue-800">
              {networkData.metadata.totalTransfers}
            </div>
            <div className="text-xs text-blue-600">Total Transfers</div>
          </div>
          <div className="text-center bg-green-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-green-800">
              {formatCurrency(networkData.metadata.totalValue)}
            </div>
            <div className="text-xs text-green-600">Total Value</div>
          </div>
        </div>
        
        {/* Enhanced performance metrics */}
        {networkData.metadata.avgROI !== undefined && networkData.metadata.avgROI !== 0 && (
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center bg-yellow-50 rounded-lg p-3">
              <div className={`text-2xl font-bold ${networkData.metadata.avgROI > 0 ? 'text-green-800' : 'text-red-800'}`}>
                {formatPercentage(networkData.metadata.avgROI)}
              </div>
              <div className="text-xs text-yellow-600">Average ROI</div>
            </div>
            <div className="text-center bg-emerald-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-emerald-800">
                {formatPercentage(networkData.metadata.successRate)}
              </div>
              <div className="text-xs text-emerald-600">Success Rate</div>
            </div>
          </div>
        )}
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Active Clubs:</span>
            <span className="font-medium">{networkData.nodes.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Transfer Routes:</span>
            <span className="font-medium">{networkData.edges.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Avg per Route:</span>
            <span className="font-medium">
              {networkData.edges.length > 0 ? 
                (networkData.metadata.totalTransfers / networkData.edges.length).toFixed(1) : 
                '0'
              } transfers
            </span>
          </div>
          
          {networkData.metadata.dateRange.start && networkData.metadata.dateRange.end && (
            <div className="pt-2 border-t text-xs text-gray-500">
              <div>Data Period:</div>
              <div className="font-medium">
                {formatDate(networkData.metadata.dateRange.start)} to {formatDate(networkData.metadata.dateRange.end)}
              </div>
            </div>
          )}
        </div>

        {/* Filter summary */}
        <div className="pt-3 border-t border-gray-200">
          <div className="text-xs font-medium text-gray-700 mb-2">Active Filters:</div>
          <div className="flex flex-wrap gap-1">
            {Object.entries(filters).map(([key, value]) => {
              if (Array.isArray(value) && value.length > 0) {
                return (
                  <span key={key} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                    {key}: {value.length}
                  </span>
                );
              }
              if (typeof value === 'number' || (typeof value === 'boolean' && value)) {
                return (
                  <span key={key} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                    {key}
                  </span>
                );
              }
              return null;
            }).filter(Boolean)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(NetworkStatistics);