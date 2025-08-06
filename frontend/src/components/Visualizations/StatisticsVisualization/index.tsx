import React, { useMemo } from 'react';
import { VisualizationProps } from '../../../types';

interface StatisticsVisualizationProps extends VisualizationProps {}

interface StatisticsData {
  totalTransfers: number;
  totalValue: number;
  avgTransferValue: number;
  uniqueClubs: number;
  uniqueLeagues: number;
  topLeagues: Array<{
    name: string;
    transfers: number;
    value: number;
  }>;
  topClubs: Array<{
    name: string;
    transfers: number;
    netSpend: number;
    league: string;
  }>;
  transfersByType: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  transfersByWindow: Array<{
    window: string;
    count: number;
    value: number;
  }>;
  valueDistribution: {
    under1M: number;
    between1M5M: number;
    between5M15M: number;
    between15M50M: number;
    over50M: number;
  };
}

export const StatisticsVisualization: React.FC<StatisticsVisualizationProps> = ({
  networkData,
  filters,
  width = 1200,
  height = 600
}) => {
  
  // Calculate comprehensive statistics
  const statistics = useMemo((): StatisticsData => {
    if (!networkData?.nodes || !networkData?.edges) {
      return {
        totalTransfers: 0,
        totalValue: 0,
        avgTransferValue: 0,
        uniqueClubs: 0,
        uniqueLeagues: 0,
        topLeagues: [],
        topClubs: [],
        transfersByType: [],
        transfersByWindow: [],
        valueDistribution: {
          under1M: 0,
          between1M5M: 0,
          between5M15M: 0,
          between15M50M: 0,
          over50M: 0
        }
      };
    }
    
    // Basic metrics
    const totalTransfers = networkData.edges.reduce((sum, edge) => sum + edge.stats.transferCount, 0);
    const totalValue = networkData.edges.reduce((sum, edge) => sum + edge.stats.totalValue, 0);
    const avgTransferValue = totalTransfers > 0 ? totalValue / totalTransfers : 0;
    
    // Unique counts
    const uniqueLeagues = new Set(networkData.nodes.map(n => n.league)).size;
    const uniqueClubs = networkData.nodes.length;
    
    // League statistics
    const leagueStats = new Map<string, { transfers: number; value: number }>();
    networkData.nodes.forEach(node => {
      const totalTransfers = node.stats.transfersIn + node.stats.transfersOut;
      const totalValue = node.stats.totalSpent + node.stats.totalReceived;
      
      if (!leagueStats.has(node.league)) {
        leagueStats.set(node.league, { transfers: 0, value: 0 });
      }
      const stats = leagueStats.get(node.league)!;
      stats.transfers += totalTransfers;
      stats.value += totalValue;
    });
    
    const topLeagues = Array.from(leagueStats.entries())
      .map(([name, stats]) => ({ name, transfers: stats.transfers, value: stats.value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
    
    // Club statistics
    const topClubs = networkData.nodes
      .map(node => ({
        name: node.name,
        transfers: node.stats.transfersIn + node.stats.transfersOut,
        netSpend: node.stats.netSpend,
        league: node.league
      }))
      .sort((a, b) => Math.abs(b.netSpend) - Math.abs(a.netSpend))
      .slice(0, 10);
    
    // Transfer type analysis
    const typeMap = new Map<string, number>();
    networkData.edges.forEach(edge => {
      edge.stats.types.forEach(type => {
        typeMap.set(type, (typeMap.get(type) || 0) + 1);
      });
    });
    
    const transfersByType = Array.from(typeMap.entries())
      .map(([type, count]) => ({
        type,
        count,
        percentage: (count / totalTransfers) * 100
      }))
      .sort((a, b) => b.count - a.count);
    
    // Transfer window analysis
    const windowMap = new Map<string, { count: number; value: number }>();
    networkData.edges.forEach(edge => {
      edge.stats.transferWindows.forEach(window => {
        if (!windowMap.has(window)) {
          windowMap.set(window, { count: 0, value: 0 });
        }
        const stats = windowMap.get(window)!;
        stats.count += edge.stats.transferCount;
        stats.value += edge.stats.totalValue;
      });
    });
    
    const transfersByWindow = Array.from(windowMap.entries())
      .map(([window, stats]) => ({ window, count: stats.count, value: stats.value }))
      .sort((a, b) => b.value - a.value);
    
    // Value distribution
    const valueDistribution = {
      under1M: 0,
      between1M5M: 0,
      between5M15M: 0,
      between15M50M: 0,
      over50M: 0
    };
    
    networkData.edges.forEach(edge => {
      edge.transfers.forEach(transfer => {
        const fee = transfer.transferFee || 0;
        if (fee < 1000000) valueDistribution.under1M++;
        else if (fee < 5000000) valueDistribution.between1M5M++;
        else if (fee < 15000000) valueDistribution.between5M15M++;
        else if (fee < 50000000) valueDistribution.between15M50M++;
        else valueDistribution.over50M++;
      });
    });
    
    return {
      totalTransfers,
      totalValue,
      avgTransferValue,
      uniqueClubs,
      uniqueLeagues,
      topLeagues,
      topClubs,
      transfersByType,
      transfersByWindow,
      valueDistribution
    };
  }, [networkData]);

  if (!networkData?.nodes?.length) {
    return (
      <div 
        className="flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300"
        style={{ width, height }}
      >
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-4">📊</div>
          <div className="text-lg font-medium">Statistics Dashboard</div>
          <div className="text-sm mt-2">No data available</div>
          <div className="text-xs mt-1">Apply filters to see comprehensive analytics</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-lg border" style={{ width, height }}>
      <div className="p-6 overflow-y-auto h-full">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Transfer Statistics Dashboard</h2>
          <p className="text-gray-600">Comprehensive analytics and insights</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600">{statistics.totalTransfers.toLocaleString()}</div>
            <div className="text-sm text-blue-800">Total Transfers</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600">€{(statistics.totalValue / 1000000000).toFixed(1)}B</div>
            <div className="text-sm text-green-800">Total Value</div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-600">€{(statistics.avgTransferValue / 1000000).toFixed(1)}M</div>
            <div className="text-sm text-purple-800">Average Value</div>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-orange-600">{statistics.uniqueClubs}</div>
            <div className="text-sm text-orange-800">Active Clubs</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top Leagues */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Top Leagues by Value</h3>
            <div className="space-y-2">
              {statistics.topLeagues.slice(0, 8).map((league, index) => (
                <div key={league.name} className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                    <span className="text-sm text-gray-900 truncate max-w-32">{league.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">€{(league.value / 1000000).toFixed(0)}M</div>
                    <div className="text-xs text-gray-500">{league.transfers} transfers</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Clubs */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Top Clubs by Net Spend</h3>
            <div className="space-y-2">
              {statistics.topClubs.slice(0, 8).map((club, index) => (
                <div key={club.name} className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                    <div>
                      <div className="text-sm text-gray-900 truncate max-w-32">{club.name}</div>
                      <div className="text-xs text-gray-500 truncate max-w-32">{club.league}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-medium ${club.netSpend >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                      €{Math.abs(club.netSpend / 1000000).toFixed(0)}M
                    </div>
                    <div className="text-xs text-gray-500">{club.transfers} transfers</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Transfer Types */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Transfer Types</h3>
            <div className="space-y-3">
              {statistics.transfersByType.map((type) => (
                <div key={type.type} className="flex justify-between items-center">
                  <span className="text-sm text-gray-900 capitalize">{type.type.replace('_', ' ')}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${type.percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900 min-w-12">{type.percentage.toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Value Distribution */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Transfer Value Distribution</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-900">Under €1M</span>
                <span className="text-sm font-medium text-gray-900">{statistics.valueDistribution.under1M.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-900">€1M - €5M</span>
                <span className="text-sm font-medium text-gray-900">{statistics.valueDistribution.between1M5M.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-900">€5M - €15M</span>
                <span className="text-sm font-medium text-gray-900">{statistics.valueDistribution.between5M15M.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-900">€15M - €50M</span>
                <span className="text-sm font-medium text-gray-900">{statistics.valueDistribution.between15M50M.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-900">Over €50M</span>
                <span className="text-sm font-medium text-gray-900">{statistics.valueDistribution.over50M.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Transfer Windows */}
        {statistics.transfersByWindow.length > 0 && (
          <div className="mt-8 bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Transfer by Window</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {statistics.transfersByWindow.map((window) => (
                <div key={window.window} className="bg-white rounded-lg p-3 border">
                  <div className="text-lg font-semibold text-gray-900 capitalize">{window.window}</div>
                  <div className="text-sm text-gray-600">{window.count.toLocaleString()} transfers</div>
                  <div className="text-sm text-gray-600">€{(window.value / 1000000).toFixed(0)}M total</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatisticsVisualization;