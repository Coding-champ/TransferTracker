import React, { useState } from 'react';
import { X, ArrowLeft, TrendingUp, Users, Euro, Calendar } from 'lucide-react';
import { TransferDetailsModalProps, TransferDetail } from '../types';
import { formatColorScaleValue } from '../utils/colorScales';

export const TransferDetailsModal: React.FC<TransferDetailsModalProps> = ({
  isOpen,
  onClose,
  sourceClub,
  targetClub,
  transfers
}) => {
  const [sortBy, setSortBy] = useState<'value' | 'date' | 'success'>('value');
  const [filterSuccess, setFilterSuccess] = useState<'all' | 'success' | 'failure'>('all');

  if (!isOpen) return null;

  // Filter and sort transfers
  let filteredTransfers = transfers;
  
  if (filterSuccess !== 'all') {
    filteredTransfers = transfers.filter(t => 
      filterSuccess === 'success' ? t.success : !t.success
    );
  }

  filteredTransfers.sort((a, b) => {
    switch (sortBy) {
      case 'value':
        return b.value - a.value;
      case 'date':
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      case 'success':
        return Number(b.success) - Number(a.success);
      default:
        return 0;
    }
  });

  const totalValue = transfers.reduce((sum, t) => sum + t.value, 0);
  const successRate = transfers.length > 0 
    ? transfers.filter(t => t.success).length / transfers.length 
    : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Transfer Details
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {sourceClub} → {targetClub}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-4 mt-4">
            <div className="bg-white rounded-lg p-3 border">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-blue-500" />
                <span className="text-sm text-gray-600">Total Transfers</span>
              </div>
              <div className="text-lg font-bold text-gray-900">{transfers.length}</div>
            </div>
            
            <div className="bg-white rounded-lg p-3 border">
              <div className="flex items-center gap-2">
                <Euro size={16} className="text-green-500" />
                <span className="text-sm text-gray-600">Total Value</span>
              </div>
              <div className="text-lg font-bold text-gray-900">
                {formatColorScaleValue(totalValue, 'value')}
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-3 border">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-purple-500" />
                <span className="text-sm text-gray-600">Success Rate</span>
              </div>
              <div className="text-lg font-bold text-gray-900">
                {formatColorScaleValue(successRate, 'success-rate')}
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-3 border">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-orange-500" />
                <span className="text-sm text-gray-600">Latest Transfer</span>
              </div>
              <div className="text-sm font-bold text-gray-900">
                {transfers.length > 0 
                  ? new Date(Math.max(...transfers.map(t => new Date(t.date).getTime()))).getFullYear()
                  : 'N/A'
                }
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-sm border rounded px-2 py-1"
              >
                <option value="value">Transfer Value</option>
                <option value="date">Date</option>
                <option value="success">Success</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Filter:</label>
              <select
                value={filterSuccess}
                onChange={(e) => setFilterSuccess(e.target.value as any)}
                className="text-sm border rounded px-2 py-1"
              >
                <option value="all">All Transfers</option>
                <option value="success">Successful Only</option>
                <option value="failure">Failed Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Transfer List */}
        <div className="overflow-y-auto max-h-96">
          {filteredTransfers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No transfers match the current filters
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredTransfers.map((transfer) => (
                <div key={transfer.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium text-gray-900">{transfer.playerName}</h3>
                        <span className="text-sm text-gray-500">
                          {transfer.position} • Age {transfer.age}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          transfer.success 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {transfer.success ? 'Success' : 'Failed'}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                        <span>
                          {formatColorScaleValue(transfer.value, 'value')}
                        </span>
                        <span>
                          {new Date(transfer.date).toLocaleDateString()}
                        </span>
                        {transfer.stats && (
                          <span>
                            {transfer.stats.gamesPlayed} games • {transfer.stats.goals}G • {transfer.stats.assists}A
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft size={16} />
              Back to Heatmap
            </button>
            
            <div className="text-sm text-gray-500">
              Showing {filteredTransfers.length} of {transfers.length} transfers
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};