import React from 'react';

export interface NodeTooltipData {
  clubName: string;
  league: string;
  transfersIn: number;
  transfersOut: number;
  totalSpent: string;
  totalReceived: string;
  netSpend: string;
  avgTransferValue: string;
  successRate: string;
}

export interface FlowTooltipData {
  from: string;
  to: string;
  transferCount: number;
  totalValue: string;
  avgValue: string;
  topTransfer: {
    player: string;
    fee: string;
    date: string;
  } | null;
  transferTypes: string[];
  successRate: string;
}

interface NodeTooltipProps {
  data: NodeTooltipData;
  x: number;
  y: number;
}

interface FlowTooltipProps {
  data: FlowTooltipData;
  x: number;
  y: number;
}

export const NodeTooltip: React.FC<NodeTooltipProps> = ({ data, x, y }) => {
  return (
    <div
      className="fixed z-50 bg-gray-900 text-white p-4 rounded-lg shadow-lg border border-gray-700 max-w-sm"
      style={{
        left: x + 10,
        top: y - 10,
        pointerEvents: 'none'
      }}
    >
      <div className="border-b border-gray-600 pb-2 mb-2">
        <h3 className="font-bold text-lg">{data.clubName}</h3>
        <p className="text-gray-300 text-sm">{data.league}</p>
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-300">Transfers In:</span>
          <span className="font-semibold text-green-400">{data.transfersIn}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-300">Transfers Out:</span>
          <span className="font-semibold text-red-400">{data.transfersOut}</span>
        </div>
        <div className="border-t border-gray-600 pt-2">
          <div className="flex justify-between">
            <span className="text-gray-300">Total Spent:</span>
            <span className="font-semibold text-red-300">{data.totalSpent}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-300">Total Received:</span>
            <span className="font-semibold text-green-300">{data.totalReceived}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-300">Net Spend:</span>
            <span className={`font-semibold ${data.netSpend.startsWith('-') ? 'text-green-400' : 'text-red-400'}`}>
              {data.netSpend}
            </span>
          </div>
        </div>
        <div className="border-t border-gray-600 pt-2">
          <div className="flex justify-between">
            <span className="text-gray-300">Avg Transfer:</span>
            <span className="font-semibold">{data.avgTransferValue}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-300">Success Rate:</span>
            <span className="font-semibold text-blue-400">{data.successRate}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const FlowTooltip: React.FC<FlowTooltipProps> = ({ data, x, y }) => {
  return (
    <div
      className="fixed z-50 bg-gray-900 text-white p-4 rounded-lg shadow-lg border border-gray-700 max-w-md"
      style={{
        left: x + 10,
        top: y - 10,
        pointerEvents: 'none'
      }}
    >
      <div className="border-b border-gray-600 pb-2 mb-2">
        <h3 className="font-bold text-lg">{data.from} → {data.to}</h3>
        <div className="flex gap-4 text-sm text-gray-300">
          <span>{data.transferCount} transfers</span>
          <span>{data.totalValue} total</span>
        </div>
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-300">Average Value:</span>
          <span className="font-semibold">{data.avgValue}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-300">Success Rate:</span>
          <span className="font-semibold text-blue-400">{data.successRate}</span>
        </div>
        
        {data.topTransfer && (
          <div className="border-t border-gray-600 pt-2">
            <p className="text-gray-300 mb-1">Top Transfer:</p>
            <div className="bg-gray-800 rounded p-2">
              <p className="font-semibold">{data.topTransfer.player}</p>
              <div className="flex justify-between text-xs text-gray-400">
                <span>{data.topTransfer.fee}</span>
                <span>{data.topTransfer.date}</span>
              </div>
            </div>
          </div>
        )}
        
        {data.transferTypes.length > 0 && (
          <div className="border-t border-gray-600 pt-2">
            <p className="text-gray-300 mb-1">Transfer Types:</p>
            <div className="flex flex-wrap gap-1">
              {data.transferTypes.map((type, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-blue-600 text-xs rounded"
                >
                  {type}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};